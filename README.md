# Real Estate Liquid Glass

An independent React/Vite app for browsing Taiwan building, land, presale, and rental transactions with an iOS-inspired Liquid Glass interface.

Transaction rows are downloaded from the Ministry of Interior open-data service. The app includes no bundled sample, mock, or fallback transaction records.

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

The serverless endpoint is `api/proxy-search.ts`; local Vite development exposes the same endpoint through a development middleware.

## Isolation

This prototype does not import or modify the existing application under the repository root. It has its own dependencies, source, tests, output directory, and Vercel configuration.

## Mobile App (iOS / Android)

Native apps are built by wrapping this same React/Vite app with Capacitor 6. See [README_APP.md](./README_APP.md) for full build/run instructions.

Quick commands:

```bash
npm install
npm run cap:ios        # open Xcode
npm run cap:android   # open Android Studio
```

Native projects live in `ios/` and `android/`. Set the backend URL inside the app (Settings → 後端資料 API URL) or via `VITE_APP_API_BASE_URL` build env.
