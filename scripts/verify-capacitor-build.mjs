import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const publicDir = join("android", "app", "src", "main", "assets", "public");
const indexPath = join(publicDir, "index.html");
const resDir = join("android", "app", "src", "main", "res");

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

for (const density of ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]) {
  assertFile(join(resDir, `mipmap-${density}`, "ic_launcher.png"));
  assertFile(join(resDir, `mipmap-${density}`, "ic_launcher_round.png"));
  assertFile(join(resDir, `mipmap-${density}`, "ic_launcher_foreground.png"));
}

assertFile(join(resDir, "mipmap-anydpi-v26", "ic_launcher.xml"));
assertFile(join(resDir, "mipmap-anydpi-v26", "ic_launcher_round.xml"));

const html = readFileSync(indexPath, "utf8");
const assetRefs = [...html.matchAll(/(?:src|href)="\/(assets\/[^\"]+)"/g)].map((match) => match[1]);

if (!assetRefs.some((ref) => ref.endsWith(".js"))) {
  fail("index.html does not reference a JavaScript bundle");
}

for (const ref of assetRefs) {
  assertFile(join(publicDir, ref));
}

const mainBundle = assetRefs.find((ref) => ref.endsWith(".js"));
if (!mainBundle) fail("could not identify the JavaScript entry bundle");

const bundle = readFileSync(join(publicDir, mainBundle), "utf8");
const duplicateRouteStub = "/__capacitor_server_route_stub__";
if (bundle.includes(duplicateRouteStub)) {
  fail("server routes were collapsed into one Route instance; the router will fail at startup");
}

console.log(`Capacitor bundle verified: web entry and Android launcher resources are present.`);