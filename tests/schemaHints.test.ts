import { describe, expect, it } from 'vitest';
import { mentionedColumns } from '../src/lib/schemaHints';

describe('資料表面板提示', () => {
  it('欄位比對是完整單字、不分大小寫', () => {
    const text = '請找出 **Country** 為 Germany 的顧客，列出 customer_name、city。customer_name | city';
    const cols = ['customer_id', 'customer_name', 'city', 'country', 'postal_code'];
    expect([...mentionedColumns(text, cols)].sort()).toEqual(['city', 'country', 'customer_name']);
    expect(mentionedColumns('cityscape', ['city']).size).toBe(0);
  });
});
