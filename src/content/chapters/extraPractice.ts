import type { Exercise } from '../types';
import { ex, tableDefCheck } from './helpers';

/**
 * 各章的第 2 題起練習（每個需要動手的子主題一題）。
 * 合併進章節的 morePractice（見 src/content/index.ts）；全部答對才算完成該章。
 */
export const extraPractice: Record<string, Exercise[]> = {
  c02: [
    ex({
      id: 'c02-p2',
      title: '不重複的國家與城市組合',
      prompt: '請列出 customers 中**不重複的 (country, city) 組合**，輸出 **country** 與 **city**。',
      expectedColumns: 'country | city',
      solution: 'SELECT DISTINCT country, city FROM customers;',
      hints: ['DISTINCT 會作用在後面**所有**欄位的組合上', 'SELECT DISTINCT country, city'],
      commonMistakes: ['只對 country 去重：DISTINCT 不能只套用在其中一欄。'],
    }),
  ],
  c03: [
    ex({
      id: 'c03-p2',
      title: '月薪至少 5000 的員工',
      prompt: '請找出 **salary 大於或等於 5000** 的員工，列出 **first_name** 與 **salary**。',
      expectedColumns: 'first_name | salary',
      solution: 'SELECT first_name, salary FROM employees WHERE salary >= 5000;',
      hints: ['大於或等於是 >='],
      commonMistakes: ['寫成 > 5000：剛好 5000 的人會被漏掉。'],
    }),
  ],
  c04: [
    ex({
      id: 'c04-p2',
      title: '薪水排行（沒薪資的排最後）',
      prompt: '請列出員工的 **first_name** 與 **salary**，依 **salary 由高到低**排序，**salary 是 NULL 的員工排在最後面**。',
      expectedColumns: 'first_name | salary',
      orderMatters: true,
      solution: 'SELECT first_name, salary FROM employees ORDER BY salary DESC NULLS LAST;',
      hints: ['PostgreSQL 由高到低排序時，NULL 預設排在**最前面**', 'ORDER BY salary DESC NULLS LAST'],
      commonMistakes: ['只寫 ORDER BY salary DESC：Nina（NULL）會排第一。'],
    }),
  ],
  c05: [
    ex({
      id: 'c05-p2',
      title: '高價的飲料或調味料',
      prompt: '請找出 **category_id 為 1 或 2**，而且 **price 大於 15** 的商品，列出 **product_name**、**category_id**、**price**。',
      expectedColumns: 'product_name | category_id | price',
      solution: 'SELECT product_name, category_id, price FROM products WHERE (category_id = 1 OR category_id = 2) AND price > 15;',
      hints: ['AND 比 OR 先算', '把 OR 的兩個條件用括號包起來'],
      commonMistakes: ['少了括號：category_id = 1 OR (category_id = 2 AND price > 15)，便宜的飲料也會被選進來。'],
    }),
    ex({
      id: 'c05-p3',
      title: '不是墨西哥也不是德國的顧客',
      prompt: '請用 **NOT** 找出 **country 既不是 Mexico、也不是 Germany** 的顧客，列出 **customer_name** 與 **country**。',
      expectedColumns: 'customer_name | country',
      solution: "SELECT customer_name, country FROM customers WHERE NOT (country = 'Mexico' OR country = 'Germany');",
      hints: ["NOT (country = 'Mexico' OR country = 'Germany')", "也等於 country <> 'Mexico' AND country <> 'Germany'"],
      commonMistakes: ["寫成 country <> 'Mexico' OR country <> 'Germany'：任何國家都會符合其中一個條件。"],
    }),
  ],
  c06: [
    ex({
      id: 'c06-p2',
      title: '一次新增兩家貨運商',
      prompt: `請**用一個 INSERT** 新增兩家貨運商到 shippers：

| shipper_id | shipper_name | phone |
|---|---|---|
| 4 | Taiwan Post | 02-2311-0000 |
| 5 | Island Courier | （NULL） |`,
      expectedColumns: 'shipper_id | shipper_name | phone',
      solution: "INSERT INTO shippers (shipper_id, shipper_name, phone) VALUES (4, 'Taiwan Post', '02-2311-0000'), (5, 'Island Courier', NULL);",
      checkQuery: 'SELECT shipper_id, shipper_name, phone FROM shippers ORDER BY shipper_id',
      hints: ['VALUES (...), (...) 用逗號分隔多筆', '沒有值就寫 NULL（不加引號）'],
      commonMistakes: ["把 NULL 寫成 'NULL'：那會變成四個字母的字串。"],
    }),
  ],
  c07: [
    ex({
      id: 'c07-p2',
      title: '有郵遞區號的顧客',
      prompt: '請找出 **postal_code 不是 NULL** 的顧客，列出 **customer_name** 與 **postal_code**。',
      expectedColumns: 'customer_name | postal_code',
      solution: 'SELECT customer_name, postal_code FROM customers WHERE postal_code IS NOT NULL;',
      hints: ['IS NOT NULL'],
      commonMistakes: ['寫成 postal_code <> NULL 或 != NULL：結果永遠是空的。'],
    }),
  ],
  c08: [
    ex({
      id: 'c08-p2',
      title: '刪除挪威顧客',
      prompt: '請刪除 **country 為 Norway** 的顧客。其他顧客不能被刪掉。',
      expectedColumns: 'customer_id | customer_name | country',
      solution: "DELETE FROM customers WHERE country = 'Norway';",
      checkQuery: 'SELECT customer_id, customer_name, country FROM customers ORDER BY customer_id',
      hints: ['DELETE FROM 表 WHERE 條件', '一定要寫 WHERE'],
      commonMistakes: ['忘了 WHERE：整張表都會被清空。'],
    }),
    ex({
      id: 'c08-p3',
      title: '飲料全面漲價 10%',
      prompt: '請把 **category_id = 1（飲料）** 的所有商品價格**調漲 10%**（新價格 = 原價 × 1.1）。',
      expectedColumns: 'product_id | price',
      solution: 'UPDATE products SET price = price * 1.1 WHERE category_id = 1;',
      checkQuery: 'SELECT product_id, price FROM products ORDER BY product_id',
      hints: ['SET 的右邊可以用原本的值計算：SET price = price * 1.1'],
      commonMistakes: ['SET price = 1.1：所有價格都變成 1.1。', '忘了 WHERE：所有分類都漲價。'],
    }),
  ],
  c09: [
    ex({
      id: 'c09-p2',
      title: '商品列表第 2 頁',
      prompt: '商品列表每頁顯示 **5 筆**，依 **product_id 由小到大**排序。請取出**第 2 頁**的商品，列出 **product_id** 與 **product_name**。',
      expectedColumns: 'product_id | product_name',
      orderMatters: true,
      solution: 'SELECT product_id, product_name FROM products ORDER BY product_id LIMIT 5 OFFSET 5;',
      hints: ['第 2 頁要先跳過第 1 頁的 5 筆', 'LIMIT 5 OFFSET 5'],
      commonMistakes: ['OFFSET 寫成 2：OFFSET 是跳過的「筆數」，不是頁數。'],
    }),
  ],
  c10: [
    ex({
      id: 'c10-p2',
      title: '員工人數與有薪資的人數',
      prompt: '請用一個查詢算出：員工總數 **total_employees**，以及**有薪資資料（salary 不是 NULL）的人數 with_salary**。',
      expectedColumns: 'total_employees | with_salary',
      strictColumns: true,
      solution: 'SELECT COUNT(*) AS total_employees, COUNT(salary) AS with_salary FROM employees;',
      hints: ['COUNT(*) 算列數', 'COUNT(欄位) 會略過 NULL'],
      commonMistakes: ['兩個都用 COUNT(*)：沒薪資的人也被算進 with_salary。'],
    }),
    ex({
      id: 'c10-p3',
      title: '薪資總額與平均',
      prompt: '請算出員工的**薪資總和 total_salary** 與**平均薪資 avg_salary**（四捨五入到整數）。沒有薪資資料的員工不算進平均。',
      expectedColumns: 'total_salary | avg_salary',
      strictColumns: true,
      solution: 'SELECT SUM(salary) AS total_salary, ROUND(AVG(salary)) AS avg_salary FROM employees;',
      hints: ['SUM、AVG 都會自動略過 NULL', 'ROUND(值) 不給位數就是四捨五入到整數'],
      commonMistakes: ['自己用 SUM(salary) / COUNT(*) 算平均：分母把 NULL 也算進去了。'],
    }),
  ],
  c11: [
    ex({
      id: 'c11-p2',
      title: '郵遞區號剛好 5 碼',
      prompt: '請用萬用字元 **_** 找出 **postal_code 剛好 5 個字元**的顧客，列出 **customer_name** 與 **postal_code**。',
      expectedColumns: 'customer_name | postal_code',
      solution: "SELECT customer_name, postal_code FROM customers WHERE postal_code LIKE '_____';",
      hints: ['_ 代表「剛好一個字元」', "五個底線：'_____'"],
      commonMistakes: ["用 '%' 會比對任意長度。"],
    }),
    ex({
      id: 'c11-p3',
      title: '以 Tea 結尾的商品',
      prompt: '請找出 **product_name 以 Tea 結尾**的商品，列出 **product_name**。',
      expectedColumns: 'product_name',
      solution: "SELECT product_name FROM products WHERE product_name LIKE '%Tea';",
      hints: ["% 放在前面：'%Tea'"],
      commonMistakes: ["'%Tea%' 會連名稱中間有 Tea 的也抓進來。"],
    }),
  ],
  c12: [
    ex({
      id: 'c12-p2',
      title: '中價位商品',
      prompt: '請找出 **price 介於 10 到 20 之間（含 10 和 20）** 的商品，列出 **product_name** 與 **price**。',
      expectedColumns: 'product_name | price',
      solution: 'SELECT product_name, price FROM products WHERE price BETWEEN 10 AND 20;',
      hints: ['BETWEEN 包含頭尾'],
    }),
  ],
  c13: [
    ex({
      id: 'c13-p2',
      title: '員工全名',
      prompt: "請列出每位員工的 **full_name**（first_name + 一個空白 + last_name，例如 'David Wang'）與 **title**。",
      expectedColumns: 'full_name | title',
      strictColumns: true,
      solution: "SELECT first_name || ' ' || last_name AS full_name, title FROM employees;",
      hints: ["用 || 或 CONCAT 串接字串", "first_name || ' ' || last_name AS full_name"],
    }),
  ],
  c14: [
    ex({
      id: 'c14-p2',
      title: '沒有商品的分類',
      prompt: '請用 **LEFT JOIN** 找出**一項商品都沒有**的分類，列出 **category_name**。',
      expectedColumns: 'category_name',
      solution: 'SELECT c.category_name FROM categories c LEFT JOIN products p ON p.category_id = c.category_id WHERE p.product_id IS NULL;',
      hints: ['categories LEFT JOIN products', '配不到商品時，products 的欄位是 NULL → WHERE p.product_id IS NULL'],
      commonMistakes: ['用 INNER JOIN：沒有商品的分類根本不會出現。'],
    }),
    ex({
      id: 'c14-p3',
      title: '訂單與貨運商全對照',
      prompt: `請列出訂單與貨運商的對照，輸出 **order_id** 與 **shipper_name**：

- **還沒指定貨運商的訂單**也要列出（shipper_name 為 NULL）
- **一筆訂單都沒有的貨運商**也要列出（order_id 為 NULL）`,
      expectedColumns: 'order_id | shipper_name',
      extraSetupSql: "INSERT INTO shippers VALUES (4, 'Mountain Movers', '04-5555-4444');",
      solution: 'SELECT o.order_id, s.shipper_name FROM orders o FULL JOIN shippers s ON s.shipper_id = o.shipper_id;',
      hints: ['兩邊都要保留 → FULL JOIN', 'FULL JOIN ... ON s.shipper_id = o.shipper_id'],
      commonMistakes: ['LEFT JOIN 只保留一邊：不是漏了沒指定貨運商的訂單，就是漏了沒有訂單的貨運商。'],
    }),
    ex({
      id: 'c14-p4',
      title: '貨運商 × 分類的所有組合',
      prompt: '業務想規劃「每家貨運商負責每個分類」的排班表。請列出**所有貨運商與所有分類的組合**，輸出 **shipper_name** 與 **category_name**。',
      expectedColumns: 'shipper_name | category_name',
      solution: 'SELECT s.shipper_name, c.category_name FROM shippers s CROSS JOIN categories c;',
      hints: ['所有組合 → CROSS JOIN（不需要 ON）'],
    }),
  ],
  c16: [
    ex({
      id: 'c16-p2',
      title: '顧客與供應商名稱總表',
      prompt: '請把**顧客名稱與供應商名稱**合併成一欄 **name**，依 **name 字母順序**排序。',
      expectedColumns: 'name',
      orderMatters: true,
      solution: 'SELECT customer_name AS name FROM customers UNION SELECT supplier_name FROM suppliers ORDER BY name;',
      hints: ['欄位名稱以第一個 SELECT 為準', 'ORDER BY 寫在最後，作用在合併後的結果'],
    }),
  ],
  c17: [
    ex({
      id: 'c17-p2',
      title: '各國各城市的顧客數',
      prompt: '請算出**每個國家的每個城市**有幾位顧客，輸出 **country**、**city**、**customer_count**。',
      expectedColumns: 'country | city | customer_count',
      solution: 'SELECT country, city, COUNT(*) AS customer_count FROM customers GROUP BY country, city;',
      hints: ['GROUP BY 可以放多個欄位'],
    }),
    ex({
      id: 'c17-p3',
      title: '每位業務經手的訂單數',
      prompt: '請算出**每位員工經手的訂單數**（只列出有訂單的員工），輸出 **first_name** 與 **order_count**。',
      expectedColumns: 'first_name | order_count',
      solution: 'SELECT e.first_name, COUNT(*) AS order_count FROM orders o JOIN employees e ON e.employee_id = o.employee_id GROUP BY e.employee_id, e.first_name;',
      hints: ['orders JOIN employees', '依員工分組；GROUP BY employee_id 可避免同名的人被合併'],
    }),
  ],
  c18: [
    ex({
      id: 'c18-p2',
      title: '春季的回購顧客',
      prompt: '只看 **2024-03-01（含）以後**的訂單，找出**下單至少 2 次**的顧客，輸出 **customer_id** 與 **order_count**。',
      expectedColumns: 'customer_id | order_count',
      solution: "SELECT customer_id, COUNT(*) AS order_count FROM orders WHERE order_date >= '2024-03-01' GROUP BY customer_id HAVING COUNT(*) >= 2;",
      hints: ['日期條件在分組前 → WHERE', '次數條件在分組後 → HAVING'],
      commonMistakes: ['把日期條件放在 HAVING：order_date 不在 GROUP BY 裡，會出錯。'],
    }),
  ],
  c19: [
    ex({
      id: 'c19-p2',
      title: '從沒賣出去的商品',
      prompt: '請用 **NOT EXISTS** 找出**從來沒有出現在任何訂單明細**的商品，列出 **product_name**。',
      expectedColumns: 'product_name',
      solution: 'SELECT product_name FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_details d WHERE d.product_id = p.product_id);',
      hints: ['NOT EXISTS (SELECT 1 FROM order_details d WHERE d.product_id = p.product_id)'],
    }),
    ex({
      id: 'c19-p3',
      title: '比某些乳製品貴',
      prompt: '請用 **ANY** 找出**價格高於「至少一項」Dairy 類（category_id = 4）商品**的商品，列出 **product_name** 與 **price**。（Dairy 商品自己也可以入選。）',
      expectedColumns: 'product_name | price',
      solution: 'SELECT product_name, price FROM products WHERE price > ANY (SELECT price FROM products WHERE category_id = 4);',
      hints: ['> ANY (子查詢)：比其中任何一個大就成立', '等於「比最便宜的那個大」'],
      commonMistakes: ['用 ALL：變成要比每一個都大。'],
    }),
  ],
  c20: [
    ex({
      id: 'c20-p2',
      title: '寫入各國顧客統計',
      prompt: '已經有一張空表 **country_stats(country, customer_count)**。請把**每個國家的顧客數**算好後寫進去。',
      expectedColumns: 'country | customer_count',
      extraSetupSql: 'CREATE TABLE country_stats (country VARCHAR(50), customer_count INTEGER);',
      solution: 'INSERT INTO country_stats (country, customer_count) SELECT country, COUNT(*) FROM customers GROUP BY country;',
      checkQuery: 'SELECT country, customer_count FROM country_stats ORDER BY country',
      hints: ['INSERT INTO ... SELECT 可以搭配 GROUP BY', '不需要 VALUES'],
    }),
  ],
  c21: [
    ex({
      id: 'c21-p2',
      title: '貨運商代號轉名稱',
      prompt: `請列出每筆訂單的 **order_id** 與 **shipper_label**：

- 1 → 'Speedy'、2 → 'United'、3 → 'Federal'
- 其他（包含 NULL）→ 'Unassigned'`,
      expectedColumns: 'order_id | shipper_label',
      strictColumns: true,
      solution: "SELECT order_id, CASE shipper_id WHEN 1 THEN 'Speedy' WHEN 2 THEN 'United' WHEN 3 THEN 'Federal' ELSE 'Unassigned' END AS shipper_label FROM orders;",
      hints: ['簡單 CASE：CASE 欄位 WHEN 值 THEN 結果 ... ELSE ... END', 'NULL 不等於任何值，會落到 ELSE'],
    }),
  ],
  c22: [
    ex({
      id: 'c22-p2',
      title: '各分類的標價比例（避免除以 0）',
      prompt: '請列出**所有分類**的 **category_name** 與 **priced_ratio** = 有標價的商品數 ÷ 商品總數（四捨五入到小數 2 位）。**沒有商品的分類顯示 NULL**，不能出錯。請用 **NULLIF** 避免除以 0。',
      expectedColumns: 'category_name | priced_ratio',
      strictColumns: true,
      solution: 'SELECT c.category_name, ROUND(COUNT(p.price)::NUMERIC / NULLIF(COUNT(p.product_id), 0), 2) AS priced_ratio FROM categories c LEFT JOIN products p ON p.category_id = c.category_id GROUP BY c.category_id, c.category_name;',
      hints: ['沒有商品的分類：分子、分母都是 0', 'NULLIF(COUNT(p.product_id), 0)：等於 0 就變成 NULL，除法結果也是 NULL', '記得 ::NUMERIC，避免整數除法'],
      commonMistakes: ['直接除 COUNT(p.product_id)：遇到 0 會出現 division by zero 錯誤。', '整數除法：1 / 2 = 0。'],
    }),
  ],
  c23: [
    ex({
      id: 'c23-p2',
      title: '裝箱數與剩餘件數',
      prompt: '每箱裝 **4 件**。請列出每筆明細的 **order_detail_id**、**quantity**、可裝滿的箱數 **boxes**（無條件捨去）、剩下的件數 **leftover**。',
      expectedColumns: 'order_detail_id | quantity | boxes | leftover',
      strictColumns: true,
      solution: 'SELECT order_detail_id, quantity, quantity / 4 AS boxes, quantity % 4 AS leftover FROM order_details;',
      hints: ['整數 / 整數 = 整數（小數直接捨去）', '% 取餘數'],
      commonMistakes: ['quantity / 4.0：結果會有小數。'],
    }),
  ],
  c24: [
    ex({
      id: 'c24-p2',
      title: '清空明細表',
      prompt: '請**清空 order_details 的所有資料**，但**保留資料表本身**。',
      expectedColumns: 'row_count | table_exists',
      solution: 'TRUNCATE TABLE order_details;',
      checkQuery: "SELECT (SELECT COUNT(*) FROM order_details) AS row_count, to_regclass('sandbox.order_details') IS NOT NULL AS table_exists",
      hints: ['TRUNCATE TABLE 清資料、保留結構', 'DROP TABLE 會連表一起刪掉'],
      commonMistakes: ['用 DROP TABLE：資料表本身也不見了。'],
    }),
    ex({
      id: 'c24-p3',
      title: '欄位改名',
      prompt: '請把 **suppliers** 表的 **phone** 欄位**改名為 phone_number**（資料保留）。',
      expectedColumns: 'kind | definition',
      solution: 'ALTER TABLE suppliers RENAME COLUMN phone TO phone_number;',
      checkQuery: tableDefCheck('suppliers'),
      hints: ['ALTER TABLE 表 RENAME COLUMN 舊名 TO 新名'],
      commonMistakes: ['先 DROP 再 ADD：原本的電話資料會全部消失。'],
    }),
  ],
  c25: [
    ex({
      id: 'c25-p2',
      title: '訂單標籤表（複合主鍵）',
      prompt: `請建立資料表 **order_tags**：

| 欄位 | 型別 | 約束 |
|---|---|---|
| order_id | INTEGER | 外鍵參照 orders(order_id) |
| tag | VARCHAR(30) | |

並以 **(order_id, tag)** 作為**複合主鍵**（同一筆訂單不能有重複標籤）。`,
      expectedColumns: 'kind | definition',
      solution: 'CREATE TABLE order_tags (order_id INTEGER REFERENCES orders(order_id), tag VARCHAR(30), PRIMARY KEY (order_id, tag));',
      checkQuery: tableDefCheck('order_tags'),
      hints: ['複合主鍵寫在欄位清單最後：PRIMARY KEY (order_id, tag)', '主鍵欄位會自動 NOT NULL'],
    }),
  ],
  c26: [
    ex({
      id: 'c26-p2',
      title: '國家＋城市的複合索引',
      prompt: '請在 **customers** 的 **(country, city)** 兩個欄位上建立一個**複合索引**，名稱為 **idx_customers_country_city**。',
      expectedColumns: 'indexname | indexdef',
      solution: 'CREATE INDEX idx_customers_country_city ON customers (country, city);',
      checkQuery: "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'sandbox' AND tablename = 'customers' ORDER BY indexname",
      hints: ['CREATE INDEX 名稱 ON 表 (欄位1, 欄位2)', '欄位順序有意義：先 country 再 city'],
    }),
  ],
  c27: [
    ex({
      id: 'c27-p2',
      title: '預計到貨日',
      prompt: '每筆訂單在下單 **7 天後**到貨。請列出 **order_id**、**order_date** 與預計到貨日 **expected_date**（DATE 型別）。',
      expectedColumns: 'order_id | order_date | expected_date',
      strictColumns: true,
      solution: 'SELECT order_id, order_date, order_date + 7 AS expected_date FROM orders;',
      hints: ['DATE + 整數 = 往後幾天，結果還是 DATE', "也可以寫 order_date + INTERVAL '7 days'，但結果會變成含時間的 TIMESTAMP，可以再 ::DATE 轉回日期"],
    }),
    ex({
      id: 'c27-p3',
      title: '員工出生年份',
      prompt: '請列出員工的 **first_name** 與出生年份 **birth_year**，依 **birth_year 由早到晚**排序（同年依 first_name）。',
      expectedColumns: 'first_name | birth_year',
      strictColumns: true,
      orderMatters: true,
      solution: 'SELECT first_name, EXTRACT(YEAR FROM birth_date) AS birth_year FROM employees ORDER BY birth_year, first_name;',
      hints: ['EXTRACT(YEAR FROM 日期)', 'ORDER BY 可以直接用欄位別名'],
    }),
  ],
  c29: [
    ex({
      id: 'c29-p2',
      title: '訂單編號格式化',
      prompt: "請列出每筆訂單的 **order_code**，格式為 **'ORD-' 加上 order_id**（例如 'ORD-1001'），以及 **order_date**。",
      expectedColumns: 'order_code | order_date',
      strictColumns: true,
      solution: "SELECT 'ORD-' || order_id::TEXT AS order_code, order_date FROM orders;",
      hints: ['把數字轉成文字：order_id::TEXT 或 CAST(order_id AS TEXT)', "再用 || 串接：'ORD-' || ..."],
    }),
  ],
  c30: [
    ex({
      id: 'c30-p2',
      title: '平均每筆訂單件數',
      prompt: '請先算出**每筆訂單的總件數**，再算出這些總件數的**平均值 avg_items**（四捨五入到小數 2 位）。',
      expectedColumns: 'avg_items',
      strictColumns: true,
      solution: 'SELECT ROUND(AVG(order_qty), 2) AS avg_items FROM (SELECT order_id, SUM(quantity) AS order_qty FROM order_details GROUP BY order_id) t;',
      hints: ['先在子查詢裡 GROUP BY order_id 算每筆訂單件數', 'FROM (子查詢) t：衍生表一定要取別名'],
      commonMistakes: ['直接 AVG(quantity)：那是「每筆明細」的平均，不是「每筆訂單」。'],
    }),
    ex({
      id: 'c30-p3',
      title: '和平均價差多少',
      prompt: '請列出每項**有標價**商品的 **product_name**、**price**，以及和全部商品平均價格的差 **diff**（price − 平均價，四捨五入到小數 2 位）。',
      expectedColumns: 'product_name | price | diff',
      strictColumns: true,
      solution: 'SELECT product_name, price, ROUND(price - (SELECT AVG(price) FROM products), 2) AS diff FROM products WHERE price IS NOT NULL;',
      hints: ['在 SELECT 裡放一個只回傳一個值的子查詢：(SELECT AVG(price) FROM products)'],
    }),
    ex({
      id: 'c30-p4',
      title: '沒有出過貨的貨運商',
      prompt: '請找出**從來沒有被任何訂單指定**的貨運商，列出 **shipper_name**。（注意：有些訂單的 shipper_id 是 NULL。）',
      expectedColumns: 'shipper_name',
      extraSetupSql: "INSERT INTO shippers VALUES (4, 'Mountain Movers', '04-5555-4444');",
      solution: 'SELECT shipper_name FROM shippers s WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.shipper_id = s.shipper_id);',
      hints: ['NOT IN 遇到子查詢裡有 NULL，結果會是空的', '改用 NOT EXISTS，或在子查詢加 WHERE shipper_id IS NOT NULL'],
      commonMistakes: ['NOT IN (SELECT shipper_id FROM orders)：子查詢含 NULL，整個條件變成未知，一筆都查不到。'],
    }),
  ],
  c31: [
    ex({
      id: 'c31-p2',
      title: '各國顧客數與訂單數',
      prompt: '請用**兩個 CTE** 分別算出每個國家的**顧客數**與**訂單數**，再合併輸出 **country**、**customer_count**、**order_count**（沒有訂單的國家顯示 0）。',
      expectedColumns: 'country | customer_count | order_count',
      strictColumns: true,
      solution: `WITH cc AS (
  SELECT country, COUNT(*) AS customer_count FROM customers GROUP BY country
), oc AS (
  SELECT c.country, COUNT(*) AS order_count
  FROM orders o JOIN customers c ON c.customer_id = o.customer_id
  GROUP BY c.country
)
SELECT cc.country, cc.customer_count, COALESCE(oc.order_count, 0) AS order_count
FROM cc LEFT JOIN oc ON oc.country = cc.country;`,
      hints: ['WITH a AS (...), b AS (...) SELECT ...', '以顧客數那個 CTE 為左表 LEFT JOIN，沒有訂單用 COALESCE 補 0'],
      commonMistakes: ['customers JOIN orders 後同時 COUNT 兩種數字：顧客數會被訂單筆數放大。'],
    }),
    ex({
      id: 'c31-p3',
      title: 'Grace 底下的所有員工',
      prompt: '請用**遞迴 CTE** 列出 **Grace（employee_id = 2）** 本人以及她**底下所有層級**的員工，輸出 **first_name** 與 **level**（Grace 為 0，直屬部下為 1，依此類推）。',
      expectedColumns: 'first_name | level',
      strictColumns: true,
      solution: `WITH RECURSIVE team AS (
  SELECT employee_id, first_name, 0 AS level FROM employees WHERE employee_id = 2
  UNION ALL
  SELECT e.employee_id, e.first_name, t.level + 1
  FROM employees e JOIN team t ON e.manager_id = t.employee_id
)
SELECT first_name, level FROM team;`,
      hints: ['錨點：employee_id = 2', '遞迴部分：找 manager_id = 上一層的 employee_id 的人，level + 1'],
    }),
  ],
  c32: [
    ex({
      id: 'c32-p2',
      title: 'RANK 與 DENSE_RANK 的差別',
      prompt: '請依**價格由高到低**列出有標價的商品 **product_name**、**price**，以及 **rnk**（RANK）、**dense_rnk**（DENSE_RANK）。',
      expectedColumns: 'product_name | price | rnk | dense_rnk',
      strictColumns: true,
      solution: 'SELECT product_name, price, RANK() OVER (ORDER BY price DESC) AS rnk, DENSE_RANK() OVER (ORDER BY price DESC) AS dense_rnk FROM products WHERE price IS NOT NULL;',
      hints: ['兩個視窗函數可以寫在同一個 SELECT', '並列時 RANK 會跳號、DENSE_RANK 不會'],
    }),
    ex({
      id: 'c32-p3',
      title: '每個分類最便宜的兩項',
      prompt: '請找出**每個分類中最便宜的 2 項**有標價商品（同價時依 product_name 字母順序取前面的），輸出 **category_id**、**product_name**、**price**。',
      expectedColumns: 'category_id | product_name | price',
      solution: `SELECT category_id, product_name, price
FROM (
  SELECT category_id, product_name, price,
         ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price, product_name) AS rn
  FROM products WHERE price IS NOT NULL
) t
WHERE rn <= 2;`,
      hints: ['每組前 N 名：ROW_NUMBER() OVER (PARTITION BY 組 ORDER BY ...)', '視窗函數要包在子查詢裡才能用 WHERE 篩'],
    }),
  ],
  c33: [
    ex({
      id: 'c33-p2',
      title: '每月件數與累計件數',
      prompt: '請算出每個月的銷售件數 **qty**（order_details.quantity 加總），以及到該月為止的**累計件數 running_qty**。輸出 **month**（\'YYYY-MM\'）、**qty**、**running_qty**，依 month 排序。',
      expectedColumns: 'month | qty | running_qty',
      strictColumns: true,
      orderMatters: true,
      solution: `WITH m AS (
  SELECT TO_CHAR(o.order_date, 'YYYY-MM') AS month, SUM(d.quantity) AS qty
  FROM orders o JOIN order_details d ON d.order_id = o.order_id
  GROUP BY 1
)
SELECT month, qty, SUM(qty) OVER (ORDER BY month) AS running_qty
FROM m ORDER BY month;`,
      hints: ['先用 CTE 算出每月件數', '累計：SUM(qty) OVER (ORDER BY month)'],
    }),
    ex({
      id: 'c33-p3',
      title: '下一筆訂單的日期',
      prompt: '請依 **order_date、order_id** 排序，列出每筆訂單的 **order_id**、**order_date** 與**下一筆訂單的日期 next_date**（最後一筆為 NULL）。',
      expectedColumns: 'order_id | order_date | next_date',
      strictColumns: true,
      solution: 'SELECT order_id, order_date, LEAD(order_date) OVER (ORDER BY order_date, order_id) AS next_date FROM orders;',
      hints: ['LEAD(欄位) 取後一列'],
    }),
  ],
  c34: [
    ex({
      id: 'c34-p2',
      title: '純數字的郵遞區號',
      prompt: '請用**正規表示式**找出 **postal_code 全部由數字組成**的顧客，列出 **customer_name** 與 **postal_code**。',
      expectedColumns: 'customer_name | postal_code',
      solution: "SELECT customer_name, postal_code FROM customers WHERE postal_code ~ '^[0-9]+$';",
      hints: ["~ 是正規表示式比對", "^ 開頭、$ 結尾、[0-9]+ 一個以上的數字"],
      commonMistakes: ["少了 ^ 或 $：'NW1 6XE' 這種含數字的也會通過。"],
    }),
    ex({
      id: 'c34-p3',
      title: '長名稱商品',
      prompt: '請找出 **product_name 超過 12 個字元**的商品，輸出 **upper_name**（名稱全大寫）與 **name_len**（字元數），依 name_len 由長到短、同長度依 upper_name 排序。',
      expectedColumns: 'upper_name | name_len',
      strictColumns: true,
      orderMatters: true,
      solution: 'SELECT UPPER(product_name) AS upper_name, LENGTH(product_name) AS name_len FROM products WHERE LENGTH(product_name) > 12 ORDER BY name_len DESC, upper_name;',
      hints: ['LENGTH(字串)、UPPER(字串)'],
    }),
    ex({
      id: 'c34-p4',
      title: '員工年資（整年）',
      prompt: "請算出每位員工到 **2024-12-31** 為止的**完整年資 years**（滿幾年），輸出 **first_name** 與 **years**。",
      expectedColumns: 'first_name | years',
      strictColumns: true,
      solution: "SELECT first_name, EXTRACT(YEAR FROM AGE(DATE '2024-12-31', hire_date)) AS years FROM employees;",
      hints: ['AGE(較晚日期, 較早日期) 回傳「幾年幾月幾天」的間隔', 'EXTRACT(YEAR FROM 間隔) 取出年數'],
      commonMistakes: ['(DATE - hire_date) / 365：沒考慮閏年，接近週年時會差一年。'],
    }),
  ],
};
