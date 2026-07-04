import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDistrictMapCoordinates,
  cleanTransactionAddress,
  isPlausibleCoordinateForCity,
  matchTaiwanLocation,
} from "../src/lib/mapLocation";

test("transaction address ranges are normalized without inventing a different road", () => {
  assert.equal(cleanTransactionAddress("忠孝東路四段100～120號"), "忠孝東路四段100號");
  assert.equal(cleanTransactionAddress("民生路10-12號"), "民生路10號");
});

test("geocoding accepts Taiwan coordinates near the selected city and rejects remote matches", () => {
  assert.equal(isPlausibleCoordinateForCity(25.033, 121.5654, "臺北市"), true);
  assert.equal(isPlausibleCoordinateForCity(22.6273, 120.3014, "臺北市"), false);
  assert.equal(isPlausibleCoordinateForCity(40.7128, -74.006, "臺北市"), false);
});

test("district map coordinates never manufacture radial fallback points", () => {
  const coordinates = buildDistrictMapCoordinates(
    [
      { name: "已知區", lat: 25.01, lng: 121.51 },
      { name: "成交區" },
      { name: "無資料區" },
    ],
    [
      { district: "已知區", lat: 24.9, lng: 121.4 },
      { district: "成交區", lat: 22.61, lng: 120.29 },
      { district: "成交區", lat: 22.63, lng: 120.31 },
    ],
  );

  assert.deepEqual(coordinates["已知區"], { lat: 25.01, lng: 121.51, source: "district" });
  assert.deepEqual(coordinates["成交區"], { lat: 22.62, lng: 120.3, source: "records" });
  assert.equal(coordinates["無資料區"], undefined);
});

test("reverse-geocoding address fields map 台灣 names to the project city and district inventory", () => {
  const match = matchTaiwanLocation({
    state: "台北市",
    city_district: "信義區",
  });

  assert.deepEqual(match, { county: "臺北市", district: "信義區" });
});
