# SQL 練功房

從零基礎到能在 LeetCode 上刷 SQL 題的本機練習平台。

- **入門課程（38 章）**：依照 [w3schools SQL 教學](https://www.w3schools.com/sql/default.asp) 的順序編排，再加上 LeetCode 必備的子查詢、CTE、視窗函數。每章流程：概念說明 → 可執行範例 → 練習題（提交後才公布解答）。
- **精熟挑戰（30 題）**：完成全部章節後解鎖。電商營收、顧客回購、商品排行、部門績效、留存分析等商業情境，Easy → Medium → Hard，每天推出新題目。提交後由 Claude 解釋錯誤、展示更好的寫法並比較差異。
- **LeetCode 式 Playground**：Monaco 編輯器、執行 / 提交、範例測資 + 隱藏測資、輸出差異比對、提示、提交紀錄。
- **學習紀錄**：日 / 週 / 月範圍，條列式與月曆式瀏覽。
- **複習計畫**：艾賓浩斯遺忘曲線，學完當天為第 1 天，在第 3、7、15、30、60 天提醒複習（可調整）。到期時頁面頂部顯示提醒，並發送瀏覽器通知。

SQL 在瀏覽器內的 **PGlite（真正的 PostgreSQL 16）** 執行，LeetCode 也可選 PostgreSQL 作答。學習紀錄存在瀏覽器的 IndexedDB（設定頁可匯出 / 匯入備份）。

## 啟動

需要 Node.js 18 以上。

```bash
npm install
```

```bash
npm run dev
```

開啟 http://localhost:5173 。

### 啟用 AI 批改（選用）

精熟階段的 AI 批改需要 Anthropic API key。沒有設定時平台仍可完整使用，只是改顯示內建的參考解答與常見錯誤。

1. 複製 `.env.example` 為 `.env`
2. 填入 `ANTHROPIC_API_KEY=...`
3. 重新執行 `npm run dev`

預設模型為 `claude-opus-5-5`（可用 `CLAUDE_MODEL` 改）。每次提交精熟題會呼叫一次 API。

### 啟用帳號同步（選用）

登入後，學習紀錄、提交、複習排程、重點筆記和設定都會同步到 Supabase，換電腦或手機用同一個帳號登入就能看到。不設定也能用，紀錄只存在瀏覽器裡。

1. 到 [supabase.com](https://supabase.com) 建立一個專案（免費方案即可）。
2. 建立資料表：在專案後台左側點 **SQL Editor**，再點 **New query**；把 `supabase/schema.sql` 的內容全部複製貼上，按右下角 **Run**（或 Ctrl+Enter）。看到 `Success. No rows returned` 就完成了，左側 **Table Editor** 會多一張 `user_data` 表。這一步只要做一次。
3. 取得連線資訊：後台 **Project Settings → API**（或首頁的 **Connect**），複製 **Project URL** 和 **anon public** key，填進 `.env`：
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. （建議）**Authentication → Sign In / Providers → Email**，關掉 **Confirm email**，註冊後就能直接登入，不用收驗證信。
5. 重新執行 `npm run dev`，到側欄底部的帳號區註冊、登入。

同步規則：本機變動約 3 秒後上傳；登入或切回分頁時，如果雲端比較新就下載。如果登入時這個瀏覽器裡已經有別人（或訪客時期）的紀錄，會請你選擇要保留哪一份。登出時會清空這個瀏覽器裡的紀錄。

## 測試

```bash
npm test
```

- `tests/content.test.ts`：每一題的標準解都能在範例與隱藏測資上執行並通過自己的判題；每個課程範例都能執行。
- `tests/wrong-answers.test.ts`：常見錯誤（NULL 比較、排序、整數除法、扇出、寫死答案…）會被判為錯誤；替代解法會被判為正確。
- `tests/compare.test.ts`、`tests/schedule.test.ts`：結果比對與複習排程邏輯。

## 專案結構

```
server/index.ts            AI 批改 API（Express + Anthropic SDK）
src/content/               課程章節、精熟題、資料集（新增題目改這裡）
src/db/                    PGlite（Web Worker）與沙盒執行
src/grading/               結果比對、判題、AI 批改請求
src/srs/schedule.ts        艾賓浩斯複習排程
src/store/                 IndexedDB（Dexie）學習紀錄
src/pages/, src/components/
```

### 新增題目

在 `src/content/chapters/*.ts` 或 `src/content/mastery/problems.ts` 加一個物件即可，判題會自動拿標準解（`solution`）的結果比對。修改資料的題目用 `checkQuery` 檢查最終狀態。加完後跑 `npm test` 確認標準解能通過。

## 小技巧

- 編輯器中 `Ctrl+Enter` 執行、`Ctrl+Shift+Enter` 提交。
- 設定頁的「模擬日期」可以把今天往後推，預覽複習提醒（模擬期間的學習紀錄也會記在模擬日期上）。
