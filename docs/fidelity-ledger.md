# Fidelity Ledger

Date: 2026-07-03

Accepted concept:

`D:/Project/github/-TWReal_Estate_Price_Explorer_google/.superpowers/brainstorm/product-design-20260703/content/design-system-06.html`

Implementation:

`D:/Project/github/-TWReal_Estate_Price_Explorer_google/prototypes/real-estate-liquid-glass/`

## Comparison

| Check | Concept evidence | Render evidence | Result |
| --- | --- | --- | --- |
| Palette | Ink, mist, coral, water, moss, and sun tokens | Desktop/mobile screenshots use the same ink, mist, coral, water, and moss hierarchy | Matched |
| Glass placement | Glass only on controls, docks, sheets, and filters | Navigation, asset dock, filters, layer control, insight, result sheet, and mobile dock use grouped glass surfaces | Matched |
| Radius family | 16, 24, 30, and capsule | Fields, panels, sheets, tabs, and icon buttons use the approved radius family | Matched |
| Desktop composition | Full map canvas with floating panels | 1440×900 render preserves floating navigation, filters, summary, map, insight, and result sheet | Matched |
| Mobile composition | Four modes visible, full map, bottom sheet and bottom dock | 390×844 render has no overflow and keeps the four asset modes, summary, insight, result sheet, and dock visible | Matched |
| Motion | Fast press feedback and spring-like panel motion | CSS uses 180 ms control feedback and spring cubic-bezier timing for panels, pins, sheets, bars, and state transitions | Matched |
| Accessibility | Reduced motion and reduced transparency fallbacks | Both media queries and a runtime transparency toggle are present | Matched |
| Data integrity | Concept used illustrative values | Implementation uses only Ministry of Interior rows and derived metrics; no transaction fallback data exists | Intentional requirement-driven change |

## QA Evidence

- Screenshot method: local headless Chromium via the repository's installed Puppeteer runtime.
- Desktop viewport: 1440×900.
- Mobile viewport: 390×844.
- Mobile dimensions: `scrollWidth === innerWidth === 390`, `scrollHeight === innerHeight === 844`.
- Interaction checks: asset mode changed to 房地, result view changed to 列表, transparency fallback toggled, and mobile filter opened.
- Browser page errors: none.
- Above-the-fold copy: approved product/mode/view labels preserved; illustrative counts replaced with loading, empty, error, or official derived values.

## External Verification Gap

The local sandbox blocked outbound Ministry of Interior, OpenStreetMap, and Nominatim requests. The UI correctly displayed an official-data error and did not substitute fake data. Live official rows and map tiles require verification in Vercel or a local environment with outbound network access.

