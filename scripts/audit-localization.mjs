import ts from "typescript";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const root = process.cwd();
const output = join(root, "localization/source-inventory.json");
const uiAttributes = new Set(["placeholder", "title", "alt", "aria-label", "label", "description"]);
const records = [];
const metadata = [];

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
  summary: { sourceFilesWithCandidates: new Set(records.map((record) => record.file)).size, candidates: records.length, contentRouteMetadata: metadata.length },
  metadata,
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