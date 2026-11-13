import type { Chapter } from '../types';
import { ex } from './helpers';

/** 正規化與交易：面試常問的資料庫觀念，搭配可判題的練習。 */

/** 沒有正規化的「大寬表」：一列塞了訂單、顧客、商品三種資訊 */
const FLAT = `CREATE TABLE order_records (
  order_id INTEGER, order_date DATE, customer_name VARCHAR(50), customer_city VARCHAR(50),
  product_name VARCHAR(50), unit_price NUMERIC(8,2), quantity INTEGER
);
INSERT INTO order_records VALUES
  (1, '2024-03-01', 'Amy',  'Taipei',    'Green Tea', 120, 2),
  (1, '2024-03-01', 'Amy',  'Taipei',    'Cookie',     80, 1),
  (2, '2024-03-02', 'Ben',  'Tainan',    'Green Tea', 120, 1),
  (3, '2024-03-05', 'Amy',  'Taipie',    'Coffee',    150, 3),
  (4, '2024-03-06', 'Cara', 'Kaohsiung', 'Cookie',     80, 5),
  (5, '2024-03-08', 'Ben',  'Tainan',    'Coffee',    155, 2),
  (5, '2024-03-08', 'Ben',  'Tainan',    'Cookie',     80, 4);
CREATE TABLE contacts (contact_id INTEGER PRIMARY KEY, name VARCHAR(30), phones VARCHAR(200));
INSERT INTO contacts VALUES
  (1, 'Amy',  '0912-111-111,02-2222-3333'),
  (2, 'Ben',  '0933-444-555'),
  (3, 'Cara', '07-555-6666,0955-777-888,0911-000-111');`;

/** 正規化之後的四張表 */
const NORMALIZED = `CREATE TABLE n_customers (customer_id INTEGER PRIMARY KEY, customer_name VARCHAR(50) NOT NULL, city VARCHAR(50));
CREATE TABLE n_products (product_id INTEGER PRIMARY KEY, product_name VARCHAR(50) NOT NULL, unit_price NUMERIC(8,2) NOT NULL);
CREATE TABLE n_orders (order_id INTEGER PRIMARY KEY, order_date DATE NOT NULL, customer_id INTEGER REFERENCES n_customers(customer_id));
CREATE TABLE n_order_lines (order_id INTEGER REFERENCES n_orders(order_id), product_id INTEGER REFERENCES n_products(product_id), quantity INTEGER NOT NULL, PRIMARY KEY (order_id, product_id));
INSERT INTO n_customers VALUES (1, 'Amy', 'Taipei'), (2, 'Ben', 'Tainan'), (3, 'Cara', 'Kaohsiung');
INSERT INTO n_products VALUES (1, 'Green Tea', 120), (2, 'Cookie', 80), (3, 'Coffee', 150);
INSERT INTO n_orders VALUES (1, '2024-03-01', 1), (2, '2024-03-02', 2), (3, '2024-03-05', 1), (4, '2024-03-06', 3), (5, '2024-03-08', 2);
INSERT INTO n_order_lines VALUES (1, 1, 2), (1, 2, 1), (2, 1, 1), (3, 3, 3), (4, 2, 5), (5, 3, 2), (5, 2, 4);`;

const BANK = `CREATE TABLE bank_accounts (account_id INTEGER PRIMARY KEY, owner VARCHAR(30) NOT NULL, balance NUMERIC(10,2) NOT NULL CHECK (balance >= 0));
INSERT INTO bank_accounts VALUES (1, 'Amy', 1000), (2, 'Ben', 500), (3, 'Cara', 200);
CREATE TABLE transfers (transfer_id SERIAL PRIMARY KEY, from_id INTEGER NOT NULL, to_id INTEGER NOT NULL, amount NUMERIC(10,2) NOT NULL);`;

const BALANCES = 'SELECT account_id, owner, balance FROM bank_accounts ORDER BY account_id';

export const part6: Chapter[] = [
  // ─────────────────────────── 正規化 ───────────────────────────
  {
    id: 'c39',
    order: 28,
    part: 'database',
    title: '正規化：把資料表拆對',
    w3Topics: 'Normalization · 1NF · 2NF · 3NF',
    concept: `
**正規化（Normalization）**是設計資料表的原則：**每一項資訊只存在一個地方**。前面幾章的 customers、orders、products 分成好幾張表，就是正規化的結果。

### 不拆表會怎樣？
假設把所有東西塞進一張「大寬表」：

| order_id | customer_name | customer_city | product_name | unit_price | quantity |
|---|---|---|---|---|---|
| 1 | Amy | Taipei | Green Tea | 120 | 2 |
| 1 | Amy | Taipei | Cookie | 80 | 1 |
| 3 | Amy | **Taipie** | Coffee | 150 | 3 |

同一份資訊（Amy 住哪、Coffee 多少錢）重複存了很多次，就會出現三種**異常**：
- **更新異常**：Amy 搬家要改很多列，漏改一列就前後矛盾（上表的 Taipie）。
- **新增異常**：還沒有人買過的新商品，沒地方記它的價格。
- **刪除異常**：刪掉某筆訂單，可能連帶失去「這位顧客住哪」的唯一紀錄。

### 三個正規形式（面試常問）
| 形式 | 規則 | 違反的例子 |
|---|---|---|
| **1NF** | 每一格只放**一個值**，沒有重複的欄位群組 | \`phones = '0912-111-111,02-2222-3333'\` |
| **2NF** | 符合 1NF，而且非主鍵欄位要依賴**整個**主鍵 | 主鍵是 (order_id, product_name)，但 order_date 只跟 order_id 有關 |
| **3NF** | 符合 2NF，而且非主鍵欄位**不依賴其他非主鍵欄位** | customer_city 依賴 customer_name，而不是訂單 |

口訣：每個欄位都要依賴「**主鍵、整個主鍵、只有主鍵**」。

### 拆完之後
拆成 customers、products、orders、order_lines 四張表，用**外鍵**連起來；要看完整資訊時再 **JOIN** 回來。

### 反正規化
報表、資料倉儲常故意保留重複資料（反正規化），換取查詢不用 JOIN 的速度。這是取捨，不是錯誤：先正規化，有效能需求再反正規化。
`,
    examples: [
      { title: '大寬表的重複資料', sql: `${FLAT}\nSELECT customer_name, customer_city, COUNT(*) AS rows_count\nFROM order_records\nGROUP BY customer_name, customer_city\nORDER BY customer_name;`, explain: 'Amy 被存成兩個不同城市：這就是更新異常。' },
      { title: '1NF：拆開一格多值', sql: `${FLAT}\nSELECT contact_id, name, TRIM(phone) AS phone\nFROM contacts, unnest(string_to_array(phones, ',')) AS phone\nORDER BY contact_id;`, explain: 'string_to_array 切成陣列，unnest 展開成多列。' },
      { title: '正規化後用 JOIN 還原', sql: `${NORMALIZED}\nSELECT o.order_id, c.customer_name, p.product_name, l.quantity\nFROM n_order_lines l\nJOIN n_orders o ON o.order_id = l.order_id\nJOIN n_customers c ON c.customer_id = o.customer_id\nJOIN n_products p ON p.product_id = l.product_id\nORDER BY o.order_id;`, explain: '資料只存一份，需要時 JOIN 起來。' },
    ],
    practice: ex({
      id: 'c39-p',
      title: '找出更新異常',
      prompt: '大寬表 **order_records** 裡，同一位顧客的城市被存了很多次。請找出**被記錄成不只一個城市**的顧客，輸出 **customer_name**。',
      expectedColumns: 'customer_name',
      extraSetupSql: FLAT,
      solution: 'SELECT customer_name FROM order_records GROUP BY customer_name HAVING COUNT(DISTINCT customer_city) > 1;',
      hints: ['依 customer_name 分組', 'COUNT(DISTINCT customer_city) > 1'],
      commonMistakes: ['COUNT(customer_city) 沒有 DISTINCT：同一城市出現兩次也會被算成 2。'],
    }),
    morePractice: [
      ex({
        id: 'c39-p2',
        title: '1NF：一格一個電話',
        prompt: '**contacts** 的 phones 欄位用逗號塞了好幾個電話，違反 1NF。請把它拆成**一列一個電話**，輸出 **contact_id** 與 **phone**。',
        expectedColumns: 'contact_id | phone',
        extraSetupSql: FLAT,
        solution: "SELECT contact_id, TRIM(phone) AS phone FROM contacts, unnest(string_to_array(phones, ',')) AS phone;",
        hints: ["string_to_array(phones, ',') 把字串切成陣列", 'unnest(陣列) 把陣列展開成多列，可以放在 FROM 裡'],
      }),
      ex({
        id: 'c39-p3',
        title: '2NF：拆出訂單表',
        prompt: `order_date 只依賴 order_id，卻在每一列商品明細重複出現（違反 2NF）。請建立 **n_orders(order_id, order_date, customer_name)**，其中 **order_id 是主鍵**，並用 **INSERT … SELECT** 從 order_records 填入**每筆訂單一列**的資料。`,
        expectedColumns: 'order_id | order_date | customer_name',
        extraSetupSql: FLAT,
        solution: `CREATE TABLE n_orders (order_id INTEGER PRIMARY KEY, order_date DATE, customer_name VARCHAR(50));
INSERT INTO n_orders (order_id, order_date, customer_name)
SELECT DISTINCT order_id, order_date, customer_name FROM order_records;`,
        checkQuery: 'SELECT order_id, order_date, customer_name FROM n_orders ORDER BY order_id',
        hints: ['先 CREATE TABLE，再 INSERT INTO … SELECT', '同一筆訂單有好幾列，要 SELECT DISTINCT'],
        commonMistakes: ['沒有 DISTINCT：同一個 order_id 插入兩次會違反主鍵。'],
      }),
      ex({
        id: 'c39-p4',
        title: '拆表後用 JOIN 還原',
        prompt: '資料已經正規化成 **n_customers、n_products、n_orders、n_order_lines** 四張表。請用 JOIN 還原每一筆明細：輸出 **order_id**、**customer_name**、**product_name**、**quantity** 與小計 **line_total**（quantity × unit_price）。',
        expectedColumns: 'order_id | customer_name | product_name | quantity | line_total',
        strictColumns: true,
        extraSetupSql: NORMALIZED,
        solution: `SELECT o.order_id, c.customer_name, p.product_name, l.quantity, l.quantity * p.unit_price AS line_total
FROM n_order_lines l
JOIN n_orders o ON o.order_id = l.order_id
JOIN n_customers c ON c.customer_id = o.customer_id
JOIN n_products p ON p.product_id = l.product_id;`,
        hints: ['從明細表 n_order_lines 出發', '用外鍵依序 JOIN 訂單 → 顧客、明細 → 商品'],
      }),
    ],
    review: ex({
      id: 'c39-r',
      title: '同一商品有好幾種價格',
      prompt: '大寬表裡商品價格也重複存了很多次。請找出**被記錄成不只一種 unit_price** 的商品，輸出 **product_name** 與不同價格的數量 **price_count**。',
      expectedColumns: 'product_name | price_count',
      strictColumns: true,
      extraSetupSql: FLAT,
      solution: 'SELECT product_name, COUNT(DISTINCT unit_price) AS price_count FROM order_records GROUP BY product_name HAVING COUNT(DISTINCT unit_price) > 1;',
      hints: ['和找顧客城市的寫法一樣，只是換成商品和價格'],
    }),
    summary: `
- 正規化：每項資訊只存一份，避免更新／新增／刪除異常
- 1NF 一格一值；2NF 依賴整個主鍵；3NF 不依賴非主鍵欄位
- 拆表用外鍵連結，查詢時 JOIN 還原；反正規化是為了效能的取捨
`,
  },

  // ─────────────────────────── 交易 ───────────────────────────
  {
    id: 'c40',
    order: 34,
    part: 'database',
    title: '交易 Transaction',
    w3Topics: 'Transaction · COMMIT · ROLLBACK · SAVEPOINT · ACID',
    concept: `
**交易（Transaction）**把好幾個步驟包成「全部成功、或全部不算」的一個單位。經典例子是轉帳：A 扣錢和 B 加錢必須一起完成，不能只做一半。

~~~sql
BEGIN;                                                        -- 開始交易（MySQL：START TRANSACTION）
UPDATE bank_accounts SET balance = balance - 300 WHERE account_id = 1;
UPDATE bank_accounts SET balance = balance + 300 WHERE account_id = 2;
COMMIT;                                                       -- 確認，改動才真正保留
~~~
- \`COMMIT\`：確認交易，改動永久保存。
- \`ROLLBACK\`：放棄交易，回到 BEGIN 之前的狀態。
- 沒有寫 BEGIN 時，每一條指令自己就是一個交易，執行完自動 COMMIT（**autocommit**）。

### 交易中出錯
交易裡任何一條指令失敗，整個交易就進入「失敗」狀態，之後的指令都會被拒絕，只能 ROLLBACK。這正是交易的價值：**不會留下做一半的資料**。

### SAVEPOINT：交易裡的存檔點
~~~sql
BEGIN;
UPDATE ...;                 -- 步驟 1
SAVEPOINT before_step2;
UPDATE ...;                 -- 步驟 2（做錯了）
ROLLBACK TO SAVEPOINT before_step2;   -- 只撤回步驟 2
COMMIT;                     -- 步驟 1 保留
~~~

### ACID（面試必考）
| 特性 | 意思 |
|---|---|
| **A**tomicity 原子性 | 全部成功或全部失敗 |
| **C**onsistency 一致性 | 交易前後都符合約束（例如餘額不能是負的） |
| **I**solation 隔離性 | 同時進行的交易互不干擾 |
| **D**urability 持久性 | COMMIT 之後就算當機也不會遺失 |

> 本平台：執行結束時如果交易還沒 COMMIT，會自動 ROLLBACK（就像連線中斷），改動不會保留。
`,
    examples: [
      { title: '轉帳', sql: `${BANK}\nBEGIN;\nUPDATE bank_accounts SET balance = balance - 300 WHERE account_id = 1;\nUPDATE bank_accounts SET balance = balance + 300 WHERE account_id = 2;\nCOMMIT;\nSELECT * FROM bank_accounts ORDER BY account_id;`, explain: 'Amy 少 300、Ben 多 300。' },
      { title: 'ROLLBACK', sql: `${BANK}\nBEGIN;\nDELETE FROM bank_accounts;\nROLLBACK;\nSELECT * FROM bank_accounts ORDER BY account_id;`, explain: '刪除被撤回，三個帳戶都還在。' },
      { title: '交易中出錯', sql: `${BANK}\nBEGIN;\nUPDATE bank_accounts SET balance = balance + 500 WHERE account_id = 2;\nUPDATE bank_accounts SET balance = balance - 500 WHERE account_id = 3;\nCOMMIT;`, explain: 'Cara 只有 200，扣 500 違反 CHECK 約束而失敗（會出現錯誤），整個交易都不算：Ben 也沒有多 500。' },
      { title: 'SAVEPOINT', sql: `${BANK}\nBEGIN;\nUPDATE bank_accounts SET balance = balance + 100 WHERE account_id = 3;\nSAVEPOINT s1;\nUPDATE bank_accounts SET balance = 0 WHERE account_id = 2;\nROLLBACK TO SAVEPOINT s1;\nCOMMIT;\nSELECT * FROM bank_accounts ORDER BY account_id;`, explain: 'Cara 的存款保留，Ben 被清零的錯誤被撤回。' },
    ],
    practice: ex({
      id: 'c40-p',
      title: '轉帳 300 元',
      prompt: '請用**交易**把 **Amy（account_id = 1）的 300 元轉給 Ben（account_id = 2）**：兩個 UPDATE 包在 BEGIN 和 COMMIT 之間。',
      expectedColumns: 'account_id | owner | balance',
      extraSetupSql: BANK,
      solution: `BEGIN;
UPDATE bank_accounts SET balance = balance - 300 WHERE account_id = 1;
UPDATE bank_accounts SET balance = balance + 300 WHERE account_id = 2;
COMMIT;`,
      checkQuery: BALANCES,
      hints: ['BEGIN; …兩個 UPDATE…; COMMIT;', '金額用 balance = balance ± 300 計算'],
      commonMistakes: ['忘了 COMMIT：交易結束時被 ROLLBACK，餘額沒有變。', '只寫一個 UPDATE：錢憑空消失或憑空出現。'],
    }),
    morePractice: [
      ex({
        id: 'c40-p2',
        title: '用 SAVEPOINT 撤回做錯的步驟',
        prompt: `請在**同一個交易**裡依序做：

1. 替 **Cara（account_id = 3）存入 100 元**
2. 建立 SAVEPOINT
3. 不小心把 **Ben（account_id = 2）的餘額改成 0**
4. 用 **ROLLBACK TO SAVEPOINT** 只撤回第 3 步
5. COMMIT

（判題看最後的餘額：Cara 的存款要保留、Ben 的餘額不變。）`,
        expectedColumns: 'account_id | owner | balance',
        extraSetupSql: BANK,
        solution: `BEGIN;
UPDATE bank_accounts SET balance = balance + 100 WHERE account_id = 3;
SAVEPOINT before_mistake;
UPDATE bank_accounts SET balance = 0 WHERE account_id = 2;
ROLLBACK TO SAVEPOINT before_mistake;
COMMIT;`,
        checkQuery: BALANCES,
        hints: ['SAVEPOINT 名稱;', 'ROLLBACK TO SAVEPOINT 名稱; 只回到存檔點，交易還在進行', '最後記得 COMMIT'],
        commonMistakes: ['用 ROLLBACK（沒有 TO SAVEPOINT）：整個交易都被撤回，Cara 的存款也不見了。'],
      }),
      ex({
        id: 'c40-p3',
        title: '一次轉給兩個人並記帳',
        prompt: '請用**一個交易**完成：**Amy（1）分別轉 100 元給 Ben（2）和 Cara（3）**，並在 **transfers(from_id, to_id, amount)** 寫入兩筆轉帳紀錄（transfer_id 會自動產生）。',
        expectedColumns: 'account_id | balance | sent | received',
        extraSetupSql: BANK,
        solution: `BEGIN;
UPDATE bank_accounts SET balance = balance - 200 WHERE account_id = 1;
UPDATE bank_accounts SET balance = balance + 100 WHERE account_id IN (2, 3);
INSERT INTO transfers (from_id, to_id, amount) VALUES (1, 2, 100), (1, 3, 100);
COMMIT;`,
        checkQuery: `SELECT a.account_id, a.balance,
  (SELECT COALESCE(SUM(amount), 0) FROM transfers t WHERE t.from_id = a.account_id) AS sent,
  (SELECT COALESCE(SUM(amount), 0) FROM transfers t WHERE t.to_id = a.account_id) AS received
FROM bank_accounts a ORDER BY a.account_id`,
        hints: ['餘額和轉帳紀錄要在同一個交易裡，才不會出現「錢轉了但沒紀錄」', 'Amy 總共扣 200'],
        commonMistakes: ['只更新餘額、沒有寫 transfers 紀錄。'],
      }),
    ],
    review: ex({
      id: 'c40-r',
      title: '三步驟轉帳',
      prompt: '請用一個交易完成：**Ben（2）轉 50 元給 Cara（3）**，接著 **Cara（3）轉 120 元給 Amy（1）**。',
      expectedColumns: 'account_id | owner | balance',
      extraSetupSql: BANK,
      solution: `BEGIN;
UPDATE bank_accounts SET balance = balance - 50 WHERE account_id = 2;
UPDATE bank_accounts SET balance = balance + 50 WHERE account_id = 3;
UPDATE bank_accounts SET balance = balance - 120 WHERE account_id = 3;
UPDATE bank_accounts SET balance = balance + 120 WHERE account_id = 1;
COMMIT;`,
      checkQuery: BALANCES,
      hints: ['四個 UPDATE 包在同一個 BEGIN … COMMIT 裡'],
    }),
    summary: `
- \`BEGIN\`（MySQL：START TRANSACTION）… \`COMMIT\` / \`ROLLBACK\`
- 交易中出錯 → 整個交易失敗，只能 ROLLBACK
- \`SAVEPOINT\` / \`ROLLBACK TO SAVEPOINT\` 撤回部分步驟
- ACID：原子性、一致性、隔離性、持久性
`,
  },
];
