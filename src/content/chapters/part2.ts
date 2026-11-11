import type { Chapter } from '../types';
import { ex } from './helpers';

export const part2: Chapter[] = [
  {
    id: 'c13',
    order: 13,
    part: 'basic',
    title: '別名 Aliases',
    w3Topics: 'SQL Aliases',
    concept: `
\`AS\` 可以替**欄位**或**資料表**取暫時的名字。

### 欄位別名
~~~sql
SELECT product_name AS name, price AS unit_price FROM products;
~~~
- LeetCode 會**比對輸出欄位名稱**，所以題目要求 \`total_revenue\` 你就要 \`AS total_revenue\`。
- 別名含空白或大寫時要用雙引號：\`AS "Unit Price"\`。

### 表別名
~~~sql
SELECT o.order_id, c.customer_name
FROM orders AS o, customers AS c
WHERE o.customer_id = c.customer_id;
~~~
表別名在 JOIN（下一章）時非常常用，\`AS\` 可以省略：\`FROM orders o\`。

### 字串串接
~~~sql
SELECT CONCAT(address, ', ', city, ', ', country) AS full_address FROM customers;
SELECT address || ', ' || city AS addr FROM customers;   -- PostgreSQL 的串接運算子
~~~
注意：\`||\` 只要有一邊是 NULL 結果就是 NULL；\`CONCAT\` 會把 NULL 當成空字串。
`,
    examples: [
      { title: '欄位別名', sql: 'SELECT product_name AS name, price AS unit_price FROM products;', explain: '輸出欄位名稱變成 name、unit_price。' },
      { title: 'CONCAT vs ||', sql: "SELECT customer_name, CONCAT(city, ' / ', postal_code) AS a, city || ' / ' || postal_code AS b FROM customers WHERE customer_id IN (1, 15);", explain: 'postal_code 為 NULL 時，|| 的結果整個變 NULL。' },
    ],
    practice: ex({
      id: 'c13-p',
      title: '重新命名欄位',
      prompt: '請列出所有商品，輸出兩個欄位：**name**（商品名稱）與 **unit_price**（價格）。**欄位名稱必須完全相同**。',
      expectedColumns: 'name | unit_price',
      solution: 'SELECT product_name AS name, price AS unit_price FROM products;',
      strictColumns: true,
      hints: ['product_name AS name'],
    }),
    review: ex({
      id: 'c13-r',
      title: '組合完整地址',
      prompt: '請列出每位顧客的 **customer**（顧客名稱）與 **full_address**，格式為「address, city, country」（逗號後有一個空白）。**address 為 NULL 時當成空字串**（所以請用 CONCAT）。',
      expectedColumns: 'customer | full_address',
      solution: "SELECT customer_name AS customer, CONCAT(address, ', ', city, ', ', country) AS full_address FROM customers;",
      strictColumns: true,
      hints: ["CONCAT(address, ', ', city, ', ', country)", '|| 遇到 NULL 會變 NULL，隱藏測資有 address 為 NULL 的顧客'],
    }),
    summary: `
- \`欄 AS 別名\`、\`表 AS 別名\`（AS 可省略）
- LeetCode 會比對欄位名稱
- CONCAT 把 NULL 當空字串；|| 遇 NULL 變 NULL
`,
  },
  {
    id: 'c14',
    order: 14,
    part: 'basic',
    title: 'JOIN 合併資料表',
    w3Topics: 'SQL Joins · Inner Join · Left Join · Right Join · Full Join',
    concept: `
資料通常分散在多張表，例如 orders 只存 customer_id，顧客名稱在 customers。**JOIN** 依照關聯欄位把它們接起來。

~~~sql
SELECT o.order_id, c.customer_name
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id;
~~~

### 四種 JOIN
| 類型 | 結果 |
|---|---|
| \`INNER JOIN\`（或 JOIN） | 只保留**兩邊都配對得到**的列 |
| \`LEFT JOIN\` | 保留**左表全部**，右表配不到補 NULL |
| \`RIGHT JOIN\` | 保留右表全部（較少用，可改寫成 LEFT JOIN） |
| \`FULL JOIN\` | 兩邊全部保留（MySQL 不支援） |

### LEFT JOIN 是 LeetCode 最常用的 JOIN
「列出**所有**顧客，以及他們的訂單（沒有訂單也要列出）」→ LEFT JOIN。

### 陷阱：LEFT JOIN 後在 WHERE 篩右表
~~~sql
-- ❌ WHERE 會把右表為 NULL 的列濾掉，LEFT JOIN 變成 INNER JOIN
SELECT ... FROM customers c LEFT JOIN orders o ON ... WHERE o.shipper_id = 1;
-- ✅ 把右表條件放在 ON
SELECT ... FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.shipper_id = 1;
~~~
`,
    examples: [
      { title: 'INNER JOIN', sql: 'SELECT o.order_id, o.order_date, c.customer_name\nFROM orders o\nJOIN customers c ON o.customer_id = c.customer_id;', explain: '每筆訂單配上顧客名稱。' },
      { title: '三張表', sql: 'SELECT o.order_id, p.product_name, d.quantity\nFROM order_details d\nJOIN orders o ON o.order_id = d.order_id\nJOIN products p ON p.product_id = d.product_id\nORDER BY o.order_id;', explain: 'JOIN 可以一直接下去。' },
      { title: 'LEFT JOIN', sql: 'SELECT c.customer_name, o.order_id\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id\nORDER BY c.customer_id;', explain: '沒有訂單的顧客，order_id 是 NULL。' },
    ],
    practice: ex({
      id: 'c14-p',
      title: '訂單與顧客名稱',
      prompt: '請列出每筆訂單的 **order_id**、**order_date** 與下單顧客的 **customer_name**。',
      expectedColumns: 'order_id | order_date | customer_name',
      solution: 'SELECT o.order_id, o.order_date, c.customer_name FROM orders o JOIN customers c ON o.customer_id = c.customer_id;',
      hints: ['orders JOIN customers ON orders.customer_id = customers.customer_id'],
    }),
    review: ex({
      id: 'c14-r',
      title: '所有顧客與訂單',
      prompt: '請列出**所有顧客**的 **customer_name** 與其訂單的 **order_id**。**沒有訂單的顧客也要列出**（order_id 為 NULL）。',
      expectedColumns: 'customer_name | order_id',
      solution: 'SELECT c.customer_name, o.order_id FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id;',
      hints: ['以 customers 為左表做 LEFT JOIN'],
      commonMistakes: ['用 INNER JOIN 會漏掉沒有訂單的顧客。'],
    }),
    summary: `
- \`A JOIN B ON A.key = B.key\`
- INNER 只留配對成功；LEFT 保留左表全部
- LEFT JOIN 的右表條件放在 ON，不要放 WHERE
`,
  },
  {
    id: 'c15',
    order: 15,
    part: 'basic',
    title: 'Self Join 自我連接',
    w3Topics: 'SQL Self Join',
    concept: `
**Self Join** 是一張表和**自己** JOIN。常見於「員工與主管在同一張表」：

| employee_id | first_name | manager_id |
|---|---|---|
| 1 | David | NULL |
| 2 | Grace | 1 |
| 3 | Kevin | 2 |

~~~sql
SELECT e.first_name AS employee, m.first_name AS manager
FROM employees e
JOIN employees m ON e.manager_id = m.employee_id;
~~~

關鍵：**一定要用兩個不同的表別名**（e 代表員工、m 代表主管）。

LeetCode 經典題：「薪水比主管高的員工」（181. Employees Earning More Than Their Managers）就是 Self Join。

### 配對同一張表的兩列
~~~sql
SELECT a.customer_name, b.customer_name, a.city
FROM customers a JOIN customers b
  ON a.city = b.city AND a.customer_id < b.customer_id;
~~~
用 \`<\` 避免 (A,B)、(B,A) 重複，也避免和自己配對。
`,
    examples: [
      { title: '員工與主管', sql: 'SELECT e.first_name AS employee, m.first_name AS manager\nFROM employees e\nJOIN employees m ON e.manager_id = m.employee_id;', explain: 'CEO 沒有主管，所以不會出現（INNER JOIN）。' },
      { title: '包含沒有主管的人', sql: 'SELECT e.first_name AS employee, m.first_name AS manager\nFROM employees e\nLEFT JOIN employees m ON e.manager_id = m.employee_id;', explain: '改成 LEFT JOIN。' },
    ],
    practice: ex({
      id: 'c15-p',
      title: '薪水比主管高？',
      prompt: '請列出每位**有主管**的員工：**employee**（員工 first_name）、**manager**（主管 first_name）、**employee_salary**、**manager_salary**。',
      expectedColumns: 'employee | manager | employee_salary | manager_salary',
      solution: 'SELECT e.first_name AS employee, m.first_name AS manager, e.salary AS employee_salary, m.salary AS manager_salary FROM employees e JOIN employees m ON e.manager_id = m.employee_id;',
      hints: ['employees e JOIN employees m ON e.manager_id = m.employee_id'],
    }),
    review: ex({
      id: 'c15-r',
      title: '同城市的顧客配對',
      prompt: '請找出**住在同一個城市**的顧客配對，列出 **customer_a**、**customer_b**（兩者的 customer_name）與 **city**。每一對只出現一次，且 **customer_a 的 customer_id 比 customer_b 小**。',
      expectedColumns: 'customer_a | customer_b | city',
      solution: 'SELECT a.customer_name AS customer_a, b.customer_name AS customer_b, a.city FROM customers a JOIN customers b ON a.city = b.city AND a.customer_id < b.customer_id;',
      hints: ['ON a.city = b.city AND a.customer_id < b.customer_id'],
    }),
    summary: `
- 同一張表用兩個別名 JOIN 自己
- 員工-主管：\`e.manager_id = m.employee_id\`
- 配對去重：\`a.id < b.id\`
`,
  },
  {
    id: 'c16',
    order: 16,
    part: 'basic',
    title: 'UNION 與 UNION ALL',
    w3Topics: 'SQL Union · SQL Union All',
    concept: `
\`UNION\` 把兩個查詢的結果**上下合併**：

~~~sql
SELECT city FROM customers
UNION
SELECT city FROM suppliers;
~~~

### 規則
- 兩邊的**欄位數量要相同**，型別要相容。
- 結果欄位名稱取自**第一個**查詢。
- \`UNION\` 會**去除重複**；\`UNION ALL\` **保留重複**（也比較快）。
- ORDER BY 只能寫在最後，作用於整個結果。

### 搭配常數欄位標記來源
~~~sql
SELECT 'Customer' AS type, customer_name AS name, city FROM customers
UNION ALL
SELECT 'Supplier', supplier_name, city FROM suppliers;
~~~

LeetCode 中「把兩種角色的資料合在一起統計」（例如 602. Friend Requests II）常用 UNION ALL。
`,
    examples: [
      { title: 'UNION 去重', sql: 'SELECT country FROM customers\nUNION\nSELECT country FROM suppliers\nORDER BY country;', explain: '同一個國家只會出現一次。' },
      { title: 'UNION ALL 保留重複', sql: "SELECT 'Customer' AS type, city FROM customers\nUNION ALL\nSELECT 'Supplier', city FROM suppliers;", explain: '加上 type 欄位標記資料來源。' },
    ],
    practice: ex({
      id: 'c16-p',
      title: '所有出現過的國家',
      prompt: '請列出**顧客或供應商**所在的所有國家（**不重複**），輸出欄位 **country**。',
      expectedColumns: 'country',
      solution: 'SELECT country FROM customers UNION SELECT country FROM suppliers;',
      hints: ['兩個 SELECT 中間用 UNION'],
    }),
    review: ex({
      id: 'c16-r',
      title: '聯絡人名冊',
      prompt: '請把顧客與供應商的聯絡人合併成一份名冊：欄位為 **type**（顧客為 \'Customer\'、供應商為 \'Supplier\'）、**name**（customer_name 或 supplier_name）、**contact_name**。**保留所有列**，不要去重。',
      expectedColumns: 'type | name | contact_name',
      solution: "SELECT 'Customer' AS type, customer_name AS name, contact_name FROM customers UNION ALL SELECT 'Supplier', supplier_name, contact_name FROM suppliers;",
      strictColumns: true,
      hints: ["SELECT 'Customer' AS type, ...", 'UNION ALL'],
    }),
    summary: `
- UNION 去重、UNION ALL 保留
- 兩邊欄位數要相同，欄名取第一個查詢
- 常數欄位可標記資料來源
`,
  },
  {
    id: 'c17',
    order: 17,
    part: 'basic',
    title: 'GROUP BY 分組',
    w3Topics: 'SQL Group By',
    concept: `
\`GROUP BY\` 把資料依某欄位**分組**，每組各算一次彙總函數：

~~~sql
SELECT country, COUNT(*) AS customer_count
FROM customers
GROUP BY country;
~~~

### 黃金規則
SELECT 中的欄位，**要嘛出現在 GROUP BY，要嘛被彙總函數包起來**。
~~~sql
SELECT country, city, COUNT(*) FROM customers GROUP BY country;  -- ❌ city 沒有分組也沒彙總
~~~
（MySQL 某些設定下不會報錯但結果不可靠；PostgreSQL 會直接報錯，反而幫你抓 bug。）

### 搭配 JOIN
~~~sql
SELECT c.category_name, COUNT(p.product_id) AS product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.category_id
GROUP BY c.category_name;
~~~
用 LEFT JOIN + \`COUNT(右表欄位)\` 可以讓「0 個」的組也出現。

### SQL 執行順序
\`FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT\`
所以 WHERE 不能使用 SELECT 裡的別名，也不能放彙總函數。
`,
    examples: [
      { title: '每國顧客數', sql: 'SELECT country, COUNT(*) AS customer_count\nFROM customers\nGROUP BY country\nORDER BY customer_count DESC;', explain: 'ORDER BY 可以使用 SELECT 的別名。' },
      { title: '每筆訂單的總數量', sql: 'SELECT order_id, SUM(quantity) AS total_qty\nFROM order_details\nGROUP BY order_id\nORDER BY order_id;', explain: '每筆訂單一列。' },
      { title: '多欄分組', sql: 'SELECT country, city, COUNT(*) AS n\nFROM customers\nGROUP BY country, city;', explain: '國家+城市的組合各算一次。' },
    ],
    practice: ex({
      id: 'c17-p',
      title: '各國顧客數',
      prompt: '請算出**每個國家**的顧客數，輸出 **country** 與 **customer_count**。',
      expectedColumns: 'country | customer_count',
      solution: 'SELECT country, COUNT(*) AS customer_count FROM customers GROUP BY country;',
      hints: ['GROUP BY country', 'COUNT(*)'],
    }),
    review: ex({
      id: 'c17-r',
      title: '各分類商品數',
      prompt: '請算出**每個分類**的商品數，輸出 **category_name** 與 **product_count**。**沒有商品的分類也要列出，數量為 0**。',
      expectedColumns: 'category_name | product_count',
      solution: 'SELECT c.category_name, COUNT(p.product_id) AS product_count FROM categories c LEFT JOIN products p ON p.category_id = c.category_id GROUP BY c.category_id, c.category_name;',
      hints: ['categories LEFT JOIN products', 'COUNT(p.product_id) 而不是 COUNT(*)，沒配對到的組才會是 0'],
      commonMistakes: ['用 COUNT(*) 會讓沒有商品的分類算成 1。', '用 INNER JOIN 會漏掉沒有商品的分類。'],
    }),
    summary: `
- \`GROUP BY 欄\` + 彙總函數 = 每組一列
- SELECT 的欄位必須在 GROUP BY 中或被彙總
- LEFT JOIN + COUNT(右表欄位) 讓 0 也出現
- 執行順序：FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY
`,
  },
  {
    id: 'c18',
    order: 18,
    part: 'basic',
    title: 'HAVING 篩選分組',
    w3Topics: 'SQL Having',
    concept: `
\`WHERE\` 在**分組前**篩選「列」；\`HAVING\` 在**分組後**篩選「組」。

~~~sql
SELECT country, COUNT(*) AS customer_count
FROM customers
GROUP BY country
HAVING COUNT(*) >= 2;
~~~

### WHERE vs HAVING
| | WHERE | HAVING |
|---|---|---|
| 時機 | 分組前 | 分組後 |
| 篩選對象 | 每一列 | 每一組 |
| 可用彙總函數 | ❌ | ✅ |

兩者可以同時使用：
~~~sql
SELECT customer_id, COUNT(*) AS n
FROM orders
WHERE order_date >= '2024-03-01'   -- 先只看三月以後的訂單
GROUP BY customer_id
HAVING COUNT(*) >= 2;              -- 再留下下單 2 次以上的顧客
~~~

LeetCode 經典：「找出重複的 Email」（182. Duplicate Emails）就是 \`GROUP BY email HAVING COUNT(*) > 1\`。
`,
    examples: [
      { title: 'HAVING', sql: 'SELECT country, COUNT(*) AS customer_count\nFROM customers\nGROUP BY country\nHAVING COUNT(*) >= 2;', explain: '只留顧客數 ≥ 2 的國家。' },
      { title: 'WHERE + HAVING', sql: "SELECT customer_id, COUNT(*) AS n\nFROM orders\nWHERE order_date >= '2024-03-01'\nGROUP BY customer_id\nHAVING COUNT(*) >= 2;", explain: '先篩列、再篩組。' },
    ],
    practice: ex({
      id: 'c18-p',
      title: '熱門國家',
      prompt: '請找出**顧客數至少 2 位**的國家，輸出 **country** 與 **customer_count**。',
      expectedColumns: 'country | customer_count',
      solution: 'SELECT country, COUNT(*) AS customer_count FROM customers GROUP BY country HAVING COUNT(*) >= 2;',
      hints: ['GROUP BY 之後加 HAVING COUNT(*) >= 2'],
    }),
    review: ex({
      id: 'c18-r',
      title: '常客',
      prompt: '請找出**下單次數至少 3 次**的顧客，輸出 **customer_name** 與 **order_count**。',
      expectedColumns: 'customer_name | order_count',
      solution: 'SELECT c.customer_name, COUNT(*) AS order_count FROM orders o JOIN customers c ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.customer_name HAVING COUNT(*) >= 3;',
      hints: ['先 JOIN customers 取得名稱', 'GROUP BY 顧客，HAVING COUNT(*) >= 3'],
    }),
    summary: `
- WHERE 篩列（分組前）、HAVING 篩組（分組後）
- HAVING 可以用彙總函數
- 找重複：\`GROUP BY x HAVING COUNT(*) > 1\`
`,
  },
  {
    id: 'c19',
    order: 19,
    part: 'basic',
    title: 'EXISTS、ANY、ALL',
    w3Topics: 'SQL Exists · SQL Any, All',
    concept: `
這些運算子搭配**子查詢**（括號裡的另一個 SELECT）使用。

### EXISTS：子查詢有沒有結果
~~~sql
SELECT customer_name
FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);
~~~
子查詢裡引用了外層的 \`c.customer_id\`，稱為**相關子查詢**：對每位顧客檢查一次「有沒有訂單」。\`NOT EXISTS\` 就是「沒有」。

### ANY / ALL：和子查詢的每個值比較
~~~sql
-- 比「任一個」Dairy 商品貴
WHERE price > ANY (SELECT price FROM products WHERE category_id = 4)
-- 比「所有」Dairy 商品都貴
WHERE price > ALL (SELECT price FROM products WHERE category_id = 4)
~~~
\`= ANY (...)\` 等同 \`IN (...)\`。

> 實務上 \`> ALL\` 常改寫成 \`> (SELECT MAX(...))\`，可讀性更好。
`,
    examples: [
      { title: 'EXISTS', sql: 'SELECT customer_name FROM customers c\nWHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);', explain: '有下過訂單的顧客。' },
      { title: 'NOT EXISTS', sql: 'SELECT customer_name FROM customers c\nWHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);', explain: '從沒下過訂單的顧客。' },
      { title: '> ALL', sql: 'SELECT product_name, price FROM products\nWHERE price > ALL (SELECT price FROM products WHERE category_id = 4);', explain: '比所有乳製品都貴的商品。' },
    ],
    practice: ex({
      id: 'c19-p',
      title: '買過 Oolong Tea 的顧客',
      prompt: '請找出**曾經買過 product_id = 1（Oolong Tea）** 的顧客，輸出 **customer_name**。請使用 **EXISTS**（每位顧客只出現一次）。',
      expectedColumns: 'customer_name',
      solution: 'SELECT c.customer_name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o JOIN order_details d ON d.order_id = o.order_id WHERE o.customer_id = c.customer_id AND d.product_id = 1);',
      hints: ['子查詢中 JOIN orders 與 order_details', 'WHERE o.customer_id = c.customer_id AND d.product_id = 1'],
      commonMistakes: ['直接 JOIN 三張表會讓買過多次的顧客重複出現。'],
    }),
    review: ex({
      id: 'c19-r',
      title: '比所有乳製品都貴',
      prompt: '請找出**價格高於所有 Dairy 類（category_id = 4）商品**的商品，輸出 **product_name** 與 **price**。',
      expectedColumns: 'product_name | price',
      solution: 'SELECT product_name, price FROM products WHERE price > ALL (SELECT price FROM products WHERE category_id = 4);',
      hints: ['price > ALL (SELECT price FROM products WHERE category_id = 4)'],
    }),
    summary: `
- \`EXISTS (子查詢)\`：有沒有結果；常用相關子查詢
- \`> ANY\` 比任一個大、\`> ALL\` 比全部大
- \`= ANY\` 等同 IN
`,
  },
  {
    id: 'c20',
    order: 20,
    part: 'basic',
    title: 'INSERT INTO SELECT 與 SELECT INTO',
    w3Topics: 'SQL Select Into · SQL Insert Into Select',
    concept: `
### INSERT INTO ... SELECT：把查詢結果塞進**已存在**的表
~~~sql
INSERT INTO customers_backup (customer_id, customer_name, country)
SELECT customer_id, customer_name, country
FROM customers
WHERE country = 'Germany';
~~~
欄位數量與型別要對應。

### 用查詢結果建立**新表**
w3schools 介紹的是 \`SELECT ... INTO 新表 FROM ...\`（SQL Server 語法）。PostgreSQL 也支援，但更通用的寫法是：
~~~sql
CREATE TABLE big_orders AS
SELECT * FROM order_details WHERE quantity >= 20;
~~~
MySQL 只支援 \`CREATE TABLE ... AS SELECT\`。
`,
    examples: [
      { title: 'CREATE TABLE AS', sql: 'CREATE TABLE cheap_products AS\nSELECT product_id, product_name, price FROM products WHERE price < 10;\nSELECT * FROM cheap_products;', explain: '建立新表並查看內容。' },
      { title: 'SELECT INTO（PostgreSQL 也支援）', sql: "SELECT customer_id, customer_name INTO uk_customers FROM customers WHERE country = 'UK';\nSELECT * FROM uk_customers;", explain: '效果相同。' },
    ],
    practice: ex({
      id: 'c20-p',
      title: '備份德國顧客',
      prompt: '已經有一張空的表 **customers_backup(customer_id, customer_name, country)**。請把 **country 為 Germany** 的顧客的這三個欄位**複製進去**。',
      extraSetupSql: 'CREATE TABLE customers_backup (customer_id INTEGER, customer_name VARCHAR(80), country VARCHAR(50));',
      solution: "INSERT INTO customers_backup (customer_id, customer_name, country) SELECT customer_id, customer_name, country FROM customers WHERE country = 'Germany';",
      checkQuery: 'SELECT * FROM customers_backup ORDER BY customer_id',
      hints: ['INSERT INTO customers_backup (...) SELECT ... FROM customers WHERE ...'],
    }),
    review: ex({
      id: 'c20-r',
      title: '建立大量訂單表',
      prompt: '請用查詢結果建立一張新表 **big_orders**，內容是 order_details 中 **quantity >= 20** 的所有欄位與資料。',
      solution: 'CREATE TABLE big_orders AS SELECT * FROM order_details WHERE quantity >= 20;',
      checkQuery: 'SELECT * FROM big_orders ORDER BY order_detail_id',
      hints: ['CREATE TABLE big_orders AS SELECT ...', '或 SELECT * INTO big_orders FROM ...'],
    }),
    summary: `
- \`INSERT INTO 表 (...) SELECT ...\`：塞進已存在的表
- \`CREATE TABLE 新表 AS SELECT ...\`：用結果建新表
`,
  },
  {
    id: 'c21',
    order: 21,
    part: 'basic',
    title: 'CASE 條件運算',
    w3Topics: 'SQL Case',
    concept: `
\`CASE\` 就是 SQL 的 if / else：

~~~sql
SELECT product_name, price,
  CASE
    WHEN price IS NULL THEN 'Unknown'
    WHEN price >= 20   THEN 'High'
    WHEN price >= 10   THEN 'Medium'
    ELSE 'Low'
  END AS price_level
FROM products;
~~~

- 由上往下判斷，**第一個成立的 WHEN** 就決定結果，所以順序很重要。
- 沒有 ELSE 且都不成立時，結果是 NULL。

### CASE + 彙總：條件計數（LeetCode 超常用）
~~~sql
SELECT
  SUM(CASE WHEN price < 10 THEN 1 ELSE 0 END)  AS cheap_count,
  SUM(CASE WHEN price >= 10 THEN 1 ELSE 0 END) AS expensive_count
FROM products;
~~~
PostgreSQL 也可以寫成 \`COUNT(*) FILTER (WHERE price < 10)\`。這個技巧可以把「列」轉成「欄」（樞紐分析），例如 1179. Reformat Department Table。
`,
    examples: [
      { title: '分級', sql: "SELECT product_name, price,\n  CASE WHEN price >= 20 THEN 'High'\n       WHEN price >= 10 THEN 'Medium'\n       ELSE 'Low' END AS price_level\nFROM products;", explain: '注意 NULL 價格會落到 ELSE → Low，所以要先判斷 NULL。' },
      { title: '條件計數', sql: 'SELECT\n  SUM(CASE WHEN country = \'UK\' THEN 1 ELSE 0 END) AS uk,\n  SUM(CASE WHEN country = \'Germany\' THEN 1 ELSE 0 END) AS germany\nFROM customers;', explain: '一個查詢算出多個條件的數量。' },
    ],
    practice: ex({
      id: 'c21-p',
      title: '商品價格分級',
      prompt: `請列出每項商品的 **product_name**、**price** 與 **price_level**：
- price 為 NULL → 'Unknown'
- price >= 20 → 'High'
- price >= 10 → 'Medium'
- 其他 → 'Low'`,
      expectedColumns: 'product_name | price | price_level',
      solution: "SELECT product_name, price, CASE WHEN price IS NULL THEN 'Unknown' WHEN price >= 20 THEN 'High' WHEN price >= 10 THEN 'Medium' ELSE 'Low' END AS price_level FROM products;",
      hints: ['先判斷 NULL，再由高到低判斷', 'CASE WHEN ... THEN ... ELSE ... END AS price_level'],
    }),
    review: ex({
      id: 'c21-r',
      title: '便宜與高價商品數',
      prompt: '請用**一個查詢、一列結果**算出：價格 **小於 10** 的商品數 **cheap_count**，以及價格 **大於等於 10** 的商品數 **expensive_count**（價格 NULL 的不算入任何一邊）。',
      expectedColumns: 'cheap_count | expensive_count',
      solution: 'SELECT SUM(CASE WHEN price < 10 THEN 1 ELSE 0 END) AS cheap_count, SUM(CASE WHEN price >= 10 THEN 1 ELSE 0 END) AS expensive_count FROM products;',
      hints: ['SUM(CASE WHEN 條件 THEN 1 ELSE 0 END)'],
    }),
    summary: `
- \`CASE WHEN ... THEN ... ELSE ... END\`，第一個成立的 WHEN 勝出
- 條件計數：\`SUM(CASE WHEN 條件 THEN 1 ELSE 0 END)\`
`,
  },
  {
    id: 'c22',
    order: 22,
    part: 'basic',
    title: 'NULL 函數：COALESCE',
    w3Topics: 'SQL Null Functions',
    concept: `
w3schools 列出各資料庫的 NULL 處理函數：

| 資料庫 | 函數 |
|---|---|
| MySQL | \`IFNULL(x, 預設)\`、\`COALESCE\` |
| SQL Server | \`ISNULL(x, 預設)\`、\`COALESCE\` |
| PostgreSQL | \`COALESCE\` |

**\`COALESCE(a, b, c, ...)\` 回傳第一個不是 NULL 的值**，是標準 SQL，各資料庫都能用，建議只記這個。

~~~sql
SELECT product_name, COALESCE(price, 0) AS price FROM products;
~~~

### 為什麼重要
任何數字和 NULL 運算結果都是 NULL：\`NULL * 12 = NULL\`、\`5 + NULL = NULL\`。

LeetCode 常見：LEFT JOIN 後沒配到的值是 NULL，題目要求顯示 0：
~~~sql
SELECT c.customer_name, COALESCE(SUM(d.quantity), 0) AS total_qty
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
LEFT JOIN order_details d ON d.order_id = o.order_id
GROUP BY c.customer_id, c.customer_name;
~~~

另一個實用函數 \`NULLIF(a, b)\`：a = b 時回傳 NULL，常用來**避免除以 0**：\`x / NULLIF(y, 0)\`。
`,
    examples: [
      { title: 'NULL 運算', sql: 'SELECT first_name, salary, salary * 12 AS annual FROM employees;', explain: 'Nina 的 salary 是 NULL，年薪也變 NULL。' },
      { title: 'COALESCE', sql: 'SELECT first_name, COALESCE(salary, 0) * 12 AS annual FROM employees;', explain: '把 NULL 當 0。' },
      { title: 'NULLIF 避免除以零', sql: 'SELECT 10 / NULLIF(0, 0) AS safe_div;', explain: '結果是 NULL 而不是錯誤。' },
    ],
    practice: ex({
      id: 'c22-p',
      title: '補上聯絡人',
      prompt: "請列出所有顧客的 **customer_name** 與 **contact**：contact 為 contact_name，若為 NULL 則顯示 **'(no contact)'**。",
      expectedColumns: 'customer_name | contact',
      solution: "SELECT customer_name, COALESCE(contact_name, '(no contact)') AS contact FROM customers;",
      hints: ["COALESCE(contact_name, '(no contact)')"],
    }),
    review: ex({
      id: 'c22-r',
      title: '每位顧客的購買總量',
      prompt: '請列出**所有顧客**的 **customer_name** 與購買商品的總數量 **total_qty**（所有訂單明細 quantity 加總）。**沒買過的顧客顯示 0**。',
      expectedColumns: 'customer_name | total_qty',
      solution: 'SELECT c.customer_name, COALESCE(SUM(d.quantity), 0) AS total_qty FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id LEFT JOIN order_details d ON d.order_id = o.order_id GROUP BY c.customer_id, c.customer_name;',
      hints: ['customers LEFT JOIN orders LEFT JOIN order_details', 'COALESCE(SUM(...), 0)'],
    }),
    summary: `
- \`COALESCE(a, b, ...)\` 回傳第一個非 NULL 值
- NULL 參與運算 → NULL
- \`NULLIF(y, 0)\` 避免除以 0
`,
  },
  {
    id: 'c23',
    order: 23,
    part: 'basic',
    title: '註解與運算子',
    w3Topics: 'SQL Comments · SQL Operators',
    concept: `
### 註解
~~~sql
-- 單行註解
SELECT * FROM products; -- 行尾註解
/* 多行
   註解 */
~~~

### 運算子整理
| 類別 | 運算子 |
|---|---|
| 算術 | \`+ - * / %\`（% 取餘數） |
| 比較 | \`= <> > < >= <=\` |
| 邏輯 | \`AND OR NOT\`、\`BETWEEN\`、\`IN\`、\`LIKE\`、\`EXISTS\` |
| 字串 | \`||\` 串接 |

### 整數除法陷阱（LeetCode 超常見）
**兩個整數相除，結果是整數**（小數被捨去）：
~~~sql
SELECT 7 / 2;        -- 3
SELECT 7 / 2.0;      -- 3.5000
SELECT 7::numeric / 2;  -- 3.5000
~~~
算比例、平均時一定要先轉成小數。MySQL 的 \`/\` 會回傳小數，但 PostgreSQL 不會，這是從 MySQL 轉過來最常見的錯誤。

### 奇偶數
\`id % 2 = 1\` 是奇數（LeetCode 620. Not Boring Movies）。
`,
    examples: [
      { title: '整數除法', sql: 'SELECT 7 / 2 AS int_div, 7 / 2.0 AS dec_div, 7 % 2 AS remainder;', explain: '7/2 = 3（不是 3.5）。' },
      { title: '算術運算', sql: '-- 每筆明細的小計\nSELECT d.order_detail_id, d.quantity, p.price, d.quantity * p.price AS subtotal\nFROM order_details d JOIN products p ON p.product_id = d.product_id;', explain: '欄位可以直接運算。' },
    ],
    practice: ex({
      id: 'c23-p',
      title: '偶數數量的明細',
      prompt: '請找出 order_details 中 **quantity 為偶數** 的明細，輸出 **order_detail_id** 與 **quantity**。',
      expectedColumns: 'order_detail_id | quantity',
      solution: 'SELECT order_detail_id, quantity FROM order_details WHERE quantity % 2 = 0;',
      hints: ['% 是取餘數'],
    }),
    review: ex({
      id: 'c23-r',
      title: '含稅價',
      prompt: '請列出**有標價**的商品 **product_name** 與含 5% 稅的價格 **price_with_tax**（四捨五入到小數 2 位）。',
      expectedColumns: 'product_name | price_with_tax',
      solution: 'SELECT product_name, ROUND(price * 1.05, 2) AS price_with_tax FROM products WHERE price IS NOT NULL;',
      hints: ['price * 1.05', 'ROUND(..., 2)'],
    }),
    summary: `
- \`--\` 單行、\`/* */\` 多行註解
- PostgreSQL 整數相除會捨去小數：\`7/2 = 3\`，請用 \`::numeric\` 或 \`* 1.0\`
- \`%\` 取餘數判斷奇偶
`,
  },
];
