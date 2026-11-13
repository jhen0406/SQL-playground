import type { DrillPattern } from '../types';

export const drillPatterns: DrillPattern[] = [
  {
    id: 'zero',
    title: '補零：列出「沒有」的組合',
    summary: '結果要包含次數為 0 的組合或分類，例如「每位學生 × 每個科目」的應考次數。',
    requires: ['c14', 'c17'],
    datasetId: 'dr-zero',
    template: `
題目要求「**每個**組合都要出現，沒有資料就顯示 0」時，資料表裡根本沒有那一列，GROUP BY 變不出來。解法分兩步：

1. **先做出完整的骨架**：用 \`CROSS JOIN\` 產生所有組合，或用 \`VALUES\` / \`UNION ALL\` 列出所有分類。
2. **再 LEFT JOIN 實際資料**，用 \`COUNT(右表欄位)\` 計數（不能用 \`COUNT(*)\`，否則沒配到的列也算 1）。

~~~sql
SELECT a.x, b.y, COUNT(f.some_col) AS cnt
FROM a CROSS JOIN b
LEFT JOIN facts f ON f.x = a.x AND f.y = b.y
GROUP BY a.x, b.y;
~~~
`,
    templateSql: `-- 所有學生 × 所有科目（CROSS JOIN 產生 3 × 3 = 9 列）
SELECT s.student_name, sub.subject_name
FROM students s
CROSS JOIN subjects sub
ORDER BY s.student_id, sub.subject_name;`,
  },
  {
    id: 'adjacent',
    title: '相鄰列比較',
    summary: '拿「前一天」「前一筆」來比較，例如氣溫上升、連續出現三次。',
    requires: ['c15', 'c27', 'c33'],
    datasetId: 'dr-adjacent',
    template: `
兩種寫法：

**1. 自我連接（Self Join）**：用條件把「這一列」和「前一列」接在一起。日期題要用**日期相減**，不要用 id 相減（id 不一定連續，也不一定照日期排）。
~~~sql
SELECT cur.id
FROM weather cur
JOIN weather prev ON cur.record_date = prev.record_date + 1   -- MySQL：DATEDIFF(cur.d, prev.d) = 1
WHERE cur.temperature > prev.temperature;
~~~

**2. LAG / LEAD**：直接取前後列的值。要注意 LAG 拿到的是「前一列」，不一定是「前一天」。
~~~sql
SELECT num,
       LAG(num)  OVER (ORDER BY id) AS prev_num,
       LEAD(num) OVER (ORDER BY id) AS next_num
FROM logs;
~~~
`,
    templateSql: `SELECT id, num,
       LAG(num)  OVER (ORDER BY id) AS prev_num,
       LEAD(num) OVER (ORDER BY id) AS next_num
FROM logs
ORDER BY id;`,
  },
  {
    id: 'division',
    title: '「全部都有」：關聯除法',
    summary: '找出「買過全部商品」「修過所有必修」的人。',
    requires: ['c18', 'c19'],
    datasetId: 'dr-division',
    template: `
「A 包含 B 的**全部**」有兩種經典寫法：

**1. 計數比較（最常用）**：每個人擁有的**不重複**項目數 = 全部項目數。
~~~sql
SELECT customer_id
FROM customer
GROUP BY customer_id
HAVING COUNT(DISTINCT product_key) = (SELECT COUNT(*) FROM product);
~~~
⚠️ 一定要 \`DISTINCT\`：同一件商品買兩次，不能算兩種。

**2. 雙重否定（NOT EXISTS）**：「不存在任何一項是他沒有的」。
~~~sql
SELECT DISTINCT c.customer_id FROM customer c
WHERE NOT EXISTS (
  SELECT 1 FROM product p
  WHERE NOT EXISTS (
    SELECT 1 FROM customer c2
    WHERE c2.customer_id = c.customer_id AND c2.product_key = p.product_key
  )
);
~~~

**3. EXCEPT（集合運算章）**：「全部商品 EXCEPT 他買過的」是空集合，就代表全買過了。可以放進 NOT EXISTS 裡：
~~~sql
SELECT DISTINCT customer_id FROM customer c
WHERE NOT EXISTS (
  SELECT product_key FROM product
  EXCEPT
  SELECT product_key FROM customer c2 WHERE c2.customer_id = c.customer_id
);
~~~
`,
    templateSql: `-- 每位顧客買過幾種商品？全部商品有幾種？
SELECT customer_id,
       COUNT(DISTINCT product_key) AS kinds,
       (SELECT COUNT(*) FROM product) AS total_kinds
FROM customer
GROUP BY customer_id
ORDER BY customer_id;`,
  },
  {
    id: 'ratio',
    title: '條件彙總與比率',
    summary: '算「確認率」「取消率」「差評比例」這類百分比。',
    requires: ['c10', 'c21'],
    datasetId: 'dr-ratio',
    template: `
比率 = 符合條件的筆數 ÷ 全部筆數。在同一個 GROUP BY 裡用 **CASE** 一次算完：

~~~sql
SELECT group_col,
       ROUND(AVG(CASE WHEN 條件 THEN 1.0 ELSE 0 END), 2) AS rate
       -- 等價：SUM(CASE ...) * 1.0 / COUNT(*)
FROM t
GROUP BY group_col;
~~~
- \`AVG(CASE WHEN … THEN 1 ELSE 0 END)\` 就是比例，最簡潔。
- **整數除法陷阱**：PostgreSQL 的 \`3 / 4\` 是 0。乘上 \`1.0\` 或轉 \`::NUMERIC\`。（MySQL 的 \`/\` 不會整數除法。）
- 分母要「全部人」時，先 LEFT JOIN，讓沒有資料的人也有一列。
`,
    templateSql: `SELECT query_name,
       COUNT(*) AS total,
       SUM(CASE WHEN rating < 3 THEN 1 ELSE 0 END) AS poor,
       ROUND(AVG(CASE WHEN rating < 3 THEN 1.0 ELSE 0 END), 2) AS poor_rate
FROM queries
GROUP BY query_name;`,
  },
  {
    id: 'asof',
    title: '某個時間點的值',
    summary: '「某天當下的價格」「首次登入的隔天」：先找到關鍵日期，再接回原表。',
    requires: ['c22', 'c30'],
    datasetId: 'dr-asof',
    template: `
先用子查詢 / CTE 找出「關鍵日期」（某日以前最後一次異動、每人首次登入日），再 JOIN 回原表取值。

~~~sql
WITH last_change AS (
  SELECT product_id, MAX(change_date) AS d
  FROM price_changes
  WHERE change_date <= DATE '2024-08-16'
  GROUP BY product_id
)
SELECT ... FROM ... LEFT JOIN last_change ...;
~~~
- 「沒有資料就給預設值」→ LEFT JOIN + \`COALESCE(值, 預設)\`。
- 也可以用 \`ROW_NUMBER() OVER (PARTITION BY id ORDER BY 日期 DESC)\` 取每組最新一筆。
`,
    templateSql: `-- 每位玩家的首次登入日
SELECT player_id, MIN(event_date) AS first_login
FROM activity
GROUP BY player_id
ORDER BY player_id;`,
  },
  {
    id: 'running',
    title: '累計到門檻',
    summary: '依順序累加，找出「累計還沒超過上限的最後一位」。',
    requires: ['c33'],
    datasetId: 'dr-queue',
    template: `
用視窗函數做**累計加總**，再篩選、排序取最後一筆：

~~~sql
SELECT name
FROM (
  SELECT name, turn, SUM(weight) OVER (ORDER BY turn) AS running_total
  FROM queue
) t
WHERE running_total <= 1000
ORDER BY turn DESC
LIMIT 1;
~~~
- \`OVER (ORDER BY …)\` 的順序決定累計的順序，要用題目指定的欄位（這裡是 turn，不是 id）。
- 視窗函數不能直接寫在 WHERE，要包一層子查詢或 CTE。
`,
    templateSql: `SELECT turn, person_name, weight,
       SUM(weight) OVER (ORDER BY turn) AS running_total
FROM queue
ORDER BY turn;`,
  },
  {
    id: 'reorder',
    title: '位置重排',
    summary: '交換相鄰座位、奇偶互換：用 CASE 算出新位置。',
    requires: ['c21', 'c32'],
    datasetId: 'dr-seat',
    template: `
不用真的搬資料，**用 CASE 算出每列的新編號**再排序：

~~~sql
SELECT CASE
         WHEN id % 2 = 1 AND id = (SELECT MAX(id) FROM seat) THEN id  -- 最後一個奇數不動
         WHEN id % 2 = 1 THEN id + 1
         ELSE id - 1
       END AS id,
       student
FROM seat
ORDER BY id;
~~~
也可以用 \`LAG\` / \`LEAD\` 取得鄰居的名字。注意邊界：總數是奇數時，最後一位沒有人可以交換。
`,
    templateSql: `SELECT id, student, id % 2 AS is_odd,
       LEAD(student) OVER (ORDER BY id) AS next_student
FROM seat;`,
  },
  {
    id: 'ties',
    title: '平手處理與合併結果',
    summary: '最多／最高可能平手；兩個答案要合併成一欄輸出。',
    requires: ['c09', 'c16'],
    datasetId: 'dr-ties',
    template: `
- **平手時依名稱取第一個**：\`ORDER BY 次數 DESC, name ASC LIMIT 1\`。
- **兩個查詢合併成一欄**：各自用括號包起來，再 \`UNION ALL\`。
  - 要用 **UNION ALL**：如果兩個答案剛好相同字串，UNION 會把它們合併成一列。
  - 每個子查詢自己的 ORDER BY / LIMIT 要包在括號裡。
~~~sql
(SELECT name AS results FROM ... ORDER BY cnt DESC, name LIMIT 1)
UNION ALL
(SELECT title FROM ... ORDER BY avg_rating DESC, title LIMIT 1);
~~~
- **雙向關係**（好友）：把 (A, B) 和 (B, A) 都列出來再計數 → \`UNION ALL\` 兩個方向。
`,
    templateSql: `-- 好友關係是雙向的：把兩個方向都攤開
SELECT requester_id AS id, accepter_id AS friend FROM request_accepted
UNION ALL
SELECT accepter_id, requester_id FROM request_accepted
ORDER BY id;`,
  },
  {
    id: 'text',
    title: '字串與正規表示式',
    summary: '大小寫轉換、找特定代碼、驗證 Email 格式、把多列串成一個字串。',
    requires: ['c11', 'c34'],
    datasetId: 'dr-text',
    template: `
| 需求 | PostgreSQL | MySQL |
|---|---|---|
| 首字大寫 | \`CONCAT(UPPER(LEFT(s,1)), LOWER(SUBSTRING(s,2)))\` | 同左 |
| 正規表示式 | \`s ~ '^[A-Za-z]'\` | \`s REGEXP '^[A-Za-z]'\`（預設不分大小寫） |
| 多列串成一列 | \`STRING_AGG(x, ',' ORDER BY x)\` | \`GROUP_CONCAT(x ORDER BY x SEPARATOR ',')\` |

**「以某代碼開頭的詞」**：代碼可能在字串開頭，也可能在空白後面，要兩種都比對：
~~~sql
WHERE conditions LIKE 'DIAB1%' OR conditions LIKE '% DIAB1%'
-- 或正規表示式：conditions ~ '(^| )DIAB1'
~~~
正規表示式裡的 \`.\` 代表任意字元，要比對真正的點要寫 \`\\.\`。
`,
    templateSql: `SELECT name,
       UPPER(LEFT(name, 1)) AS first_char,
       LOWER(SUBSTRING(name, 2)) AS rest,
       name ~ '^[A-Z]' AS starts_upper
FROM users;`,
  },
  {
    id: 'dedupe',
    title: '找出與刪除重複資料',
    summary: '找出重複的值、刪除重複列只保留一筆。',
    requires: ['c08', 'c19'],
    datasetId: 'dr-dedupe',
    template: `
**找重複**：\`GROUP BY 值 HAVING COUNT(*) > 1\`。

**刪重複、保留 id 最小的那筆**：刪掉「存在另一筆相同值、且 id 更小」的列。
~~~sql
DELETE FROM person p1
WHERE EXISTS (
  SELECT 1 FROM person p2
  WHERE p2.email = p1.email AND p2.id < p1.id
);
-- MySQL 常見寫法：DELETE p1 FROM person p1 JOIN person p2 ON p1.email = p2.email AND p1.id > p2.id;
~~~
⚠️ 條件寫成 \`p2.id <> p1.id\` 會把每一組重複的**全部**刪光。
`,
    templateSql: `SELECT email, COUNT(*) AS cnt, MIN(id) AS keep_id
FROM person
GROUP BY email
ORDER BY email;`,
  },
];
