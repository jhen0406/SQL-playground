import type { Chapter } from '../types';
import { ex } from './helpers';

export const part1: Chapter[] = [
  {
    id: 'c01',
    order: 1,
    part: 'basic',
    title: 'SQL 簡介與基本語法',
    w3Topics: 'SQL Intro · SQL Syntax',
    concept: `
**SQL**（Structured Query Language）是和「關聯式資料庫」溝通的語言。資料庫裡有很多張**資料表（table）**，每張表由**欄位（column）**與**列（row）**組成，就像 Excel 的工作表：

| customer_id | customer_name | country |
|---|---|---|
| 1 | Alpine Market | Germany |
| 2 | Casa Lupita | Mexico |

- 每一**列**是一筆資料（一位顧客）
- 每一**欄**是一種屬性（名稱、國家…）

### 最基本的語法

~~~sql
SELECT 欄位 FROM 資料表;
~~~

- \`SELECT\`、\`FROM\` 是**關鍵字**，大小寫都可以（習慣上寫大寫，比較好讀）。
- \`*\` 代表「所有欄位」。
- 一個 SQL 指令以分號 \`;\` 結尾。一次執行多個指令時一定要用分號隔開。

### 本平台的資料庫
「資料表」面板（電腦上在本頁右側，手機上在內容上方，點開即可；做練習題時則在題目旁的「資料表」分頁）可以看到這份**小商店資料庫**的所有表：customers（顧客）、products（商品）、orders（訂單）、order_details（訂單明細）等。本平台使用 **PostgreSQL**，LeetCode 的 SQL 題也可以選 PostgreSQL 作答。
`,
    examples: [
      { title: '查詢整張表', sql: 'SELECT * FROM customers;', explain: '取出 customers 表的所有欄位、所有列。' },
      { title: '關鍵字大小寫不拘', sql: 'select * from products;', explain: '小寫也能執行，但建議關鍵字用大寫，提高可讀性。' },
    ],
    practice: ex({
      id: 'c01-p',
      title: '查出所有貨運商',
      prompt: '請查出 **shippers**（貨運商）資料表的**所有欄位與所有資料**。',
      solution: 'SELECT * FROM shippers;',
      hints: ['使用 SELECT * FROM 表名;', '表名是 shippers'],
    }),
    review: ex({
      id: 'c01-r',
      title: '查出所有商品分類',
      prompt: '請查出 **categories**（商品分類）資料表的所有資料。',
      solution: 'SELECT * FROM categories;',
      hints: ['和查 shippers 的寫法一樣，只是換一張表'],
    }),
    summary: `
- 資料表 = 欄位（column）× 列（row）
- \`SELECT * FROM 表;\` 取出整張表
- 關鍵字大小寫不拘；指令以 \`;\` 結尾
`,
  },
  {
    id: 'c02',
    order: 2,
    part: 'basic',
    title: 'SELECT 與 SELECT DISTINCT',
    w3Topics: 'SQL Select · SQL Select Distinct',
    concept: `
### 選擇特定欄位
在 \`SELECT\` 後面列出想要的欄位，用逗號分隔，結果欄位的順序就是你列出的順序：

~~~sql
SELECT customer_name, city FROM customers;
~~~

實務上**盡量不要用 \`SELECT *\`**：只取需要的欄位，資料量更小、意圖更清楚。

### 去除重複：DISTINCT
\`SELECT DISTINCT\` 會把「完全相同」的列合併成一列：

~~~sql
SELECT DISTINCT country FROM customers;
~~~

若寫多個欄位，例如 \`SELECT DISTINCT country, city\`，是「國家+城市的組合」不重複。

搭配 \`COUNT\` 可以算出不重複的數量：\`SELECT COUNT(DISTINCT country) FROM customers;\`（COUNT 第 10 章會詳細介紹）。
`,
    examples: [
      { title: '只取兩個欄位', sql: 'SELECT customer_name, city FROM customers;', explain: '結果只會有 customer_name 與 city 兩欄。' },
      { title: '不重複的國家', sql: 'SELECT DISTINCT country FROM customers;', explain: '15 位顧客，但國家只有 11 個。' },
      { title: '不重複的數量', sql: 'SELECT COUNT(DISTINCT country) FROM customers;', explain: '直接算出有幾個不同的國家。' },
    ],
    practice: ex({
      id: 'c02-p',
      title: '顧客來自哪些國家',
      prompt: '請列出 customers 中**不重複**的 **country**（每個國家只出現一次）。',
      expectedColumns: 'country',
      solution: 'SELECT DISTINCT country FROM customers;',
      hints: ['在 SELECT 後面加上 DISTINCT', 'SELECT DISTINCT country FROM ...'],
    }),
    review: ex({
      id: 'c02-r',
      title: '商品名稱與價格',
      prompt: '請列出所有商品的 **product_name** 與 **price** 兩個欄位（順序：先 product_name 再 price）。',
      expectedColumns: 'product_name | price',
      solution: 'SELECT product_name, price FROM products;',
      hints: ['在 SELECT 後面依序寫出兩個欄位，用逗號分隔'],
    }),
    summary: `
- \`SELECT 欄1, 欄2 FROM 表\`：只取需要的欄位
- \`SELECT DISTINCT\`：去除重複的列
- \`COUNT(DISTINCT 欄)\`：不重複的數量
`,
  },
  {
    id: 'c03',
    order: 3,
    part: 'basic',
    title: 'WHERE 篩選條件',
    w3Topics: 'SQL Where',
    concept: `
\`WHERE\` 用來篩選「符合條件」的列：

~~~sql
SELECT * FROM customers WHERE country = 'Mexico';
~~~

### 常用比較運算子
| 運算子 | 意思 |
|---|---|
| \`=\` | 等於 |
| \`<>\` 或 \`!=\` | 不等於 |
| \`>\` \`<\` \`>=\` \`<=\` | 大於、小於… |
| \`BETWEEN a AND b\` | 介於 a 與 b（含頭尾，第 12 章） |
| \`LIKE\` | 模式比對（第 11 章） |
| \`IN (...)\` | 在清單中（第 12 章） |

### 注意事項
- **文字要用單引號** \`'Mexico'\`；數字不用引號 \`price > 20\`。
- PostgreSQL 中雙引號 \`"name"\` 代表「欄位名稱」，不是字串！這點和 MySQL 不同。
- PostgreSQL 的字串比較**區分大小寫**：\`'mexico'\` 不等於 \`'Mexico'\`。
`,
    examples: [
      { title: '文字條件', sql: "SELECT * FROM customers WHERE country = 'Mexico';", explain: '只留下國家為 Mexico 的顧客。' },
      { title: '數字條件', sql: 'SELECT product_name, price FROM products WHERE price >= 20;', explain: '價格大於等於 20 的商品。' },
      { title: '不等於', sql: "SELECT customer_name, country FROM customers WHERE country <> 'Germany';", explain: '排除德國顧客。' },
    ],
    practice: ex({
      id: 'c03-p',
      title: '找出英國顧客',
      prompt: '請找出 **country 為 UK** 的顧客，列出 **customer_name** 與 **city**。',
      expectedColumns: 'customer_name | city',
      solution: "SELECT customer_name, city FROM customers WHERE country = 'UK';",
      hints: ["WHERE country = 'UK'", '文字要用單引號'],
    }),
    review: ex({
      id: 'c03-r',
      title: '高價商品',
      prompt: '請找出 **價格大於 20** 的商品，列出 **product_name** 與 **price**。',
      expectedColumns: 'product_name | price',
      solution: 'SELECT product_name, price FROM products WHERE price > 20;',
      hints: ['數字比較不需要引號', '注意是「大於」不是「大於等於」'],
    }),
    summary: `
- \`WHERE 條件\` 篩選列
- 字串用單引號；PostgreSQL 字串比較區分大小寫
- \`<>\` 表示不等於
`,
  },
  {
    id: 'c04',
    order: 4,
    part: 'basic',
    title: 'ORDER BY 排序',
    w3Topics: 'SQL Order By',
    concept: `
\`ORDER BY\` 決定結果的排列順序：

~~~sql
SELECT product_name, price FROM products ORDER BY price;        -- 由小到大（ASC，預設）
SELECT product_name, price FROM products ORDER BY price DESC;   -- 由大到小
~~~

### 多欄排序
先依第一個欄位排，相同時再依第二個欄位排：

~~~sql
SELECT * FROM customers ORDER BY country ASC, customer_name DESC;
~~~

### NULL 的位置（重要！）
- **PostgreSQL**：NULL 被視為「最大」，所以 \`ASC\` 時 NULL 在最後、\`DESC\` 時 NULL 在**最前面**。
- **MySQL**：剛好相反，NULL 被視為最小。
- 可以明確指定：\`ORDER BY price DESC NULLS LAST\`。

> 沒有寫 ORDER BY 時，資料庫**不保證**任何順序。題目若要求排序，就一定要寫。
`,
    examples: [
      { title: '價格由高到低', sql: 'SELECT product_name, price FROM products ORDER BY price DESC;', explain: '注意 price 為 NULL 的 Dried Squid 排在最前面。' },
      { title: 'NULLS LAST', sql: 'SELECT product_name, price FROM products ORDER BY price DESC NULLS LAST;', explain: '把 NULL 移到最後。' },
      { title: '多欄排序', sql: 'SELECT country, customer_name FROM customers ORDER BY country, customer_name DESC;', explain: '同國家內再依名稱反向排序。' },
    ],
    practice: ex({
      id: 'c04-p',
      title: '商品依價格排序',
      prompt: '請列出所有商品的 **product_name** 與 **price**，依 **price 由低到高** 排序；價格相同時依 **product_name 字母順序（A→Z）** 排序。',
      expectedColumns: 'product_name | price',
      solution: 'SELECT product_name, price FROM products ORDER BY price ASC, product_name ASC;',
      orderMatters: true,
      hints: ['ORDER BY 可以接多個欄位，用逗號分隔', 'ORDER BY price, product_name'],
    }),
    review: ex({
      id: 'c04-r',
      title: '顧客依國家排序',
      prompt: '請列出顧客的 **country** 與 **customer_name**，先依 **country A→Z**，同國家內再依 **customer_name Z→A** 排序。',
      expectedColumns: 'country | customer_name',
      solution: 'SELECT country, customer_name FROM customers ORDER BY country ASC, customer_name DESC;',
      orderMatters: true,
      hints: ['第二個排序欄位要加 DESC'],
    }),
    summary: `
- \`ORDER BY 欄 [ASC|DESC]\`，預設 ASC
- 多欄排序：\`ORDER BY a, b DESC\`
- PostgreSQL 中 DESC 時 NULL 在最前，可用 \`NULLS LAST\`
`,
  },
  {
    id: 'c05',
    order: 5,
    part: 'basic',
    title: 'AND、OR、NOT',
    w3Topics: 'SQL And · SQL Or · SQL Not',
    concept: `
用邏輯運算子組合多個條件：

- \`AND\`：所有條件都成立
- \`OR\`：任一條件成立
- \`NOT\`：條件取反

~~~sql
SELECT * FROM customers WHERE country = 'Germany' AND city = 'Berlin';
SELECT * FROM customers WHERE city = 'Berlin' OR city = 'London';
SELECT * FROM customers WHERE NOT country = 'Spain';
~~~

### 優先順序：AND 比 OR 先算！
~~~sql
-- 錯誤示範：會變成 (country='Germany') OR (country='France' AND city <> 'Strasbourg')
WHERE country = 'Germany' OR country = 'France' AND city <> 'Strasbourg'

-- 正確：用括號明確表達
WHERE (country = 'Germany' OR country = 'France') AND city <> 'Strasbourg'
~~~

混用 AND 和 OR 時，**永遠加上括號**，這是 LeetCode 常見的錯誤來源。
`,
    examples: [
      { title: 'AND', sql: "SELECT * FROM customers WHERE country = 'Germany' AND city = 'Berlin';", explain: '兩個條件都要成立。' },
      { title: 'OR', sql: "SELECT customer_name, city FROM customers WHERE city = 'Berlin' OR city = 'London';", explain: '任一成立即可。' },
      { title: 'NOT', sql: "SELECT customer_name, country FROM customers WHERE NOT country = 'Mexico';", explain: '等同 country <> \'Mexico\'。' },
    ],
    practice: ex({
      id: 'c05-p',
      title: '德國或法國，但不是史特拉斯堡',
      prompt: '請找出 **country 為 Germany 或 France**，而且 **city 不是 Strasbourg** 的顧客，列出 **customer_name、city、country**。',
      expectedColumns: 'customer_name | city | country',
      solution: "SELECT customer_name, city, country FROM customers WHERE (country = 'Germany' OR country = 'France') AND city <> 'Strasbourg';",
      hints: ['OR 的部分要用括號包起來', "(country = 'Germany' OR country = 'France') AND ..."],
      commonMistakes: ['忘了加括號，AND 會先於 OR 計算，導致德國顧客的條件沒有套用 city 篩選。這份資料結果可能剛好相同，但邏輯是錯的，在別的資料上就會出錯。'],
    }),
    review: ex({
      id: 'c05-r',
      title: '非飲料類的便宜商品',
      prompt: '請找出 **category_id 不是 1**，而且 **price 小於 10** 的商品，列出 **product_name、category_id、price**。',
      expectedColumns: 'product_name | category_id | price',
      solution: 'SELECT product_name, category_id, price FROM products WHERE NOT category_id = 1 AND price < 10;',
      hints: ['NOT category_id = 1 或 category_id <> 1 都可以'],
    }),
    summary: `
- AND 全部成立、OR 任一成立、NOT 取反
- **AND 優先於 OR**，混用時一定加括號
`,
  },
  {
    id: 'c06',
    order: 6,
    part: 'basic',
    title: 'INSERT INTO 新增資料',
    w3Topics: 'SQL Insert Into',
    concept: `
\`INSERT INTO\` 新增一筆或多筆資料。

### 寫法一：指定欄位（推薦）
~~~sql
INSERT INTO customers (customer_id, customer_name, city, country)
VALUES (16, 'Nordic Fresh', 'Stockholm', 'Sweden');
~~~
沒有列出的欄位會是 \`NULL\`（或該欄位的預設值）。

### 寫法二：不指定欄位
~~~sql
INSERT INTO shippers VALUES (4, 'Island Courier', '02-5555-4444');
~~~
必須依照表的欄位順序提供**全部**的值，表結構改變時容易出錯。

### 一次新增多筆
~~~sql
INSERT INTO categories (category_id, category_name)
VALUES (8, 'Frozen'), (9, 'Tea Sets');
~~~

> 這類「修改資料」的題目，判題時會在你的 SQL 執行後，查詢資料表的最終狀態來比對。
`,
    examples: [
      {
        title: '新增後查詢',
        sql: "INSERT INTO categories (category_id, category_name) VALUES (8, 'Frozen'), (9, 'Tea Sets');\nSELECT * FROM categories;",
        explain: '可以一次執行多個指令，結果會顯示最後一個 SELECT。每次執行都會重置資料庫，不用擔心弄壞資料。',
      },
    ],
    practice: ex({
      id: 'c06-p',
      title: '新增一位顧客',
      prompt: `請新增一位顧客到 customers：

| 欄位 | 值 |
|---|---|
| customer_id | 16 |
| customer_name | Nordic Fresh |
| contact_name | Erik Berg |
| address | Kungsgatan 1 |
| city | Stockholm |
| postal_code | 11143 |
| country | Sweden |`,
      solution: "INSERT INTO customers (customer_id, customer_name, contact_name, address, city, postal_code, country) VALUES (16, 'Nordic Fresh', 'Erik Berg', 'Kungsgatan 1', 'Stockholm', '11143', 'Sweden');",
      checkQuery: 'SELECT * FROM customers ORDER BY customer_id',
      hints: ['INSERT INTO customers (欄位...) VALUES (值...);', 'postal_code 是文字欄位，要加引號'],
    }),
    review: ex({
      id: 'c06-r',
      title: '只填部分欄位',
      prompt: '請新增一項商品：**product_id = 17、product_name = Green Tea、category_id = 1、price = 9.50**。其他欄位（supplier_id、unit）不填，讓它們是 NULL。',
      solution: "INSERT INTO products (product_id, product_name, category_id, price) VALUES (17, 'Green Tea', 1, 9.50);",
      checkQuery: 'SELECT * FROM products ORDER BY product_id',
      hints: ['在 INSERT INTO products 後面用括號列出要填的欄位'],
    }),
    summary: `
- \`INSERT INTO 表 (欄...) VALUES (值...);\`
- 未列出的欄位 → NULL 或預設值
- \`VALUES (...), (...)\` 一次新增多筆
`,
  },
  {
    id: 'c07',
    order: 7,
    part: 'basic',
    title: 'NULL 值',
    w3Topics: 'SQL Null Values',
    concept: `
\`NULL\` 代表「**沒有值 / 未知**」，它不是 0，也不是空字串 \`''\`。

### 不能用 = 比較 NULL
~~~sql
SELECT * FROM customers WHERE postal_code = NULL;   -- ❌ 永遠查不到任何資料
SELECT * FROM customers WHERE postal_code IS NULL;  -- ✅
SELECT * FROM customers WHERE postal_code IS NOT NULL;
~~~

任何值和 NULL 比較（=、<>、>…）結果都是「未知」，WHERE 只會留下結果為「真」的列。

### LeetCode 經典陷阱
「找出 referee_id 不是 2 的顧客」：
~~~sql
WHERE referee_id <> 2                         -- ❌ 會漏掉 referee_id 是 NULL 的人
WHERE referee_id <> 2 OR referee_id IS NULL   -- ✅
~~~
`,
    examples: [
      { title: 'IS NULL', sql: 'SELECT customer_name, contact_name, postal_code FROM customers WHERE postal_code IS NULL;', explain: '找出沒有郵遞區號的顧客。' },
      { title: '= NULL 查不到', sql: 'SELECT * FROM customers WHERE postal_code = NULL;', explain: '結果是 0 列，這就是常見錯誤。' },
      { title: 'NULL 與不等於', sql: 'SELECT product_name, price FROM products WHERE price <> 12.5;', explain: '價格為 NULL 的 Dried Squid 不會出現在結果中。' },
    ],
    practice: ex({
      id: 'c07-p',
      title: '沒有聯絡人的顧客',
      prompt: '請找出 **contact_name 是 NULL** 的顧客，列出 **customer_id** 與 **customer_name**。',
      expectedColumns: 'customer_id | customer_name',
      solution: 'SELECT customer_id, customer_name FROM customers WHERE contact_name IS NULL;',
      hints: ['使用 IS NULL，而不是 = NULL'],
    }),
    review: ex({
      id: 'c07-r',
      title: '不是 Speedy Express 的訂單',
      prompt: '請找出 **shipper_id 不是 1** 的訂單（**包含 shipper_id 是 NULL、尚未指定貨運商的訂單**），列出 **order_id** 與 **shipper_id**。',
      expectedColumns: 'order_id | shipper_id',
      solution: 'SELECT order_id, shipper_id FROM orders WHERE shipper_id <> 1 OR shipper_id IS NULL;',
      hints: ['shipper_id <> 1 會漏掉 NULL', '再加上 OR shipper_id IS NULL'],
      commonMistakes: ['只寫 shipper_id <> 1，漏掉 NULL 的訂單 1017。'],
    }),
    summary: `
- NULL ≠ 0 ≠ ''，代表未知
- 用 \`IS NULL\` / \`IS NOT NULL\`，不能用 \`= NULL\`
- \`col <> x\` 不會包含 NULL 的列
`,
  },
  {
    id: 'c08',
    order: 8,
    part: 'basic',
    title: 'UPDATE 與 DELETE',
    w3Topics: 'SQL Update · SQL Delete',
    concept: `
### UPDATE：修改資料
~~~sql
UPDATE customers
SET contact_name = 'Chen Ya-ting', city = 'New Taipei'
WHERE customer_id = 15;
~~~

### DELETE：刪除資料
~~~sql
DELETE FROM order_details WHERE quantity < 5;
~~~

### ⚠️ 一定要寫 WHERE
\`UPDATE customers SET city = 'X';\` 會把**所有**顧客的城市都改掉；\`DELETE FROM customers;\` 會刪光整張表。實務上先用 \`SELECT ... WHERE ...\` 確認要影響的資料，再改成 UPDATE / DELETE。

### 外鍵限制
如果資料被其他表參照（例如商品被訂單明細使用），直接刪除會因為**外鍵約束**而失敗——這是在保護資料完整性。
`,
    examples: [
      { title: '先查再改', sql: "SELECT * FROM products WHERE category_id = 3;\n", explain: '先確認要調整的是哪些商品。' },
      {
        title: '漲價 10%',
        sql: 'UPDATE products SET price = price * 1.1 WHERE category_id = 3;\nSELECT product_name, price FROM products WHERE category_id = 3;',
        explain: 'SET 可以使用欄位原本的值做計算。',
      },
      { title: '外鍵保護', sql: 'DELETE FROM products WHERE product_id = 1;', explain: '商品 1 已被訂單明細使用，刪除會失敗並顯示錯誤。' },
    ],
    practice: ex({
      id: 'c08-p',
      title: '更新顧客資料',
      prompt: '顧客 **customer_id = 15**（Taipei Tea House）搬家了：請把它的 **contact_name 改成 Chen Ya-ting**、**city 改成 New Taipei**。其他顧客不能被修改。',
      solution: "UPDATE customers SET contact_name = 'Chen Ya-ting', city = 'New Taipei' WHERE customer_id = 15;",
      checkQuery: 'SELECT customer_id, contact_name, city FROM customers ORDER BY customer_id',
      hints: ['UPDATE 表 SET 欄1 = 值1, 欄2 = 值2 WHERE ...', '別忘了 WHERE customer_id = 15'],
    }),
    review: ex({
      id: 'c08-r',
      title: '刪除小量明細',
      prompt: '請刪除 order_details 中 **quantity 小於 5** 的所有明細。',
      solution: 'DELETE FROM order_details WHERE quantity < 5;',
      checkQuery: 'SELECT order_detail_id, quantity FROM order_details ORDER BY order_detail_id',
      hints: ['DELETE FROM 表 WHERE 條件;'],
    }),
    summary: `
- \`UPDATE 表 SET 欄 = 值 WHERE ...\`
- \`DELETE FROM 表 WHERE ...\`
- 忘了 WHERE 會影響整張表；外鍵會阻止刪除被參照的資料
`,
  },
  {
    id: 'c09',
    order: 9,
    part: 'basic',
    title: 'LIMIT 取前幾筆（SELECT TOP）',
    w3Topics: 'SQL Select Top',
    concept: `
w3schools 介紹了三種「只取前幾筆」的寫法，各資料庫不同：

| 資料庫 | 語法 |
|---|---|
| SQL Server | \`SELECT TOP 3 * FROM ...\` |
| MySQL / PostgreSQL / SQLite | \`... LIMIT 3\` |
| Oracle / 標準 SQL | \`... FETCH FIRST 3 ROWS ONLY\` |

LeetCode 的 MySQL 與 PostgreSQL 都使用 **LIMIT**：

~~~sql
SELECT product_name, price FROM products ORDER BY price DESC LIMIT 3;
~~~

### OFFSET：跳過前幾筆
~~~sql
SELECT * FROM orders ORDER BY order_date LIMIT 3 OFFSET 3;  -- 第 4~6 筆
~~~
這是 LeetCode「第 N 高的薪水」類題目的基礎。

> LIMIT 一定要搭配 ORDER BY，否則「前 3 筆」是哪 3 筆是不確定的。
`,
    examples: [
      { title: '最貴的 3 項（有陷阱）', sql: 'SELECT product_name, price FROM products ORDER BY price DESC LIMIT 3;', explain: 'PostgreSQL 中 NULL 排在 DESC 最前面，所以 Dried Squid 被算進前三名了！' },
      { title: '排除 NULL', sql: 'SELECT product_name, price FROM products WHERE price IS NOT NULL ORDER BY price DESC LIMIT 3;', explain: '先排除 NULL（或用 NULLS LAST）。' },
      { title: 'OFFSET', sql: 'SELECT order_id, order_date FROM orders ORDER BY order_date LIMIT 3 OFFSET 3;', explain: '跳過最早的 3 筆，取接下來的 3 筆。' },
    ],
    practice: ex({
      id: 'c09-p',
      title: '最貴的三項商品',
      prompt: '請找出**價格最高的 3 項商品**（不要包含價格是 NULL 的商品），列出 **product_name** 與 **price**，價格由高到低排序。',
      expectedColumns: 'product_name | price',
      solution: 'SELECT product_name, price FROM products WHERE price IS NOT NULL ORDER BY price DESC LIMIT 3;',
      orderMatters: true,
      hints: ['ORDER BY price DESC LIMIT 3', 'PostgreSQL 中 DESC 會把 NULL 排在最前面'],
      commonMistakes: ['沒有排除 NULL，導致 Dried Squid（price 為 NULL）排第一。'],
    }),
    review: ex({
      id: 'c09-r',
      title: '第 4 到第 6 早的訂單',
      prompt: '依 **order_date 由早到晚**（日期相同時依 order_id 由小到大）排序後，取出**第 4 到第 6 筆**訂單，列出 **order_id** 與 **order_date**。',
      expectedColumns: 'order_id | order_date',
      solution: 'SELECT order_id, order_date FROM orders ORDER BY order_date, order_id LIMIT 3 OFFSET 3;',
      orderMatters: true,
      hints: ['LIMIT 3 OFFSET 3'],
    }),
    summary: `
- \`ORDER BY ... LIMIT n\` 取前 n 筆
- \`LIMIT n OFFSET m\` 跳過 m 筆
- SQL Server 用 TOP，PostgreSQL/MySQL 用 LIMIT
`,
  },
  {
    id: 'c10',
    order: 10,
    part: 'basic',
    title: '彙總函數 MIN / MAX / COUNT / SUM / AVG',
    w3Topics: 'SQL Aggregate Functions · Min and Max · Count · Sum · Avg',
    concept: `
彙總函數把「很多列」計算成「一個值」：

| 函數 | 作用 |
|---|---|
| \`COUNT(*)\` | 列數（包含 NULL） |
| \`COUNT(欄)\` | 該欄**非 NULL** 的數量 |
| \`SUM(欄)\` | 加總 |
| \`AVG(欄)\` | 平均（忽略 NULL） |
| \`MIN(欄)\` / \`MAX(欄)\` | 最小 / 最大 |

~~~sql
SELECT COUNT(*) AS total, COUNT(price) AS priced, AVG(price) AS avg_price FROM products;
~~~

### 重點
- **彙總函數會忽略 NULL**（COUNT(*) 除外）。
- \`ROUND(值, 2)\` 四捨五入到小數 2 位，LeetCode 很常要求。
- 沒有 GROUP BY 時，整張表算成一列。想「每個分類各算一次」要用第 18 章的 GROUP BY。
- \`AS\` 可以替結果欄位取名字（第 13 章）。
`,
    examples: [
      { title: 'COUNT(*) vs COUNT(欄)', sql: 'SELECT COUNT(*) AS all_rows, COUNT(price) AS priced_rows FROM products;', explain: '16 項商品，但只有 15 項有價格。' },
      { title: '平均與四捨五入', sql: 'SELECT AVG(price) AS raw_avg, ROUND(AVG(price), 2) AS avg_2 FROM products;', explain: 'AVG 會忽略 NULL。' },
      { title: '加總', sql: 'SELECT SUM(quantity) AS total_qty FROM order_details WHERE order_id = 1003;', explain: '訂單 1003 一共買了幾件。' },
    ],
    practice: ex({
      id: 'c10-p',
      title: '商品價格統計',
      prompt: '請用**一個查詢**算出商品的：最低價 **min_price**、最高價 **max_price**、平均價 **avg_price**（四捨五入到小數 2 位）、有標價的商品數 **priced_count**。',
      expectedColumns: 'min_price | max_price | avg_price | priced_count',
      solution: 'SELECT MIN(price) AS min_price, MAX(price) AS max_price, ROUND(AVG(price), 2) AS avg_price, COUNT(price) AS priced_count FROM products;',
      hints: ['四個彙總函數可以寫在同一個 SELECT 裡', '有標價 = price 不是 NULL → COUNT(price)'],
      commonMistakes: ['用 COUNT(*) 計算有標價的商品數，會把 price 為 NULL 的商品也算進去。'],
    }),
    review: ex({
      id: 'c10-r',
      title: '訂單明細總量',
      prompt: '請算出 order_details 的**總銷售數量 total_quantity**（quantity 加總）與**明細筆數 line_count**。',
      expectedColumns: 'total_quantity | line_count',
      solution: 'SELECT SUM(quantity) AS total_quantity, COUNT(*) AS line_count FROM order_details;',
      hints: ['SUM(quantity)、COUNT(*)'],
    }),
    summary: `
- COUNT/SUM/AVG/MIN/MAX，除了 COUNT(*) 都忽略 NULL
- \`ROUND(x, 2)\` 四捨五入
- 沒有 GROUP BY → 整張表算成一列
`,
  },
  {
    id: 'c11',
    order: 11,
    part: 'basic',
    title: 'LIKE 與萬用字元',
    w3Topics: 'SQL Like · SQL Wildcards',
    concept: `
\`LIKE\` 做「模式比對」，搭配萬用字元：

| 萬用字元 | 意思 | 範例 |
|---|---|---|
| \`%\` | 任意長度（含 0）的任意字元 | \`'S%'\` 以 S 開頭 |
| \`_\` | 剛好一個任意字元 | \`'_a%'\` 第二個字是 a |

~~~sql
SELECT * FROM customers WHERE customer_name LIKE 'S%';     -- S 開頭
SELECT * FROM customers WHERE customer_name LIKE '%a';     -- a 結尾
SELECT * FROM products  WHERE product_name LIKE '%Tea%';   -- 包含 Tea
~~~

### 大小寫
- MySQL 的 LIKE 預設**不分**大小寫。
- PostgreSQL 的 LIKE **區分**大小寫；不分大小寫要用 \`ILIKE\`，或 \`LOWER(欄) LIKE '%tea%'\`。

在 LeetCode 寫 PostgreSQL 時，要特別注意題目是否要求不分大小寫。
`,
    examples: [
      { title: 'S 開頭', sql: "SELECT customer_name FROM customers WHERE customer_name LIKE 'S%';", explain: '% 代表後面接任意字元。' },
      { title: '區分大小寫', sql: "SELECT product_name FROM products WHERE product_name LIKE '%tea%';", explain: '小寫 tea 查不到 Oolong Tea！' },
      { title: 'ILIKE', sql: "SELECT product_name FROM products WHERE product_name ILIKE '%tea%';", explain: 'ILIKE 不分大小寫。' },
      { title: '_ 單一字元', sql: "SELECT customer_name FROM customers WHERE customer_name LIKE '_a%';", explain: '第二個字母是 a。' },
    ],
    practice: ex({
      id: 'c11-p',
      title: 'S 開頭的顧客',
      prompt: '請找出 **customer_name 以大寫 S 開頭** 的顧客，列出 **customer_name** 與 **country**。',
      expectedColumns: 'customer_name | country',
      solution: "SELECT customer_name, country FROM customers WHERE customer_name LIKE 'S%';",
      hints: ["LIKE 'S%'"],
    }),
    review: ex({
      id: 'c11-r',
      title: '名稱含 tea 的商品',
      prompt: '請找出 **product_name 中包含 "tea"（不分大小寫）** 的商品，列出 **product_id** 與 **product_name**。',
      expectedColumns: 'product_id | product_name',
      solution: "SELECT product_id, product_name FROM products WHERE product_name ILIKE '%tea%';",
      hints: ['PostgreSQL 的 LIKE 會區分大小寫', '試試 ILIKE 或 LOWER(product_name) LIKE ...'],
    }),
    summary: `
- \`%\` 任意長度、\`_\` 單一字元
- PostgreSQL：LIKE 區分大小寫，ILIKE 不區分
`,
  },
  {
    id: 'c12',
    order: 12,
    part: 'basic',
    title: 'IN 與 BETWEEN',
    w3Topics: 'SQL In · SQL Between',
    concept: `
### IN：在清單之中
~~~sql
SELECT * FROM customers WHERE country IN ('Germany', 'France', 'UK');
-- 等同 country = 'Germany' OR country = 'France' OR country = 'UK'
~~~
\`NOT IN\` 則是不在清單中。IN 也可以接子查詢（第 33 章）。

### BETWEEN：介於範圍（含頭尾）
~~~sql
SELECT * FROM products WHERE price BETWEEN 10 AND 20;   -- 10 <= price <= 20
SELECT * FROM orders WHERE order_date BETWEEN '2024-02-01' AND '2024-03-31';
~~~

### 日期範圍的小陷阱
如果欄位是**時間戳記**（含時分秒），\`BETWEEN '2024-02-01' AND '2024-03-31'\` 會漏掉 3/31 當天 00:00 以後的資料。更穩健的寫法是**半開區間**：
~~~sql
WHERE order_date >= '2024-02-01' AND order_date < '2024-04-01'
~~~
`,
    examples: [
      { title: 'IN', sql: "SELECT customer_name, country FROM customers WHERE country IN ('Germany', 'France');", explain: '比一堆 OR 簡潔。' },
      { title: 'BETWEEN 數字', sql: 'SELECT product_name, price FROM products WHERE price BETWEEN 10 AND 20;', explain: '包含 10 與 20。' },
      { title: 'NOT BETWEEN', sql: 'SELECT product_name, price FROM products WHERE price NOT BETWEEN 10 AND 20;', explain: 'NULL 價格不會出現。' },
    ],
    practice: ex({
      id: 'c12-p',
      title: '歐洲三國顧客',
      prompt: '請找出 **country 為 Germany、France 或 UK** 的顧客，列出 **customer_name** 與 **country**。',
      expectedColumns: 'customer_name | country',
      solution: "SELECT customer_name, country FROM customers WHERE country IN ('Germany', 'France', 'UK');",
      hints: ["country IN ('Germany', 'France', 'UK')"],
    }),
    review: ex({
      id: 'c12-r',
      title: '二、三月的訂單',
      prompt: '請找出 **2024 年 2 月 1 日到 3 月 31 日（含）** 之間的訂單，列出 **order_id** 與 **order_date**。',
      expectedColumns: 'order_id | order_date',
      solution: "SELECT order_id, order_date FROM orders WHERE order_date BETWEEN '2024-02-01' AND '2024-03-31';",
      hints: ["BETWEEN '2024-02-01' AND '2024-03-31'", '或使用 >= 與 < 的半開區間'],
    }),
    summary: `
- \`IN (a, b, c)\` 取代多個 OR
- \`BETWEEN a AND b\` 含頭尾
- 時間戳記建議用半開區間 \`>= 起 AND < 迄\`
`,
  },
];
