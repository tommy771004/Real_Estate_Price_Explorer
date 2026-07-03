# Real Estate Liquid Glass Prototype Design

Date: 2026-07-03

## Goal

Create a standalone React web prototype for Taiwan real-estate transaction exploration. It visually interprets iOS 26 Liquid Glass while remaining deployable to Vercel and completely isolated from the existing website.

## Product Scope

The first screen is the usable product, not a landing page. Four asset types are equal first-level modes:

- House and building transactions
- Land transactions
- Presale transactions
- Rentals

The prototype includes location selection, asset-specific summaries, a map-first result workspace, list/trend/compare views, an explanatory insight panel, responsive mobile navigation, and a compact filter workflow. All transaction rows come from the Ministry of Interior open-data download service; no sample transaction dataset is bundled.

## Visual Direction

Use balanced Liquid Glass:

- Glass is reserved for floating navigation, mode selectors, filters, sheets, and interactive controls.
- Maps and transaction content remain visually borderless and use spacing, typography, and placement for hierarchy.
- Primary radii are 16, 24, 30, and capsule.
- Palette: ink `#17312a`, mist `#f2f7f4`, coral `#ef6c52`, water `#81bdc8`, moss `#3e7662`, sun `#f2bd59`.
- Typography uses the system stack with `Noto Sans TC` fallback.

## Responsive Behavior

Desktop uses a full map canvas with floating navigation, filter panel, summary strip, insight panel, and result sheet.

Mobile is re-composed:

- Four asset modes remain visible.
- Filters collapse to location, asset-specific category, and period.
- The map fills the viewport.
- Results live in a bottom sheet.
- A bottom dock exposes map, list, trends, and compare.
- Detailed explanatory content opens as a separate sheet rather than compressed text.

## Motion

Motion should feel responsive rather than decorative:

- 180 ms for button, hover, focus, and tab feedback.
- 280-420 ms spring-like transitions for sheets, filter expansion, and view changes.
- Selected asset and view controls glide between states.
- Glass surfaces subtly compress on pointer/touch activation.
- No perpetual floating decoration.
- `prefers-reduced-motion` disables movement and keeps short opacity changes.

## Accessibility And Fallbacks

- All controls have visible labels and keyboard focus.
- Glass is never required to understand content.
- `prefers-reduced-transparency` and a `.reduce-transparency` class replace blur with opaque surfaces.
- Text contrast remains readable over the map.
- Stable heights prevent layout shifts.
- Empty/error states preserve the active filter and provide recovery actions.

## Project Boundary

All implementation lives under `prototypes/real-estate-liquid-glass/`.

The prototype owns its package manifest, source, tests, Vite configuration, and Vercel configuration. It does not import from or modify the existing root `src/`, routing, CSS, package manifest, or deployment configuration.

It copies the existing app's public data contract into the standalone project: the same city and transaction codes, official XLS row mapping, property-type filtering, Nominatim address geocoding, and Leaflet/OpenStreetMap map behavior.

## Acceptance Criteria

- Standalone install, test, typecheck, and build commands pass from the prototype directory.
- Vercel serves the Vite SPA and rewrites deep routes to `index.html`.
- Four asset modes update visible labels, metrics, filters, and official transaction records.
- Map, list, trend, and compare views are interactive.
- Desktop and 390 px mobile layouts have no clipping or incoherent overlap.
- Motion is visible in normal mode and suppressed under reduced-motion.
- Transparency fallback remains legible without backdrop blur.
