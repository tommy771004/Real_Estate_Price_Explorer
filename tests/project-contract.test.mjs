import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

const read = (path) => readFile(new URL(path, ROOT), "utf8");

test("prototype is independently installable and deployable to Vercel", async () => {
  const [packageSource, vercelSource] = await Promise.all([
    read("package.json"),
    read("vercel.json"),
  ]);

  const packageJson = JSON.parse(packageSource);
  const vercel = JSON.parse(vercelSource);

  assert.equal(packageJson.name, "real-estate-liquid-glass");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.scripts.dev, "vite");
  assert.equal(packageJson.scripts.build, "tsc -b && vite build");
  assert.equal(packageJson.scripts.test, "node --import tsx --test tests/*.test.ts tests/*.test.mjs");
  assert.deepEqual(vercel.rewrites, [{ source: "/(.*)", destination: "/index.html" }]);
});

test("app exposes four asset modes and semantic interactive views", async () => {
  const [app, map, hook] = await Promise.all([
    read("src/App.tsx"),
    read("src/components/MapCanvas.tsx"),
    read("src/hooks/useTransactions.ts"),
  ]);

  for (const label of ["房地", "土地", "預售屋", "租賃"]) {
    assert.match(app, new RegExp(label));
  }

  assert.match(app, /aria-pressed=/);
  assert.match(app, /aria-expanded=/);
  assert.match(app, /MapCanvas/);
  assert.match(app, /ResultWorkspace/);
  assert.match(map, /MapContainer/);
  assert.match(map, /TileLayer/);
  assert.match(hook, /\/api\/proxy-search/);
  assert.doesNotMatch(app, /ASSET_EXPERIENCES/);
});

test("Liquid Glass CSS includes motion and accessibility fallbacks", async () => {
  const css = await read("src/styles.css");

  assert.match(css, /backdrop-filter:\s*blur/);
  assert.match(css, /--radius-panel:\s*24px/);
  assert.match(css, /--spring-smooth:/);
  assert.match(css, /cubic-bezier/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /prefers-reduced-transparency:\s*reduce/);
  assert.match(css, /\.reduce-transparency/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
});

test("serverless API downloads official Ministry of Interior data", async () => {
  const [api, search] = await Promise.all([
    read("api/proxy-search.ts"),
    read("server/search.ts"),
  ]);

  assert.match(api, /searchOfficialTransactions/);
  assert.match(search, /https:\/\/plvr\.land\.moi\.gov\.tw\/Download\?fileName=/);
  assert.match(search, /xlsx\.read/);
  assert.doesNotMatch(search, /mock|fallback data|sample/i);
});
