import { describe, it, expect, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createPGlite } from '../src/db/pglite';
import { runInSandbox } from '../src/db/sandbox';
import { gradeExercise, type Runner } from '../src/grading/grade';
import { getChapter, getProblem, getDataset } from '../src/content';
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
