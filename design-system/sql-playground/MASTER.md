# SQL 練功房 — Design System (MASTER)

> 依 ui-ux-pro-max 資料庫（v2.15.0）整理。本機沒有 Python，無法執行 `search.py`，以下由直接讀取其 CSV 資料表取得。
> 實作位置：`src/styles.css`（CSS 變數）、`src/components/SqlEditor.tsx`（Monaco 主題）。

## 來源

| 項目 | 資料表 / 列 | 採用內容 |
|---|---|---|
| 產品類型 | products #79 Coding Bootcamp | Dark Mode (OLED) + Minimalism & Swiss；反模式：只有淺色模式 |
| 配色 | colors #151 Coding Challenge & Practice | 深石板底 `#0F172A`、程式綠 `#22C55E`、難度琥珀 `#D97706` |
| 字型 | typography #9 Developer Mono | JetBrains Mono（程式碼）+ IBM Plex Sans（介面）；中文補 Noto Sans TC |
| 檢查清單 | references/pro-rules.md | SVG 圖示（不用 emoji）、文字對比 ≥ 4.5:1、可見 focus、reduced-motion |

## Token

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F8FAFC` | `#0B1120` |
| `--surface` | `#FFFFFF` | `#131C2E` |
| `--text` | `#0F172A` | `#F8FAFC` |
| `--muted` | `#475569` | `#94A3B8` |
| `--primary` | `#15803D`（白字 5:1） | `#22C55E`（深字） |
| `--easy / --medium / --hard` | `#15803D / #B45309 / #DC2626` | `#4ADE80 / #FBBF24 / #F87171` |

- 側欄固定使用深色（兩種主題皆同），強化「程式工具」識別。
- 間距：4 / 8 / 12 / 16 / 24 / 32；圓角：6 / 10 / 14。
- 動效：150ms `cubic-bezier(.2,.8,.2,1)`；`prefers-reduced-motion` 時關閉。

## 規則

- 圖示一律使用 `lucide-react`，裝飾性圖示加 `aria-hidden`，純圖示按鈕要有 `aria-label`。
- 程式字型**關閉連字**：教學中 `<>`、`>=` 必須照實顯示，不能變成 `≠`、`≥`。
- 數字（統計、日期、列號）使用 mono + tabular-nums。
- 難度只用外框色標籤（Easy/Medium/Hard），不靠顏色單獨傳達資訊（同時有文字）。
- 按鈕高度 38px（小按鈕 32px），導覽列項目 40px。
