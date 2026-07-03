# 原專案 1:1 轉換盤點

更新日期：2026-07-03

## 結論

目前 Liquid Glass 新專案已可作為獨立部署的新版查詢體驗，核心查詢、地圖、營運互動、SEO 內容與主要分析工作流已對齊原專案。正式替換前仍需在 Vercel/network-enabled 環境確認第三方服務穩定性，並設定 feedback/audit 寫入端點。

## 已對齊

- 資料來源：內政部實價登錄 XLS，無 mock、fake、sample 成交資料。
- 查詢模式：房地、土地、預售屋、租賃。
- 行政區：沿用原專案縣市與行政區清單。
- 欄位契約：沿用原 `Transaction` 欄位命名與 row mapping。
- 地圖：Leaflet、Nominatim geocoding、圖層切換、成交點選。
- 篩選：關鍵字、交易型態、期間、單價、面積、屋齡，依原專案主要口徑實作。
- 互動：儲存查詢、收藏成交、加入比較、設定面板。
- 搜尋輔助：熱門行政區、最近搜尋、suggestions 皆由官方結果或使用者本機操作推導。
- SEO：內容區、FAQ 與頁腳網站地圖已存在於新專案 DOM。
- 意見回饋與 audit log：已提供 Vercel Function API，未設定 webhook 時回 503，不偽造成功。
- 位置權限：可用瀏覽器 geolocation 判斷最近縣市行政區並切換查詢。
- 分析：清單排序、分頁、預售屋建案彙整、社區趨勢圖已移植為 Liquid Glass 版本。
- 設定：深色模式、字級、主要文案編輯、透明度切換已移植。
- 部署：獨立 Vite React 專案，具 Vercel Function API。
- 手機：壓縮摘要、收合資料指南、結果 sheet 限高，保留地圖可視空間。

## 尚非 1:1

- feedback/audit 需要設定 `FEEDBACK_WEBHOOK_URL` 與 `AUDIT_WEBHOOK_URL` 才會真正寫入外部系統。
- 原站 SEO route/sitemap 產生器尚未完整移到新專案的獨立 sitemap pipeline。
- 原站部分營運型內容頁仍需決定是否全部納入 Liquid Glass 專案，或保留在主站內容系統。

## 後續正式替換條件

- 設定 feedback/audit 寫入端點或確認改用其他正式資料庫。
- 在 Vercel/network-enabled 環境跑官方資料下載、Nominatim、圖磚載入 smoke test。
- 用真實城市/行政區回歸測試房地、土地、預售屋、租賃各至少一組。
- 建立 SEO route 與 sitemap parity test。
