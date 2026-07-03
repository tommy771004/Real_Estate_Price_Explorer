# Real Estate Liquid Glass Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an independent React/Vite real-estate explorer with responsive Liquid Glass visuals, iOS-like motion, and standalone Vercel deployment.

**Architecture:** A focused React app composes a Leaflet map, floating control surfaces, and responsive result views. A Vercel serverless function downloads Ministry of Interior XLS files, while pure row-mapping and selection helpers preserve the existing app's data contract. CSS tokens own glass, radius, motion, responsive, and accessibility behavior.

**Tech Stack:** React 19, TypeScript, Vite 6, React Leaflet, XLSX, Lucide React, CSS, Node test runner, Vercel Functions.

---

### Task 1: Standalone Project Contract

**Files:**
- Create: `prototypes/real-estate-liquid-glass/package.json`
- Create: `prototypes/real-estate-liquid-glass/vercel.json`
- Create: `prototypes/real-estate-liquid-glass/tests/project-contract.test.mjs`

- [ ] Write a test that requires independent scripts, a Vercel SPA rewrite, four asset modes, reduced-motion CSS, and reduced-transparency CSS.
- [ ] Run `node --test tests/project-contract.test.mjs` and verify it fails because project files do not exist.
- [ ] Add the minimal package and deployment configuration.
- [ ] Run the test and verify only source-surface assertions remain failing.

### Task 2: Official Data Model And API

**Files:**
- Create: `prototypes/real-estate-liquid-glass/src/data/transactions.ts`
- Create: `prototypes/real-estate-liquid-glass/server/search.ts`
- Create: `prototypes/real-estate-liquid-glass/api/proxy-search.ts`
- Create: `prototypes/real-estate-liquid-glass/tests/real-data.test.ts`

- [ ] Write tests asserting official row mapping, A/B/C transaction codes, building/land filtering, and summaries derived from fetched records.
- [ ] Run `node --import tsx --test tests/real-data.test.ts` and verify the missing module failure.
- [ ] Implement the official XLS downloader, typed mapper, filter functions, and derived summaries.
- [ ] Run the test and verify it passes.

### Task 3: React Workspace

**Files:**
- Create: `prototypes/real-estate-liquid-glass/index.html`
- Create: `prototypes/real-estate-liquid-glass/src/main.tsx`
- Create: `prototypes/real-estate-liquid-glass/src/App.tsx`
- Create: `prototypes/real-estate-liquid-glass/src/components/AssetDock.tsx`
- Create: `prototypes/real-estate-liquid-glass/src/components/FilterPanel.tsx`
- Create: `prototypes/real-estate-liquid-glass/src/components/MapCanvas.tsx`
- Create: `prototypes/real-estate-liquid-glass/src/components/ResultWorkspace.tsx`
- Create: `prototypes/real-estate-liquid-glass/src/components/SiteChrome.tsx`

- [ ] Add source-contract assertions for labels, semantic controls, and component boundaries.
- [ ] Run the contract test and verify those assertions fail.
- [ ] Implement asset switching, official-data filters, view switching, insight toggling, and fetched record selection.
- [ ] Run contract and real-data tests and verify they pass.

### Task 4: Liquid Glass And Motion System

**Files:**
- Create: `prototypes/real-estate-liquid-glass/src/styles.css`

- [ ] Extend the contract test to require glass tokens, spring easing, stable radii, reduced motion, and transparency fallback.
- [ ] Run the contract test and verify CSS assertions fail.
- [ ] Implement responsive desktop/mobile composition and interaction states.
- [ ] Run the contract test and verify it passes.

### Task 5: Toolchain And Deployment Verification

**Files:**
- Create: `prototypes/real-estate-liquid-glass/tsconfig.json`
- Create: `prototypes/real-estate-liquid-glass/vite.config.ts`
- Create: `prototypes/real-estate-liquid-glass/.gitignore`
- Create: `prototypes/real-estate-liquid-glass/README.md`

- [ ] Install the prototype dependencies without modifying the root package manifest.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Start the prototype dev server on an unused port.
- [ ] Verify desktop and 390 px mobile workflows in the browser.
- [ ] Capture screenshots and compare them against the accepted visual companion concept.
