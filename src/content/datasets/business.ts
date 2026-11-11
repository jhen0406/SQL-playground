import type { Dataset } from '../types';

/** 電商：營收、回購、商品排行 */
export const ecommerce: Dataset = {
  id: 'ecommerce',
  name: '電商資料庫',
  description: '2024 上半年的顧客、商品與訂單。orders.status 可能是 completed / cancelled / refunded，只有 completed 算營收。',
  schemaSql: `
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name        VARCHAR(50) NOT NULL,
  city        VARCHAR(30),
  segment     VARCHAR(20),   -- 'consumer' | 'business'
  signup_date DATE NOT NULL
);
CREATE TABLE categories (
  category_id INTEGER PRIMARY KEY,
  name        VARCHAR(30) NOT NULL
);
CREATE TABLE products (
  product_id  INTEGER PRIMARY KEY,
  name        VARCHAR(50) NOT NULL,
  category_id INTEGER REFERENCES categories(category_id),
  price       NUMERIC(10,2) NOT NULL,
  cost        NUMERIC(10,2) NOT NULL
);
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(customer_id),
  order_date  DATE NOT NULL,
  status      VARCHAR(20) NOT NULL
);
CREATE TABLE order_items (
  order_id   INTEGER REFERENCES orders(order_id),
  product_id INTEGER REFERENCES products(product_id),
  quantity   INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  discount   NUMERIC(4,2) NOT NULL DEFAULT 0,  -- 0.10 代表打九折
  PRIMARY KEY (order_id, product_id)
);
`,
  seedSql: `
INSERT INTO customers VALUES
 (1,  'Amy',    'Taipei',    'consumer', '2023-11-02'),
 (2,  'Ben',    'Taichung',  'consumer', '2023-12-15'),
 (3,  'Cathy',  'Kaohsiung', 'business', '2024-01-03'),
 (4,  'Daniel', 'Taipei',    'consumer', '2024-01-10'),
 (5,  'Eva',    'Tainan',    'business', '2024-01-21'),
 (6,  'Frank',  'Taipei',    'consumer', '2024-02-01'),
 (7,  'Gina',   'Hsinchu',   'consumer', '2024-02-14'),
 (8,  'Henry',  'Taichung',  'business', '2024-02-20'),
 (9,  'Ivy',    'Taipei',    'consumer', '2024-03-05'),
 (10, 'Jason',  'Kaohsiung', 'consumer', '2024-03-18'),
 (11, 'Kelly',  'Tainan',    'business', '2024-04-02'),
 (12, 'Leo',    'Hsinchu',   'consumer', '2024-04-25'),
 (13, 'Mona',   'Taipei',    'consumer', '2024-05-09'),
 (14, 'Nick',   'Taichung',  'consumer', '2024-05-30'),
 (15, 'Olivia', 'Taipei',    'business', '2024-06-10');

INSERT INTO categories VALUES (1, 'Electronics'), (2, 'Home'), (3, 'Books'), (4, 'Beauty');

INSERT INTO products VALUES
 (1,  'Wireless Earbuds', 1, 1990, 1200),
 (2,  'Smart Watch',      1, 4990, 3300),
 (3,  'Power Bank',       1,  890,  450),
 (4,  'Desk Lamp',        2,  1290,  700),
 (5,  'Air Purifier',     2,  6990, 4800),
 (6,  'Coffee Mug',       2,   390,  150),
 (7,  'SQL Cookbook',     3,   680,  380),
 (8,  'Data Science 101', 3,   850,  500),
 (9,  'Travel Guide',     3,   450,  220),
 (10, 'Face Cream',       4,  1100,  400),
 (11, 'Lip Balm',         4,   250,   80),
 (12, 'Shampoo',          4,   420,  180);

-- 90 筆訂單：日期隨編號遞增，約每 2 天一筆；顧客數隨時間成長
INSERT INTO orders
SELECT g,
       1 + ((g * 5) % LEAST(14, 2 + g / 6)),
       DATE '2024-01-01' + (g * 2 + (g * 7) % 3),
       CASE WHEN g % 11 = 0 THEN 'cancelled'
            WHEN g % 17 = 0 THEN 'refunded'
            ELSE 'completed' END
FROM generate_series(1, 90) AS g;

-- 每筆訂單 1~3 個品項
INSERT INTO order_items
SELECT o.g, p.product_id, 1 + ((o.g + k) % 4), p.price,
       CASE WHEN o.g % 5 = 0 THEN 0.10 ELSE 0 END
FROM generate_series(1, 90) AS o(g)
CROSS JOIN generate_series(1, 3) AS k
JOIN products p ON p.product_id = 1 + ((o.g * 5 + k * 3) % 12)
WHERE k <= 1 + (o.g % 3);
`,
  hiddenExtraSql: `
INSERT INTO customers VALUES (16, 'Peter', 'Taipei', 'consumer', '2024-06-20');
INSERT INTO products VALUES (13, 'Gaming Mouse', 1, 1490, 800);
INSERT INTO orders VALUES
 (1001, 15, '2024-06-21', 'completed'),
 (1002, 16, '2024-06-22', 'completed'),
 (1003, 15, '2024-06-25', 'completed'),
 (1004, 16, '2024-06-26', 'cancelled'),
 (1005, 3,  '2024-06-27', 'completed'),
 (1006, 14, '2024-06-28', 'refunded');
INSERT INTO order_items VALUES
 (1001, 13, 3, 1490, 0),
 (1001, 5,  1, 6990, 0.10),
 (1002, 13, 1, 1490, 0),
 (1003, 2,  2, 4990, 0),
 (1004, 5,  5, 6990, 0),
 (1005, 13, 2, 1490, 0.10),
 (1006, 2,  1, 4990, 0);
`,
};

/** 人資：部門績效、薪資排名 */
export const hr: Dataset = {
  id: 'hr',
  name: '人資與業績資料庫',
  description: '部門、員工（含主管關係）、年度考績與業務的每筆成交紀錄。',
  schemaSql: `
CREATE TABLE departments (
  dept_id   INTEGER PRIMARY KEY,
  dept_name VARCHAR(30) NOT NULL,
  budget    NUMERIC(12,2)
);
CREATE TABLE employees (
  emp_id     INTEGER PRIMARY KEY,
  name       VARCHAR(30) NOT NULL,
  dept_id    INTEGER REFERENCES departments(dept_id),
  manager_id INTEGER REFERENCES employees(emp_id),
  hire_date  DATE NOT NULL,
  salary     NUMERIC(10,2) NOT NULL
);
CREATE TABLE reviews (
  emp_id INTEGER REFERENCES employees(emp_id),
  year   INTEGER NOT NULL,
  score  INTEGER NOT NULL,  -- 1~5 分
  PRIMARY KEY (emp_id, year)
);
CREATE TABLE sales (
  sale_id   INTEGER PRIMARY KEY,
  emp_id    INTEGER REFERENCES employees(emp_id),
  sale_date DATE NOT NULL,
  amount    NUMERIC(10,2) NOT NULL
);
`,
  seedSql: `
INSERT INTO departments VALUES
 (1, 'Sales',       2000000),
 (2, 'Engineering', 3500000),
 (3, 'Marketing',   1200000),
 (4, 'Finance',      900000),
 (5, 'Legal',        500000);

INSERT INTO employees VALUES
 (1,  'Alice',   NULL, NULL, '2015-03-01', 250000),
 (2,  'Bob',     1,    1,    '2016-05-10', 120000),
 (3,  'Carol',   2,    1,    '2016-07-01', 150000),
 (4,  'Dave',    3,    1,    '2017-02-15', 110000),
 (5,  'Erin',    4,    1,    '2018-01-08', 105000),
 (6,  'Frank',   1,    2,    '2019-04-01',  68000),
 (7,  'Grace',   1,    2,    '2019-09-16',  72000),
 (8,  'Heidi',   1,    2,    '2021-03-01',  61000),
 (9,  'Ivan',    1,    2,    '2022-06-20',  55000),
 (10, 'Judy',    2,    3,    '2018-08-01',  98000),
 (11, 'Ken',     2,    3,    '2019-11-11',  98000),
 (12, 'Laura',   2,    3,    '2020-02-03',  91000),
 (13, 'Mallory', 2,    10,   '2022-01-10',  76000),
 (14, 'Niaj',    2,    10,   '2023-07-01',  99000),
 (15, 'Olivia',  3,    4,    '2020-05-05',  64000),
 (16, 'Peggy',   3,    4,    '2023-03-20',  52000),
 (17, 'Quinn',   4,    5,    '2021-10-01',  60000),
 (18, 'Rupert',  4,    5,    '2024-02-01',  58000);

INSERT INTO reviews VALUES
 (6, 2022, 4), (6, 2023, 5), (7, 2022, 3), (7, 2023, 4), (8, 2022, 2), (8, 2023, 3), (9, 2023, 4),
 (10, 2022, 5), (10, 2023, 4), (11, 2022, 4), (11, 2023, 5), (12, 2022, 3), (12, 2023, 3),
 (13, 2023, 5), (14, 2023, 2), (15, 2022, 4), (15, 2023, 4), (16, 2023, 3), (17, 2022, 3), (17, 2023, 2),
 (2, 2023, 4), (3, 2023, 5), (4, 2023, 3), (5, 2023, 4);

-- 業務（Bob 6~9 號）2024 上半年的成交紀錄
INSERT INTO sales
SELECT g,
       CASE WHEN g % 9 = 0 THEN 2 ELSE 6 + (g % 4) END,
       DATE '2024-01-02' + (g * 3),
       1000 + ((g * 937) % 9000)
FROM generate_series(1, 58) AS g;
`,
  hiddenExtraSql: `
INSERT INTO departments VALUES (6, 'Support', 400000);
INSERT INTO employees VALUES
 (19, 'Sybil',  6, 1,  '2024-04-01', 50000),
 (20, 'Trent',  6, 19, '2024-05-01', 52000),
 (21, 'Uma',    1, 2,  '2024-05-15', 72000);
INSERT INTO reviews VALUES (19, 2023, 5), (21, 2023, 5);
INSERT INTO sales VALUES
 (1001, 21, '2024-06-03', 9800),
 (1002, 21, '2024-06-04', 9800),
 (1003, 21, '2024-06-05', 120),
 (1004, 9,  '2024-06-28', 15000);
`,
};

/** 訂閱 / 活躍：留存、連續登入、流失 */
export const saas: Dataset = {
  id: 'saas',
  name: '訂閱制 App 資料庫',
  description: '使用者、每日登入紀錄、訂閱方案。適合練習留存率、連續天數與日期區間題。',
  schemaSql: `
CREATE TABLE users (
  user_id     INTEGER PRIMARY KEY,
  signup_date DATE NOT NULL,
  country     VARCHAR(20),
  channel     VARCHAR(20)   -- 'ads' | 'organic' | 'referral'
);
CREATE TABLE logins (
  user_id    INTEGER REFERENCES users(user_id),
  login_date DATE NOT NULL,
  PRIMARY KEY (user_id, login_date)
);
CREATE TABLE subscriptions (
  sub_id      INTEGER PRIMARY KEY,
  user_id     INTEGER REFERENCES users(user_id),
  plan        VARCHAR(20) NOT NULL,     -- 'basic' | 'pro'
  start_date  DATE NOT NULL,
  end_date    DATE,                      -- NULL 代表仍在訂閱中
  monthly_fee NUMERIC(8,2) NOT NULL
);
`,
  seedSql: `
INSERT INTO users
SELECT g,
       DATE '2024-03-01' + ((g * 3) % 30),
       (ARRAY['TW','JP','US','TW','KR'])[1 + g % 5],
       (ARRAY['ads','organic','referral'])[1 + (g * 7) % 3]
FROM generate_series(1, 30) AS g;

-- 登入紀錄：每位使用者從註冊日起，依規則在某些天登入
INSERT INTO logins
SELECT DISTINCT u.user_id, u.signup_date + d
FROM users u
CROSS JOIN generate_series(0, 40) AS d
WHERE d = 0
   OR (u.user_id % 3 = 0 AND d < 12)                       -- 每 3 人有 1 人前 12 天天天登入
   OR (u.user_id % 4 = 1 AND d % 2 = 0 AND d < 30)         -- 有些人隔天登入
   OR (u.user_id % 5 = 2 AND d IN (1, 2, 3, 7, 8, 20))
   OR (u.user_id % 7 = 0 AND d BETWEEN 25 AND 31);

INSERT INTO subscriptions
SELECT row_number() OVER (ORDER BY u.user_id),
       u.user_id,
       CASE WHEN u.user_id % 4 = 0 THEN 'pro' ELSE 'basic' END,
       u.signup_date + (u.user_id % 6),
       CASE WHEN u.user_id % 3 = 1 THEN u.signup_date + (u.user_id % 6) + 30 + u.user_id ELSE NULL END,
       CASE WHEN u.user_id % 4 = 0 THEN 299 ELSE 99 END
FROM users u
WHERE u.user_id % 5 <> 3;
`,
  hiddenExtraSql: `
INSERT INTO users VALUES (31, '2024-03-31', 'TW', 'ads'), (32, '2024-04-01', 'US', 'organic');
INSERT INTO logins VALUES
 (31, '2024-03-31'), (31, '2024-04-01'), (31, '2024-04-02'), (31, '2024-04-03'), (31, '2024-04-04'),
 (31, '2024-04-05'), (31, '2024-04-06'), (31, '2024-04-07'), (31, '2024-04-08'), (31, '2024-04-09'),
 (31, '2024-04-10'), (31, '2024-04-11'), (31, '2024-04-12'), (31, '2024-04-13'), (31, '2024-04-14'),
 (32, '2024-04-01'), (32, '2024-04-08');
INSERT INTO subscriptions VALUES (100, 31, 'pro', '2024-03-31', NULL, 299), (101, 32, 'basic', '2024-04-01', '2024-04-05', 99);
`,
};
