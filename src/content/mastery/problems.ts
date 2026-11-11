import type { MasteryProblem } from '../types';

const REV = 'oi.quantity * oi.unit_price * (1 - oi.discount)';
const COMPLETED_NOTE = '> 營收定義：只計算 **status = \'completed\'** 的訂單；每個品項的營收 = quantity × unit_price × (1 − discount)。';

export const masteryProblems: MasteryProblem[] = [
  // ───────────────────────────── Easy ─────────────────────────────
  {
    id: 'm-e01',
    difficulty: 'Easy',
    topic: '營收',
    title: '上半年總營收',
    datasetId: 'ecommerce',
    leetcodeRef: '基礎彙總（1251. Average Selling Price 的前置）',
    prompt: `老闆想知道 2024 上半年一共賺進多少營收。

${COMPLETED_NOTE}

請輸出一個欄位 **total_revenue**，四捨五入到小數 2 位。`,
    expectedColumns: 'total_revenue',
    strictColumns: true,
    solution: `SELECT ROUND(SUM(${REV}), 2) AS total_revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'completed';`,
    hints: ['營收在 order_items，訂單狀態在 orders，需要 JOIN', "WHERE o.status = 'completed'", '記得乘上 (1 - discount)'],
    commonMistakes: ['沒有排除 cancelled / refunded 訂單。', '忘了折扣：quantity * unit_price 沒有乘上 (1 - discount)。'],
    explanation: '先 JOIN 訂單與明細，用 WHERE 過濾狀態，再 SUM 每個品項的營收。過濾條件放在 WHERE（分組前）即可。',
  },
  {
    id: 'm-e02',
    difficulty: 'Easy',
    topic: '營運',
    title: '各狀態訂單數',
    datasetId: 'ecommerce',
    leetcodeRef: 'GROUP BY 基本題（1741. Find Total Time Spent by Each Employee）',
    prompt: '客服主管想看各種訂單狀態各有幾筆。請輸出 **status** 與 **order_count**。',
    expectedColumns: 'status | order_count',
    strictColumns: true,
    solution: 'SELECT status, COUNT(*) AS order_count FROM orders GROUP BY status;',
    hints: ['GROUP BY status'],
    explanation: '單純的分組計數。注意 COUNT(*) 算的是訂單筆數；如果 JOIN 了 order_items 才計數，會變成品項數。',
  },
  {
    id: 'm-e03',
    difficulty: 'Easy',
    topic: '營收',
    title: '每月營收',
    datasetId: 'ecommerce',
    leetcodeRef: '1193. Monthly Transactions I',
    prompt: `財務要做月報。請算出**每個月的營收**。

${COMPLETED_NOTE}

輸出 **month**（格式 'YYYY-MM'）與 **revenue**（四捨五入到小數 2 位），依 month 由早到晚排序。`,
    expectedColumns: 'month | revenue',
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT TO_CHAR(o.order_date, 'YYYY-MM') AS month,
       ROUND(SUM(${REV}), 2) AS revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY TO_CHAR(o.order_date, 'YYYY-MM')
ORDER BY month;`,
    hints: ["TO_CHAR(order_date, 'YYYY-MM')", 'GROUP BY 月份運算式'],
    commonMistakes: ['用 EXTRACT(MONTH ...) 分組：跨年資料會把不同年的同月份合併。', '忘記 ORDER BY。'],
    explanation: "按月份字串分組是最直接的作法；也可以 GROUP BY DATE_TRUNC('month', order_date) 再格式化。MySQL 對應寫法是 DATE_FORMAT(order_date, '%Y-%m')。",
  },
  {
    id: 'm-e04',
    difficulty: 'Easy',
    topic: '顧客',
    title: '各城市顧客結構',
    datasetId: 'ecommerce',
    leetcodeRef: '條件計數（1179. Reformat Department Table 的基礎）',
    prompt: "業務想知道每個城市有多少顧客、其中多少是企業客戶（segment = 'business'）。請輸出 **city**、**customers**、**business_customers**。",
    expectedColumns: 'city | customers | business_customers',
    strictColumns: true,
    solution: `SELECT city,
       COUNT(*) AS customers,
       SUM(CASE WHEN segment = 'business' THEN 1 ELSE 0 END) AS business_customers
FROM customers
GROUP BY city;`,
    hints: ["SUM(CASE WHEN segment = 'business' THEN 1 ELSE 0 END)", '或 COUNT(*) FILTER (WHERE ...)'],
    explanation: '條件計數是把「列」轉成「欄」的基本功。PostgreSQL 的 COUNT(*) FILTER (WHERE segment = \'business\') 更簡潔，但 MySQL 不支援，LeetCode 上 SUM(CASE ...) 通用性最好。',
  },
  {
    id: 'm-e05',
    difficulty: 'Easy',
    topic: '部門績效',
    title: '各部門平均薪資',
    datasetId: 'hr',
    leetcodeRef: '1075. Project Employees I',
    prompt: '人資要檢視薪資結構。請算出**每個有員工的部門**的平均薪資與人數，輸出 **dept_name**、**avg_salary**（四捨五入到小數 2 位）、**headcount**。（沒有所屬部門的員工不計）',
    expectedColumns: 'dept_name | avg_salary | headcount',
    strictColumns: true,
    solution: `SELECT d.dept_name, ROUND(AVG(e.salary), 2) AS avg_salary, COUNT(*) AS headcount
FROM employees e
JOIN departments d ON d.dept_id = e.dept_id
GROUP BY d.dept_id, d.dept_name;`,
    hints: ['employees JOIN departments', 'GROUP BY 部門'],
    explanation: 'INNER JOIN 自然排除沒有員工的部門與沒有部門的員工。GROUP BY 主鍵 dept_id 再加上 dept_name 是好習慣：避免不同部門同名時被合併。',
  },
  {
    id: 'm-e06',
    difficulty: 'Easy',
    topic: '部門績效',
    title: '薪水比主管高的員工',
    datasetId: 'hr',
    leetcodeRef: '181. Employees Earning More Than Their Managers',
    prompt: '找出**薪水比自己直屬主管還高**的員工，輸出 **employee**（員工 name）。',
    expectedColumns: 'employee',
    strictColumns: true,
    solution: `SELECT e.name AS employee
FROM employees e
JOIN employees m ON e.manager_id = m.emp_id
WHERE e.salary > m.salary;`,
    hints: ['Self Join：employees e JOIN employees m ON e.manager_id = m.emp_id'],
    explanation: '和 LeetCode 181 完全相同的 Self Join 模式。用 INNER JOIN 會自動排除沒有主管的人。',
  },
  {
    id: 'm-e07',
    difficulty: 'Easy',
    topic: '部門績效',
    title: '第二高的薪水',
    datasetId: 'hr',
    leetcodeRef: '176. Second Highest Salary',
    prompt: '請找出公司**第二高的薪水**（不重複的薪資值中第二大），輸出 **second_highest_salary**。若不存在則回傳 NULL（一列）。',
    expectedColumns: 'second_highest_salary',
    strictColumns: true,
    solution: `SELECT (
  SELECT DISTINCT salary FROM employees
  ORDER BY salary DESC
  LIMIT 1 OFFSET 1
) AS second_highest_salary;`,
    hints: ['DISTINCT salary ORDER BY salary DESC LIMIT 1 OFFSET 1', '外面包一層 SELECT (...) 才能在沒有資料時回傳 NULL'],
    commonMistakes: ['沒有 DISTINCT：最高薪有兩人時會取到重複的最高薪。', '沒有外層 SELECT：不存在時回傳 0 列而不是 NULL。'],
    explanation: '另一種寫法：SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)。MAX 在沒有資料時自然回傳 NULL。',
  },
  {
    id: 'm-e08',
    difficulty: 'Easy',
    topic: '成長',
    title: '各渠道註冊數',
    datasetId: 'saas',
    leetcodeRef: 'GROUP BY + ORDER BY',
    prompt: '行銷想比較各獲客渠道的成效。請輸出 **channel** 與 **user_count**，依 user_count 由多到少排序，同數量依 channel 字母排序。',
    expectedColumns: 'channel | user_count',
    strictColumns: true,
    orderMatters: true,
    solution: 'SELECT channel, COUNT(*) AS user_count FROM users GROUP BY channel ORDER BY user_count DESC, channel;',
    hints: ['ORDER BY 可以使用別名 user_count'],
  },
  {
    id: 'm-e09',
    difficulty: 'Easy',
    topic: '顧客',
    title: '從未下單的顧客',
    datasetId: 'ecommerce',
    leetcodeRef: '183. Customers Who Never Order',
    prompt: '找出**完全沒有任何訂單**（不論狀態）的顧客，輸出 **name**。',
    expectedColumns: 'name',
    strictColumns: true,
    solution: `SELECT c.name
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);`,
    hints: ['NOT EXISTS 或 LEFT JOIN ... WHERE o.order_id IS NULL'],
    explanation: 'NOT EXISTS 與 LEFT JOIN + IS NULL 是兩種標準寫法。NOT IN 在子查詢含 NULL 時會失效，養成用 NOT EXISTS 的習慣。',
  },
  {
    id: 'm-e10',
    difficulty: 'Easy',
    topic: '部門績效',
    title: '2023 年高考績員工',
    datasetId: 'hr',
    leetcodeRef: 'JOIN + WHERE + ORDER BY',
    prompt: '請列出 **2023 年考績 4 分以上**的員工：**name**、**dept_name**、**score**，依 score 由高到低、同分依 name 排序。',
    expectedColumns: 'name | dept_name | score',
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT e.name, d.dept_name, r.score
FROM reviews r
JOIN employees e ON e.emp_id = r.emp_id
JOIN departments d ON d.dept_id = e.dept_id
WHERE r.year = 2023 AND r.score >= 4
ORDER BY r.score DESC, e.name;`,
    hints: ['reviews JOIN employees JOIN departments'],
  },

  // ──────────────────────────── Medium ────────────────────────────
  {
    id: 'm-m01',
    difficulty: 'Medium',
    topic: '商品排行',
    title: '營收前五名商品',
    datasetId: 'ecommerce',
    leetcodeRef: '1084. Sales Analysis III / Top-N',
    prompt: `請找出**營收前 5 名**的商品。

${COMPLETED_NOTE}

輸出 **product_name**、**units_sold**（銷售數量）、**revenue**（四捨五入到小數 2 位），依 revenue 由高到低排序，營收相同依 product_id 由小到大。`,
    expectedColumns: 'product_name | units_sold | revenue',
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT p.name AS product_name,
       SUM(oi.quantity) AS units_sold,
       ROUND(SUM(${REV}), 2) AS revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p ON p.product_id = oi.product_id
WHERE o.status = 'completed'
GROUP BY p.product_id, p.name
ORDER BY revenue DESC, p.product_id
LIMIT 5;`,
    hints: ['三表 JOIN 後 GROUP BY 商品', 'ORDER BY revenue DESC, product_id LIMIT 5'],
  },
  {
    id: 'm-m02',
    difficulty: 'Medium',
    topic: '回購',
    title: '顧客回購率',
    datasetId: 'ecommerce',
    leetcodeRef: '1174. Immediate Food Delivery II（比例計算）',
    prompt: '在**至少有 1 筆 completed 訂單**的顧客中，有多少比例的人**有 2 筆以上 completed 訂單**？請輸出 **repurchase_rate**（0~1 之間的小數，四捨五入到小數 2 位）。',
    expectedColumns: 'repurchase_rate',
    strictColumns: true,
    solution: `WITH c AS (
  SELECT customer_id, COUNT(*) AS n
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
)
SELECT ROUND(SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END)::NUMERIC / COUNT(*), 2) AS repurchase_rate
FROM c;`,
    hints: ['先用 CTE 算每位顧客的 completed 訂單數', '分子：n >= 2 的人數；分母：CTE 的總人數', '注意整數除法！'],
    commonMistakes: ['整數除法得到 0。', '分母用了全部顧客（包含沒買過的人）。'],
    explanation: '比例題的套路：先算出「每個個體」的指標（CTE），再算「符合條件的個體 / 全部個體」。PostgreSQL 一定要轉成 NUMERIC 再除，或寫 AVG(CASE WHEN n >= 2 THEN 1.0 ELSE 0 END)。',
  },
  {
    id: 'm-m03',
    difficulty: 'Medium',
    topic: '成長',
    title: '每月新客數',
    datasetId: 'ecommerce',
    leetcodeRef: '1107. New Users Daily Count',
    prompt: "「新客」的定義是：顧客**第一筆 completed 訂單**所在的月份。請算出每個月的新客數，輸出 **month**（'YYYY-MM'）與 **new_customers**，依 month 排序。",
    expectedColumns: 'month | new_customers',
    strictColumns: true,
    orderMatters: true,
    solution: `WITH first_order AS (
  SELECT customer_id, MIN(order_date) AS first_date
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
)
SELECT TO_CHAR(first_date, 'YYYY-MM') AS month, COUNT(*) AS new_customers
FROM first_order
GROUP BY TO_CHAR(first_date, 'YYYY-MM')
ORDER BY month;`,
    hints: ['先找每位顧客的 MIN(order_date)', '再依首購月份分組計數'],
    commonMistakes: ['直接用所有訂單的月份計算 COUNT(DISTINCT customer_id)：那是「活躍客」不是「新客」。'],
  },
  {
    id: 'm-m04',
    difficulty: 'Medium',
    topic: '商品排行',
    title: '各分類營收冠軍',
    datasetId: 'ecommerce',
    leetcodeRef: '184. Department Highest Salary',
    prompt: `請找出**每個分類中營收最高**的商品（並列都要列出）。

${COMPLETED_NOTE}

輸出 **category**、**product**、**revenue**（四捨五入到小數 2 位）。`,
    expectedColumns: 'category | product | revenue',
    strictColumns: true,
    solution: `WITH pr AS (
  SELECT p.category_id, p.product_id, p.name, SUM(${REV}) AS revenue
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.order_id
  JOIN products p ON p.product_id = oi.product_id
  WHERE o.status = 'completed'
  GROUP BY p.category_id, p.product_id, p.name
), ranked AS (
  SELECT *, RANK() OVER (PARTITION BY category_id ORDER BY revenue DESC) AS rnk
  FROM pr
)
SELECT c.name AS category, r.name AS product, ROUND(r.revenue, 2) AS revenue
FROM ranked r
JOIN categories c ON c.category_id = r.category_id
WHERE r.rnk = 1;`,
    hints: ['CTE 1：每個商品的營收', 'CTE 2：RANK() OVER (PARTITION BY category_id ORDER BY revenue DESC)', '篩 rnk = 1'],
    commonMistakes: ['用 ROW_NUMBER：並列時只會留下一個。'],
  },
  {
    id: 'm-m05',
    difficulty: 'Medium',
    topic: '營收',
    title: '月營收成長率',
    datasetId: 'ecommerce',
    leetcodeRef: '1193 + LAG（MoM growth）',
    prompt: `請計算每月營收與**月增率**。

${COMPLETED_NOTE}

輸出 **month**（'YYYY-MM'）、**revenue**、**prev_revenue**（上個月營收，第一個月為 NULL）、**growth_pct**（(本月 − 上月) / 上月 × 100），三個金額/比例欄位都四捨五入到小數 2 位，依 month 排序。`,
    expectedColumns: 'month | revenue | prev_revenue | growth_pct',
    strictColumns: true,
    orderMatters: true,
    solution: `WITH m AS (
  SELECT TO_CHAR(o.order_date, 'YYYY-MM') AS month, SUM(${REV}) AS revenue
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
    hints: ['先用 CTE 算出每月營收', 'LAG(revenue) OVER (ORDER BY month) 取上月', '先算再四捨五入，避免誤差累積'],
    commonMistakes: ['先 ROUND 再計算成長率，造成小數誤差。'],
  },
  {
    id: 'm-m06',
    difficulty: 'Medium',
    topic: '營收',
    title: '各分類毛利',
    datasetId: 'ecommerce',
    leetcodeRef: '多欄位彙總運算',
    prompt: `請計算各分類的營收、毛利與毛利率（completed 訂單）。

- 品項營收 = quantity × unit_price × (1 − discount)
- 品項毛利 = quantity × (unit_price × (1 − discount) − products.cost)
- 毛利率 margin_pct = 毛利 / 營收 × 100

輸出 **category**、**revenue**、**gross_profit**、**margin_pct**（皆四捨五入到小數 2 位），依 gross_profit 由高到低排序。`,
    expectedColumns: 'category | revenue | gross_profit | margin_pct',
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT c.name AS category,
       ROUND(SUM(${REV}), 2) AS revenue,
       ROUND(SUM(oi.quantity * (oi.unit_price * (1 - oi.discount) - p.cost)), 2) AS gross_profit,
       ROUND(SUM(oi.quantity * (oi.unit_price * (1 - oi.discount) - p.cost)) / SUM(${REV}) * 100, 2) AS margin_pct
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p ON p.product_id = oi.product_id
JOIN categories c ON c.category_id = p.category_id
WHERE o.status = 'completed'
GROUP BY c.category_id, c.name
ORDER BY gross_profit DESC;`,
    hints: ['成本在 products.cost', '毛利率要用「總毛利 / 總營收」，不是每個品項毛利率的平均'],
    commonMistakes: ['AVG(每個品項的毛利率)：會讓小額品項與大額品項權重相同。'],
  },
  {
    id: 'm-m07',
    difficulty: 'Medium',
    topic: '部門績效',
    title: '各部門前三高薪',
    datasetId: 'hr',
    leetcodeRef: '185. Department Top Three Salaries',
    prompt: '請列出**每個部門薪資前三高**的員工（薪資相同者同名次，不跳號；例如 150, 99, 98, 98 → 四人都入選）。輸出 **dept_name**、**name**、**salary**。',
    expectedColumns: 'dept_name | name | salary',
    strictColumns: true,
    solution: `WITH ranked AS (
  SELECT e.*, DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rnk
  FROM employees e
  WHERE e.dept_id IS NOT NULL
)
SELECT d.dept_name, r.name, r.salary
FROM ranked r
JOIN departments d ON d.dept_id = r.dept_id
WHERE r.rnk <= 3;`,
    hints: ['DENSE_RANK 不跳號', '包一層 CTE 再篩 rnk <= 3'],
    commonMistakes: ['用 RANK：並列後會跳號，可能少選人。', '用 ROW_NUMBER：同薪只會選一個。'],
  },
  {
    id: 'm-m08',
    difficulty: 'Medium',
    topic: '部門績效',
    title: '業務業績佔比',
    datasetId: 'hr',
    leetcodeRef: '視窗函數 + 彙總（SUM(SUM(x)) OVER）',
    prompt: '請算出每位有成交紀錄的員工的業績總額 **total_sales**，以及**佔所屬部門總業績的百分比 share_pct**（× 100，四捨五入到小數 2 位）。輸出 **name**、**total_sales**、**share_pct**。',
    expectedColumns: 'name | total_sales | share_pct',
    strictColumns: true,
    solution: `SELECT e.name,
       SUM(s.amount) AS total_sales,
       ROUND(SUM(s.amount) * 100 / SUM(SUM(s.amount)) OVER (PARTITION BY e.dept_id), 2) AS share_pct
FROM sales s
JOIN employees e ON e.emp_id = s.emp_id
GROUP BY e.emp_id, e.name, e.dept_id;`,
    hints: ['先 GROUP BY 員工得到 SUM(amount)', '部門總額可用視窗函數：SUM(SUM(amount)) OVER (PARTITION BY dept_id)', '也可以用 CTE 分兩步算'],
    explanation: '視窗函數在 GROUP BY 之後執行，所以可以對彙總結果再開窗：SUM(SUM(amount)) OVER (PARTITION BY dept_id) 就是部門總額。也可以先 CTE 算出個人業績，再 JOIN 部門總額。',
  },
  {
    id: 'm-m09',
    difficulty: 'Medium',
    topic: '部門績效',
    title: '每月業績冠軍',
    datasetId: 'hr',
    leetcodeRef: '分組 Top-1（含並列）',
    prompt: "請找出**每個月業績最高**的員工（並列都列出）。輸出 **month**（'YYYY-MM'）、**name**、**monthly_sales**，依 month、name 排序。",
    expectedColumns: 'month | name | monthly_sales',
    strictColumns: true,
    orderMatters: true,
    solution: `WITH m AS (
  SELECT TO_CHAR(sale_date, 'YYYY-MM') AS month, emp_id, SUM(amount) AS monthly_sales
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
    hints: ['先算每人每月業績', 'RANK() OVER (PARTITION BY month ORDER BY monthly_sales DESC)'],
  },
  {
    id: 'm-m10',
    difficulty: 'Medium',
    topic: '留存',
    title: '次日留存率',
    datasetId: 'saas',
    leetcodeRef: '550. Game Play Analysis IV',
    prompt: '「次日留存」= 使用者在**註冊日的隔天**有登入。請算出全體使用者的次日留存率 **day1_retention**（0~1，四捨五入到小數 2 位）。',
    expectedColumns: 'day1_retention',
    strictColumns: true,
    solution: `SELECT ROUND(COUNT(l.user_id)::NUMERIC / COUNT(*), 2) AS day1_retention
FROM users u
LEFT JOIN logins l
  ON l.user_id = u.user_id
 AND l.login_date = u.signup_date + 1;`,
    hints: ['LEFT JOIN 登入表，條件是 login_date = signup_date + 1', 'COUNT(l.user_id) 只會算配對到的人'],
    commonMistakes: ['把 login_date 條件寫在 WHERE，LEFT JOIN 變成 INNER JOIN，分母就錯了。'],
    explanation: 'LeetCode 550 用的是「首次登入日」，這裡用註冊日，概念相同。把配對條件寫在 ON 裡，配不到的人會留下（值為 NULL），COUNT(欄位) 自然只計算配對成功的人。',
  },
  {
    id: 'm-m11',
    difficulty: 'Medium',
    topic: '成長',
    title: '各國付費轉換率',
    datasetId: 'saas',
    leetcodeRef: '1211. Queries Quality and Percentage（比例 + 分組）',
    prompt: '請算出每個國家的使用者數 **users**、曾經訂閱過的使用者數 **paying_users**，以及轉換率 **conversion_rate**（paying_users / users，四捨五入到小數 2 位）。輸出 **country**、**users**、**paying_users**、**conversion_rate**。',
    expectedColumns: 'country | users | paying_users | conversion_rate',
    strictColumns: true,
    solution: `SELECT u.country,
       COUNT(DISTINCT u.user_id) AS users,
       COUNT(DISTINCT s.user_id) AS paying_users,
       ROUND(COUNT(DISTINCT s.user_id)::NUMERIC / COUNT(DISTINCT u.user_id), 2) AS conversion_rate
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.user_id
GROUP BY u.country;`,
    hints: ['users LEFT JOIN subscriptions', '一個人可能有多筆訂閱 → 用 COUNT(DISTINCT ...)'],
    commonMistakes: ['COUNT(*) 在一人多筆訂閱時會重複計算。'],
  },
  {
    id: 'm-m12',
    difficulty: 'Medium',
    topic: '顧客',
    title: '顧客價值總覽',
    datasetId: 'ecommerce',
    leetcodeRef: 'RFM 分析的前置（多重彙總）',
    prompt: `請為每位**有 completed 訂單**的顧客計算：完成訂單數 **completed_orders**、累計消費 **total_spent**（四捨五入到小數 2 位）、最近一次完成訂單日期 **last_order_date**。

輸出 **name**、**completed_orders**、**total_spent**、**last_order_date**，依 total_spent 由高到低、同額依 name 排序。`,
    expectedColumns: 'name | completed_orders | total_spent | last_order_date',
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT c.name,
       COUNT(DISTINCT o.order_id) AS completed_orders,
       ROUND(SUM(${REV}), 2) AS total_spent,
       MAX(o.order_date) AS last_order_date
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY c.customer_id, c.name
ORDER BY total_spent DESC, c.name;`,
    hints: ['JOIN order_items 後，一筆訂單會變成多列', '訂單數要用 COUNT(DISTINCT o.order_id)'],
    commonMistakes: ['COUNT(*) 算到的是品項數，不是訂單數（JOIN 造成的「扇出」問題）。'],
  },

  // ───────────────────────────── Hard ─────────────────────────────
  {
    id: 'm-h01',
    difficulty: 'Hard',
    topic: '留存',
    title: '最長連續登入天數',
    datasetId: 'saas',
    leetcodeRef: '180. Consecutive Numbers / 1285（Gaps and Islands）',
    prompt: '請算出每位使用者的**最長連續登入天數** **max_streak**，只列出 max_streak **至少 3 天**的使用者。輸出 **user_id** 與 **max_streak**，依 max_streak 由大到小、同天數依 user_id 排序。',
    expectedColumns: 'user_id | max_streak',
    strictColumns: true,
    orderMatters: true,
    solution: `WITH g AS (
  SELECT user_id, login_date,
         login_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date))::INT AS grp
  FROM logins
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
    hints: [
      '經典技巧「日期 − 序號」：連續的日期減去 ROW_NUMBER 會得到相同的值',
      '同一個 (user_id, grp) 就是一段連續區間',
      '先算每段長度，再取每人的最大值',
    ],
    explanation: 'Gaps and Islands：連續日期 d, d+1, d+2 的 ROW_NUMBER 是 n, n+1, n+2，相減後都等於 d−n，所以可以當作分組鍵。這是 LeetCode Hard 題中最常見的技巧之一。',
  },
  {
    id: 'm-h02',
    difficulty: 'Hard',
    topic: '回購',
    title: '首購月份 Cohort 留存',
    datasetId: 'ecommerce',
    leetcodeRef: 'Cohort Analysis（1645. Hopper Company Queries II 類型）',
    prompt: `依顧客**第一筆 completed 訂單的月份**分群（cohort）。請計算每個 cohort 的人數，以及其中**在首購的下一個月也有 completed 訂單**的人數與比例。

輸出 **cohort_month**（'YYYY-MM'）、**cohort_size**、**retained_next_month**、**retention_rate**（0~1，四捨五入到小數 2 位），依 cohort_month 排序。`,
    expectedColumns: 'cohort_month | cohort_size | retained_next_month | retention_rate',
    strictColumns: true,
    orderMatters: true,
    solution: `WITH cohort AS (
  SELECT customer_id, DATE_TRUNC('month', MIN(order_date))::DATE AS cohort
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
), active AS (
  SELECT DISTINCT customer_id, DATE_TRUNC('month', order_date)::DATE AS m
  FROM orders
  WHERE status = 'completed'
)
SELECT TO_CHAR(c.cohort, 'YYYY-MM') AS cohort_month,
       COUNT(*) AS cohort_size,
       COUNT(a.customer_id) AS retained_next_month,
       ROUND(COUNT(a.customer_id)::NUMERIC / COUNT(*), 2) AS retention_rate
FROM cohort c
LEFT JOIN active a
  ON a.customer_id = c.customer_id
 AND a.m = (c.cohort + INTERVAL '1 month')::DATE
GROUP BY c.cohort
ORDER BY c.cohort;`,
    hints: ['CTE 1：每位顧客的首購月（DATE_TRUNC）', 'CTE 2：每位顧客有購買的月份（DISTINCT）', 'LEFT JOIN 條件：同一人、月份 = cohort + 1 個月'],
  },
  {
    id: 'm-h03',
    difficulty: 'Hard',
    topic: '營收',
    title: '7 日移動平均營收',
    datasetId: 'ecommerce',
    leetcodeRef: '1321. Restaurant Growth',
    prompt: `請計算 **2024 年 6 月每一天**的單日營收與 **7 日移動平均**（含當天往前共 7 天；沒有訂單的日子營收算 0，這些 0 也要納入平均）。

${COMPLETED_NOTE}

輸出 **day**、**revenue**、**ma7**（皆四捨五入到小數 2 位），依 day 排序。`,
    expectedColumns: 'day | revenue | ma7',
    strictColumns: true,
    orderMatters: true,
    solution: `WITH days AS (
  SELECT d::DATE AS day
  FROM generate_series(DATE '2024-01-01', DATE '2024-06-30', INTERVAL '1 day') AS d
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
    hints: [
      '先用 generate_series 產生連續日期，LEFT JOIN 每日營收並補 0',
      'AVG(...) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)',
      '6/1 的移動平均需要 5 月底的資料，所以要先算完再篩 6 月',
    ],
    commonMistakes: ['沒有補齊沒訂單的日期，「前 6 列」就不是「前 6 天」。', '先篩選 6 月再開窗，6/1~6/6 的平均會少算 5 月的天數。'],
  },
  {
    id: 'm-h04',
    difficulty: 'Hard',
    topic: '部門績效',
    title: '部門薪資中位數',
    datasetId: 'hr',
    leetcodeRef: '569. Median Employee Salary',
    prompt: '請算出**每個部門的薪資中位數** **median_salary**（偶數人時取中間兩人的平均），四捨五入到小數 2 位。輸出 **dept_name** 與 **median_salary**。',
    expectedColumns: 'dept_name | median_salary',
    strictColumns: true,
    solution: `SELECT d.dept_name,
       ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY e.salary))::NUMERIC, 2) AS median_salary
FROM employees e
JOIN departments d ON d.dept_id = e.dept_id
GROUP BY d.dept_id, d.dept_name;`,
    hints: ['PostgreSQL 有 PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ...)', 'MySQL 沒有，要用 ROW_NUMBER 與 COUNT 自己找中間列——兩種都值得練'],
    explanation: `PERCENTILE_CONT 回傳 double precision，ROUND 前要轉成 NUMERIC。LeetCode 569 若用 MySQL，常見解法是：
~~~sql
WITH r AS (
  SELECT dept_id, salary,
         ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary) AS rn,
         COUNT(*) OVER (PARTITION BY dept_id) AS cnt
  FROM employees
)
SELECT dept_id, AVG(salary) FROM r
WHERE rn BETWEEN cnt / 2.0 AND cnt / 2.0 + 1
GROUP BY dept_id;
~~~`,
  },
  {
    id: 'm-h05',
    difficulty: 'Hard',
    topic: '回購',
    title: '連續三個月都有購買的顧客',
    datasetId: 'ecommerce',
    leetcodeRef: 'Gaps and Islands（月份版）',
    prompt: '請找出**曾經連續 3 個月（或更多）每個月都至少有一筆 completed 訂單**的顧客，輸出 **name**（每人一列）。',
    expectedColumns: 'name',
    strictColumns: true,
    solution: `WITH m AS (
  SELECT DISTINCT customer_id, DATE_TRUNC('month', order_date)::DATE AS m
  FROM orders
  WHERE status = 'completed'
), g AS (
  SELECT customer_id, m,
         (EXTRACT(YEAR FROM m) * 12 + EXTRACT(MONTH FROM m))
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
    hints: ['把月份轉成「年 × 12 + 月」的整數，就能套用連續天數的技巧', '同一位顧客可能有兩段連續區間，最後要去重'],
    explanation: '也可以用 LAG 判斷：LAG(m, 2) OVER (...) = m − 2 個月，代表連續三個月。兩種方法都是 LeetCode 常見解法。',
  },
  {
    id: 'm-h06',
    difficulty: 'Hard',
    topic: '部門績效',
    title: '組織階層與匯報鏈',
    datasetId: 'hr',
    leetcodeRef: '1270. All People Report to the Given Manager（遞迴 CTE）',
    prompt: "請用遞迴 CTE 列出每位員工在組織中的層級 **level**（最高主管為 1），以及從最高主管到自己的匯報鏈 **chain**（以 ' > ' 串接 name，例如 'Alice > Bob > Frank'）。輸出 **name**、**level**、**chain**，依 level、name 排序。",
    expectedColumns: 'name | level | chain',
    strictColumns: true,
    orderMatters: true,
    solution: `WITH RECURSIVE tree AS (
  SELECT emp_id, name, 1 AS level, name::TEXT AS chain
  FROM employees
  WHERE manager_id IS NULL
  UNION ALL
  SELECT e.emp_id, e.name, t.level + 1, t.chain || ' > ' || e.name
  FROM employees e
  JOIN tree t ON e.manager_id = t.emp_id
)
SELECT name, level, chain
FROM tree
ORDER BY level, name;`,
    hints: ['錨點：manager_id IS NULL', '遞迴：JOIN 上一層，level + 1、chain 串接', 'chain 的型別要一致：name::TEXT'],
  },
  {
    id: 'm-h07',
    difficulty: 'Hard',
    topic: '商品排行',
    title: '最常一起購買的商品組合',
    datasetId: 'ecommerce',
    leetcodeRef: '購物籃分析（1164 / Self Join 配對）',
    prompt: `請找出**同一筆 completed 訂單中最常一起出現**的商品組合。組合以 (product_a, product_b) 表示，**product_a 的 product_id 較小**。

列出次數排名前 3 名的組合（用 RANK，並列全部列出）：**product_a**、**product_b**（商品名稱）、**together_count**，依 together_count 由多到少、再依 product_a、product_b 的 product_id 排序。`,
    expectedColumns: 'product_a | product_b | together_count',
    strictColumns: true,
    orderMatters: true,
    solution: `WITH items AS (
  SELECT DISTINCT oi.order_id, oi.product_id
  FROM order_items oi
  JOIN orders o ON o.order_id = oi.order_id
  WHERE o.status = 'completed'
), pairs AS (
  SELECT a.product_id AS pa, b.product_id AS pb, COUNT(*) AS together_count
  FROM items a
  JOIN items b ON a.order_id = b.order_id AND a.product_id < b.product_id
  GROUP BY a.product_id, b.product_id
), ranked AS (
  SELECT *, RANK() OVER (ORDER BY together_count DESC) AS rnk FROM pairs
)
SELECT p1.name AS product_a, p2.name AS product_b, r.together_count
FROM ranked r
JOIN products p1 ON p1.product_id = r.pa
JOIN products p2 ON p2.product_id = r.pb
WHERE r.rnk <= 3
ORDER BY r.together_count DESC, r.pa, r.pb;`,
    hints: ['同一筆訂單的品項 Self Join，條件 a.product_id < b.product_id', 'GROUP BY 兩個商品計數', 'RANK() OVER (ORDER BY together_count DESC) <= 3'],
  },
  {
    id: 'm-h08',
    difficulty: 'Hard',
    topic: '留存',
    title: '月活躍與流失人數',
    datasetId: 'saas',
    leetcodeRef: 'MAU / Churn（1645、1917 類型）',
    prompt: `請依登入紀錄計算每個月的：
- **mau**：該月至少登入一次的使用者數
- **churned**：**上個月**有登入、但**這個月**沒有登入的使用者數（第一個月為 0）

輸出 **month**（'YYYY-MM'）、**mau**、**churned**，依 month 排序。`,
    expectedColumns: 'month | mau | churned',
    strictColumns: true,
    orderMatters: true,
    solution: `WITH a AS (
  SELECT DISTINCT user_id, DATE_TRUNC('month', login_date)::DATE AS m
  FROM logins
), months AS (
  SELECT DISTINCT m FROM a
)
SELECT TO_CHAR(mo.m, 'YYYY-MM') AS month,
       (SELECT COUNT(*) FROM a WHERE a.m = mo.m) AS mau,
       (SELECT COUNT(*)
          FROM a prev
         WHERE prev.m = (mo.m - INTERVAL '1 month')::DATE
           AND NOT EXISTS (SELECT 1 FROM a cur WHERE cur.user_id = prev.user_id AND cur.m = mo.m)
       ) AS churned
FROM months mo
ORDER BY mo.m;`,
    hints: ['先整理出 (user_id, 月份) 的不重複清單', '流失 = 上月清單中，不存在於本月清單的人', '可用相關子查詢或 LEFT JOIN 兩個月份清單'],
  },
];
