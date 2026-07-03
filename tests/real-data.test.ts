import assert from "node:assert/strict";
import test from "node:test";

import {
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

