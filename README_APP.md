# 實價登錄查詢 — 行動 App (iOS / Android)

這份資料夾利用 [Capacitor 6](https://capacitorjs.com/) 直接包覆根目錄的 React/Vite Web App，產出可在 App Store / Google Play 上架的原生安裝檔。Web 與 App **共用同一份 React 程式碼**，因此 1:1 對齊所有功能與 UI/UX。

## 目錄結構

```
Real_Estate_Price_Explorer/
├─ src/                  # 共用 React app (web + native)
├─ api/                  # Vercel serverless 後端
├─ capacitor.config.ts   # Capacitor 設定
├─ ios/                  # 由 `npx cap add ios` 產生的 Xcode 專案
└─ android/              # 由 `npx cap add android` 產生的 Gradle 專案
```

> `ios/` 與 `android/` 資料夾為 Capacitor CLI 生成，建議 commit 進版控，方便調整原生權限、splash、icon。`Pods/`、`build/` 等 build artifact 已在 `.gitignore` 排除。

## 一次環境需求

- Node 20+/22+（已用 v25 驗證）
- iOS：macOS + Xcode 15+（已用 Xcode 26.2 驗證）+ CocoaPods
- Android：Android Studio (Ladybug+) + JDK 17 + Android SDK 34+

## Web 端改動（共用）

- `src/lib/apiBase.ts` — 提供可設定的 API base URL。原生 App 可在「設定 → 後端資料 API URL」指定遠端 Vercel 部署；web 預設走相對路徑。
- `src/lib/nativeGeo.ts` — 在原生裝置自動改用 `@capacitor/geolocation`，並保留 IP fallback。
- `src/App.tsx` 的 fetch 端點（`/api/proxy-search`、`/api/audit-log`、`/api/feedback`）改透過 `buildApiUrl()`。

## Build & Run

### iOS

```bash
npm install
npm run cap:ios    # build web + cap sync ios + open Xcode
```

Xcode 開啟後，選擇 signing team，按 ▶️ Run 到模擬器或實機。也可直接：

```bash
npm run cap:run:ios
```

### Android

```bash
npm install
npm run cap:android    # build web + cap sync android + open Android Studio
```

Android Studio 開啟後，等 Gradle sync 完成（首次需要從 SDK Manager 安裝 SDK 34），按 ▶️ Run。

> 在本機測 GitHub Actions 建構時，請執行 `npm run cap:sync` 確認 web 與 plugin 同步成功。

## 後端設定（重要）

原生 App 無法呼叫 `/api/...` 相對路徑（因為 file:// 沒有 origin），務必在 App 內「設定 → 後端資料 API URL」填入你部署到 Vercel 的網址，例如：

```
https://your-real-estate-app.vercel.app
```

填入後會寫入 `localStorage` 的 `app:apiBaseUrl`，所有 `fetch` 都會改打到該網域的 `/api/proxy-search`、`/api/audit-log`、`/api/feedback`。

懶得每次手填也可以在 build 時用 Vite env 預設：

```bash
VITE_APP_API_BASE_URL=https://your-vercel-app.vercel.app npm run build
```

## 已套用的原生權限

- iOS（`ios/App/App/Info.plist`）
  - `NSLocationWhenInUseUsageDescription`：定位切換行政區說明
  - ATS 限制 https（OpenStreetMap / 內政部 / geojs 都已是 https）
- Android（`android/app/src/main/AndroidManifest.xml`）
  - `INTERNET`
  - `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION`

## 更新原生專案

當你新增/移除 Capacitor plugin 或改 `capacitor.config.ts`：

```bash
npm run cap:sync      # build web + copy + sync plugins
```

如果要重新生成原生專案（會清除既有原生改動）：

```bash
npx cap rm ios && npx cap add ios
npx cap rm android && npx cap add android
```

## 版本

- App version: 0.1.0（iOS `MARKETING_VERSION` / Android `versionName` 同步）
- appId: `tw.realestate.explorer`
