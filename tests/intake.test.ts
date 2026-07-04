import assert from "node:assert/strict";
import test from "node:test";

import {
  buildIntakeWrite,
  persistIntake,
  validateAuditPayload,
  validateFeedbackPayload,
} from "../server/intake";

test("feedback payload preserves the original database location columns", () => {
  const result = validateFeedbackPayload({
    category: "資料問題",
    content: "地址顯示有誤",
    contact: "reader@example.com",
    location: {
      latitude: 25.033,
      longitude: 121.5654,
      county: "臺北市",
      district: "信義區",
      method: "gps",
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.data, {
    category: "資料問題",
    content: "地址顯示有誤",
    contact: "reader@example.com",
    latitude: 25.033,
    longitude: 121.5654,
    county: "臺北市",
    district: "信義區",
    location_method: "gps",
  });
});

test("intake writes target the original feedbacks and audit_logs tables", () => {
  const feedback = buildIntakeWrite("feedback", {
    category: "功能建議",
    content: "增加匯出",
    contact: null,
    latitude: null,
    longitude: null,
    county: null,
    district: null,
    location_method: "unknown",
  });
  const audit = buildIntakeWrite("audit", {
    action_type: "search",
    details: "臺北市信義區",
    latitude: null,
    longitude: null,
    county: "臺北市",
    district: "信義區",
    location_method: "manual",
  });

  assert.match(feedback.sql, /INSERT INTO feedbacks/);
  assert.match(audit.sql, /INSERT INTO audit_logs/);
  assert.equal(feedback.params.length, 8);
  assert.equal(audit.params.length, 7);
});

test("database persistence returns the real inserted id and never simulates success", async () => {
  const validated = validateAuditPayload({ action_type: "search", details: "土地" });
  assert.equal(validated.ok, true);
  if (!validated.ok) return;

  const result = await persistIntake("audit", validated.data, async () => ({
    rows: [{ id: 42 }],
  }));

  assert.deepEqual(result, { success: true, status: 200, data: { id: 42 } });
});
