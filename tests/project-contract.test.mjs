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
  const [app, chrome, map, hook] = await Promise.all([
    read("src/App.tsx"),
    read("src/components/SiteChrome.tsx"),
    read("src/components/MapCanvas.tsx"),
    read("src/hooks/useTransactions.ts"),
  ]);

  for (const label of ["房地", "土地", "預售屋", "租賃"]) {
    assert.match(app, new RegExp(label));
  }

  assert.match(chrome, /aria-pressed=/);
  assert.match(app, /aria-expanded=/);
  assert.match(app, /MapCanvas/);
  assert.match(app, /ResultWorkspace/);
  assert.match(map, /MapContainer/);
  assert.match(map, /TileLayer/);
  assert.match(hook, /\/api\/proxy-search/);
  assert.doesNotMatch(app, /ASSET_EXPERIENCES/);
});

test("interactive chrome buttons are wired to real panels and persisted actions", async () => {
  const [app, chrome, workspace, filter] = await Promise.all([
    read("src/App.tsx"),
    read("src/components/SiteChrome.tsx"),
    read("src/components/ResultWorkspace.tsx"),
    read("src/components/FilterPanel.tsx"),
  ]);

  assert.match(chrome, /onSettingsOpen/);
  assert.match(chrome, /onFavoritesOpen/);
  assert.match(app, /explorer_lg_saved_searches/);
  assert.match(app, /explorer_lg_favorites/);
  assert.match(app, /settings-panel/);
  assert.match(app, /saved-panel/);
  assert.match(workspace, /onSaveSearch/);
  assert.match(workspace, /onAddToCompare/);
  assert.match(filter, /keyword/);
  assert.match(filter, /unitPrice/);
  assert.match(filter, /area/);
  assert.match(filter, /age/);
});

test("parity features cover SEO, search intelligence, feedback, location, settings, and table analysis", async () => {
  const [app, workspace, feedbackApi, auditApi, experience] = await Promise.all([
    read("src/App.tsx"),
    read("src/components/ResultWorkspace.tsx"),
    read("api/feedback.ts"),
    read("api/audit-log.ts"),
    read("src/data/experience.ts"),
  ]);

  for (const token of [
    "seo-content-zone",
    "常見問題 FAQ",
    "site-footer-map",
    "recentSearches",
    "popularDistricts",
    "suggestions",
    "feedback-panel",
    "requestUserLocation",
    "darkMode",
    "fontSize",
    "editableCopy",
  ]) {
    assert.match(app, new RegExp(token));
  }

  assert.match(workspace, /sortConfig/);
  assert.match(workspace, /pageSize/);
  assert.match(workspace, /aggregatePresaleProjects/);
  assert.match(workspace, /buildCommunityTrend/);
  assert.match(feedbackApi, /validateFeedbackPayload/);
  assert.match(auditApi, /validateAuditPayload/);
  assert.match(experience, /derivePopularDistricts/);
  assert.match(experience, /sortTransactions/);
  assert.match(experience, /paginateTransactions/);
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
  assert.match(css, /\.map-canvas\s*\{[^}]*z-index:\s*0/s);
  assert.match(css, /\.leaflet-map\s*\{[^}]*z-index:\s*0/s);
  assert.match(css, /max-height:\s*min\(40dvh,\s*240px\)/);
  assert.match(css, /\.insight-panel:not\(\.is-open\)/);
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
