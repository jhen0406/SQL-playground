import { describe, it, expect, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createPGlite } from '../src/db/pglite';
import { runInSandbox } from '../src/db/sandbox';
import { gradeExercise, type Runner } from '../src/grading/grade';
import { getChapter, getProblem, getDrill, getDataset } from '../src/content';
import type { Exercise } from '../src/content/types';

let db: PGlite;
let run: Runner;
beforeAll(async () => {
  db = createPGlite();
  await db.waitReady;
  run = (req) => runInSandbox(db, req);
});

const grade = (ex: Exercise, sql: string) => gradeExercise(run, getDataset(ex), ex, sql);

describe('判題會擋下常見錯誤', () => {
  it('c07-r：<> 會漏掉 NULL', async () => {
    const g = await grade(getChapter('c07')!.review, 'SELECT order_id, shipper_id FROM orders WHERE shipper_id <> 1;');
    expect(g.pass).toBe(false);
  });
  it('c09-p：DESC 時 NULL 排第一', async () => {
    const g = await grade(getChapter('c09')!.practice, 'SELECT product_name, price FROM products ORDER BY price DESC LIMIT 3;');
    expect(g.pass).toBe(false);
  });
  it('c04-p：排序錯誤會被指出', async () => {
    const g = await grade(getChapter('c04')!.practice, 'SELECT product_name, price FROM products ORDER BY price ASC, product_name DESC;');
    expect(g.pass).toBe(false);
  });
  it('c13-r：|| 遇到 NULL 在隱藏測資失敗', async () => {
    const g = await grade(
      getChapter('c13')!.review,
      "SELECT customer_name AS customer, address || ', ' || city || ', ' || country AS full_address FROM customers;",
    );
    expect(g.pass).toBe(false);
    expect(g.cases.find((c) => !c.pass)?.hidden).toBe(true);
  });
  it('寫死範例資料的答案會在隱藏測資失敗', async () => {
    const g = await grade(getChapter('c03')!.practice, "SELECT customer_name, city FROM customers WHERE customer_id IN (4, 11);");
    expect(g.cases[0].pass).toBe(true);
    expect(g.pass).toBe(false);
  });
  it('c17-r：COUNT(*) 讓空分類變成 1', async () => {
    const g = await grade(
      getChapter('c17')!.review,
      'SELECT c.category_name, COUNT(*) AS product_count FROM categories c LEFT JOIN products p ON p.category_id = c.category_id GROUP BY c.category_name;',
    );
    expect(g.pass).toBe(false);
  });
  it('c29-p：整數除法', async () => {
    const g = await grade(getChapter('c29')!.practice, 'SELECT ROUND(COUNT(price) / COUNT(*), 2) AS priced_ratio FROM products;');
    expect(g.pass).toBe(false);
  });
  it('m-e01：忘了排除取消訂單', async () => {
    const g = await grade(getProblem('m-e01')!, 'SELECT ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS total_revenue FROM order_items;');
    expect(g.pass).toBe(false);
  });
  it('m-m07：用 RANK 取代 DENSE_RANK 會少人', async () => {
    const g = await grade(
      getProblem('m-m07')!,
      `WITH r AS (SELECT e.*, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) rn FROM employees e WHERE dept_id IS NOT NULL)
       SELECT d.dept_name, r.name, r.salary FROM r JOIN departments d USING (dept_id) WHERE rn <= 3;`,
    );
    expect(g.pass).toBe(false);
  });
  it('m-m12：COUNT(*) 扇出', async () => {
    const g = await grade(
      getProblem('m-m12')!,
      `SELECT c.name, COUNT(*) AS completed_orders, ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount)), 2) AS total_spent, MAX(o.order_date) AS last_order_date
       FROM customers c JOIN orders o ON o.customer_id = c.customer_id JOIN order_items oi ON oi.order_id = o.order_id
       WHERE o.status = 'completed' GROUP BY c.customer_id, c.name ORDER BY total_spent DESC, c.name;`,
    );
    expect(g.pass).toBe(false);
  });
  it('m-e05：欄名不同會被嚴格欄名擋下', async () => {
    const g = await grade(
      getProblem('m-e05')!,
      'SELECT d.dept_name, ROUND(AVG(e.salary), 2) AS avg, COUNT(*) AS headcount FROM employees e JOIN departments d ON d.dept_id = e.dept_id GROUP BY d.dept_id, d.dept_name;',
    );
    expect(g.pass).toBe(false);
  });
  it('替代解法也能通過（NOT IN / LEFT JOIN）', async () => {
    const ex = getChapter('c30')!.review;
    expect((await grade(ex, 'SELECT customer_name FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders);')).pass).toBe(true);
    expect((await grade(ex, 'SELECT c.customer_name FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL;')).pass).toBe(true);
  });
  it('m-e07：MAX 子查詢的替代解法', async () => {
    const g = await grade(getProblem('m-e07')!, 'SELECT MAX(salary) AS second_highest_salary FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);');
    expect(g.pass).toBe(true);
  });
});

describe('題型特訓：常見錯誤會被判錯、正確的替代寫法會通過', () => {
  const D = (id: string) => getDrill(id)!;
  const wrong: [string, string, string][] = [
    ['d-01', 'INNER JOIN 漏掉 0 次', 'SELECT s.student_id, s.student_name, e.subject_name, COUNT(*) AS attended_exams FROM students s JOIN examinations e ON e.student_id = s.student_id GROUP BY s.student_id, s.student_name, e.subject_name ORDER BY s.student_id, e.subject_name;'],
    ['d-01', 'COUNT(*) 把 0 算成 1', 'SELECT s.student_id, s.student_name, sub.subject_name, COUNT(*) AS attended_exams FROM students s CROSS JOIN subjects sub LEFT JOIN examinations e ON e.student_id = s.student_id AND e.subject_name = sub.subject_name GROUP BY s.student_id, s.student_name, sub.subject_name ORDER BY s.student_id, sub.subject_name;'],
    ['d-02', 'GROUP BY CASE 少了 0 人級距', "SELECT CASE WHEN income < 20000 THEN 'Low Salary' WHEN income <= 50000 THEN 'Average Salary' ELSE 'High Salary' END AS category, COUNT(*) AS accounts_count FROM accounts GROUP BY 1;"],
    ['d-03', '用 id 相減', 'SELECT cur.id FROM weather cur JOIN weather prev ON cur.id = prev.id + 1 WHERE cur.temperature > prev.temperature;'],
    ['d-03', '用 LAG 比較前一列', 'SELECT id FROM (SELECT id, temperature, LAG(temperature) OVER (ORDER BY record_date) AS p FROM weather) t WHERE temperature > p;'],
    ['d-04', '只看總次數', 'SELECT num AS consecutive_nums FROM logs GROUP BY num HAVING COUNT(*) >= 3;'],
    ['d-04', '忘了 DISTINCT', 'SELECT num AS consecutive_nums FROM (SELECT num, LAG(num) OVER (ORDER BY id) p, LEAD(num) OVER (ORDER BY id) n FROM logs) t WHERE num = p AND num = n;'],
    ['d-05', 'COUNT 沒有 DISTINCT', 'SELECT customer_id FROM customer GROUP BY customer_id HAVING COUNT(product_key) = (SELECT COUNT(*) FROM product);'],
    ['d-05', '商品數寫死', 'SELECT customer_id FROM customer GROUP BY customer_id HAVING COUNT(DISTINCT product_key) = 2;'],
    ['d-06', '計數混入選修', 'SELECT student_name FROM enrollments GROUP BY student_name HAVING COUNT(*) = (SELECT COUNT(*) FROM courses WHERE is_required);'],
    ['d-07', '從 confirmations 開始，漏掉沒訊息的人', "SELECT user_id, ROUND(AVG(CASE WHEN action = 'confirmed' THEN 1.0 ELSE 0 END), 2) AS confirmation_rate FROM confirmations GROUP BY user_id;"],
    ['d-08', '整數除法', 'SELECT query_name, ROUND(AVG(rating / position), 2) AS quality, ROUND(AVG(CASE WHEN rating < 3 THEN 100.0 ELSE 0 END), 2) AS poor_query_percentage FROM queries GROUP BY query_name;'],
    ['d-09', '只檢查乘客', "SELECT t.request_at AS day, ROUND(AVG(CASE WHEN t.status LIKE 'cancelled%' THEN 1.0 ELSE 0 END), 2) AS cancellation_rate FROM trips t JOIN users c ON c.users_id = t.client_id AND c.banned = 'No' WHERE t.request_at BETWEEN '2024-10-01' AND '2024-10-03' GROUP BY t.request_at;"],
    ['d-10', '漏掉沒調價的商品', "SELECT pc.product_id, pc.new_price AS price FROM price_changes pc WHERE (pc.product_id, pc.change_date) IN (SELECT product_id, MAX(change_date) FROM price_changes WHERE change_date <= '2024-08-16' GROUP BY product_id);"],
    ['d-11', '任兩天連續就算', 'SELECT ROUND(COUNT(DISTINCT a.player_id)::NUMERIC / (SELECT COUNT(DISTINCT player_id) FROM activity), 2) AS fraction FROM activity a JOIN activity b ON b.player_id = a.player_id AND b.event_date = a.event_date + 1;'],
    ['d-12', '依 person_id 累計', 'SELECT person_name FROM (SELECT person_name, person_id, SUM(weight) OVER (ORDER BY person_id) AS t FROM queue) x WHERE t <= 1000 ORDER BY person_id DESC LIMIT 1;'],
    ['d-13', '沒處理最後一個奇數座位', 'SELECT CASE WHEN id % 2 = 1 THEN id + 1 ELSE id - 1 END AS id, student FROM seat ORDER BY id;'],
    ['d-13', '最大 id 寫死', 'SELECT CASE WHEN id = 5 THEN id WHEN id % 2 = 1 THEN id + 1 ELSE id - 1 END AS id, student FROM seat ORDER BY id;'],
    ['d-14', '用 UNION', "(SELECT u.name AS results FROM movie_rating r JOIN users u ON u.user_id = r.user_id GROUP BY u.user_id, u.name ORDER BY COUNT(*) DESC, u.name LIMIT 1) UNION (SELECT m.title FROM movie_rating r JOIN movies m ON m.movie_id = r.movie_id WHERE r.created_at >= '2024-02-01' AND r.created_at < '2024-03-01' GROUP BY m.movie_id, m.title ORDER BY AVG(r.rating) DESC, m.title LIMIT 1);"],
    ['d-15', '只算邀請者', 'SELECT requester_id AS id, COUNT(*) AS num FROM request_accepted GROUP BY requester_id ORDER BY num DESC LIMIT 1;'],
    ['d-16', '用 INITCAP', 'SELECT user_id, INITCAP(name) AS name FROM users ORDER BY user_id;'],
    ['d-17', "LIKE '%DIAB1%'", "SELECT patient_id, patient_name, conditions FROM patients WHERE conditions LIKE '%DIAB1%';"],
    ['d-18', '點沒有跳脫', "SELECT user_id, name, mail FROM members WHERE mail ~ '^[A-Za-z][A-Za-z0-9_.-]*@sqlpg.com$';"],
    ['d-18', '不分大小寫', "SELECT user_id, name, mail FROM members WHERE mail ~* '^[A-Za-z][A-Za-z0-9_.-]*@sqlpg\\.com$';"],
    ['d-19', '沒有 DISTINCT', "SELECT sell_date, COUNT(product) AS num_sold, STRING_AGG(product, ',' ORDER BY product) AS products FROM sales_log GROUP BY sell_date ORDER BY sell_date;"],
    ['d-21', '<> 會刪光重複列', 'DELETE FROM person p1 WHERE EXISTS (SELECT 1 FROM person p2 WHERE p2.email = p1.email AND p2.id <> p1.id);'],
  ];
  for (const [id, why, sql] of wrong) {
    it(`${id}：${why}`, async () => {
      const g = await grade(D(id), sql);
      expect(g.pass).toBe(false);
    });
  }

  const right: [string, string, string][] = [
    ['d-02', 'VALUES + LEFT JOIN', "SELECT v.category, COUNT(a.account_id) AS accounts_count FROM (VALUES ('Low Salary'), ('Average Salary'), ('High Salary')) v(category) LEFT JOIN accounts a ON v.category = CASE WHEN a.income < 20000 THEN 'Low Salary' WHEN a.income <= 50000 THEN 'Average Salary' ELSE 'High Salary' END GROUP BY v.category;"],
    ['d-04', '三次自我連接', 'SELECT DISTINCT l1.num AS consecutive_nums FROM logs l1 JOIN logs l2 ON l2.id = l1.id + 1 JOIN logs l3 ON l3.id = l1.id + 2 WHERE l1.num = l2.num AND l2.num = l3.num;'],
    ['d-06', '計數寫法', 'SELECT e.student_name FROM enrollments e JOIN courses c ON c.course_name = e.course_name WHERE c.is_required GROUP BY e.student_name HAVING COUNT(DISTINCT c.course_name) = (SELECT COUNT(*) FROM courses WHERE is_required);'],
    ['d-10', 'ROW_NUMBER 寫法', "SELECT p.product_id, COALESCE(x.new_price, 10) AS price FROM (SELECT DISTINCT product_id FROM price_changes) p LEFT JOIN (SELECT product_id, new_price, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY change_date DESC) rn FROM price_changes WHERE change_date <= '2024-08-16') x ON x.product_id = p.product_id AND x.rn = 1;"],
    ['d-05', 'NOT EXISTS + EXCEPT', 'SELECT DISTINCT customer_id FROM customer c WHERE NOT EXISTS (SELECT product_key FROM product EXCEPT SELECT product_key FROM customer c2 WHERE c2.customer_id = c.customer_id);'],
    ['d-17', '正規表示式', "SELECT patient_id, patient_name, conditions FROM patients WHERE conditions ~ '(^| )DIAB1';"],
    ['d-21', 'NOT IN MIN(id)', 'DELETE FROM person WHERE id NOT IN (SELECT MIN(id) FROM person GROUP BY email);'],
  ];
  for (const [id, why, sql] of right) {
    it(`${id}：${why} 也算對`, async () => {
      const g = await grade(D(id), sql);
      expect(g.pass, g.summary).toBe(true);
    });
  }
});

describe('章節補充練習：常見錯誤會被判錯', () => {
  const P = (cid: string, id: string) => {
    const c = getChapter(cid)!;
    return [c.practice, ...(c.morePractice ?? [])].find((e) => e.id === id)!;
  };
  const cases: [string, string, string, string][] = [
    ['c04', 'c04-p2', 'DESC 時 NULL 排第一', 'SELECT first_name, salary FROM employees ORDER BY salary DESC;'],
    ['c05', 'c05-p2', '少了括號', 'SELECT product_name, category_id, price FROM products WHERE category_id = 1 OR category_id = 2 AND price > 15;'],
    ['c05', 'c05-p3', '<> 用 OR 連接', "SELECT customer_name, country FROM customers WHERE country <> 'Mexico' OR country <> 'Germany';"],
    ['c09', 'c09-p2', 'OFFSET 寫成頁數', 'SELECT product_id, product_name FROM products ORDER BY product_id LIMIT 5 OFFSET 2;'],
    ['c10', 'c10-p2', 'COUNT(*) 也算 NULL', 'SELECT COUNT(*) AS total_employees, COUNT(*) AS with_salary FROM employees;'],
    ['c11', 'c11-p3', "'%Tea%' 抓到中間有 Tea 的", "SELECT product_name FROM products WHERE product_name LIKE '%Tea%';"],
    ['c14', 'c14-p2', 'INNER JOIN', 'SELECT c.category_name FROM categories c JOIN products p ON p.category_id = c.category_id WHERE p.product_id IS NULL;'],
    ['c14', 'c14-p3', '只用 LEFT JOIN', 'SELECT o.order_id, s.shipper_name FROM orders o LEFT JOIN shippers s ON s.shipper_id = o.shipper_id;'],
    ['c19', 'c19-p3', '用 ALL', 'SELECT product_name, price FROM products WHERE price > ALL (SELECT price FROM products WHERE category_id = 4);'],
    ['c22', 'c22-p2', '沒有 NULLIF 會除以 0', 'SELECT c.category_name, ROUND(COUNT(p.price)::NUMERIC / COUNT(p.product_id), 2) AS priced_ratio FROM categories c LEFT JOIN products p ON p.category_id = c.category_id GROUP BY c.category_id, c.category_name;'],
    ['c24', 'c24-p2', 'DROP TABLE', 'DROP TABLE order_details;'],
    ['c30', 'c30-p2', '平均到明細', 'SELECT ROUND(AVG(quantity), 2) AS avg_items FROM order_details;'],
    ['c30', 'c30-p4', 'NOT IN 遇到 NULL', 'SELECT shipper_name FROM shippers WHERE shipper_id NOT IN (SELECT shipper_id FROM orders);'],
    ['c34', 'c34-p2', '少了 ^ $', "SELECT customer_name, postal_code FROM customers WHERE postal_code ~ '[0-9]+';"],
  ];
  for (const [cid, id, why, sql] of cases) {
    it(`${id}：${why}`, async () => {
      const g = await grade(P(cid, id), sql);
      expect(g.pass).toBe(false);
    });
  }
});

describe('新章節：常見錯誤會被判錯', () => {
  const P = (cid: string, id: string) => {
    const c = getChapter(cid)!;
    return [c.practice, ...(c.morePractice ?? []), c.review].find((e) => e.id === id)!;
  };
  const cases: [string, string, string, string][] = [
    ['c35', 'c35-p2', '順序寫反', 'SELECT customer_id FROM orders EXCEPT SELECT customer_id FROM customers;'],
    ['c36', 'c36-p', '整數除法後才 CEIL', 'SELECT order_detail_id, quantity, CEIL(quantity / 6) AS boxes FROM order_details;'],
    ['c36', 'c36-p2', '用 ROUND 取代 FLOOR', 'SELECT product_name, ROUND(price * 0.85) AS sale_price FROM products;'],
    ['c37', 'c37-p', '輸入一般名稱', 'Alpine Market'],
    ['c37', 'c37-p2', "' OR '1'='1 回傳全部帳號", "' OR '1'='1"],
    ['c37', 'c37-p3', '混入商品', "x' OR 1=1 UNION SELECT username, password FROM app_users --"],
    ['c37', 'c37-p4', 'PREPARE 沒用參數', "PREPARE find_customer AS SELECT customer_name, city FROM customers WHERE customer_name = 'Alpine Market';"],
    ['c38', 'c38-p2', 'LAST_VALUE 沒設範圍', "SELECT order_id, order_date, LAST_VALUE(order_id) OVER (PARTITION BY TO_CHAR(order_date, 'YYYY-MM') ORDER BY order_date, order_id) AS last_in_month FROM orders;"],
    ['c38', 'c38-p5', '累計平均', "WITH m AS (SELECT TO_CHAR(order_date, 'YYYY-MM') AS month, COUNT(*) AS order_count FROM orders GROUP BY 1) SELECT month, order_count, ROUND(AVG(order_count) OVER (ORDER BY month), 2) AS moving_avg FROM m ORDER BY month;"],
    ['c39', 'c39-p', 'COUNT 沒有 DISTINCT', 'SELECT customer_name FROM order_records GROUP BY customer_name HAVING COUNT(customer_city) > 1;'],
    ['c39', 'c39-p3', '沒有 DISTINCT 違反主鍵', 'CREATE TABLE n_orders (order_id INTEGER PRIMARY KEY, order_date DATE, customer_name VARCHAR(50)); INSERT INTO n_orders SELECT order_id, order_date, customer_name FROM order_records;'],
    ['c40', 'c40-p', '忘了 COMMIT', 'BEGIN; UPDATE bank_accounts SET balance = balance - 300 WHERE account_id = 1; UPDATE bank_accounts SET balance = balance + 300 WHERE account_id = 2;'],
    ['c40', 'c40-p', '只扣款沒入帳', 'UPDATE bank_accounts SET balance = balance - 300 WHERE account_id = 1;'],
    ['c40', 'c40-p2', 'ROLLBACK 整個交易', 'BEGIN; UPDATE bank_accounts SET balance = balance + 100 WHERE account_id = 3; UPDATE bank_accounts SET balance = 0 WHERE account_id = 2; ROLLBACK; COMMIT;'],
    ['c40', 'c40-p3', '沒寫轉帳紀錄', 'BEGIN; UPDATE bank_accounts SET balance = balance - 200 WHERE account_id = 1; UPDATE bank_accounts SET balance = balance + 100 WHERE account_id IN (2, 3); COMMIT;'],
    ['c38', 'c38-r', 'LAST_VALUE 沒設範圍', 'SELECT first_name, hire_date, FIRST_VALUE(first_name) OVER (ORDER BY hire_date) AS first_hire, LAST_VALUE(first_name) OVER (ORDER BY hire_date) AS last_hire FROM employees;'],
  ];
  for (const [cid, id, why, sql] of cases) {
    it(`${id}：${why}`, async () => {
      const g = await grade(P(cid, id), sql);
      expect(g.pass).toBe(false);
    });
  }
  it('c37-p4：PREPARE 可以重複執行（沙盒會 DEALLOCATE）', async () => {
    const ex = P('c37', 'c37-p4');
    expect((await grade(ex, ex.solution)).pass).toBe(true);
    expect((await grade(ex, ex.solution)).pass).toBe(true);
  });
  it('c37-p2：admin\' -- 的其他寫法也算對', async () => {
    expect((await grade(P('c37', 'c37-p2'), "admin'--")).pass).toBe(true);
  });
});

