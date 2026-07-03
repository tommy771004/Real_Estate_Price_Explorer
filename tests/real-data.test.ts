import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_FILTERS,
  applyClientFilters,
  buildSearchPayload,
  filterTransactionsByAssetMode,
  mapOfficialRows,
  summarizeTransactions,
} from "../src/data/transactions";

const buildingRow = [
  "中壢區",
  "房地(土地+建物)",
  "青埔路一段1號",
  "120",
  "都市：其他",
  "",
  "",
  "1150401",
  "土地1建物1",
  "八層",
  "十五層",
  "住宅大樓",
  "住家用",
  "鋼筋混凝土造",
  "1050101",
  "100",
  "3",
  "2",
  "2",
  "有",
  "有",
  "18000000",
  "180000",
  "坡道平面",
  "20",
  "2000000",
  "",
  "real-building-id",
];

const landRow = [
  "中壢區",
  "土地",
  "青埔段100地號",
  "210",
  "都市：住宅區",
  "",
  "",
  "1150301",
  "土地1",
  "",
  "",
  "其他",
  "",
  "",
  "",
  "210",
  "0",
  "0",
  "0",
  "無",
  "無",
  "36000000",
  "171429",
  "",
  "0",
  "0",
  "",
  "real-land-id",
];

test("official rows map to the same transaction field contract as the main app", () => {
  const records = mapOfficialRows([buildingRow, landRow], "買賣");

  assert.equal(records.length, 2);
  assert.equal(records[0].id, "real-building-id");
  assert.equal(records[0].address, "青埔路一段1號");
  assert.equal(records[0].totalPrice, "18000000");
  assert.equal(records[1].transactionType, "土地");
  assert.equal(records[1].zoning, "都市：住宅區");
  assert.equal(records[1].lat, undefined);
  assert.equal(records[1].lng, undefined);
});

test("building and land modes filter the official buy-sale dataset without fake records", () => {
  const records = mapOfficialRows([buildingRow, landRow], "買賣");

  assert.deepEqual(
    filterTransactionsByAssetMode(records, "building").map(({ id }) => id),
    ["real-building-id"],
  );
  assert.deepEqual(
    filterTransactionsByAssetMode(records, "land").map(({ id }) => id),
    ["real-land-id"],
  );
});

test("search payload uses the main app transaction codes", () => {
  assert.equal(buildSearchPayload("臺北市", "中山區", "building").transactionType, "A");
  assert.equal(buildSearchPayload("臺北市", "中山區", "land").transactionType, "A");
  assert.equal(buildSearchPayload("臺北市", "中山區", "presale").transactionType, "B");
  assert.equal(buildSearchPayload("臺北市", "中山區", "rental").transactionType, "C");
});

test("summaries are derived from fetched records", () => {
  const summary = summarizeTransactions(mapOfficialRows([buildingRow], "買賣"), "building");

  assert.equal(summary.count, 1);
  assert.equal(summary.metrics[0].value, "59.5 萬");
  assert.equal(summary.metrics[1].value, "1,800 萬");
});

test("client filters preserve the original app keyword price area age and period behavior", () => {
  const newerBuildingRow = [...buildingRow];
  newerBuildingRow[2] = "青埔路二段2號";
  newerBuildingRow[7] = "1150601";
  newerBuildingRow[14] = "1100101";
  newerBuildingRow[15] = "80";
  newerBuildingRow[21] = "24000000";
  newerBuildingRow[22] = "300000";
  newerBuildingRow[27] = "newer-building-id";

  const records = mapOfficialRows([buildingRow, newerBuildingRow, landRow], "買賣");
  const filtered = applyClientFilters(records, "building", {
    ...DEFAULT_FILTERS,
    keyword: "青埔路二段",
    propertyTypes: ["房地"],
    period: { startY: "115", startM: "1", endY: "115", endM: "12" },
    unitPrice: { min: "80", max: "120", unit: "1" },
    area: { min: "20", max: "30", unit: "2" },
    age: { min: "0", max: "10" },
  });

  assert.deepEqual(filtered.map(({ id }) => id), ["newer-building-id"]);
});

test("search payload forwards original app advanced query fields to the official API", () => {
  const payload = buildSearchPayload("臺北市", "中山區", "building", {
    ...DEFAULT_FILTERS,
    keyword: "南京東路",
    propertyTypes: ["房地", "建物"],
    period: { startY: "113", startM: "3", endY: "115", endM: "6" },
    unitPrice: { min: "60", max: "100", unit: "1" },
    area: { min: "20", max: "40", unit: "2" },
    age: { min: "5", max: "20" },
  });

  assert.equal(payload.keyword, "南京東路");
  assert.deepEqual(payload.propertyTypes, ["房地", "建物"]);
  assert.deepEqual(payload.period, { startY: "113", startM: "3", endY: "115", endM: "6" });
  assert.deepEqual(payload.unitPrice, { min: "60", max: "100", unit: "1" });
  assert.deepEqual(payload.area, { min: "20", max: "40", unit: "2" });
  assert.deepEqual(payload.age, { min: "5", max: "20" });
});
