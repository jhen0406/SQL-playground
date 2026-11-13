/**
 * PostgreSQL 標準解和 MySQL 寫法不同的題目：MySQL 版解答與差異說明。
 * 由 src/content/index.ts 合併到各題的 mysql / mysqlNote。
 * 每一筆都用 scripts/verify-mysql.ts 在 MySQL 8 上驗證過（結果與 PostgreSQL 標準解一致）。
 */
export interface MysqlVersion {
  mysql: string;
  note: string;
}

const REV = 'oi.quantity * oi.unit_price * (1 - oi.discount)';

const NOTE = {
  toChar: "MySQL 沒有 TO_CHAR，月份字串用 DATE_FORMAT(日期, '%Y-%m')。",
  cast: 'MySQL 沒有 :: 轉型；而且 MySQL 的 / 一定是小數除法，不會像 PostgreSQL 整數相除被捨去，所以不必轉型。',
  dateAdd: 'MySQL 的「日期 + 1」會變成數字，要用 DATE_ADD(日期, INTERVAL 1 DAY)。',
};

export const mysqlSolutions: Record<string, MysqlVersion> = {
  'c04-p': {
    mysql: 'SELECT product_name, price FROM products ORDER BY price IS NULL, price ASC, product_name ASC;',
    note: 'NULL 的位置相反：PostgreSQL 由小到大時 NULL 排最後，MySQL 排最前面。要和 PostgreSQL 一樣，先依 price IS NULL 排序（0 在前、1 在後）。',
  },
  'c04-p2': {
    mysql: 'SELECT first_name, salary FROM employees ORDER BY salary IS NULL, salary DESC;',
    note: 'MySQL 沒有 NULLS LAST。用 ORDER BY 欄位 IS NULL 把 NULL 排到最後（MySQL 由大到小時 NULL 本來就在最後，但寫出來比較清楚）。',
  },
  'c11-r': {
    mysql: "SELECT product_id, product_name FROM products WHERE product_name LIKE '%tea%';",
    note: 'MySQL 沒有 ILIKE。MySQL 預設的字元排序規則不分大小寫，LIKE 本身就不分大小寫。',
  },
  'c13-p2': {
    mysql: "SELECT CONCAT(first_name, ' ', last_name) AS full_name, title FROM employees;",
    note: 'MySQL 的 || 是「邏輯 OR」，不是字串串接！要用 CONCAT。',
  },
  'c13-r': {
    mysql: "SELECT customer_name AS customer, CONCAT(COALESCE(address, ''), ', ', city, ', ', country) AS full_address FROM customers;",
    note: 'PostgreSQL 的 CONCAT 會把 NULL 當空字串；MySQL 的 CONCAT 只要有一個 NULL 結果就是 NULL，要先 COALESCE。',
  },
  'c14-p3': {
    mysql:
      'SELECT o.order_id, s.shipper_name FROM orders o LEFT JOIN shippers s ON s.shipper_id = o.shipper_id\nUNION\nSELECT o.order_id, s.shipper_name FROM orders o RIGHT JOIN shippers s ON s.shipper_id = o.shipper_id;',
    note: 'MySQL 不支援 FULL JOIN，改用 LEFT JOIN 和 RIGHT JOIN 的結果 UNION 起來。',
  },
  'c22-p2': {
    mysql:
      'SELECT c.category_name, ROUND(COUNT(p.price) / NULLIF(COUNT(p.product_id), 0), 2) AS priced_ratio FROM categories c LEFT JOIN products p ON p.category_id = c.category_id GROUP BY c.category_id, c.category_name;',
    note: NOTE.cast,
  },
  'c23-p2': {
    mysql: 'SELECT order_detail_id, quantity, quantity DIV 4 AS boxes, quantity % 4 AS leftover FROM order_details;',
    note: 'MySQL 的 / 會算出小數（7 / 4 = 1.75），整數除法要用 DIV（或 FLOOR(quantity / 4)）。',
  },
  'c25-p': {
    mysql: 'CREATE TABLE members (member_id INT PRIMARY KEY, email VARCHAR(100) NOT NULL UNIQUE, age INT CHECK (age >= 18), joined_on DATE DEFAULT (CURRENT_DATE));',
    note: 'MySQL 的 DEFAULT 用函數時要加括號：DEFAULT (CURRENT_DATE)。CHECK 約束要 MySQL 8.0.16 以後才會真的檢查。',
  },
  'c26-r': {
    mysql: "CREATE TABLE tickets (ticket_id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(100) NOT NULL);\nINSERT INTO tickets (title) VALUES ('Login bug'), ('Slow page');",
    note: 'MySQL 的自動遞增寫成 INT AUTO_INCREMENT（MySQL 也接受 SERIAL，但很少人這樣寫）。',
  },
  'c37-p2': {
    mysql: "admin' #",
    note: 'MySQL 的 -- 後面一定要接空白才算註解（admin\' -- 加一個空白），所以攻擊者常改用 # 註解。',
  },
  'c37-p3': {
    mysql: "x' UNION SELECT username, password FROM app_users #",
    note: 'MySQL 的 -- 後面要有空白，用 # 比較保險。',
  },
  'c37-p4': {
    mysql: "PREPARE find_customer FROM 'SELECT customer_name, city FROM customers WHERE customer_name = ?';\nSET @name = 'Alpine Market';\nEXECUTE find_customer USING @name;",
    note: 'MySQL 的 PREPARE 寫成 PREPARE 名稱 FROM \'SQL 字串\'，參數用 ?，執行時用 EXECUTE … USING @變數。實務上通常由程式語言的 placeholder 處理。',
  },
  'c39-p2': {
    mysql: `SELECT c.contact_id, TRIM(j.phone) AS phone
FROM contacts c
JOIN JSON_TABLE(
  CONCAT('["', REPLACE(c.phones, ',', '","'), '"]'),
  '$[*]' COLUMNS (phone VARCHAR(30) PATH '$')
) AS j;`,
    note: 'MySQL 沒有 string_to_array／unnest。常見做法是把字串轉成 JSON 陣列，再用 JSON_TABLE 展開成多列（MySQL 8.0 以後）。',
  },
  'c27-p2': {
    mysql: 'SELECT order_id, order_date, DATE_ADD(order_date, INTERVAL 7 DAY) AS expected_date FROM orders;',
    note: NOTE.dateAdd,
  },
  'c27-r': {
    mysql: "SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, COUNT(*) AS order_count FROM orders GROUP BY DATE_FORMAT(order_date, '%Y-%m') ORDER BY month;",
    note: NOTE.toChar,
  },
  'c29-p': {
    mysql: 'SELECT ROUND(COUNT(price) / COUNT(*), 2) AS priced_ratio FROM products;',
    note: NOTE.cast,
  },
  'c29-p2': {
    mysql: "SELECT CONCAT('ORD-', order_id) AS order_code, order_date FROM orders;",
    note: 'MySQL 沒有 :: 轉型，|| 也不是串接。CONCAT 會自動把數字轉成文字。',
  },
  'c29-r': {
    mysql: 'SELECT SUM(CAST(price_text AS DECIMAL(10, 2))) AS total FROM raw_prices;',
    note: 'MySQL 的 CAST 不能寫 NUMERIC，要用 DECIMAL(總位數, 小數位數)。',
  },
  'c33-p': {
    mysql:
      "WITH m AS (\n  SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, COUNT(*) AS order_count\n  FROM orders GROUP BY 1\n)\nSELECT month, order_count, LAG(order_count) OVER (ORDER BY month) AS prev_count\nFROM m ORDER BY month;",
    note: NOTE.toChar,
  },
  'c33-p2': {
    mysql:
      "WITH m AS (\n  SELECT DATE_FORMAT(o.order_date, '%Y-%m') AS month, SUM(d.quantity) AS qty\n  FROM orders o JOIN order_details d ON d.order_id = o.order_id\n  GROUP BY 1\n)\nSELECT month, qty, SUM(qty) OVER (ORDER BY month) AS running_qty\nFROM m ORDER BY month;",
    note: NOTE.toChar,
  },
  'c38-p2': {
    mysql:
      "SELECT order_id, order_date,\n  LAST_VALUE(order_id) OVER (\n    PARTITION BY DATE_FORMAT(order_date, '%Y-%m') ORDER BY order_date, order_id\n    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING\n  ) AS last_in_month\nFROM orders;",
    note: NOTE.toChar,
  },
  'c38-p5': {
    mysql:
      "WITH m AS (\n  SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, COUNT(*) AS order_count\n  FROM orders GROUP BY 1\n)\nSELECT month, order_count,\n  ROUND(AVG(order_count) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg\nFROM m ORDER BY month;",
    note: NOTE.toChar,
  },
  'c34-p': {
    mysql: "SELECT country, GROUP_CONCAT(customer_name ORDER BY customer_name SEPARATOR ', ') AS customer_names FROM customers GROUP BY country ORDER BY country;",
    note: "MySQL 用 GROUP_CONCAT(欄位 ORDER BY … SEPARATOR '分隔')，預設分隔是逗號、沒有空白。",
  },
  'c34-p2': {
    mysql: "SELECT customer_name, postal_code FROM customers WHERE REGEXP_LIKE(postal_code, '^[0-9]+$');",
    note: 'MySQL 用 REGEXP_LIKE(字串, 樣式) 或 字串 REGEXP 樣式。',
  },
  'c34-p4': {
    mysql: "SELECT first_name, TIMESTAMPDIFF(YEAR, hire_date, '2024-12-31') AS years FROM employees;",
    note: 'MySQL 沒有 AGE，用 TIMESTAMPDIFF(YEAR, 較早日期, 較晚日期) 算滿幾年。',
  },
  'c34-r': {
    mysql:
      'SELECT order_id, customer_id, order_date, DATEDIFF(order_date, LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id)) AS days_since_prev FROM orders;',
    note: 'MySQL 的日期不能直接相減（會變成奇怪的數字），天數差要用 DATEDIFF(較晚, 較早)。',
  },
  'm-e03': {
    mysql: `SELECT DATE_FORMAT(o.order_date, '%Y-%m') AS month,
       ROUND(SUM(${REV}), 2) AS revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY DATE_FORMAT(o.order_date, '%Y-%m')
ORDER BY month;`,
    note: NOTE.toChar,
  },
  'm-m02': {
    mysql: `WITH c AS (
  SELECT customer_id, COUNT(*) AS n
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
)
SELECT ROUND(SUM(n >= 2) / COUNT(*), 2) AS repurchase_rate
FROM c;`,
    note: 'MySQL 的條件運算結果就是 1／0，SUM(n >= 2) 可以直接計數；除法也不用轉型。',
  },
  'm-m03': {
    mysql: `WITH first_order AS (
  SELECT customer_id, MIN(order_date) AS first_date
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
)
SELECT DATE_FORMAT(first_date, '%Y-%m') AS month, COUNT(*) AS new_customers
FROM first_order
GROUP BY DATE_FORMAT(first_date, '%Y-%m')
ORDER BY month;`,
    note: NOTE.toChar,
  },
  'm-m05': {
    mysql: `WITH m AS (
  SELECT DATE_FORMAT(o.order_date, '%Y-%m') AS month, SUM(${REV}) AS revenue
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'completed'
  GROUP BY 1
)
SELECT month,
       ROUND(revenue, 2) AS revenue,
       ROUND(LAG(revenue) OVER (ORDER BY month), 2) AS prev_revenue,
       ROUND((revenue - LAG(revenue) OVER (ORDER BY month)) / LAG(revenue) OVER (ORDER BY month) * 100, 2) AS growth_pct
FROM m
ORDER BY month;`,
    note: NOTE.toChar,
  },
  'm-m09': {
    mysql: `WITH m AS (
  SELECT DATE_FORMAT(sale_date, '%Y-%m') AS month, emp_id, SUM(amount) AS monthly_sales
  FROM sales
  GROUP BY 1, 2
), ranked AS (
  SELECT *, RANK() OVER (PARTITION BY month ORDER BY monthly_sales DESC) AS rnk
  FROM m
)
SELECT r.month, e.name, r.monthly_sales
FROM ranked r
JOIN employees e ON e.emp_id = r.emp_id
WHERE r.rnk = 1
ORDER BY r.month, e.name;`,
    note: NOTE.toChar,
  },
  'm-m10': {
    mysql: `SELECT ROUND(COUNT(l.user_id) / COUNT(*), 2) AS day1_retention
FROM users u
LEFT JOIN logins l
  ON l.user_id = u.user_id
 AND l.login_date = DATE_ADD(u.signup_date, INTERVAL 1 DAY);`,
    note: NOTE.dateAdd + ' 除法也不用轉型。',
  },
  'm-m11': {
    mysql: `SELECT u.country,
       COUNT(DISTINCT u.user_id) AS users,
       COUNT(DISTINCT s.user_id) AS paying_users,
       ROUND(COUNT(DISTINCT s.user_id) / COUNT(DISTINCT u.user_id), 2) AS conversion_rate
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.user_id
GROUP BY u.country;`,
    note: NOTE.cast,
  },
  'm-h01': {
    mysql: `WITH numbered AS (
  SELECT user_id, login_date,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS rn
  FROM logins
), g AS (
  SELECT user_id, DATE_SUB(login_date, INTERVAL rn DAY) AS grp
  FROM numbered
), streaks AS (
  SELECT user_id, grp, COUNT(*) AS streak
  FROM g
  GROUP BY user_id, grp
)
SELECT user_id, MAX(streak) AS max_streak
FROM streaks
GROUP BY user_id
HAVING MAX(streak) >= 3
ORDER BY max_streak DESC, user_id;`,
    note: '日期減掉序號要用 DATE_SUB(日期, INTERVAL n DAY)；先在一層 CTE 算出 ROW_NUMBER 再相減比較清楚。',
  },
  'm-h02': {
    mysql: `WITH cohort AS (
  SELECT customer_id, DATE_FORMAT(MIN(order_date), '%Y-%m-01') AS cohort
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
), active AS (
  SELECT DISTINCT customer_id, DATE_FORMAT(order_date, '%Y-%m-01') AS m
  FROM orders
  WHERE status = 'completed'
)
SELECT DATE_FORMAT(c.cohort, '%Y-%m') AS cohort_month,
       COUNT(*) AS cohort_size,
       COUNT(a.customer_id) AS retained_next_month,
       ROUND(COUNT(a.customer_id) / COUNT(*), 2) AS retention_rate
FROM cohort c
LEFT JOIN active a
  ON a.customer_id = c.customer_id
 AND a.m = DATE_FORMAT(DATE_ADD(c.cohort, INTERVAL 1 MONTH), '%Y-%m-01')
GROUP BY c.cohort
ORDER BY c.cohort;`,
    note: "MySQL 沒有 DATE_TRUNC，月初可以寫 DATE_FORMAT(日期, '%Y-%m-01')；下個月用 DATE_ADD(…, INTERVAL 1 MONTH)。",
  },
  'm-h03': {
    mysql: `WITH RECURSIVE days AS (
  SELECT DATE '2024-01-01' AS day
  UNION ALL
  SELECT DATE_ADD(day, INTERVAL 1 DAY) FROM days WHERE day < '2024-06-30'
), daily AS (
  SELECT o.order_date AS day, SUM(${REV}) AS revenue
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'completed'
  GROUP BY o.order_date
), filled AS (
  SELECT days.day, COALESCE(daily.revenue, 0) AS revenue
  FROM days LEFT JOIN daily ON daily.day = days.day
), ma AS (
  SELECT day, revenue,
         AVG(revenue) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma7
  FROM filled
)
SELECT day, ROUND(revenue, 2) AS revenue, ROUND(ma7, 2) AS ma7
FROM ma
WHERE day BETWEEN '2024-06-01' AND '2024-06-30'
ORDER BY day;`,
    note: 'MySQL 沒有 generate_series，連續日期用遞迴 CTE 產生（WITH RECURSIVE … DATE_ADD(day, INTERVAL 1 DAY)）。',
  },
  'm-h04': {
    mysql: `WITH r AS (
  SELECT e.dept_id, e.salary,
         ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary) AS rn,
         COUNT(*) OVER (PARTITION BY e.dept_id) AS cnt
  FROM employees e
)
SELECT d.dept_name, ROUND(AVG(r.salary), 2) AS median_salary
FROM r
JOIN departments d ON d.dept_id = r.dept_id
WHERE r.rn IN (FLOOR((r.cnt + 1) / 2), CEIL((r.cnt + 1) / 2))
GROUP BY d.dept_id, d.dept_name;`,
    note: 'MySQL 沒有 PERCENTILE_CONT。用 ROW_NUMBER 和 COUNT 找出中間那一筆（偶數筆時是中間兩筆）再取平均，這也是 LeetCode 569 的常見寫法。',
  },
  'm-h05': {
    mysql: `WITH m AS (
  SELECT DISTINCT customer_id, DATE_FORMAT(order_date, '%Y-%m-01') AS m
  FROM orders
  WHERE status = 'completed'
), g AS (
  SELECT customer_id, m,
         (YEAR(m) * 12 + MONTH(m))
           - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY m) AS grp
  FROM m
), runs AS (
  SELECT customer_id
  FROM g
  GROUP BY customer_id, grp
  HAVING COUNT(*) >= 3
)
SELECT c.name
FROM customers c
WHERE c.customer_id IN (SELECT customer_id FROM runs);`,
    note: "MySQL 沒有 DATE_TRUNC，月初用 DATE_FORMAT(日期, '%Y-%m-01')；年、月可以直接用 YEAR()、MONTH()。",
  },
  'm-h06': {
    mysql: `WITH RECURSIVE tree AS (
  SELECT emp_id, name, 1 AS level, CAST(name AS CHAR(500)) AS chain
  FROM employees
  WHERE manager_id IS NULL
  UNION ALL
  SELECT e.emp_id, e.name, t.level + 1, CONCAT(t.chain, ' > ', e.name)
  FROM employees e
  JOIN tree t ON e.manager_id = t.emp_id
)
SELECT name, level, chain
FROM tree
ORDER BY level, name;`,
    note: 'MySQL 遞迴 CTE 的欄位長度由錨點決定，chain 要先 CAST 成夠長的 CHAR，否則會被截斷；串接用 CONCAT。',
  },
  'm-h08': {
    mysql: `WITH a AS (
  SELECT DISTINCT user_id, DATE_FORMAT(login_date, '%Y-%m-01') AS m
  FROM logins
), months AS (
  SELECT DISTINCT m FROM a
)
SELECT DATE_FORMAT(mo.m, '%Y-%m') AS month,
       (SELECT COUNT(*) FROM a WHERE a.m = mo.m) AS mau,
       (SELECT COUNT(*)
          FROM a prev
         WHERE prev.m = DATE_FORMAT(DATE_SUB(mo.m, INTERVAL 1 MONTH), '%Y-%m-01')
           AND NOT EXISTS (SELECT 1 FROM a cur WHERE cur.user_id = prev.user_id AND cur.m = mo.m)
       ) AS churned
FROM months mo
ORDER BY mo.m;`,
    note: "MySQL 沒有 DATE_TRUNC / INTERVAL 字串：月初用 DATE_FORMAT(日期, '%Y-%m-01')，上個月用 DATE_SUB(…, INTERVAL 1 MONTH)。",
  },
  'd-02': {
    mysql: `SELECT 'Low Salary' AS category, SUM(income < 20000) AS accounts_count FROM accounts
UNION ALL
SELECT 'Average Salary', SUM(income BETWEEN 20000 AND 50000) FROM accounts
UNION ALL
SELECT 'High Salary', SUM(income > 50000) FROM accounts;`,
    note: 'MySQL 沒有 FILTER。條件本身就是 1／0，SUM(條件) 就是符合的筆數。',
  },
  'd-03': {
    mysql: `SELECT cur.id
FROM weather cur
JOIN weather prev ON DATEDIFF(cur.record_date, prev.record_date) = 1
WHERE cur.temperature > prev.temperature;`,
    note: 'MySQL 的「日期 + 1」會變成數字（20240131 + 1 = 20240132，跨月就錯），要用 DATEDIFF(今天, 前一天) = 1 或 DATE_ADD。LeetCode 197 的標準 MySQL 解就是 DATEDIFF。',
  },
  'd-08': {
    mysql: `SELECT query_name,
       ROUND(AVG(rating / position), 2) AS quality,
       ROUND(AVG(rating < 3) * 100, 2) AS poor_query_percentage
FROM queries
GROUP BY query_name;`,
    note: 'MySQL 的 / 不會整數除法；AVG(rating < 3) 就是比例。LeetCode 1211 的 MySQL 解常這樣寫。',
  },
  'd-11': {
    mysql: `WITH firsts AS (
  SELECT player_id, MIN(event_date) AS first_day
  FROM activity
  GROUP BY player_id
)
SELECT ROUND(COUNT(a.player_id) / (SELECT COUNT(*) FROM firsts), 2) AS fraction
FROM firsts f
LEFT JOIN activity a ON a.player_id = f.player_id AND a.event_date = DATE_ADD(f.first_day, INTERVAL 1 DAY);`,
    note: NOTE.dateAdd + ' 除法也不用轉型。',
  },
  'd-18': {
    mysql: String.raw`SELECT user_id, name, mail
FROM members
WHERE REGEXP_LIKE(mail, '^[A-Za-z][A-Za-z0-9_.-]*@sqlpg\\.com$', 'c');`,
    note: "MySQL 的 REGEXP 預設不分大小寫，要加第三個參數 'c' 才會區分；字串裡的反斜線要寫兩次（\\\\.）。",
  },
  'd-19': {
    mysql: `SELECT sell_date,
       COUNT(DISTINCT product) AS num_sold,
       GROUP_CONCAT(DISTINCT product ORDER BY product SEPARATOR ',') AS products
FROM sales_log
GROUP BY sell_date
ORDER BY sell_date;`,
    note: 'MySQL 用 GROUP_CONCAT(DISTINCT 欄位 ORDER BY 欄位 SEPARATOR \',\')。',
  },
  'd-21': {
    mysql: `DELETE p1
FROM person p1
JOIN person p2 ON p2.email = p1.email AND p2.id < p1.id;`,
    note: 'MySQL 不允許在 DELETE 的子查詢裡讀同一張表（錯誤 1093），改用 DELETE … JOIN 的寫法。',
  },
};
