import type { Chapter } from '../types';
import { ex } from './helpers';

export const part4: Chapter[] = [
  {
    id: 'c30',
    order: 30,
    part: 'leetcode',
    title: '子查詢 Subquery',
    w3Topics: '補充：LeetCode 必備',
    concept: `
**子查詢**是放在另一個查詢裡的 SELECT，可以出現在三個地方：

### 1. WHERE 中（最常見）
~~~sql
-- 比平均價格貴的商品
SELECT product_name, price FROM products
WHERE price > (SELECT AVG(price) FROM products);
~~~
回傳單一值的子查詢稱為**純量子查詢**。

### 2. FROM 中（衍生表，必須取別名）
~~~sql
SELECT AVG(order_qty) FROM (
  SELECT order_id, SUM(quantity) AS order_qty FROM order_details GROUP BY order_id
) t;
~~~

### 3. SELECT 中
~~~sql
SELECT product_name, price, (SELECT AVG(price) FROM products) AS avg_price FROM products;
~~~

### NOT IN 的 NULL 陷阱
~~~sql
WHERE customer_id NOT IN (SELECT customer_id FROM orders)
~~~
如果子查詢結果裡**有任何 NULL**，NOT IN 會整個回傳空結果！較安全的寫法是 \`NOT EXISTS\` 或 \`LEFT JOIN ... WHERE 右表.id IS NULL\`。

LeetCode 183. Customers Who Never Order 就是這個題型。
`,
    examples: [
      { title: '高於平均', sql: 'SELECT product_name, price FROM products\nWHERE price > (SELECT AVG(price) FROM products);', explain: '子查詢先算出平均價。' },
      { title: '衍生表', sql: 'SELECT ROUND(AVG(order_qty), 2) AS avg_items_per_order FROM (\n  SELECT order_id, SUM(quantity) AS order_qty FROM order_details GROUP BY order_id\n) t;', explain: '先算每筆訂單件數，再平均。' },
      { title: 'LEFT JOIN 找「沒有」', sql: 'SELECT c.customer_name FROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id\nWHERE o.order_id IS NULL;', explain: '和 NOT EXISTS 等價。' },
    ],
    practice: ex({
      id: 'c30-p',
      title: '高於平均價的商品',
      prompt: '請找出**價格高於所有商品平均價格**的商品，輸出 **product_name** 與 **price**。',
      expectedColumns: 'product_name | price',
      solution: 'SELECT product_name, price FROM products WHERE price > (SELECT AVG(price) FROM products);',
      hints: ['WHERE price > (SELECT AVG(price) FROM products)'],
    }),
    review: ex({
      id: 'c30-r',
      title: '從未下單的顧客',
      prompt: '請找出**從來沒有下過訂單**的顧客，輸出 **customer_name**。（對應 LeetCode 183）',
      expectedColumns: 'customer_name',
      solution: 'SELECT customer_name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);',
      hints: ['NOT EXISTS、NOT IN 或 LEFT JOIN ... IS NULL 都可以'],
    }),
    summary: `
- 子查詢可放在 WHERE / FROM / SELECT
- FROM 中的子查詢要取別名
- NOT IN 遇到 NULL 會失效，優先用 NOT EXISTS
`,
  },
  {
    id: 'c31',
    order: 31,
    part: 'leetcode',
    title: 'CTE：WITH 子句',
    w3Topics: '補充：LeetCode 必備',
    concept: `
**CTE（Common Table Expression）** 用 \`WITH\` 先替子查詢取名字，再在主查詢使用，讓複雜查詢**一步一步**寫：

~~~sql
WITH customer_qty AS (
  SELECT o.customer_id, SUM(d.quantity) AS total_qty
  FROM orders o JOIN order_details d ON d.order_id = o.order_id
  GROUP BY o.customer_id
)
SELECT * FROM customer_qty WHERE total_qty > 30;
~~~

### 多個 CTE
~~~sql
WITH a AS (...),
     b AS (SELECT ... FROM a ...)   -- 後面的 CTE 可以使用前面的
SELECT ... FROM b;
~~~

### 為什麼 LeetCode 中大量使用
- 中等/困難題常需要「先算 A，再用 A 算 B」
- 比巢狀子查詢好讀、好除錯：可以先 \`SELECT * FROM a\` 看中間結果

### 遞迴 CTE（進階）
\`WITH RECURSIVE\` 可產生序列或走訪階層（例如找出某主管底下所有員工）。
`,
    examples: [
      { title: '一步步計算', sql: 'WITH customer_qty AS (\n  SELECT o.customer_id, SUM(d.quantity) AS total_qty\n  FROM orders o JOIN order_details d ON d.order_id = o.order_id\n  GROUP BY o.customer_id\n)\nSELECT c.customer_name, q.total_qty\nFROM customer_qty q JOIN customers c ON c.customer_id = q.customer_id\nORDER BY q.total_qty DESC;', explain: '先算每位顧客總量，再接名稱。' },
      { title: '遞迴：產生 1~5', sql: 'WITH RECURSIVE nums AS (\n  SELECT 1 AS n\n  UNION ALL\n  SELECT n + 1 FROM nums WHERE n < 5\n)\nSELECT * FROM nums;', explain: '遞迴 CTE 的基本形式。' },
    ],
    practice: ex({
      id: 'c31-p',
      title: '購買量高於平均的顧客',
      prompt: '請先算出**每位顧客的購買總數量**（所有訂單明細 quantity 加總），再找出**總數量高於「所有有購買顧客的平均總數量」** 的顧客，輸出 **customer_name** 與 **total_qty**。建議使用 CTE。',
      expectedColumns: 'customer_name | total_qty',
      solution: `WITH customer_qty AS (
  SELECT o.customer_id, SUM(d.quantity) AS total_qty
  FROM orders o JOIN order_details d ON d.order_id = o.order_id
  GROUP BY o.customer_id
)
SELECT c.customer_name, q.total_qty
FROM customer_qty q JOIN customers c ON c.customer_id = q.customer_id
WHERE q.total_qty > (SELECT AVG(total_qty) FROM customer_qty);`,
      hints: ['WITH customer_qty AS (SELECT customer_id, SUM(quantity) ... GROUP BY customer_id)', '主查詢中 WHERE total_qty > (SELECT AVG(total_qty) FROM customer_qty)'],
    }),
    review: ex({
      id: 'c31-r',
      title: '營收最高的分類',
      prompt: '營收 = quantity × price。請找出**營收最高的商品分類**，輸出 **category_name** 與 **revenue**。若有多個分類並列第一，全部列出。',
      expectedColumns: 'category_name | revenue',
      solution: `WITH cat_rev AS (
  SELECT c.category_name, SUM(d.quantity * p.price) AS revenue
  FROM order_details d
  JOIN products p ON p.product_id = d.product_id
  JOIN categories c ON c.category_id = p.category_id
  GROUP BY c.category_id, c.category_name
)
SELECT category_name, revenue FROM cat_rev
WHERE revenue = (SELECT MAX(revenue) FROM cat_rev);`,
      hints: ['先用 CTE 算每個分類的營收', '再找 revenue = MAX(revenue) 的分類（不要用 LIMIT 1，會漏掉並列）'],
      commonMistakes: ['用 ORDER BY revenue DESC LIMIT 1，並列第一時會漏掉。'],
    }),
    summary: `
- \`WITH 名稱 AS (查詢) SELECT ...\`
- 多個 CTE 以逗號分隔，後者可引用前者
- 「找最大值的那些列」：\`WHERE x = (SELECT MAX(x) ...)\`，不要 LIMIT 1
`,
  },
  {
    id: 'c32',
    order: 32,
    part: 'leetcode',
    title: '視窗函數：排名',
    w3Topics: '補充：LeetCode 必備',
    concept: `
**視窗函數（Window Function）** 對「一群相關的列」計算，但**不會把列合併**（GROUP BY 會合併）。

~~~sql
SELECT product_name, category_id, price,
       RANK() OVER (PARTITION BY category_id ORDER BY price DESC) AS rnk
FROM products;
~~~
- \`PARTITION BY\`：分組（每組各自排名），可省略 = 整張表一組
- \`ORDER BY\`：組內的排序依據

### 三種排名函數（價格 30, 20, 20, 10）
| 函數 | 結果 | 說明 |
|---|---|---|
| \`ROW_NUMBER()\` | 1, 2, 3, 4 | 不重複的流水號 |
| \`RANK()\` | 1, 2, 2, 4 | 並列同名次，**跳號** |
| \`DENSE_RANK()\` | 1, 2, 2, 3 | 並列同名次，**不跳號** |

### 經典用法：每組前 N 名
視窗函數不能直接寫在 WHERE，要包一層：
~~~sql
WITH ranked AS (
  SELECT *, DENSE_RANK() OVER (PARTITION BY category_id ORDER BY price DESC) AS rnk
  FROM products
)
SELECT * FROM ranked WHERE rnk <= 2;
~~~
LeetCode：176/177（第 N 高薪水）、178（Rank Scores）、184/185（部門最高 / 前三高薪水）。
`,
    examples: [
      { title: '三種排名比較', sql: 'SELECT product_name, price,\n  ROW_NUMBER() OVER (ORDER BY price DESC NULLS LAST) AS row_num,\n  RANK()       OVER (ORDER BY price DESC NULLS LAST) AS rnk,\n  DENSE_RANK() OVER (ORDER BY price DESC NULLS LAST) AS dense_rnk\nFROM products;', explain: 'Cold Brew Coffee 與 Pineapple Cake… 觀察並列時的差異。' },
      { title: '分組排名', sql: 'SELECT category_id, product_name, price,\n  DENSE_RANK() OVER (PARTITION BY category_id ORDER BY price DESC) AS rnk\nFROM products WHERE price IS NOT NULL\nORDER BY category_id, rnk;', explain: '每個分類各自從 1 開始排。' },
    ],
    practice: ex({
      id: 'c32-p',
      title: '分類內價格排名',
      prompt: '請在**每個分類內**依價格由高到低排名（並列同名次、不跳號），輸出 **category_id**、**product_name**、**price**、**price_rank**。**排除 price 為 NULL 的商品**。',
      expectedColumns: 'category_id | product_name | price | price_rank',
      solution: 'SELECT category_id, product_name, price, DENSE_RANK() OVER (PARTITION BY category_id ORDER BY price DESC) AS price_rank FROM products WHERE price IS NOT NULL;',
      hints: ['DENSE_RANK() OVER (PARTITION BY category_id ORDER BY price DESC)'],
    }),
    review: ex({
      id: 'c32-r',
      title: '每個分類最貴的商品',
      prompt: '請找出**每個分類中價格最高**的商品（同價並列都要列出），輸出 **category_name**、**product_name**、**price**。（類似 LeetCode 184）',
      expectedColumns: 'category_name | product_name | price',
      solution: `WITH ranked AS (
  SELECT p.*, RANK() OVER (PARTITION BY p.category_id ORDER BY p.price DESC) AS rnk
  FROM products p WHERE p.price IS NOT NULL
)
SELECT c.category_name, r.product_name, r.price
FROM ranked r JOIN categories c ON c.category_id = r.category_id
WHERE r.rnk = 1;`,
      hints: ['先用 CTE 計算 RANK()，再篩 rnk = 1', '記得排除 NULL 價格（DESC 時 NULL 會排第一）'],
    }),
    summary: `
- \`函數() OVER (PARTITION BY ... ORDER BY ...)\`
- ROW_NUMBER 流水號、RANK 跳號、DENSE_RANK 不跳號
- 篩選排名要包一層 CTE / 子查詢
`,
  },
  {
    id: 'c33',
    order: 33,
    part: 'leetcode',
    title: '視窗函數：LAG / LEAD 與累計',
    w3Topics: '補充：LeetCode 必備',
    concept: `
### LAG / LEAD：取前一列 / 後一列
~~~sql
SELECT order_date,
       LAG(order_date)  OVER (ORDER BY order_date) AS prev_date,
       LEAD(order_date) OVER (ORDER BY order_date) AS next_date
FROM orders;
~~~
- \`LAG(欄, n, 預設)\`：往前 n 列（預設 1），沒有則回傳預設值（預設 NULL）
- 常用於「和上個月比較」「連續登入」「相鄰兩筆的間隔」

### 彙總函數也可以當視窗函數
~~~sql
SELECT order_date, order_id,
       COUNT(*)  OVER (ORDER BY order_date, order_id) AS running_count,  -- 累計
       SUM(qty)  OVER (PARTITION BY customer_id)      AS customer_total  -- 組內總和（不合併列）
FROM ...;
~~~
有 ORDER BY 時預設計算「從第一列到目前列」，也就是**累計**。

### 移動平均（進階）
~~~sql
AVG(amount) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)  -- 7 日移動平均
~~~
LeetCode：180（Consecutive Numbers）、197（Rising Temperature）、1321（Restaurant Growth）。
`,
    examples: [
      { title: 'LAG', sql: 'SELECT order_id, order_date,\n  LAG(order_date) OVER (ORDER BY order_date, order_id) AS prev_date,\n  order_date - LAG(order_date) OVER (ORDER BY order_date, order_id) AS gap_days\nFROM orders;', explain: '和上一筆訂單隔了幾天。' },
      { title: '累計', sql: 'SELECT order_id, order_date,\n  COUNT(*) OVER (ORDER BY order_date, order_id) AS running_count\nFROM orders;', explain: '到目前為止的累計訂單數。' },
    ],
    practice: ex({
      id: 'c33-p',
      title: '每月訂單數與上月比較',
      prompt: "請算出每個月的訂單數 **order_count**，並加上**上個月的訂單數 prev_count**（第一個月為 NULL）。輸出 **month**（'YYYY-MM'）、**order_count**、**prev_count**，依 month 排序。",
      expectedColumns: 'month | order_count | prev_count',
      solution: `WITH m AS (
  SELECT TO_CHAR(order_date, 'YYYY-MM') AS month, COUNT(*) AS order_count
  FROM orders GROUP BY 1
)
SELECT month, order_count, LAG(order_count) OVER (ORDER BY month) AS prev_count
FROM m ORDER BY month;`,
      orderMatters: true,
      hints: ['先用 CTE 算出每月訂單數', 'LAG(order_count) OVER (ORDER BY month)'],
    }),
    review: ex({
      id: 'c33-r',
      title: '累計訂單數',
      prompt: '請依 **order_date、order_id** 由早到晚列出每筆訂單的 **order_id**、**order_date** 與到該筆為止的**累計訂單數 running_count**。',
      expectedColumns: 'order_id | order_date | running_count',
      solution: 'SELECT order_id, order_date, COUNT(*) OVER (ORDER BY order_date, order_id) AS running_count FROM orders ORDER BY order_date, order_id;',
      orderMatters: true,
      hints: ['COUNT(*) OVER (ORDER BY order_date, order_id)'],
    }),
    summary: `
- \`LAG / LEAD(欄) OVER (ORDER BY ...)\` 取前後列
- \`SUM/COUNT() OVER (ORDER BY ...)\` = 累計
- \`ROWS BETWEEN n PRECEDING AND CURRENT ROW\` = 移動視窗
`,
  },
  {
    id: 'c34',
    order: 34,
    part: 'leetcode',
    title: '字串與日期函數進階',
    w3Topics: '補充：LeetCode 必備',
    concept: `
### 常用字串函數
| 函數 | 範例 | 結果 |
|---|---|---|
| \`UPPER / LOWER\` | \`UPPER('abc')\` | ABC |
| \`LENGTH\` | \`LENGTH('hello')\` | 5 |
| \`SUBSTRING(s, 起, 長)\` | \`SUBSTRING('hello', 1, 2)\` | he |
| \`LEFT / RIGHT\` | \`LEFT('hello', 3)\` | hel |
| \`TRIM\` | \`TRIM('  a ')\` | a |
| \`REPLACE\` | \`REPLACE('a-b', '-', '')\` | ab |
| \`STRING_AGG(欄, 分隔)\` | 把多列串成一個字串 | |

LeetCode 1667（Fix Names）：\`UPPER(LEFT(name,1)) || LOWER(SUBSTRING(name, 2))\`
LeetCode 1484（Group Sold Products）：\`STRING_AGG(DISTINCT product, ',' ORDER BY product)\`

### 正規表達式（PostgreSQL）
\`email ~ '^[a-zA-Z][a-zA-Z0-9_.-]*@leetcode\\.com$'\`（1517. Find Users With Valid E-Mails）

### 日期間隔
- \`d1 - d2\` 得到天數
- \`d + 1\` = 隔天（DATE 加整數）
- 「前一筆紀錄距今幾天」= \`d - LAG(d) OVER (...)\`
`,
    examples: [
      { title: '字串函數', sql: "SELECT customer_name, UPPER(customer_name) AS up, LENGTH(customer_name) AS len, LEFT(customer_name, 3) AS first3 FROM customers;", explain: '常見的字串處理。' },
      { title: 'STRING_AGG', sql: "SELECT country, STRING_AGG(customer_name, ', ' ORDER BY customer_name) AS names\nFROM customers GROUP BY country;", explain: '把同國家的顧客名串成一個字串。' },
    ],
    practice: ex({
      id: 'c34-p',
      title: '各國顧客名單',
      prompt: "請列出每個國家的顧客名單：輸出 **country** 與 **customer_names**（該國所有 customer_name 依字母排序，以 **', '** 串接）。依 country 排序。",
      expectedColumns: 'country | customer_names',
      solution: "SELECT country, STRING_AGG(customer_name, ', ' ORDER BY customer_name) AS customer_names FROM customers GROUP BY country ORDER BY country;",
      orderMatters: true,
      hints: ["STRING_AGG(customer_name, ', ' ORDER BY customer_name)"],
    }),
    review: ex({
      id: 'c34-r',
      title: '距離上一筆訂單幾天',
      prompt: '請列出每筆訂單的 **order_id**、**customer_id**、**order_date**，以及**距離同一位顧客上一筆訂單的天數 days_since_prev**（該顧客的第一筆訂單為 NULL）。',
      expectedColumns: 'order_id | customer_id | order_date | days_since_prev',
      solution: 'SELECT order_id, customer_id, order_date, order_date - LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS days_since_prev FROM orders;',
      hints: ['LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)', 'DATE - DATE 就是天數'],
    }),
    summary: `
- UPPER/LOWER/LENGTH/SUBSTRING/LEFT/TRIM/REPLACE
- \`STRING_AGG(欄, 分隔 ORDER BY ...)\`
- 日期相減 = 天數；搭配 LAG 算間隔
`,
  },
];
