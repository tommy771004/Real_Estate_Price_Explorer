# Real Estate Liquid Glass

An independent React/Vite prototype for browsing Taiwan building, land, presale, and rental transaction examples with an iOS-inspired Liquid Glass interface.

## Local development

```bash
npm install
npm run dev
```

The default local URL is `http://localhost:4174`.

## Verification

```bash
npm test
npm run typecheck
npm run build
```

## Vercel

Import this folder as the Vercel project root:

```text
prototypes/real-estate-liquid-glass
```

The included `vercel.json` builds the Vite app and rewrites SPA routes to `index.html`.

## Isolation

This prototype does not import or modify the existing application under the repository root. It has its own dependencies, source, tests, output directory, and Vercel configuration.
