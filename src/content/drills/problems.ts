import type { DrillProblem } from '../types';

/** 題型特訓題目。題目情境自行撰寫，leetcodeRef 只標示對應的 LeetCode 題號。 */
export const drillProblems: DrillProblem[] = [
  // ───────── 補零 ─────────
  {
    id: 'd-01',
    patternId: 'zero',
    difficulty: 'Easy',
    title: '每位學生每科的應考次數',
    datasetId: 'dr-zero',
    leetcodeRef: '1280. Students and Examinations',
    prompt: `教務處要一張完整的應考統計：**每位學生 × 每個科目**都要列出來，沒考過的科目次數為 0。

輸出 **student_id**、**student_name**、**subject_name**、**attended_exams**，依 student_id、subject_name 排序。`,
    expectedColumns: 'student_id | student_name | subject_name | attended_exams',
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT s.student_id, s.student_name, sub.subject_name, COUNT(e.subject_name) AS attended_exams
FROM students s
CROSS JOIN subjects sub
LEFT JOIN examinations e ON e.student_id = s.student_id AND e.subject_name = sub.subject_name
GROUP BY s.student_id, s.student_name, sub.subject_name
ORDER BY s.student_id, sub.subject_name;`,
    hints: ['考試紀錄裡沒有「考 0 次」的列，要先做出所有組合', 'students CROSS JOIN subjects，再 LEFT JOIN examinations', 'COUNT(e.subject_name)，不要 COUNT(*)'],
    commonMistakes: ['直接從 examinations GROUP BY：沒考過的組合不會出現。', 'COUNT(*)：沒配到的組合會被算成 1。', 'LEFT JOIN 只比對 student_id，漏了 subject_name。'],
    explanation: 'CROSS JOIN 產生「學生 × 科目」的完整骨架，再 LEFT JOIN 實際考試紀錄。COUNT(右表欄位) 會略過 NULL，所以沒考過的是 0。',
  },
  {
    id: 'd-02',
    patternId: 'zero',
    difficulty: 'Medium',
    title: '收入級距人數（含 0 人）',
    datasetId: 'dr-zero',
    leetcodeRef: '1907. Count Salary Categories',
    prompt: `財務想知道帳戶在三個收入級距各有幾個：

- **Low Salary**：income < 20000
- **Average Salary**：20000 ≤ income ≤ 50000
- **High Salary**：income > 50000

**三個級距都要輸出**，沒有帳戶的級距顯示 0。輸出 **category**、**accounts_count**。`,
    expectedColumns: 'category | accounts_count',
    strictColumns: true,
    solution: `SELECT 'Low Salary' AS category, COUNT(*) FILTER (WHERE income < 20000) AS accounts_count FROM accounts
UNION ALL
SELECT 'Average Salary', COUNT(*) FILTER (WHERE income BETWEEN 20000 AND 50000) FROM accounts
UNION ALL
SELECT 'High Salary', COUNT(*) FILTER (WHERE income > 50000) FROM accounts;`,
    hints: ['GROUP BY CASE ... 的話，沒有帳戶的級距不會出現', '每個級距各寫一個 SELECT，再 UNION ALL', 'SUM(CASE WHEN 條件 THEN 1 ELSE 0 END) 在沒有符合的列時也會回傳 0'],
    commonMistakes: ['GROUP BY CASE 分級：0 人的級距整列消失。', '邊界寫錯：20000 和 50000 都屬於 Average Salary。'],
    explanation: '要保證三列都出現，最直接是三個彙總查詢 UNION ALL（對整張表彙總一定回傳一列）。也可以用 VALUES 列出三個級距再 LEFT JOIN 分好級的資料。FILTER 是 PostgreSQL 語法，MySQL 用 SUM(income < 20000)。',
  },
  // ───────── 相鄰列比較 ─────────
  {
    id: 'd-03',
    patternId: 'adjacent',
    difficulty: 'Easy',
    title: '比前一天熱的日子',
    datasetId: 'dr-adjacent',
    leetcodeRef: '197. Rising Temperature',
    prompt: '找出氣溫比**前一天（日曆上的前一天）**還高的日子，輸出它們的 **id**。',
    expectedColumns: 'id',
    strictColumns: true,
    solution: `SELECT cur.id
FROM weather cur
JOIN weather prev ON cur.record_date = prev.record_date + 1
WHERE cur.temperature > prev.temperature;`,
    hints: ['把 weather 接上自己：今天 & 前一天', '條件用日期：cur.record_date = prev.record_date + 1'],
    commonMistakes: ['用 cur.id = prev.id + 1：id 不保證照日期排列，也可能有缺日。', '用 LAG(temperature) 比較：前一列不一定是前一天。'],
    explanation: 'PostgreSQL 的 DATE + 1 就是隔天。MySQL 寫 DATEDIFF(cur.record_date, prev.record_date) = 1。資料缺日時，前一列不是前一天，所以不能只看順序。',
  },
  {
    id: 'd-04',
    patternId: 'adjacent',
    difficulty: 'Medium',
    title: '連續出現三次的數字',
    datasetId: 'dr-adjacent',
    leetcodeRef: '180. Consecutive Numbers',
    prompt: '在 logs 中，依 id 順序**連續出現至少三次**的數字有哪些？輸出 **consecutive_nums**（不重複）。',
    expectedColumns: 'consecutive_nums',
    strictColumns: true,
    solution: `SELECT DISTINCT num AS consecutive_nums
FROM (
  SELECT num,
         LAG(num)  OVER (ORDER BY id) AS prev_num,
         LEAD(num) OVER (ORDER BY id) AS next_num
  FROM logs
) t
WHERE num = prev_num AND num = next_num;`,
    hints: ['某一列和它的前一列、後一列都相同 → 連續三次', 'LAG / LEAD', '同一個數字可能連續出現好幾段，要 DISTINCT'],
    commonMistakes: ['GROUP BY num HAVING COUNT(*) >= 3：只是總共出現三次，不一定連續。', '忘了 DISTINCT：同一數字有兩段連續會重複輸出。'],
    explanation: 'LAG/LEAD 拿到前後列的值，三個相等就代表連續三次。也可以三次自我連接：l1.id = l2.id - 1 AND l2.id = l3.id - 1（此題 id 連續才成立）。',
  },
  // ───────── 關聯除法 ─────────
  {
    id: 'd-05',
    patternId: 'division',
    difficulty: 'Medium',
    title: '買過全部商品的顧客',
    datasetId: 'dr-division',
    leetcodeRef: '1045. Customers Who Bought All Products',
    prompt: '找出**買過 product 表中所有商品**的顧客，輸出 **customer_id**。customer 表可能有重複列（同一件商品買很多次）。',
    expectedColumns: 'customer_id',
    strictColumns: true,
    solution: `SELECT customer_id
FROM customer
GROUP BY customer_id
HAVING COUNT(DISTINCT product_key) = (SELECT COUNT(*) FROM product);`,
    hints: ['每位顧客買過幾「種」商品？', 'HAVING COUNT(DISTINCT product_key) = 商品總數', '商品總數用子查詢算，不要寫死'],
    commonMistakes: ['COUNT(product_key) 沒加 DISTINCT：重複購買會被多算。', '把商品數寫死成 2：商品增加就錯。'],
    explanation: '「擁有的不重複項目數 = 全部項目數」就是關聯除法最常見的寫法。',
  },
  {
    id: 'd-06',
    patternId: 'division',
    difficulty: 'Medium',
    title: '修完所有必修的學生',
    datasetId: 'dr-division',
    leetcodeRef: '關聯除法（1045 的變形）',
    prompt: '找出**修過所有必修課**（is_required = TRUE）的學生，輸出 **student_name**。選修課修多少都不影響。',
    expectedColumns: 'student_name',
    strictColumns: true,
    solution: `SELECT DISTINCT e.student_name
FROM enrollments e
WHERE NOT EXISTS (
  SELECT 1 FROM courses c
  WHERE c.is_required
    AND NOT EXISTS (
      SELECT 1 FROM enrollments e2
      WHERE e2.student_name = e.student_name AND e2.course_name = c.course_name
    )
);`,
    hints: ['只算必修課：選修不能混進計數', '寫法一：JOIN courses 篩必修，再 HAVING COUNT(DISTINCT) = 必修總數', '寫法二：不存在「他沒修的必修課」→ 雙重 NOT EXISTS'],
    commonMistakes: ['計數沒有排除選修：修了選修的人數字會對不上。', '必修門數寫死。'],
    explanation: '雙重否定讀法：「找學生，使得不存在任何必修課是他沒修的」。等價的計數寫法：JOIN courses c ON … WHERE c.is_required GROUP BY student_name HAVING COUNT(DISTINCT c.course_name) = (SELECT COUNT(*) FROM courses WHERE is_required)。',
  },
  // ───────── 條件彙總與比率 ─────────
  {
    id: 'd-07',
    patternId: 'ratio',
    difficulty: 'Medium',
    title: '確認訊息的成功率',
    datasetId: 'dr-ratio',
    leetcodeRef: '1934. Confirmation Rate',
    prompt: `每位註冊用戶的**確認率** = 'confirmed' 訊息數 ÷ 收到的確認訊息總數。沒收到任何確認訊息的用戶，確認率為 0。

輸出 **user_id**、**confirmation_rate**（四捨五入到小數 2 位），**每位註冊用戶都要出現**。`,
    expectedColumns: 'user_id | confirmation_rate',
    strictColumns: true,
    solution: `SELECT s.user_id,
       ROUND(AVG(CASE WHEN c.action = 'confirmed' THEN 1.0 ELSE 0 END), 2) AS confirmation_rate
FROM signups s
LEFT JOIN confirmations c ON c.user_id = s.user_id
GROUP BY s.user_id;`,
    hints: ['以 signups 為左表 LEFT JOIN', "AVG(CASE WHEN action = 'confirmed' THEN 1.0 ELSE 0 END)"],
    commonMistakes: ['從 confirmations 開始查：沒收到訊息的用戶不會出現。', '整數除法：SUM(...) / COUNT(*) 在 PostgreSQL 會變 0。'],
    explanation: 'LEFT JOIN 讓沒有訊息的用戶留下一列（action 為 NULL），CASE 把它算成 0，AVG 後就是 0。',
  },
  {
    id: 'd-08',
    patternId: 'ratio',
    difficulty: 'Easy',
    title: '搜尋結果品質',
    datasetId: 'dr-ratio',
    leetcodeRef: '1211. Queries Quality and Percentage',
    prompt: `對每個搜尋詞 query_name 計算：

- **quality**：rating ÷ position 的平均
- **poor_query_percentage**：rating < 3 的結果佔的百分比（× 100）

兩者都四捨五入到小數 2 位。輸出 **query_name**、**quality**、**poor_query_percentage**。`,
    expectedColumns: 'query_name | quality | poor_query_percentage',
    strictColumns: true,
    solution: `SELECT query_name,
       ROUND(AVG(rating::NUMERIC / position), 2) AS quality,
       ROUND(AVG(CASE WHEN rating < 3 THEN 100.0 ELSE 0 END), 2) AS poor_query_percentage
FROM queries
GROUP BY query_name;`,
    hints: ['rating / position 是整數相除，要先轉 NUMERIC', '百分比：AVG(CASE WHEN rating < 3 THEN 100.0 ELSE 0 END)'],
    commonMistakes: ['rating / position 整數除法：5 / 2 = 2。', '百分比忘了 × 100。'],
    explanation: '兩個指標都是「平均」：一個平均比值，一個平均 0/100 的旗標。MySQL 的 / 不會整數除法，所以 LeetCode 上常見直接 rating / position。',
  },
  {
    id: 'd-09',
    patternId: 'ratio',
    difficulty: 'Hard',
    title: '每日叫車取消率',
    datasetId: 'dr-ratio',
    leetcodeRef: '262. Trips and Users',
    prompt: `計算 **2024-10-01 到 2024-10-03** 每天的取消率：

- 只看**乘客和司機都沒被封鎖**（banned = 'No'）的行程
- 取消率 = 被取消（status 以 'cancelled' 開頭）的行程數 ÷ 當天行程數，四捨五入到小數 2 位
- 當天沒有符合條件的行程就不用輸出

輸出 **day**、**cancellation_rate**。`,
    expectedColumns: 'day | cancellation_rate',
    strictColumns: true,
    solution: `SELECT t.request_at AS day,
       ROUND(AVG(CASE WHEN t.status LIKE 'cancelled%' THEN 1.0 ELSE 0 END), 2) AS cancellation_rate
FROM trips t
JOIN users c ON c.users_id = t.client_id AND c.banned = 'No'
JOIN users d ON d.users_id = t.driver_id AND d.banned = 'No'
WHERE t.request_at BETWEEN '2024-10-01' AND '2024-10-03'
GROUP BY t.request_at;`,
    hints: ['users 要 JOIN 兩次：一次當乘客、一次當司機', "條件：兩個人都 banned = 'No'", '取消率用 AVG(CASE ...)'],
    commonMistakes: ['只檢查乘客或只檢查司機有沒有被封鎖。', "只比對 'cancelled_by_driver'，漏了 'cancelled_by_client'。", '整數除法。'],
    explanation: '同一張 users 表扮演兩個角色，就 JOIN 兩次並取不同別名。篩完再依日期分組算比例。',
  },
  // ───────── 某時點的值 ─────────
  {
    id: 'd-10',
    patternId: 'asof',
    difficulty: 'Medium',
    title: '指定日期的商品價格',
    datasetId: 'dr-asof',
    leetcodeRef: '1164. Product Price at a Given Date',
    prompt: `每次調價會在 price_changes 留一筆紀錄。所有商品的初始價格都是 **10**。

請列出**每個商品在 2024-08-16 當天**的價格（當天調價的算新價格）。輸出 **product_id**、**price**。`,
    expectedColumns: 'product_id | price',
    strictColumns: true,
    solution: `WITH last_change AS (
  SELECT product_id, MAX(change_date) AS d
  FROM price_changes
  WHERE change_date <= '2024-08-16'
  GROUP BY product_id
)
SELECT p.product_id, COALESCE(pc.new_price, 10) AS price
FROM (SELECT DISTINCT product_id FROM price_changes) p
LEFT JOIN last_change lc ON lc.product_id = p.product_id
LEFT JOIN price_changes pc ON pc.product_id = lc.product_id AND pc.change_date = lc.d;`,
    hints: ['先找每個商品在 8/16 以前（含）最後一次調價的日期', '所有商品都要列出 → 從不重複的 product_id 出發 LEFT JOIN', '找不到調價紀錄 → COALESCE(價格, 10)'],
    commonMistakes: ['只輸出有在 8/16 前調價的商品：漏了還是初始價 10 的。', '條件用 < 而非 <=：當天調價沒算到。'],
    explanation: '「某時點的值」= 該時點以前最新的一筆。先用 MAX(日期) 找關鍵日期，再接回原表取價格；沒有就用預設值。也可以用 ROW_NUMBER() 取每組最新一筆。',
  },
  {
    id: 'd-11',
    patternId: 'asof',
    difficulty: 'Medium',
    title: '首次登入隔天也登入的比例',
    datasetId: 'dr-asof',
    leetcodeRef: '550. Game Play Analysis IV',
    prompt: '計算有多少比例的玩家在**首次登入的隔天**又登入了。輸出 **fraction**（四捨五入到小數 2 位）。',
    expectedColumns: 'fraction',
    strictColumns: true,
    solution: `WITH firsts AS (
  SELECT player_id, MIN(event_date) AS first_day
  FROM activity
  GROUP BY player_id
)
SELECT ROUND(
  COUNT(a.player_id)::NUMERIC / (SELECT COUNT(*) FROM firsts), 2) AS fraction
FROM firsts f
LEFT JOIN activity a ON a.player_id = f.player_id AND a.event_date = f.first_day + 1;`,
    hints: ['先算每位玩家的首次登入日', '再看「首次登入日 + 1」那天有沒有登入紀錄', '分母是全部玩家數'],
    commonMistakes: ['只要有任兩天連續登入就算：題目只看「首次登入的隔天」。', '整數除法得到 0。'],
    explanation: '關鍵日期是每人的 MIN(event_date)。LEFT JOIN 隔天的紀錄，配得到就代表有回來。',
  },
  // ───────── 累計到門檻 ─────────
  {
    id: 'd-12',
    patternId: 'running',
    difficulty: 'Medium',
    title: '最後一位能搭上電梯的人',
    datasetId: 'dr-queue',
    leetcodeRef: '1204. Last Person to Fit in the Bus',
    prompt: '電梯載重上限 **1000** 公斤，大家依 **turn** 順序進電梯。請找出**最後一位能進去而不超重**的人，輸出 **person_name**。',
    expectedColumns: 'person_name',
    strictColumns: true,
    solution: `SELECT person_name
FROM (
  SELECT person_name, turn, SUM(weight) OVER (ORDER BY turn) AS total
  FROM queue
) t
WHERE total <= 1000
ORDER BY turn DESC
LIMIT 1;`,
    hints: ['依 turn 累計體重：SUM(weight) OVER (ORDER BY turn)', '篩 total <= 1000，取 turn 最大的那位'],
    commonMistakes: ['依 person_id 排序累計：題目的順序是 turn。', '在 WHERE 直接使用視窗函數（不允許），要包子查詢。'],
    explanation: '累計加總是視窗函數最常見的用途。篩選條件要放到外層，因為 WHERE 比視窗函數先執行。',
  },
  // ───────── 位置重排 ─────────
  {
    id: 'd-13',
    patternId: 'reorder',
    difficulty: 'Medium',
    title: '相鄰座位交換',
    datasetId: 'dr-seat',
    leetcodeRef: '626. Exchange Seats',
    prompt: '把每兩個相鄰座位的學生互換（1↔2、3↔4…）。如果人數是奇數，最後一位留在原位。輸出 **id**、**student**，依 id 排序。',
    expectedColumns: 'id | student',
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT CASE
         WHEN id % 2 = 1 AND id = (SELECT MAX(id) FROM seat) THEN id
         WHEN id % 2 = 1 THEN id + 1
         ELSE id - 1
       END AS id,
       student
FROM seat
ORDER BY id;`,
    hints: ['不要真的搬名字，改算每個人的新 id', '奇數 id → id + 1；偶數 id → id - 1', '最後一個奇數 id 不動'],
    commonMistakes: ['忘了處理奇數人數：最後一位變成不存在的 id。'],
    explanation: '用 CASE 計算新位置再 ORDER BY。也可以 COALESCE(LEAD(student), student) 搭配奇偶判斷取鄰居名字。',
  },
  // ───────── 平手與合併 ─────────
  {
    id: 'd-14',
    patternId: 'ties',
    difficulty: 'Medium',
    title: '評分王與二月最佳電影',
    datasetId: 'dr-ties',
    leetcodeRef: '1341. Movie Rating',
    prompt: `請用**一個欄位 results** 輸出兩列：

1. **評分過最多部電影**的使用者 name（平手取字母序最小）
2. **2024 年 2 月**平均評分最高的電影 title（平手取字母序最小）`,
    expectedColumns: 'results',
    strictColumns: true,
    solution: `(SELECT u.name AS results
 FROM movie_rating r JOIN users u ON u.user_id = r.user_id
 GROUP BY u.user_id, u.name
 ORDER BY COUNT(*) DESC, u.name
 LIMIT 1)
UNION ALL
(SELECT m.title
 FROM movie_rating r JOIN movies m ON m.movie_id = r.movie_id
 WHERE r.created_at >= '2024-02-01' AND r.created_at < '2024-03-01'
 GROUP BY m.movie_id, m.title
 ORDER BY AVG(r.rating) DESC, m.title
 LIMIT 1);`,
    hints: ['兩個子查詢各自 ORDER BY ... LIMIT 1，用括號包起來', '平手處理：ORDER BY 次數 DESC, 名稱', '用 UNION ALL，不是 UNION'],
    commonMistakes: ['用 UNION：使用者名字剛好和電影名稱相同時只剩一列。', '平手時沒有指定第二排序鍵。', '二月條件寫成 <= 2024-02-29 時要注意 timestamp。'],
    explanation: '兩個獨立的 Top-1 查詢，用 UNION ALL 疊起來。每個子查詢的 ORDER BY/LIMIT 必須在括號內。',
  },
  {
    id: 'd-15',
    patternId: 'ties',
    difficulty: 'Medium',
    title: '好友最多的人',
    datasetId: 'dr-ties',
    leetcodeRef: '602. Friend Requests II: Who Has the Most Friends',
    prompt: '好友邀請被接受後，**雙方**都多一位好友。請找出好友最多的人（保證只有一位），輸出 **id**、**num**。',
    expectedColumns: 'id | num',
    strictColumns: true,
    solution: `SELECT id, COUNT(*) AS num
FROM (
  SELECT requester_id AS id FROM request_accepted
  UNION ALL
  SELECT accepter_id FROM request_accepted
) t
GROUP BY id
ORDER BY num DESC
LIMIT 1;`,
    hints: ['邀請者和接受者都算一次', '把兩個欄位用 UNION ALL 疊成同一欄再計數'],
    commonMistakes: ['只算 requester_id 或只算 accepter_id。', '用 UNION：同一人出現多次會被合併。'],
    explanation: '雙向關係的計數，先攤平成「每個人出現一次 = 一位好友」，再 GROUP BY。',
  },
  // ───────── 字串 ─────────
  {
    id: 'd-16',
    patternId: 'text',
    difficulty: 'Easy',
    title: '修正名字大小寫',
    datasetId: 'dr-text',
    leetcodeRef: '1667. Fix Names in a Table',
    prompt: '把 users 的 name 改成**首字母大寫、其餘小寫**。輸出 **user_id**、**name**，依 user_id 排序。',
    expectedColumns: 'user_id | name',
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT user_id, CONCAT(UPPER(LEFT(name, 1)), LOWER(SUBSTRING(name, 2))) AS name
FROM users
ORDER BY user_id;`,
    hints: ['UPPER(LEFT(name, 1))', 'LOWER(SUBSTRING(name, 2))', '用 CONCAT 或 || 串起來'],
    commonMistakes: ['用 INITCAP：它會把每個單字的首字都大寫（mary ANN → Mary Ann），題目只要第一個字母大寫。', '忘了 ORDER BY。'],
    explanation: '拆成首字和其餘兩段分別轉換再串接。MySQL 也是 CONCAT(UPPER(LEFT(...)), LOWER(SUBSTRING(...)))。',
  },
  {
    id: 'd-17',
    patternId: 'text',
    difficulty: 'Easy',
    title: '有糖尿病代碼的病患',
    datasetId: 'dr-text',
    leetcodeRef: '1527. Patients With a Condition',
    prompt: 'conditions 是以空白分隔的症狀代碼。第一型糖尿病的代碼**以 DIAB1 開頭**。請找出有這種症狀的病患，輸出 **patient_id**、**patient_name**、**conditions**。',
    expectedColumns: 'patient_id | patient_name | conditions',
    strictColumns: true,
    solution: `SELECT patient_id, patient_name, conditions
FROM patients
WHERE conditions LIKE 'DIAB1%' OR conditions LIKE '% DIAB1%';`,
    hints: ['代碼可能在最前面，也可能在空白後面', "LIKE 'DIAB1%' OR LIKE '% DIAB1%'"],
    commonMistakes: ["LIKE '%DIAB1%'：會抓到 SADIAB100 這種代碼中間含 DIAB1 的。"],
    explanation: '「某個詞以 X 開頭」要比對詞的邊界：字串開頭或空白之後。正規表示式寫法：conditions ~ \'(^| )DIAB1\'。',
  },
  {
    id: 'd-18',
    patternId: 'text',
    difficulty: 'Medium',
    title: '格式正確的 Email',
    datasetId: 'dr-text',
    leetcodeRef: '1517. Find Users With Valid E-Mails',
    prompt: `找出 Email 格式正確的會員。正確格式：

- 前綴以**英文字母**開頭，之後只能是字母、數字、底線 \`_\`、點 \`.\`、減號 \`-\`
- 網域必須是 **@sqlpg.com**（全小寫）

輸出 **user_id**、**name**、**mail**。`,
    expectedColumns: 'user_id | name | mail',
    strictColumns: true,
    solution: `SELECT user_id, name, mail
FROM members
WHERE mail ~ '^[A-Za-z][A-Za-z0-9_.-]*@sqlpg\\.com$';`,
    hints: ['用正規表示式 ~', "^[A-Za-z] 開頭，[A-Za-z0-9_.-]* 中間", "結尾 @sqlpg\\.com$，點要跳脫"],
    commonMistakes: ['網域的點沒跳脫：sqlpgxcom 也會通過。', '用 ~* 不分大小寫：@SQLPG.COM 不該通過。', '沒有 ^ 和 $：只要包含就會通過。'],
    explanation: 'PostgreSQL 用 ~ 做區分大小寫的正規比對。MySQL 用 REGEXP（預設不分大小寫，需要 BINARY 或 REGEXP_LIKE(..., \'c\')）。',
  },
  {
    id: 'd-19',
    patternId: 'text',
    difficulty: 'Easy',
    title: '每日售出商品清單',
    datasetId: 'dr-text',
    leetcodeRef: '1484. Group Sold Products By The Date',
    prompt: '依日期統計：**num_sold** 是當天售出的**不同**商品數，**products** 是這些商品名稱依字母排序、以逗號串接。輸出 **sell_date**、**num_sold**、**products**，依 sell_date 排序。',
    expectedColumns: 'sell_date | num_sold | products',
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT sell_date,
       COUNT(DISTINCT product) AS num_sold,
       STRING_AGG(DISTINCT product, ',' ORDER BY product) AS products
FROM sales_log
GROUP BY sell_date
ORDER BY sell_date;`,
    hints: ['COUNT(DISTINCT product)', "STRING_AGG(DISTINCT product, ',' ORDER BY product)"],
    commonMistakes: ['沒有 DISTINCT：同一商品賣兩次會出現兩次。', '串接沒排序。'],
    explanation: 'STRING_AGG 把一組的多列串成一個字串。MySQL 用 GROUP_CONCAT(DISTINCT product ORDER BY product SEPARATOR \',\')。',
  },
  // ───────── 重複資料 ─────────
  {
    id: 'd-20',
    patternId: 'dedupe',
    difficulty: 'Easy',
    title: '找出重複的 Email',
    datasetId: 'dr-dedupe',
    leetcodeRef: '182. Duplicate Emails',
    prompt: '找出 person 表中**出現超過一次**的 Email，輸出 **email**。',
    expectedColumns: 'email',
    strictColumns: true,
    solution: 'SELECT email FROM person GROUP BY email HAVING COUNT(*) > 1;',
    hints: ['GROUP BY email', 'HAVING COUNT(*) > 1'],
    commonMistakes: ['用 WHERE COUNT(*) > 1：彙總條件要放 HAVING。'],
    explanation: '分組後用 HAVING 篩選次數。',
  },
  {
    id: 'd-21',
    patternId: 'dedupe',
    difficulty: 'Medium',
    title: '刪除重複 Email',
    datasetId: 'dr-dedupe',
    leetcodeRef: '196. Delete Duplicate Emails',
    prompt: '用 **DELETE** 刪掉重複的 Email，每個 Email 只**保留 id 最小**的那一筆。（判題會在你的 SQL 執行後查看 person 表的內容。）',
    expectedColumns: 'id | email',
    checkQuery: 'SELECT id, email FROM person ORDER BY id;',
    solution: `DELETE FROM person p1
WHERE EXISTS (
  SELECT 1 FROM person p2
  WHERE p2.email = p1.email AND p2.id < p1.id
);`,
    hints: ['要刪的是：存在另一筆同 Email、且 id 更小的列', 'DELETE ... WHERE EXISTS (子查詢)'],
    commonMistakes: ['條件寫 p2.id <> p1.id：每組重複的全部都會被刪掉。', '用 SELECT 而不是 DELETE：資料沒有變。'],
    explanation: '相關子查詢對每一列檢查「有沒有比我更早的同 Email」，有就刪。也可以 DELETE FROM person WHERE id NOT IN (SELECT MIN(id) FROM person GROUP BY email)。',
  },
];
