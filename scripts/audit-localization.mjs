import ts from "typescript";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const root = process.cwd();
const output = join(root, "localization/source-inventory.json");
const uiAttributes = new Set(["placeholder", "title", "alt", "aria-label", "label", "description"]);
const records = [];
const metadata = [];
const translatedUses = [];
const dynamicTranslatedUses = [];
const keyMapDomains = new Map();

// Extract explicit domains without executing or importing application modules.
for (const path of files(join(root, "src/lib"))) {
  if (/\/locales\//.test(path)) continue;
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  function findMap(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text.endsWith("_KEYS") && node.initializer) {
      let value = node.initializer;
      if (ts.isAsExpression(value)) value = value.expression;
      if (ts.isObjectLiteralExpression(value)) {
        const properties = value.properties.filter(ts.isPropertyAssignment);
        if (properties.length === value.properties.length && properties.every((property) => ts.isStringLiteral(property.initializer))) {
          keyMapDomains.set(node.name.text, properties.map((property) => property.initializer.text));
        }
      }
    }
    ts.forEachChild(node, findMap);
  }
  findMap(source);
}

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

for (const directory of ["src/routes", "src/components", "src/lib", "src/hooks"]) {
  for (const path of files(join(root, directory))) {
    const file = relative(root, path);
    if (/\/locales\/|\.server\.ts$|\.functions\.ts$|\/email\/|\/email-templates\/|\/api\/|i18n(?:-|\.)|country-languages\.ts$|auto-translate/.test(file)) continue;
    const source = ts.createSourceFile(file, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    if (file.startsWith("src/routes/") && file.endsWith("tsx") && !file.endsWith("/__root.tsx")) {
      const text = source.text;
      metadata.push({ file, hasHead: /\bhead\s*:/.test(text), review: "pending" });
    }
    function record(node, kind, text) {
      const normalized = text.replace(/\s+/g, " ").trim();
      if (!normalized || !/\p{L}/u.test(normalized)) return;
      const position = source.getLineAndCharacterOfPosition(node.getStart(source));
      records.push({ file, line: position.line + 1, kind, text: normalized, review: "pending" });
    }
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(source) === "t" && node.arguments[0]) {
        const argument = node.arguments[0];
        const position = source.getLineAndCharacterOfPosition(node.getStart(source));
        if (ts.isElementAccessExpression(argument) && ts.isIdentifier(argument.expression)) {
          const keys = keyMapDomains.get(argument.expression.text);
          if (keys) {
            for (const key of keys) translatedUses.push({ file, line: position.line + 1, key, domain: argument.expression.text });
            for (const parameter of node.arguments.slice(1)) visit(parameter);
            return;
          }
        }
        if (ts.isConditionalExpression(argument) && ts.isStringLiteral(argument.whenTrue) && ts.isStringLiteral(argument.whenFalse)) {
          for (const key of [argument.whenTrue.text, argument.whenFalse.text]) translatedUses.push({ file, line: position.line + 1, key });
          for (const parameter of node.arguments.slice(1)) visit(parameter);
          return;
        }
      }
      if (ts.isCallExpression(node) && node.expression.getText(source) === "t" && node.arguments[0] && ts.isTemplateExpression(node.arguments[0])) {
        const argument = node.arguments[0];
        const position = source.getLineAndCharacterOfPosition(node.getStart(source));
        dynamicTranslatedUses.push({
          file, line: position.line + 1,
          pattern: argument.head.text + argument.templateSpans.map((span) => `*${span.literal.text}`).join(""),
          review: "pending-explicit-key-domain-verification",
        });
        for (const parameter of node.arguments.slice(1)) visit(parameter);
        return;
      }
      if (ts.isCallExpression(node) && node.expression.getText(source) === "t" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        const position = source.getLineAndCharacterOfPosition(node.getStart(source));
        translatedUses.push({ file, line: position.line + 1, key: node.arguments[0].text });
        // Translation keys are not new English literals; still inspect parameters.
        for (const argument of node.arguments.slice(1)) visit(argument);
        return;
      }
      if (ts.isJsxText(node)) record(node, "jsx-text", node.text);
      else if (ts.isJsxAttribute(node) && uiAttributes.has(node.name.getText(source))) {
        if (node.initializer && ts.isStringLiteral(node.initializer)) record(node, "ui-attribute", node.initializer.text);
      } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
        if (ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent)) return;
        if (ts.isJsxAttribute(node.parent)) return;
        const parent = node.parent.getText(source);
        // Candidate inventory deliberately retains uncertain literals for human classification.
        const text = ts.isTemplateExpression(node)
          ? node.head.text + node.templateSpans.map((span, index) => `{value${index + 1}}${span.literal.text}`).join("")
          : node.text;
        if (ts.isTemplateExpression(node) && /className|https?:|supabase|\.from\(/.test(parent)) return;
        if (/^(?:https?:|\/|@\/)|^[\w.-]+$/.test(text) && !/^[A-Z][a-z]+$/.test(text)) return;
        if (/className\s*=|console\.(?:log|warn|error)|queryKey:/.test(parent)) return;
        const kind = /toast\.|throw new Error|setError\(/.test(parent) ? "feedback-candidate" : "literal-candidate";
        record(node, kind, text);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}

records.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
const inventory = {
  status: "unreviewed-candidate-inventory",
  policy: "Classify each record as app-owned text, user-content boundary, or technical exception before approving key coverage. Candidate count is not translation completion.",
  summary: { sourceFilesWithCandidates: new Set(records.map((record) => record.file)).size, candidates: records.length, contentRouteMetadata: metadata.length, translatedUses: translatedUses.length, dynamicTranslatedUses: dynamicTranslatedUses.length },
  metadata,
  translatedUses,
  dynamicTranslatedUses,
  records,
};
const serialized = JSON.stringify(inventory, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(output, "utf8") !== serialized) throw new Error("Localization inventory is stale; regenerate and review changed records.");
} else {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, serialized);
}
console.log(JSON.stringify(inventory.summary));