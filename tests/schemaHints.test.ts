import { describe, expect, it } from 'vitest';
import { mentionedColumns, tablesUsed } from '../src/lib/schemaHints';

const TABLES = ['categories', 'customers', 'employees', 'orders', 'order_details', 'products'];

describe('資料表面板提示', () => {
  it('從標準解找出用到的表，依原本順序回傳', () => {
    expect(tablesUsed("SELECT customer_name FROM Customers WHERE country = 'Germany'", TABLES)).toEqual(['customers']);
    const join = `SELECT c.customer_name, o.order_id
      FROM orders o JOIN customers c ON c.customer_id = o.customer_id
      JOIN order_details od ON od.order_id = o.order_id`;
    expect(tablesUsed(join, TABLES)).toEqual(['customers', 'orders', 'order_details']);
  });

  it('不會誤抓字串或註解裡的字', () => {
    const sql = "-- products 先不用\nSELECT 'orders' AS label /* employees */ FROM customers";
    expect(tablesUsed(sql, TABLES)).toEqual(['customers']);
  });

  it('不會把較長的名稱當成較短的表（order_details 不等於 orders）', () => {
    expect(tablesUsed('SELECT * FROM order_details', TABLES)).toEqual(['order_details']);
  });

  it('欄位比對是完整單字、不分大小寫', () => {
    const text = '請找出 **Country** 為 Germany 的顧客，列出 customer_name、city。customer_name | city';
    const cols = ['customer_id', 'customer_name', 'city', 'country', 'postal_code'];
    expect([...mentionedColumns(text, cols)].sort()).toEqual(['city', 'country', 'customer_name']);
    expect(mentionedColumns('cityscape', ['city']).size).toBe(0);
  });
});
