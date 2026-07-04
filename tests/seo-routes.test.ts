import assert from "node:assert/strict";
import test from "node:test";

import { SEO_CONTENT_PAGES, getSeoContentPage } from "../src/content/seoPages";
import {
  INDEXABLE_SELECTIONS,
  buildSelectionPath,
  parseSelectionPath,
} from "../src/lib/seoRoutes";
import { buildSitemapRecords, renderSitemapXml } from "../src/lib/seoSitemap";

const SITE_ORIGIN = "https://real-estate-liquid-glass.vercel.app";

test("SEO inventory stays at parity with the original 100 canonical routes", () => {
  const records = buildSitemapRecords(SITE_ORIGIN, "2031-12-24");
  const locations = records.map(({ loc }) => loc);

  assert.equal(INDEXABLE_SELECTIONS.length, 66);
  assert.equal(SEO_CONTENT_PAGES.length, 34);
  assert.equal(records.length, 100);
  assert.equal(new Set(locations).size, records.length);
  assert.equal(locations.filter((url) => url.includes("/prices/")).length, 66);
  assert.ok(locations.every((url) => !new URL(url).pathname.startsWith("/districts/")));
});

test("selection routes round-trip encoded city and transaction names", () => {
  const selection = { cityName: "高雄市", typeName: "預售屋" };
  const path = buildSelectionPath(selection);

  assert.equal(path, "/prices/%E9%AB%98%E9%9B%84%E5%B8%82/%E9%A0%90%E5%94%AE%E5%B1%8B/");
  assert.deepEqual(parseSelectionPath(path), {
    cityName: "高雄市",
    typeName: "預售屋",
    district: "全部",
  });
});

test("operational content and metro district hubs are part of the independent project", () => {
  for (const path of [
    "/about/",
    "/contact/",
    "/privacy/",
    "/methodology/",
    "/buying-guides/taipei/districts/",
    "/renting-guides/tenant-rights/",
  ]) {
    assert.ok(getSeoContentPage(path), `missing ${path}`);
  }
});

test("sitemap XML contains only supported canonical fields", () => {
  const xml = renderSitemapXml(buildSitemapRecords(SITE_ORIGIN, "2031-12-24"));

  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<lastmod>2031-12-24<\/lastmod>/);
  assert.doesNotMatch(xml, /<priority>|<changefreq>/);
  assert.doesNotMatch(xml, /[?&](city|type)=/);
});
