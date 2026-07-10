# AGENTS.md

Compact guidance for OpenCode sessions working in this repo.

## Verification commands

```bash
npm test                 # node:test tsx runner; .ts + .mjs
npm run typecheck        # tsc -b --pretty false (use this, not tsc directly)
npm run build            # tsc -b && vite build → dist/
npm run dev              # vite dev server, host 0.0.0.0 port 3000
```

Run a single test file (the `npm test` glob can't be narrowed):

```bash
node --import tsx --test tests/real-data.test.ts
```

Always verify in this order: **typecheck → test → build**. They catch different things (`typecheck` is faster; `build` surfaces rollup resolve issues the other two miss).

## Critical repo facts

- **package name is `real-estate-liquid-glass`**, not the repo folder name. `tests/project-contract.test.mjs` asserts this — do not rename it.
- **No mock/sample/fallback transaction data is allowed.** `tests/project-contract.test.mjs` asserts `server/search.ts` does not match `/mock|fallback data|sample/i`. The app intentionally ships with zero bundled records.
- Results come **live from 内政部** `https://plvr.land.moi.gov.tw/Download?fileName={city}_lvr_land_{A|B|C}.xls`, parsed via xlsx, first 2 rows skipped. See `server/search.ts`.
- Run `npm run build` after reasonable changes — recent web work failed at build due to a missing transitive dep (`react-is` for recharts). Typecheck + test will not catch this.

## Architecture

- `src/App.tsx` is the single entry point and stateful orchestrator (~880 lines). It owns search/favorites/compare/settings/feedback/location state, persisted via `localStorage` keys prefixed `explorer_lg_*` and `real_estate_loc_cache_v2` (geocoding cache in `useGeocoding`).
- Four asset modes (`building`, `land`, `presale`, `rental`) map to transaction codes A/A/B/C and `ASSET_DEFINITIONS` accents. Definitions are hardcoded in `App.tsx` separately from `src/data/transactions.ts`'s `ASSET_DEFINITIONS` — keep them aligned if changing labels.
- Pricing math is specific: `unitPrice` is per **㎡**, displayed per **坪** via `× 3.30578`. Filter conversion in `applyClientFilters` mirrors this. Don't refactor the constants blindly.
- `api/proxy-search.ts`, `api/audit-log.ts`, `api/feedback.ts` are Vercel serverless handlers. In dev, `vite.config.ts` wires the same paths via `officialDataDevApi()` middleware — **both code paths must stay in sync** when changing request/response shapes.
- `server/intake.ts` writes to `feedbacks` and `audit_logs` Postgres tables (Neon). Without `DATABASE_URL`, it returns 503 (graceful), not crash. Tests inject a fake executor.
- Capacitor 6 wraps the same React app for iOS (`ios/`) and Android (`android/`). API base URL is configurable via `src/lib/apiBase.ts` (`VITE_APP_API_BASE_URL` env or in-app Settings). Local dev uses relative `/api/*`. Native uses an absolute URL.
- All three fetch sites (`/api/proxy-search`, `/api/audit-log`, `/api/feedback`) must go through `buildApiUrl()` so native builds hit the configured backend.

## Test quirks

- `tests/*.test.mjs` and `tests/*.test.ts` are both run by the `npm test` glob — keep file extensions consistent when adding tests.
- `tests/project-contract.test.mjs` does **source-text pattern matching** on `src/App.tsx`, components, and CSS to enforcing UI/feature parity from the original prototype. Changes that remove matching tokens (e.g. `feedback-panel`, `recentSearches`, `aria-pressed=`) will break it. Update the contract patterns intentionally when refactoring.
- `scripts/network-smoke.ts` hits live 内政部 + Nominatim + OSM tile endpoints; not part of `npm test`. Run manually when touching search/geocoding/tile code.
- `tests/real-data.test.ts` contains hardcoded official xlsx row fixtures (building/land/presale/rental) — they document the column-index contract in `mapOfficialRows`. Rental rows have an extra column offset (`isRent ? 22 : 21`) that the tests pin.

## Gotchas

- `tsconfig.json` has no separate `node` config; `vite.config.ts` is included in `include`. Server code importing Node builtins (`xlsx`, `ws`, `@neondatabase/serverless`) is fine only because tests import it directly under tsx, not via tsc emit (tsconfig is `noEmit`).
- `src/data/locations.ts` `CITY_DISTRICTS` keys use **臺** (traditional form) for 5 cities; test your filter paths against `臺北市` not `台北市`.
- Capacitor `npx cap sync` regenerates `ios/App/App/public/` and `android/app/src/main/assets/public/` from `dist/` — never edit those copied web assets; change `src/` and re-sync.
- iOS/Android version is pinned to `0.1.0` in `ios/App/App.xcodeproj/project.pbxproj` (`MARKETING_VERSION`) and `android/app/build.gradle` (`versionName`). Bump together.
