import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const publicDir = join("android", "app", "src", "main", "assets", "public");
const indexPath = join(publicDir, "index.html");

function fail(message) {
  console.error(`Capacitor bundle verification failed: ${message}`);
  process.exit(1);
}

function assertFile(path) {
  if (!existsSync(path)) fail(`missing ${path}`);
  if (statSync(path).size <= 0) fail(`${path} is empty`);
}

assertFile(indexPath);
assertFile(join(publicDir, "logo.png"));
assertFile(join(publicDir, "manifest.json"));

const html = readFileSync(indexPath, "utf8");
const assetRefs = [...html.matchAll(/(?:src|href)="\/(assets\/[^\"]+)"/g)].map((match) => match[1]);

if (!assetRefs.some((ref) => ref.endsWith(".js"))) {
  fail("index.html does not reference a JavaScript bundle");
}

for (const ref of assetRefs) {
  assertFile(join(publicDir, ref));
}

console.log(`Capacitor bundle verified: ${assetRefs.length} referenced assets are present.`);