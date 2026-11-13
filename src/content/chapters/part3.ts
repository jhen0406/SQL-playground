import type { Chapter } from '../types';
import { ex, tableDefCheck } from './helpers';

export const part3: Chapter[] = [
  {
    id: 'c24',
    order: 26,
    part: 'database',
    title: 'CREATE / DROP / ALTER TABLE',
    w3Topics: 'SQL Create DB · Drop DB · Create Table · Drop Table · Alter Table',
    concept: `
### 建立資料庫（了解即可）
~~~sql
CREATE DATABASE shop;
DROP DATABASE shop;
~~~
本平台每次執行都在一個沙盒裡，不需要建立資料庫。

### 建立資料表
~~~sql
CREATE TABLE reviews (
  review_id  INTEGER,
  product_id INTEGER,
  rating     INTEGER,
  comment    TEXT
);
~~~
每個欄位需要**名稱 + 型別**。常用型別：\`INTEGER\`、\`NUMERIC(10,2)\`、\`VARCHAR(n)\`、\`TEXT\`、\`DATE\`、\`TIMESTAMP\`、\`BOOLEAN\`（第 32 章）。

### 刪除 / 清空
~~~sql
DROP TABLE reviews;            -- 整張表（含結構）刪除
DROP TABLE IF EXISTS reviews;  -- 不存在也不報錯
TRUNCATE TABLE reviews;        -- 只清空資料，保留結構
~~~

### 修改結構 ALTER TABLE
~~~sql
ALTER TABLE shippers ADD COLUMN email VARCHAR(100);
ALTER TABLE shippers DROP COLUMN phone;
ALTER TABLE shippers RENAME COLUMN shipper_name TO name;
ALTER TABLE shippers ALTER COLUMN email TYPE VARCHAR(200);   -- PostgreSQL 語法
~~~
`,
    examples: [
      { title: '建表並查看結構', sql: "CREATE TABLE reviews (review_id INTEGER, product_id INTEGER, rating INTEGER, comment TEXT);\nSELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reviews';", explain: 'information_schema 存放資料庫的結構資訊。' },
      { title: 'ALTER TABLE', sql: 'ALTER TABLE shippers ADD COLUMN email VARCHAR(100);\nSELECT * FROM shippers;', explain: '新欄位的值都是 NULL。' },
    ],
    practice: ex({
      id: 'c24-p',
      title: '建立評論表',
      prompt: `請建立資料表 **reviews**，欄位依序為：

| 欄位 | 型別 |
|---|---|
| review_id | INTEGER |
| product_id | INTEGER |
| rating | INTEGER |
| comment | TEXT |`,
      solution: 'CREATE TABLE reviews (review_id INTEGER, product_id INTEGER, rating INTEGER, comment TEXT);',
      checkQuery: tableDefCheck('reviews'),
      orderMatters: true,
      hints: ['CREATE TABLE reviews ( 欄位 型別, ... );'],
    }),
    review: ex({
      id: 'c24-r',
      title: '修改貨運商表',
      prompt: '請修改 **shippers** 表：**新增**欄位 **email VARCHAR(100)**，並**刪除** **phone** 欄位。',
      solution: 'ALTER TABLE shippers ADD COLUMN email VARCHAR(100);\nALTER TABLE shippers DROP COLUMN phone;',
      checkQuery: tableDefCheck('shippers'),
      orderMatters: true,
      hints: ['ALTER TABLE shippers ADD COLUMN ...;', 'ALTER TABLE shippers DROP COLUMN ...;'],
    }),
    summary: `
- \`CREATE TABLE 表 (欄 型別, ...)\`
- \`DROP TABLE\` 刪表、\`TRUNCATE\` 清資料
- \`ALTER TABLE ... ADD / DROP / RENAME COLUMN\`
`,
  },
  {
    id: 'c25',
    order: 27,
    part: 'database',
    title: '約束 Constraints',
    w3Topics: 'SQL Constraints · Not Null · Unique · Primary Key · Foreign Key · Check · Default',
    concept: `
**約束**是資料表的規則，資料庫會自動拒絕違反規則的資料。

| 約束 | 作用 |
|---|---|
| \`NOT NULL\` | 不能是 NULL |
| \`UNIQUE\` | 值不能重複 |
| \`PRIMARY KEY\` | 主鍵 = NOT NULL + UNIQUE，每張表一個 |
| \`FOREIGN KEY\` / \`REFERENCES\` | 值必須存在於另一張表 |
| \`CHECK (條件)\` | 值必須滿足條件 |
| \`DEFAULT 值\` | 沒給值時的預設值 |

~~~sql
CREATE TABLE members (
  member_id INTEGER PRIMARY KEY,
  email     VARCHAR(100) NOT NULL UNIQUE,
  age       INTEGER CHECK (age >= 18),
  joined_on DATE DEFAULT CURRENT_DATE,
  referrer  INTEGER REFERENCES members(member_id)
);
~~~

### 複合主鍵
~~~sql
CREATE TABLE order_items (
  order_id INTEGER, product_id INTEGER, quantity INTEGER,
  PRIMARY KEY (order_id, product_id)
);
~~~
LeetCode 題目開頭的表格說明常寫「(order_id, product_id) is the primary key」，代表**這個組合不會重複**——這是解題的重要線索！
`,
    examples: [
      { title: '違反約束會失敗', sql: "CREATE TABLE members (member_id INTEGER PRIMARY KEY, email VARCHAR(100) NOT NULL UNIQUE, age INTEGER CHECK (age >= 18));\nINSERT INTO members VALUES (1, 'a@x.com', 20);\nINSERT INTO members VALUES (2, 'a@x.com', 30);", explain: '第二筆 email 重複，會出現 unique 錯誤。' },
      { title: '外鍵', sql: "INSERT INTO orders VALUES (9999, 999, 1, '2024-06-01', 1);", explain: 'customer_id 999 不存在，外鍵會拒絕。' },
    ],
    practice: ex({
      id: 'c25-p',
      title: '建立會員表',
      prompt: `請建立資料表 **members**：

| 欄位 | 型別 | 約束 |
|---|---|---|
| member_id | INTEGER | 主鍵 |
| email | VARCHAR(100) | 不可為 NULL、不可重複 |
| age | INTEGER | 必須 >= 18 |
| joined_on | DATE | 預設為 CURRENT_DATE |`,
      solution: 'CREATE TABLE members (member_id INTEGER PRIMARY KEY, email VARCHAR(100) NOT NULL UNIQUE, age INTEGER CHECK (age >= 18), joined_on DATE DEFAULT CURRENT_DATE);',
      checkQuery: tableDefCheck('members'),
      orderMatters: true,
      hints: ['PRIMARY KEY、NOT NULL UNIQUE、CHECK (age >= 18)、DEFAULT CURRENT_DATE'],
    }),
    review: ex({
      id: 'c25-r',
      title: '建立商品評價表',
      prompt: `請建立資料表 **product_reviews**：

| 欄位 | 型別 | 約束 |
|---|---|---|
| review_id | INTEGER | 主鍵 |
| product_id | INTEGER | 不可為 NULL，外鍵參照 products(product_id) |
| rating | INTEGER | 不可為 NULL，必須介於 1 到 5（含） |`,
      solution: 'CREATE TABLE product_reviews (review_id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(product_id), rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5));',
      checkQuery: tableDefCheck('product_reviews'),
      orderMatters: true,
      hints: ['REFERENCES products(product_id)', 'CHECK (rating BETWEEN 1 AND 5)'],
    }),
    summary: `
- NOT NULL、UNIQUE、PRIMARY KEY、FOREIGN KEY、CHECK、DEFAULT
- 主鍵 = 不重複且不為 NULL；可以是多欄組合
- LeetCode 表格說明的主鍵資訊是解題線索
`,
  },
  {
    id: 'c26',
    order: 29,
    part: 'database',
    title: '索引與自動遞增',
    w3Topics: 'SQL Create Index · SQL Auto Increment',
    concept: `
### 索引 INDEX
索引就像書的目錄，讓資料庫**不用掃描整張表**就能找到資料，加快 WHERE、JOIN、ORDER BY。

~~~sql
CREATE INDEX idx_orders_order_date ON orders (order_date);
CREATE UNIQUE INDEX idx_members_email ON members (email);
DROP INDEX idx_orders_order_date;
~~~
代價：佔空間，且每次 INSERT/UPDATE 都要更新索引。主鍵與 UNIQUE 會自動建立索引。

### 自動遞增
各資料庫寫法不同：

| 資料庫 | 寫法 |
|---|---|
| MySQL | \`id INT AUTO_INCREMENT PRIMARY KEY\` |
| SQL Server | \`id INT IDENTITY(1,1)\` |
| PostgreSQL | \`id SERIAL PRIMARY KEY\` 或 \`id INTEGER GENERATED ALWAYS AS IDENTITY\` |

~~~sql
CREATE TABLE tickets (
  ticket_id SERIAL PRIMARY KEY,
  title     VARCHAR(100) NOT NULL
);
INSERT INTO tickets (title) VALUES ('Login bug');  -- ticket_id 自動為 1
~~~
`,
    examples: [
      { title: '建立索引', sql: "CREATE INDEX idx_orders_order_date ON orders (order_date);\nSELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'orders';", explain: '可以看到主鍵索引與新建的索引。' },
      { title: 'SERIAL', sql: "CREATE TABLE tickets (ticket_id SERIAL PRIMARY KEY, title VARCHAR(100) NOT NULL);\nINSERT INTO tickets (title) VALUES ('A'), ('B'), ('C');\nSELECT * FROM tickets;", explain: 'ticket_id 自動填入 1、2、3。' },
    ],
    practice: ex({
      id: 'c26-p',
      title: '替訂單日期建立索引',
      prompt: '請在 **orders** 表的 **order_date** 欄位上建立一個索引，名稱為 **idx_orders_order_date**。',
      solution: 'CREATE INDEX idx_orders_order_date ON orders (order_date);',
      checkQuery: "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'sandbox' AND tablename = 'orders' ORDER BY indexname",
      orderMatters: true,
      hints: ['CREATE INDEX 索引名稱 ON 表 (欄位);'],
    }),
    review: ex({
      id: 'c26-r',
      title: '自動編號的工單表',
      prompt: "請建立資料表 **tickets**：**ticket_id** 為自動遞增主鍵、**title VARCHAR(100) NOT NULL**。接著新增兩筆工單，title 依序為 **'Login bug'** 與 **'Slow page'**（不要手動指定 ticket_id）。",
      solution: "CREATE TABLE tickets (ticket_id SERIAL PRIMARY KEY, title VARCHAR(100) NOT NULL);\nINSERT INTO tickets (title) VALUES ('Login bug'), ('Slow page');",
      checkQuery: 'SELECT ticket_id, title FROM tickets ORDER BY ticket_id',
      orderMatters: true,
      hints: ['ticket_id SERIAL PRIMARY KEY', "INSERT INTO tickets (title) VALUES ('Login bug'), ('Slow page');"],
    }),
    summary: `
- \`CREATE INDEX 名 ON 表 (欄)\` 加速查詢
- PostgreSQL 自動遞增：SERIAL 或 GENERATED ... AS IDENTITY
- MySQL：AUTO_INCREMENT
`,
  },
  {
    id: 'c27',
    order: 30,
    part: 'database',
    title: '日期 Dates',
    w3Topics: 'SQL Dates',
    concept: `
### 日期型別
| 型別 | 範例 |
|---|---|
| \`DATE\` | 2024-03-05 |
| \`TIMESTAMP\` | 2024-03-05 14:30:00 |
| \`INTERVAL\` | 3 days、1 month |

日期字串格式用 \`'YYYY-MM-DD'\`，可以直接和 DATE 欄位比較。

### 常用函數（PostgreSQL）
~~~sql
SELECT CURRENT_DATE;                              -- 今天
SELECT EXTRACT(YEAR FROM order_date) FROM orders; -- 取年份（MONTH、DAY 亦可）
SELECT DATE_TRUNC('month', order_date) FROM orders;  -- 截到月初
SELECT TO_CHAR(order_date, 'YYYY-MM') FROM orders;   -- 格式化成 '2024-03'
SELECT order_date + INTERVAL '7 days' FROM orders;   -- 加 7 天
SELECT DATE '2024-03-10' - DATE '2024-03-01';        -- 相減得到天數：9
~~~

### 和 MySQL 對照
| 需求 | PostgreSQL | MySQL |
|---|---|---|
| 年-月字串 | \`TO_CHAR(d, 'YYYY-MM')\` | \`DATE_FORMAT(d, '%Y-%m')\` |
| 相差天數 | \`d1 - d2\` | \`DATEDIFF(d1, d2)\` |
| 加天數 | \`d + INTERVAL '1 day'\` 或 \`d + 1\` | \`DATE_ADD(d, INTERVAL 1 DAY)\` |

「每月營收」這類題目，幾乎都是 \`GROUP BY TO_CHAR(日期, 'YYYY-MM')\`。
`,
    examples: [
      { title: '取年月', sql: "SELECT order_id, order_date, EXTRACT(MONTH FROM order_date) AS m, TO_CHAR(order_date, 'YYYY-MM') AS ym FROM orders;", explain: 'EXTRACT 回傳數字，TO_CHAR 回傳字串。' },
      { title: '日期相減', sql: "SELECT first_name, hire_date, DATE '2024-12-31' - hire_date AS days_employed FROM employees;", explain: 'DATE - DATE 得到整數天數。' },
    ],
    practice: ex({
      id: 'c27-p',
      title: '三月的訂單',
      prompt: '請找出 **2024 年 3 月** 的所有訂單，輸出 **order_id** 與 **order_date**。',
      expectedColumns: 'order_id | order_date',
      solution: "SELECT order_id, order_date FROM orders WHERE order_date >= '2024-03-01' AND order_date < '2024-04-01';",
      hints: ["order_date >= '2024-03-01' AND order_date < '2024-04-01'", '或 EXTRACT(YEAR ...) = 2024 AND EXTRACT(MONTH ...) = 3'],
    }),
    review: ex({
      id: 'c27-r',
      title: '每月訂單數',
      prompt: "請算出**每個月**的訂單數，輸出 **month**（格式 'YYYY-MM'，例如 '2024-01'）與 **order_count**，依 month 由早到晚排序。",
      expectedColumns: 'month | order_count',
      solution: "SELECT TO_CHAR(order_date, 'YYYY-MM') AS month, COUNT(*) AS order_count FROM orders GROUP BY TO_CHAR(order_date, 'YYYY-MM') ORDER BY month;",
      orderMatters: true,
      hints: ["TO_CHAR(order_date, 'YYYY-MM')", 'GROUP BY 同一個運算式（或別名）'],
    }),
    summary: `
- DATE、TIMESTAMP、INTERVAL
- \`TO_CHAR(d, 'YYYY-MM')\`、\`EXTRACT(MONTH FROM d)\`、\`DATE_TRUNC('month', d)\`
- \`d1 - d2\` = 天數；\`d + INTERVAL '1 day'\`
`,
  },
  {
    id: 'c28',
    order: 31,
    part: 'database',
    title: 'VIEW 檢視表',
    w3Topics: 'SQL Views',
    concept: `
**VIEW** 是一個「存起來的查詢」，用起來就像一張表，但不另外存資料——每次查詢 view 時才執行底層的 SELECT。

~~~sql
CREATE VIEW product_catalog AS
SELECT p.product_name, c.category_name, p.price
FROM products p
JOIN categories c ON c.category_id = p.category_id;

SELECT * FROM product_catalog WHERE price > 20;
~~~

### 用途
- 把複雜的 JOIN 包裝起來，讓別人好用
- 權限控管：只開放部分欄位
- 修改：\`CREATE OR REPLACE VIEW ...\`；刪除：\`DROP VIEW ...\`

> 下一章會學的 **CTE（WITH）** 可以看成是「只在這次查詢有效的 view」，在 LeetCode 中更常用。
`,
    examples: [
      { title: '建立與使用 view', sql: 'CREATE VIEW product_catalog AS\nSELECT p.product_name, c.category_name, p.price\nFROM products p JOIN categories c ON c.category_id = p.category_id;\nSELECT * FROM product_catalog WHERE price > 20;', explain: '查詢 view 就像查詢表。' },
    ],
    practice: ex({
      id: 'c28-p',
      title: '商品目錄 view',
      prompt: '請建立一個 view **product_catalog**，欄位為 **product_name**、**category_name**、**price**（products JOIN categories）。',
      solution: 'CREATE VIEW product_catalog AS SELECT p.product_name, c.category_name, p.price FROM products p JOIN categories c ON c.category_id = p.category_id;',
      checkQuery: 'SELECT * FROM product_catalog ORDER BY product_name',
      orderMatters: true,
      hints: ['CREATE VIEW product_catalog AS SELECT ...'],
    }),
    review: ex({
      id: 'c28-r',
      title: '德國顧客 view',
      prompt: "請建立一個 view **german_customers**，包含 **country = 'Germany'** 的顧客的 **customer_id**、**customer_name**、**city**。",
      solution: "CREATE VIEW german_customers AS SELECT customer_id, customer_name, city FROM customers WHERE country = 'Germany';",
      checkQuery: 'SELECT * FROM german_customers ORDER BY customer_id',
      orderMatters: true,
      hints: ['CREATE VIEW german_customers AS SELECT ... WHERE ...'],
    }),
    summary: `
- \`CREATE VIEW 名 AS SELECT ...\`：存起來的查詢
- \`CREATE OR REPLACE VIEW\`、\`DROP VIEW\`
- CTE 是一次性的 view
`,
  },
  {
    id: 'c29',
    order: 32,
    part: 'database',
    title: '資料型別與型別轉換',
    w3Topics: 'SQL Data Types · CAST',
    concept: `
### PostgreSQL 常用型別
| 類別 | 型別 | 說明 |
|---|---|---|
| 整數 | \`SMALLINT\`、\`INTEGER\`、\`BIGINT\` | |
| 小數 | \`NUMERIC(p, s)\` | 精確，適合金額 |
| 浮點 | \`REAL\`、\`DOUBLE PRECISION\` | 近似值，有誤差 |
| 文字 | \`VARCHAR(n)\`、\`TEXT\`、\`CHAR(n)\` | |
| 日期 | \`DATE\`、\`TIMESTAMP\`、\`INTERVAL\` | |
| 布林 | \`BOOLEAN\` | true / false |

### 型別轉換
~~~sql
SELECT CAST('123' AS INTEGER);
SELECT '123'::INTEGER;          -- PostgreSQL 簡寫
SELECT 5::NUMERIC / 2;          -- 2.5
~~~

### 比例計算（LeetCode 必考）
\`COUNT\` 回傳整數，整數 / 整數 = 整數：
~~~sql
SELECT COUNT(price) / COUNT(*) FROM products;                   -- 0 ❌
SELECT ROUND(COUNT(price)::NUMERIC / COUNT(*), 2) FROM products; -- 0.94 ✅
~~~
注意：PostgreSQL 的 \`ROUND(x, 2)\` 只接受 NUMERIC，如果 x 是 DOUBLE PRECISION 要先 \`::NUMERIC\`。
`,
    examples: [
      { title: '整數除法', sql: 'SELECT COUNT(price) / COUNT(*) AS wrong, ROUND(COUNT(price)::NUMERIC / COUNT(*), 2) AS correct FROM products;', explain: '15 / 16 在整數除法下是 0。' },
      { title: 'CAST', sql: "SELECT CAST('42' AS INTEGER) + 1 AS a, '3.14'::NUMERIC * 2 AS b;", explain: '文字轉數字。' },
    ],
    practice: ex({
      id: 'c29-p',
      title: '有標價商品的比例',
      prompt: '請算出**有標價的商品佔全部商品的比例** **priced_ratio**，四捨五入到小數 2 位（例如 0.94）。',
      expectedColumns: 'priced_ratio',
      solution: 'SELECT ROUND(COUNT(price)::NUMERIC / COUNT(*), 2) AS priced_ratio FROM products;',
      hints: ['COUNT(price) / COUNT(*) 是整數除法', '先轉型：COUNT(price)::NUMERIC'],
      commonMistakes: ['沒有轉型，整數除法得到 0。'],
    }),
    review: ex({
      id: 'c29-r',
      title: '文字價格加總',
      prompt: '有一張表 **raw_prices(item TEXT, price_text TEXT)**，價格被存成文字。請算出所有價格的總和 **total**（數值型別）。',
      extraSetupSql: "CREATE TABLE raw_prices (item TEXT, price_text TEXT);\nINSERT INTO raw_prices VALUES ('pen', '12.5'), ('book', '320'), ('bag', '899.9'), ('ink', '45');",
      solution: 'SELECT SUM(CAST(price_text AS NUMERIC)) AS total FROM raw_prices;',
      expectedColumns: 'total',
      hints: ['CAST(price_text AS NUMERIC) 或 price_text::NUMERIC'],
    }),
    summary: `
- NUMERIC 精確、DOUBLE 近似
- \`CAST(x AS 型別)\` 或 \`x::型別\`
- 比例：\`COUNT(...)::NUMERIC / COUNT(*)\`
`,
  },
];
