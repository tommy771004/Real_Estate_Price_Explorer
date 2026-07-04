import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

test("location permission is requested only after an explicit user action", () => {
  assert.match(app, /onClick=\{requestUserLocation\}/);
  assert.doesNotMatch(
    app,
    /locationRequested[\s\S]{0,400}requestUserLocation\(\)/,
    "app mount must not trigger the browser location permission prompt",
  );
});
