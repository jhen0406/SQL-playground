# CLAUDE.md

給在這個專案工作的 Claude 看的背景說明。功能介紹與啟動方式見 `README.md`；這份只記非顯而易見的決定與注意事項。

## 溝通

- 使用者用**繁體中文**溝通；介面文字、註解、commit 訊息也用繁體中文。
- 目標使用者：SQL 零基礎，學完要能直接刷 LeetCode SQL 題。

## 常用指令

```bash
npm run dev        # vite (5173) + API server (8787)，用 concurrently 同時啟動
npm test           # vitest：內容自檢 + 判題 + 排程 + 統計，目前 132 個測試
npm run build      # tsc --noEmit && vite build
```

修改題目或判題邏輯後一定要跑 `npm test`：`tests/content.test.ts` 會用 PGlite 實際執行每一題的標準解，`tests/wrong-answers.test.ts` 確認常見錯誤寫法會被判錯。

## 架構重點

- **SQL 引擎**：PGlite（PostgreSQL 16 wasm），跑在 Web Worker（`src/db/worker.ts`），10 秒逾時會砍掉 worker 重建。每次執行前會重設 `sandbox` schema。日期/時間型別保留為原始字串。
- **判題**（`src/grading/`）：
  - 使用者 SQL 和標準解會分別在「範例資料」與「隱藏測資」（`hiddenExtraSql`）上執行，再比對結果。
  - 預設忽略列順序，用 multiset 比對；`orderMatters` 為真時才要求順序一致。
  - 數值取到小數 4 位再比對。欄位名稱只在 `strictColumns` 時才檢查。
  - 修改資料的題目（DML/DDL）用 `checkQuery` 檢查最後的資料狀態。
- **隱藏測資用來防止寫死答案**：例如 `shop` 資料集的隱藏資料有 UK 顧客 104、空分類 Bakery(7)、分類 8 Frozen 和 9 Pet Food。新增題目時要確認錯誤寫法在隱藏測資上會失敗。
- **儲存**：Dexie（IndexedDB）是主要儲存，元件透過 `src/store/db.ts` 的 `useLive` 讀取。
  - DB 版本 2 新增了 `notes` 表（重點筆記）。
  - 寫入函式集中在 `src/store/progress.ts`。
- **雲端同步**（`src/store/cloud.ts`，選用）：
  - 登入後，把 `exportAll()` 的整份 JSON 當成快照，upsert 到 Supabase 的 `user_data` 表（schema 在 `supabase/schema.sql`，有 RLS）。
  - 用 Dexie hook 偵測本機變動，約 3 秒後上傳。`drafts` 表不觸發同步。
  - 登入時的合併規則寫在 `reconcile()`：本機資料屬於誰記在 localStorage 的 `sqlpg.owner`。
  - 登出會清空本機資料。
  - `VITE_SUPABASE_URL` 只要專案網址；程式會自動去掉 `/rest/v1/`。
- **AI 批改**（`server/index.ts`）：
  - Express 搭配 `@anthropic-ai/sdk`，模型用 `claude-opus-5-5`。
  - 只綁定 `127.0.0.1:${API_PORT}`。不要用 `PORT` 這個環境變數，預覽環境會設 `PORT=5173`，造成衝突。
  - 沒有 API key 時，前端改成顯示內建的標準解。
  - 呼叫 API 要花錢，沒經使用者同意不要實際呼叫。
- **複習排程**（`src/srs/schedule.ts`）：
  - 間隔是 [2, 6, 14, 29, 59] 天，也就是第 3／7／15／30／60 天。
  - 複習時「第一次提交」答錯，會從當天起重新排到第 3 天。
  - 要測試排程時，可以用 localStorage 的 `sqlpg.debugDayOffset` 模擬日期（設定頁的「模擬日期」）。
- **重點筆記**（`src/components/Highlighter.tsx`）：
  - 用 CSS Custom Highlight API 標記文字，不改動 React 管理的 DOM。
  - 位置記成「文字＋第幾次出現」，比對邏輯在 `src/lib/textMatch.ts`。
- **Monaco**：從本機打包載入，不走 CDN。主題 `sqlpg-dark` / `sqlpg-light` 定義在 `src/components/SqlEditor.tsx`。

## 設計規範（詳見 `design-system/sql-playground/MASTER.md`）

- 風格參考 Figma「Multiple Dark Dashboards Inspirations」的第 ④ 個儀表板（ovniscale）：深紫黑底配青綠主色、紫色輔色。
- **預設深色**，保留淺色版，主題邏輯在 `src/lib/theme.ts`。所有顏色都用 `src/styles.css` 開頭的 token，元件裡不要寫死顏色。
- **卡片和導覽列都不加邊框，圓角統一 5px**，按鈕和輸入框也是 5px。只有 chip 和頭像維持圓形。
  - 卡片裡的區塊用 `--surface-2` 底色區分。
  - hover／選中狀態用 `box-shadow: inset 0 0 0 1px`，不用 border。
- 版面：左邊是 92px 寬的窄圖示側欄，加上頂部列；寬度 ≤ 860px 時側欄變成抽屜。
- 字型：Poppins（英數）＋ Noto Sans TC（中文）＋ JetBrains Mono（程式碼）。**程式字型必須關閉連字**，否則 `<>`、`>=` 會顯示成 `≠`、`≥`。
- 圖示只用 `lucide-react`。裝飾性圖示加 `aria-hidden`，純圖示按鈕要有 `aria-label`。
- 圖表：手寫 SVG，系列色用 `--series-1` / `--series-2`（已通過 dataviz 驗證器檢查）。要有圖例、tooltip 和表格檢視。

## 環境注意事項（Windows）

- `python` 只是 Windows Store 的捷徑，並沒有安裝真正的 Python。要寫腳本請用 Node。
- 沒有安裝 `gh` CLI；GitHub repo 是私人的 `jhen0406/SQL-playground`，在 `main` 分支開發。
- `.env` 不進 git，每台電腦要自己建一份，參考 `.env.example`。
- 用內建瀏覽器驗證畫面時，要確認視窗寬度（窄、中、寬三種都看），也要看有沒有出現水平捲軸。測完記得刪掉塞進 IndexedDB 的測試資料。
