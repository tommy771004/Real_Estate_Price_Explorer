import assert from "node:assert/strict";

import { searchOfficialTransactions } from "../server/search";
import {
  filterTransactionsByAssetMode,
  mapOfficialRows,
  type AssetMode,
} from "../src/data/transactions";

type SmokeResult = {
  check: string;
  records?: number;
  source?: string;
  detail?: string;
};

const results: SmokeResult[] = [];

const verifyOfficialMode = async (
  mode: AssetMode,
  cityCode: string,
  district: string,
  transactionType: "A" | "B" | "C",
  transactionName: "買賣" | "預售屋" | "租賃",
) => {
  const response = await searchOfficialTransactions({ cityCode, district, transactionType });
  const mapped = mapOfficialRows(response.data, transactionName);
  const records = filterTransactionsByAssetMode(mapped, mode);
  assert.ok(records.length > 0, `${mode}: ${district} 沒有取得可驗證的官方資料`);
  assert.ok(records.every((record) => record.district === district));
  results.push({ check: mode, records: records.length, source: response.source });
};

await verifyOfficialMode("building", "H", "中壢區", "A", "買賣");
await verifyOfficialMode("land", "H", "中壢區", "A", "買賣");
await verifyOfficialMode("presale", "H", "中壢區", "B", "預售屋");
await verifyOfficialMode("rental", "A", "大安區", "C", "租賃");

const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");
geocodeUrl.search = new URLSearchParams({
  format: "jsonv2",
  q: "台灣 台北市 信義區",
  limit: "1",
}).toString();
const geocodeResponse = await fetch(geocodeUrl, {
  headers: {
    "Accept-Language": "zh-TW",
    "User-Agent": "real-estate-liquid-glass-network-smoke/1.0",
  },
  signal: AbortSignal.timeout(20_000),
});
assert.equal(geocodeResponse.ok, true, `Nominatim HTTP ${geocodeResponse.status}`);
const geocode = await geocodeResponse.json() as Array<{ lat?: string; lon?: string }>;
assert.ok(geocode[0]?.lat && geocode[0]?.lon, "Nominatim 沒有回傳座標");
results.push({ check: "nominatim", detail: `${geocode[0].lat},${geocode[0].lon}` });

const tileResponse = await fetch("https://a.tile.openstreetmap.org/12/3431/1754.png", {
  headers: { "User-Agent": "real-estate-liquid-glass-network-smoke/1.0" },
  signal: AbortSignal.timeout(20_000),
});
assert.equal(tileResponse.ok, true, `OSM tile HTTP ${tileResponse.status}`);
assert.match(tileResponse.headers.get("content-type") ?? "", /^image\//);
assert.ok((await tileResponse.arrayBuffer()).byteLength > 0, "OSM tile 回傳空內容");
results.push({ check: "tile.openstreetmap.org", detail: "image response ok" });

console.log(JSON.stringify({ success: true, results }, null, 2));
