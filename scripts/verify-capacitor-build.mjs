import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
  assertFile(join(resDir, `mipmap-${density}`, "ic_launcher_monochrome.png"));
}

assertFile(join(resDir, "mipmap-anydpi-v26", "ic_launcher.xml"));
assertFile(join(resDir, "mipmap-anydpi-v26", "ic_launcher_round.xml"));
assertFile(join(resDir, "mipmap-anydpi-v33", "ic_launcher.xml"));
assertFile(join(resDir, "mipmap-anydpi-v33", "ic_launcher_round.xml"));

const html = readFileSync(indexPath, "utf8");
const assetRefs = [...html.matchAll(/(?:src|href)="\/(assets\/[^\"]+)"/g)].map((match) => match[1]);

if (!assetRefs.some((ref) => ref.endsWith(".js"))) {
  fail("index.html does not reference a JavaScript bundle");
}

for (const ref of assetRefs) {
  assertFile(join(publicDir, ref));
}

const javascriptAssets = readdirSync(join(publicDir, "assets"))
  .filter((name) => name.endsWith(".js"))
  .map((name) => join(publicDir, "assets", name));
if (javascriptAssets.length === 0) fail("could not identify any JavaScript bundles");

// Vite code-splits route dependencies, so auth code is not guaranteed to be
// present in the HTML entry chunk. Verify the complete packaged application.
const bundle = javascriptAssets.map((path) => readFileSync(path, "utf8")).join("\n");
const duplicateRouteStub = "/__capacitor_server_route_stub__";
if (bundle.includes(duplicateRouteStub)) {
  fail("server routes were collapsed into one Route instance; the router will fail at startup");
}
if (!bundle.includes("https://viplifes.com/~oauth/initiate")) {
  fail("the absolute Android OAuth broker URL is missing from the packaged bundle");
}
if (!bundle.includes("https://viplifes.com") || !bundle.includes("/auth/callback")) {
  fail("the canonical Android OAuth callback is missing from the packaged bundle");
}

const envPath = ".env";
assertFile(envPath);
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^['\"]|['\"]$/g, "")];
    }),
);
const backendUrl = env.VITE_SUPABASE_URL;
if (!backendUrl || !bundle.includes(backendUrl)) {
  fail("the backend URL was not embedded; check the Capacitor Vite envDir configuration");
}

console.log(`Capacitor bundle verified: web entry and Android launcher resources are present.`);