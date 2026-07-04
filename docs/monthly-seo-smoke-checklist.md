# 每月 SEO 與資料 Smoke Checklist

建議每月執行一次，正式部署後再以 Vercel 網址重跑 HTTP 檢查。

## 本機與建置

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] 確認 `dist/sitemap.xml` 有 100 個 canonical URL，其中 66 個為 `/prices/`。
- [ ] 抽查買賣、預售屋、租賃 route 的 title、canonical、H1 與 JSON-LD。
- [ ] 抽查 `/about/`、`/contact/` 與六都行政區索引頁可直接載入。

## 真實外部服務

- [ ] `npm run smoke:network`
- [ ] 房地、土地、預售屋、租賃各至少一組真實縣市／行政區資料非空。
- [ ] Nominatim 回傳可解析座標。
- [ ] OpenStreetMap 圖磚回傳 `image/*` 且內容非空。

## Vercel 部署

- [ ] 已設定 `VITE_SITE_URL` 為正式 canonical origin。
- [ ] 已設定與原站相同的 `DATABASE_URL`，feedback/audit 不得使用模擬成功。
- [ ] `/sitemap.xml` 與 `/robots.txt` 回傳 200 且 Content-Type 正確。
- [ ] 抽查一個 `/prices/` route 與一個營運內容頁回傳 200，不被 SPA rewrite 改成錯誤 canonical。
- [ ] 送出一筆標記為 smoke 的 feedback 後，於資料庫確認寫入並刪除該測試列。

## Search Console

- [ ] sitemap 讀取成功，discovered URL 接近 100。
- [ ] Indexed URL 與 intended URL 差異沒有異常放大。
- [ ] 抽查 canonical 選擇與提交網址一致。
- [ ] 行政區查詢深層 route 未通過內容品質閘門前，不加入 sitemap。
