import type { Chapter } from '../types';
import { ex } from './helpers';

/** 依 fooish 教學比對後補上的章節：集合運算、數學函數、SQL Injection、視窗函數進階。 */

const APP_USERS = `CREATE TABLE app_users (user_id INTEGER PRIMARY KEY, username VARCHAR(30) NOT NULL UNIQUE, password VARCHAR(30) NOT NULL, role VARCHAR(10) NOT NULL);
INSERT INTO app_users VALUES (1, 'admin', 'S3cret!', 'admin'), (2, 'grace', 'gr@ce99', 'staff'), (3, 'kevin', 'k3vin', 'staff');`;

export const part5: Chapter[] = [
  // ─────────────────────────── 集合運算 ───────────────────────────
  {
    id: 'c35',
    order: 17,
    part: 'basic',
    title: '集合運算 INTERSECT / EXCEPT',
    w3Topics: 'SQL INTERSECT · EXCEPT · MINUS',
    concept: `
UNION 是「合併」，另外兩個集合運算是「交集」和「差集」。規則和 UNION 一樣：**欄位數量、型別要對得上**，結果預設**去除重複**。

| 運算 | 意思 | 範例 |
|---|---|---|
| \`A UNION B\` | 在 A **或** B | 顧客或供應商所在的國家 |
| \`A INTERSECT B\` | 同時在 A **和** B | 同時有顧客和供應商的國家 |
| \`A EXCEPT B\` | 在 A 但**不在** B | 有顧客、但沒有供應商的國家 |

~~~sql
SELECT country FROM customers
INTERSECT
SELECT country FROM suppliers;
~~~

### EXCEPT 的別名
- Oracle 叫 \`MINUS\`，意思相同。
- MySQL 8.0.31 以後才支援 INTERSECT / EXCEPT；舊版要改用 JOIN 或 NOT EXISTS。

### 加上 ALL：保留重複
\`UNION ALL\`、\`INTERSECT ALL\`、\`EXCEPT ALL\` 會依出現次數計算。例如 A 有 3 個 1、B 有 1 個 1，\`A EXCEPT ALL B\` 會剩 2 個 1。

### 和 NOT EXISTS 的比較
「有顧客但沒下過訂單」可以寫成：
~~~sql
SELECT customer_id FROM customers
EXCEPT
SELECT customer_id FROM orders;
~~~
- EXCEPT 把 NULL 當成相同的值比較，**不會有 NOT IN 遇到 NULL 的陷阱**。
- 缺點：只能輸出兩邊共有的欄位。想同時輸出 customer_name，要再 JOIN 回去，或改用 NOT EXISTS。
`,
    examples: [
      { title: 'INTERSECT', sql: 'SELECT country FROM customers\nINTERSECT\nSELECT country FROM suppliers;', explain: '同時有顧客和供應商的國家。' },
      { title: 'EXCEPT', sql: 'SELECT country FROM customers\nEXCEPT\nSELECT country FROM suppliers\nORDER BY country;', explain: '有顧客、但沒有供應商的國家。' },
      { title: 'EXCEPT ALL', sql: "SELECT country FROM customers\nEXCEPT ALL\nSELECT country FROM suppliers\nORDER BY country;", explain: '保留重複：Germany 有兩位顧客，扣掉 0 個供應商後還是兩列。' },
    ],
    practice: ex({
      id: 'c35-p',
      title: '顧客和供應商都在的城市',
      prompt: '請用 **INTERSECT** 找出**同時有顧客和供應商**的城市，輸出 **city**。',
      expectedColumns: 'city',
      solution: 'SELECT city FROM customers INTERSECT SELECT city FROM suppliers;',
      hints: ['兩個 SELECT 中間放 INTERSECT', '兩邊都只選 city 一欄'],
    }),
    morePractice: [
      ex({
        id: 'c35-p2',
        title: '從沒下過訂單的顧客編號',
        prompt: '請用 **EXCEPT** 找出**從沒下過訂單**的顧客，輸出 **customer_id**。',
        expectedColumns: 'customer_id',
        solution: 'SELECT customer_id FROM customers EXCEPT SELECT customer_id FROM orders;',
        hints: ['全部顧客 EXCEPT 有下單的顧客'],
        commonMistakes: ['順序寫反：orders EXCEPT customers 會得到空結果。'],
      }),
      ex({
        id: 'c35-p3',
        title: '兩段期間都有下單的顧客',
        prompt: '請找出**在 2024 年 1–3 月下過單、而且在 4–5 月也下過單**的顧客，輸出 **customer_id**。',
        expectedColumns: 'customer_id',
        solution: "SELECT customer_id FROM orders WHERE order_date BETWEEN '2024-01-01' AND '2024-03-31'\nINTERSECT\nSELECT customer_id FROM orders WHERE order_date BETWEEN '2024-04-01' AND '2024-05-31';",
        hints: ['兩段期間各寫一個 SELECT，再取交集', '每個 SELECT 可以有自己的 WHERE'],
        commonMistakes: ["一個 WHERE 寫 order_date <= '2024-03-31' AND order_date >= '2024-04-01'：同一筆訂單不可能同時符合。"],
      }),
    ],
    review: ex({
      id: 'c35-r',
      title: '沒買過飲料的顧客',
      prompt: '在**有下過訂單**的顧客中，找出**從沒買過飲料（category_id = 1）**的顧客，輸出 **customer_id**。',
      expectedColumns: 'customer_id',
      solution: 'SELECT customer_id FROM orders\nEXCEPT\nSELECT o.customer_id FROM orders o JOIN order_details d ON d.order_id = o.order_id JOIN products p ON p.product_id = d.product_id WHERE p.category_id = 1;',
      hints: ['有下單的顧客 EXCEPT 買過飲料的顧客', '「買過飲料」要 JOIN orders、order_details、products'],
    }),
    summary: `
- \`INTERSECT\` 交集、\`EXCEPT\` 差集（Oracle：MINUS）
- 欄位數量、型別要一致；預設去重，加 ALL 保留重複
- EXCEPT 沒有 NOT IN 的 NULL 陷阱
`,
  },

  // ─────────────────────────── 數學函數 ───────────────────────────
  {
    id: 'c36',
    order: 25,
    part: 'basic',
    title: '數學函數',
    w3Topics: 'ABS · CEIL · FLOOR · ROUND · MOD · POWER · SQRT',
    concept: `
| 函數 | 作用 | 範例 → 結果 |
|---|---|---|
| \`ABS(x)\` | 絕對值 | \`ABS(-3)\` → 3 |
| \`CEIL(x)\` / \`CEILING(x)\` | 無條件**進位** | \`CEIL(4.1)\` → 5 |
| \`FLOOR(x)\` | 無條件**捨去** | \`FLOOR(4.9)\` → 4 |
| \`ROUND(x, n)\` | 四捨五入到 n 位 | \`ROUND(3.14159, 2)\` → 3.14 |
| \`TRUNC(x, n)\` | 直接截斷到 n 位 | \`TRUNC(3.789, 1)\` → 3.7 |
| \`MOD(a, b)\` / \`a % b\` | 餘數 | \`MOD(10, 3)\` → 1 |
| \`POWER(a, b)\` | a 的 b 次方 | \`POWER(2, 10)\` → 1024 |
| \`SQRT(x)\` | 平方根 | \`SQRT(16)\` → 4 |

### 負數的 CEIL / FLOOR
\`FLOOR(-4.1)\` 是 **-5**（往更小的方向），\`CEIL(-4.1)\` 是 **-4**。

### 「不滿一箱也算一箱」→ CEIL
~~~sql
SELECT CEIL(quantity / 6.0) AS boxes FROM order_details;
~~~
⚠️ 寫成 \`quantity / 6\` 會先做整數除法（7 / 6 = 1），再 CEIL 也救不回來。

### ROUND 的型別陷阱（PostgreSQL）
\`ROUND(x, 2)\` 只接受 **NUMERIC**。如果 x 是 DOUBLE PRECISION（例如某些函數的結果），會出現錯誤：
~~~sql
SELECT ROUND(SQRT(2::FLOAT), 2);            -- ❌ function round(double precision, integer) does not exist
SELECT ROUND(SQRT(2::FLOAT)::NUMERIC, 2);   -- ✅ 1.41
~~~
MySQL 沒有這個限制。
`,
    examples: [
      { title: '常用數學函數', sql: 'SELECT ABS(-3) AS abs_v, CEIL(4.1) AS ceil_v, FLOOR(4.9) AS floor_v,\n       ROUND(3.14159, 2) AS round_v, TRUNC(3.789, 1) AS trunc_v,\n       MOD(10, 3) AS mod_v, POWER(2, 10) AS pow_v, SQRT(16) AS sqrt_v;', explain: '一次看完每個函數的結果。' },
      { title: '負數', sql: 'SELECT CEIL(-4.1) AS ceil_neg, FLOOR(-4.1) AS floor_neg, ROUND(-4.5) AS round_neg;', explain: 'FLOOR 往更小的方向，所以 -4.1 變成 -5。' },
      { title: '裝箱數', sql: 'SELECT order_detail_id, quantity,\n       quantity / 6 AS wrong_boxes,\n       CEIL(quantity / 6.0) AS boxes\nFROM order_details;', explain: '整數除法會先捨去，CEIL 要配 6.0。' },
      { title: 'ROUND 型別錯誤', sql: 'SELECT ROUND(SQRT(2::FLOAT), 2);', explain: '這個範例會出現錯誤：DOUBLE PRECISION 不能直接 ROUND 到小數位，要先 ::NUMERIC。' },
    ],
    practice: ex({
      id: 'c36-p',
      title: '出貨箱數',
      prompt: '每箱最多裝 **6 件**，不滿一箱也要用一箱。請列出每筆明細的 **order_detail_id**、**quantity** 與需要的箱數 **boxes**。',
      expectedColumns: 'order_detail_id | quantity | boxes',
      strictColumns: true,
      solution: 'SELECT order_detail_id, quantity, CEIL(quantity / 6.0) AS boxes FROM order_details;',
      hints: ['不滿也算一個 → 無條件進位 CEIL', '先用 6.0 避免整數除法'],
      commonMistakes: ['CEIL(quantity / 6)：整數除法已經先捨去了。', '用 ROUND：7 件會算成 1 箱。'],
    }),
    morePractice: [
      ex({
        id: 'c36-p2',
        title: '85 折後的整數價',
        prompt: '週年慶全館 **85 折**，折後價格**無條件捨去到整數元**。請列出 **product_name** 與 **sale_price**（沒有標價的商品顯示 NULL）。',
        expectedColumns: 'product_name | sale_price',
        strictColumns: true,
        solution: 'SELECT product_name, FLOOR(price * 0.85) AS sale_price FROM products;',
        hints: ['折後價 = price * 0.85', '無條件捨去：FLOOR'],
        commonMistakes: ['用 ROUND：會四捨五入而不是捨去。'],
      }),
      ex({
        id: 'c36-p3',
        title: '薪水與 5000 的差距',
        prompt: '請列出**有薪資資料**的員工 **first_name**、**salary**，以及薪水和 5000 的差距 **gap**（一律是正數或 0）。',
        expectedColumns: 'first_name | salary | gap',
        strictColumns: true,
        solution: 'SELECT first_name, salary, ABS(salary - 5000) AS gap FROM employees WHERE salary IS NOT NULL;',
        hints: ['差距不分正負 → 絕對值 ABS'],
      }),
      ex({
        id: 'c36-p4',
        title: '三年後的價格',
        prompt: '假設每年漲價 **5%**，請算出每項**有標價**商品 3 年後的價格 **price_in_3y** = price × 1.05³，四捨五入到小數 2 位。輸出 **product_name** 與 **price_in_3y**。',
        expectedColumns: 'product_name | price_in_3y',
        strictColumns: true,
        solution: 'SELECT product_name, ROUND(price * POWER(1.05, 3), 2) AS price_in_3y FROM products WHERE price IS NOT NULL;',
        hints: ['次方：POWER(1.05, 3)', '最後 ROUND(..., 2)'],
      }),
    ],
    review: ex({
      id: 'c36-r',
      title: '每項商品平均每單件數（進位）',
      prompt: '請算出**每項有賣出的商品**平均每筆明細的件數，**無條件進位到整數**。輸出 **product_id** 與 **avg_qty**。',
      expectedColumns: 'product_id | avg_qty',
      strictColumns: true,
      solution: 'SELECT product_id, CEIL(AVG(quantity)) AS avg_qty FROM order_details GROUP BY product_id;',
      hints: ['先 GROUP BY product_id 算 AVG', '再用 CEIL 進位'],
    }),
    summary: `
- ABS 絕對值、CEIL 進位、FLOOR 捨去、ROUND 四捨五入、TRUNC 截斷
- MOD / % 餘數、POWER 次方、SQRT 平方根
- 除法要先避免整數除法；PostgreSQL 的 ROUND(x, n) 需要 NUMERIC
`,
  },

  // ─────────────────────────── SQL Injection ───────────────────────────
  {
    id: 'c37',
    order: 33,
    part: 'database',
    title: 'SQL Injection 與參數化查詢',
    w3Topics: 'SQL Injection · Prepared Statements',
    concept: `
**SQL Injection（SQL 注入）**：程式把使用者的輸入**直接拼接**進 SQL 字串，攻擊者就能輸入一段「看起來像資料、其實是 SQL」的文字，改變整個查詢的意思。

### 危險的寫法
~~~js
// 後端程式（示意）
const sql = "SELECT * FROM app_users WHERE username = '" + input + "'";
~~~
正常輸入 \`grace\` → \`WHERE username = 'grace'\`。但如果輸入：

| 輸入 | 拼接後 | 效果 |
|---|---|---|
| \`' OR '1'='1\` | \`WHERE username = '' OR '1'='1'\` | 條件永遠成立，**回傳所有資料** |
| \`admin' --\` | \`WHERE username = 'admin' --' AND password = ...\` | \`--\` 把後面的密碼檢查**變成註解** |
| \`x' UNION SELECT username, password FROM app_users --\` | 接上另一個查詢 | **偷出別張表**的資料 |
| \`'; DROP TABLE app_users; --\` | 多一條指令 | **刪表** |

關鍵：攻擊者用 \`'\` 結束字串，接著寫自己的 SQL，最後用 \`--\` 把原本剩下的部分註解掉。

### 正確做法：參數化查詢（Prepared Statement）
SQL 的**結構先固定**，使用者輸入只能當成「值」傳進去，永遠不會被當成 SQL 執行：
~~~js
// 程式端：用 placeholder（各語言寫法不同：$1、?、:name）
db.query('SELECT * FROM app_users WHERE username = $1', [input]);
~~~
PostgreSQL 也能直接用 SQL 示範同一件事：
~~~sql
PREPARE find_user(text) AS
  SELECT username, role FROM app_users WHERE username = $1;
EXECUTE find_user('grace');          -- 找到 grace
EXECUTE find_user(''' OR ''1''=''1'); -- 只會找名字真的叫「' OR '1'='1」的人 → 0 筆
~~~

### 其他防線
- **最小權限**：網站用的資料庫帳號只給需要的權限（例如不能 DROP）。
- **不要自己跳脫引號**當作主要防禦，容易漏掉情況。
- 錯誤訊息不要直接顯示給使用者，避免洩漏資料表結構。

> 本章的練習在隔離的沙盒裡模擬攻擊，目的是理解漏洞怎麼發生、以及為什麼參數化查詢能擋住它。
`,
    examples: [
      {
        title: '拼接後的查詢',
        sql: `${APP_USERS}\n-- 假設輸入是 ' OR '1'='1，拼接後變成：\nSELECT username, role FROM app_users WHERE username = '' OR '1'='1';`,
        explain: "'1'='1' 永遠成立，所有帳號都被查出來。",
      },
      {
        title: '用 -- 跳過密碼檢查',
        sql: `${APP_USERS}\n-- 輸入 admin' -- 之後：\nSELECT username, role FROM app_users WHERE username = 'admin' --' AND password = 'wrong';`,
        explain: '密碼條件被註解掉了，不知道密碼也能登入 admin。',
      },
      {
        title: 'PREPARE / EXECUTE 擋住注入',
        sql: `${APP_USERS}\nPREPARE find_user(text) AS\n  SELECT username, role FROM app_users WHERE username = $1;\nEXECUTE find_user(''' OR ''1''=''1');`,
        explain: '輸入被當成單純的字串值，查不到任何人。把參數改成 grace 再執行看看。',
      },
    ],
    practice: ex({
      id: 'c37-p',
      title: '讓搜尋回傳所有顧客',
      prompt: '這個「顧客搜尋」功能用字串拼接 SQL。請在輸入框輸入一段文字，讓查詢**回傳所有顧客**。',
      expectedColumns: 'customer_name | city',
      inputTemplate: "SELECT customer_name, city FROM customers WHERE customer_name = '{{input}}';",
      solution: "' OR '1'='1",
      hints: ["先用 ' 結束原本的字串", "再接一個永遠成立的條件：OR '1'='1", '注意最後模板還有一個 \'，你的輸入要讓它剛好配對'],
      commonMistakes: ['只輸入某個顧客名稱：只會查到一位。'],
      explanation: "拼接後變成 WHERE customer_name = '' OR '1'='1'。AND/OR 讓整個條件永遠為真，所有列都符合。",
    }),
    morePractice: [
      ex({
        id: 'c37-p2',
        title: '不用密碼登入 admin',
        prompt: '這是登入功能，帳號輸入框的內容會被拼進 SQL，密碼你不知道。請只在**帳號**輸入框動手腳，讓查詢**只回傳 admin 這個帳號**。',
        expectedColumns: 'username | role',
        extraSetupSql: APP_USERS,
        inputTemplate: "SELECT username, role FROM app_users WHERE username = '{{input}}' AND password = 'i-do-not-know';",
        solution: "admin' --",
        hints: ["用 ' 結束帳號字串", '-- 之後的內容會變成註解'],
        commonMistakes: ["用 ' OR '1'='1：會回傳所有帳號，不是只有 admin。"],
        explanation: "拼接後是 WHERE username = 'admin' --' AND password = ...，密碼條件被註解掉了。",
      }),
      ex({
        id: 'c37-p3',
        title: '用 UNION 偷出帳號密碼',
        prompt: '這個「商品查詢」只會顯示商品名稱與包裝（兩個文字欄位）。請利用 **UNION**，讓結果**只顯示 app_users 表所有人的 username 和 password**（不要混入任何商品）。',
        expectedColumns: 'product_name | unit',
        extraSetupSql: APP_USERS,
        inputTemplate: "SELECT product_name, unit FROM products WHERE product_name = '{{input}}';",
        solution: "x' UNION SELECT username, password FROM app_users --",
        hints: ['先讓原本的查詢查不到東西（例如名稱給一個不存在的值）', 'UNION 後面的 SELECT 欄位數要一樣：兩個文字欄位', '最後用 -- 註解掉剩下的引號'],
        commonMistakes: ["用 ' OR 1=1 UNION ...：會連所有商品一起列出來。"],
        explanation: 'UNION 注入是最常見的資料外洩手法：只要知道原查詢有幾個欄位，就能接上任何查詢。這也是為什麼錯誤訊息、欄位數都不該洩漏給使用者。',
      }),
      ex({
        id: 'c37-p4',
        title: '改寫成參數化查詢',
        prompt: `現在換你當開發者。請用 **PREPARE** 建立一個名為 **find_customer** 的參數化查詢：

- 參數：一個 **text**（顧客名稱）
- 內容：查出 customer_name = 參數 的顧客的 customer_name 與 city

建好之後用 **EXECUTE** 試試看正常名稱與攻擊字串。（判題會檢查 find_customer 是否存在、是否真的使用參數。）`,
        expectedColumns: 'name | params | uses_param',
        solution: "PREPARE find_customer(text) AS\n  SELECT customer_name, city FROM customers WHERE customer_name = $1;\nEXECUTE find_customer('Alpine Market');",
        checkQuery: "SELECT name, parameter_types::TEXT AS params, statement LIKE '%$1%' AS uses_param FROM pg_prepared_statements ORDER BY name",
        hints: ['PREPARE 名稱(參數型別) AS 查詢', '查詢裡用 $1 代表第一個參數', 'EXECUTE 名稱(值)'],
        commonMistakes: ["把值直接寫死在 PREPARE 裡（WHERE customer_name = 'Alpine Market'）：那就不是參數化了。"],
        explanation: "參數化查詢把「SQL 結構」和「資料」分開送：EXECUTE find_customer(''' OR ''1''=''1') 只會去找名字真的是那串文字的顧客，查不到任何人。",
      }),
    ],
    review: ex({
      id: 'c37-r',
      title: '數字欄位的注入',
      prompt: '這個「查訂單」功能把**顧客編號**直接拼進 SQL（沒有引號）。請輸入一段文字，讓查詢**回傳所有訂單**。',
      expectedColumns: 'order_id | order_date',
      inputTemplate: 'SELECT order_id, order_date FROM orders WHERE customer_id = {{input}};',
      solution: '0 OR 1=1',
      hints: ['這裡沒有引號，不需要先結束字串', '接一個永遠成立的條件'],
      explanation: '數字欄位沒有引號包住，更容易注入。只檢查「有沒有引號」是擋不住的，正解仍是參數化查詢。',
    }),
    summary: `
- 字串拼接 SQL = 讓使用者寫 SQL
- 經典手法：\`' OR '1'='1\`、\`admin' --\`、\`UNION SELECT\`
- 防禦：**參數化查詢**（placeholder / PREPARE），加上最小權限
`,
  },

  // ─────────────────────────── 視窗函數進階 ───────────────────────────
  {
    id: 'c38',
    order: 39,
    part: 'leetcode',
    title: '視窗函數進階：範圍、取值與分組',
    w3Topics: 'FIRST_VALUE · LAST_VALUE · NTH_VALUE · NTILE · ROWS BETWEEN',
    concept: `
### 視窗範圍（frame）
\`OVER (ORDER BY ...)\` 後面還可以指定「**要看哪幾列**」：

~~~sql
SUM(x) OVER (ORDER BY d ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)  -- 前兩列 + 本列
~~~
| 寫法 | 意思 |
|---|---|
| \`UNBOUNDED PRECEDING\` | 從第一列開始 |
| \`n PRECEDING\` / \`n FOLLOWING\` | 往前 / 往後 n 列 |
| \`CURRENT ROW\` | 本列 |
| \`UNBOUNDED FOLLOWING\` | 到最後一列 |

**預設範圍**：有 ORDER BY 時是「從第一列到本列」（所以 SUM 會變成累計）。

### 取特定位置的值
| 函數 | 回傳 |
|---|---|
| \`FIRST_VALUE(x)\` | 範圍內第一列的 x |
| \`LAST_VALUE(x)\` | 範圍內最後一列的 x |
| \`NTH_VALUE(x, n)\` | 範圍內第 n 列的 x |

### ⚠️ LAST_VALUE 的經典陷阱
因為預設範圍只到「本列」，\`LAST_VALUE\` 拿到的永遠是**本列自己**。要看整個分組，必須把範圍擴大：
~~~sql
LAST_VALUE(x) OVER (
  PARTITION BY g ORDER BY d
  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
~~~
NTH_VALUE 也一樣：本列還沒走到第 n 列時會得到 NULL。

### NTILE(n)：平均分成 n 組
依排序把資料切成 n 份，回傳每列屬於第幾組（1～n）。常用來做「前 25%」「四分位」。
`,
    examples: [
      { title: '移動平均（3 期）', sql: "WITH m AS (\n  SELECT TO_CHAR(order_date, 'YYYY-MM') AS month, COUNT(*) AS cnt\n  FROM orders GROUP BY 1\n)\nSELECT month, cnt,\n  ROUND(AVG(cnt) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS ma3\nFROM m ORDER BY month;", explain: '每個月和前兩個月的平均。' },
      { title: 'LAST_VALUE 的陷阱', sql: 'SELECT product_name, category_id, price,\n  LAST_VALUE(product_name) OVER (PARTITION BY category_id ORDER BY price) AS wrong_last,\n  LAST_VALUE(product_name) OVER (PARTITION BY category_id ORDER BY price\n    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS right_last\nFROM products WHERE price IS NOT NULL\nORDER BY category_id, price;', explain: 'wrong_last 每列都是自己；right_last 才是該分類最貴的商品。' },
      { title: 'FIRST_VALUE / NTH_VALUE', sql: 'SELECT category_id, product_name, price,\n  FIRST_VALUE(product_name) OVER w AS cheapest,\n  NTH_VALUE(product_name, 2) OVER w AS second_cheapest\nFROM products WHERE price IS NOT NULL\nWINDOW w AS (PARTITION BY category_id ORDER BY price\n             ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)\nORDER BY category_id, price;', explain: 'WINDOW 子句可以替視窗取名字，重複使用。' },
      { title: 'NTILE', sql: 'SELECT product_name, price, NTILE(4) OVER (ORDER BY price DESC) AS quartile\nFROM products WHERE price IS NOT NULL;', explain: '依價格由高到低分成 4 組。' },
    ],
    practice: ex({
      id: 'c38-p',
      title: '每個分類的最貴商品',
      prompt: '請列出每項**有標價**的商品 **category_id**、**product_name**，以及**同分類中最貴的商品名稱 top_product**（同價時取 product_name 字母序較前的）。請用 **FIRST_VALUE**。',
      expectedColumns: 'category_id | product_name | top_product',
      strictColumns: true,
      solution: 'SELECT category_id, product_name, FIRST_VALUE(product_name) OVER (PARTITION BY category_id ORDER BY price DESC, product_name) AS top_product FROM products WHERE price IS NOT NULL;',
      hints: ['PARTITION BY category_id ORDER BY price DESC', 'FIRST_VALUE 從範圍的第一列取值，預設範圍就夠用'],
    }),
    morePractice: [
      ex({
        id: 'c38-p2',
        title: '當月最後一筆訂單',
        prompt: '請依 **order_date、order_id** 排序，列出每筆訂單的 **order_id**、**order_date**，以及**同一個月的最後一筆訂單編號 last_in_month**。',
        expectedColumns: 'order_id | order_date | last_in_month',
        strictColumns: true,
        solution: "SELECT order_id, order_date,\n  LAST_VALUE(order_id) OVER (\n    PARTITION BY TO_CHAR(order_date, 'YYYY-MM') ORDER BY order_date, order_id\n    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING\n  ) AS last_in_month\nFROM orders;",
        hints: ["PARTITION BY TO_CHAR(order_date, 'YYYY-MM')", 'LAST_VALUE 要把範圍擴大到 UNBOUNDED FOLLOWING'],
        commonMistakes: ['沒有設範圍：LAST_VALUE 每列都拿到自己的 order_id。'],
      }),
      ex({
        id: 'c38-p3',
        title: '各分類第二貴的價格',
        prompt: '請找出每個分類中**依價格由高到低排第 2 的商品價格 second_price**（只看有標價的商品；只有一項商品的分類不用列出）。輸出 **category_id** 與 **second_price**。',
        expectedColumns: 'category_id | second_price',
        strictColumns: true,
        solution: `SELECT DISTINCT category_id, second_price
FROM (
  SELECT category_id,
         NTH_VALUE(price, 2) OVER (
           PARTITION BY category_id ORDER BY price DESC
           ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
         ) AS second_price
  FROM products WHERE price IS NOT NULL
) t
WHERE second_price IS NOT NULL;`,
        hints: ['NTH_VALUE(price, 2)，範圍要擴大到整個分組', '每個分類每列都會算出同一個值 → DISTINCT', '只有一項商品的分類會得到 NULL，要篩掉'],
        commonMistakes: ['沒有設範圍：第一列（最貴的那項）會得到 NULL。'],
      }),
      ex({
        id: 'c38-p4',
        title: '商品價格四等分',
        prompt: '請把**有標價**的商品依**價格由高到低**（同價依 product_id）平均分成 **4 組**，輸出 **product_name**、**price**、**price_group**（1 最貴）。',
        expectedColumns: 'product_name | price | price_group',
        strictColumns: true,
        solution: 'SELECT product_name, price, NTILE(4) OVER (ORDER BY price DESC, product_id) AS price_group FROM products WHERE price IS NOT NULL;',
        hints: ['NTILE(4) OVER (ORDER BY ...)'],
      }),
      ex({
        id: 'c38-p5',
        title: '3 個月移動平均訂單數',
        prompt: "請算出每個月的訂單數 **order_count**，以及**本月與前兩個月**的移動平均 **moving_avg**（四捨五入到小數 2 位；前面不足兩個月就用現有的月份平均）。輸出 **month**（'YYYY-MM'）、**order_count**、**moving_avg**，依 month 排序。",
        expectedColumns: 'month | order_count | moving_avg',
        strictColumns: true,
        orderMatters: true,
        solution: "WITH m AS (\n  SELECT TO_CHAR(order_date, 'YYYY-MM') AS month, COUNT(*) AS order_count\n  FROM orders GROUP BY 1\n)\nSELECT month, order_count,\n  ROUND(AVG(order_count) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg\nFROM m ORDER BY month;",
        hints: ['先算每月訂單數', 'AVG(...) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)'],
        commonMistakes: ['沒有設範圍：變成從第一個月開始的累計平均。'],
      }),
    ],
    review: ex({
      id: 'c38-r',
      title: '最早與最晚入職的同事',
      prompt: '請依 **hire_date** 排序，列出每位員工的 **first_name**、**hire_date**，以及**全公司最早入職的人 first_hire** 與**最晚入職的人 last_hire**（first_name）。',
      expectedColumns: 'first_name | hire_date | first_hire | last_hire',
      strictColumns: true,
      solution: `SELECT first_name, hire_date,
  FIRST_VALUE(first_name) OVER w AS first_hire,
  LAST_VALUE(first_name) OVER w AS last_hire
FROM employees
WINDOW w AS (ORDER BY hire_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING);`,
      hints: ['不需要 PARTITION BY：整張表是一個視窗', 'LAST_VALUE 要擴大範圍'],
      commonMistakes: ['LAST_VALUE 沒有設範圍，每列都拿到自己。'],
    }),
    summary: `
- \`ROWS BETWEEN … AND …\` 指定視窗範圍；有 ORDER BY 時預設到本列
- FIRST_VALUE / LAST_VALUE / NTH_VALUE；LAST、NTH 通常要擴大範圍
- \`NTILE(n)\` 平均分成 n 組
`,
  },
];
