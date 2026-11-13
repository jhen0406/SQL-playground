import type { Dataset } from '../types';

/**
 * 題型特訓用的小資料集：每個題型組一份，只放解題需要的 1–4 張表。
 * hiddenExtraSql 刻意放入邊界情況（平手、缺日、重複、空分類…），讓寫死答案或常見錯誤失敗。
 */

export const drZero: Dataset = {
  id: 'dr-zero',
  name: '考試與帳戶',
  description: '學生、科目、考試紀錄，以及帳戶月收入。',
  schemaSql: `
CREATE TABLE students (student_id INTEGER PRIMARY KEY, student_name VARCHAR(50) NOT NULL);
CREATE TABLE subjects (subject_name VARCHAR(50) PRIMARY KEY);
CREATE TABLE examinations (student_id INTEGER NOT NULL, subject_name VARCHAR(50) NOT NULL);
CREATE TABLE accounts (account_id INTEGER PRIMARY KEY, income INTEGER NOT NULL);
`,
  seedSql: `
INSERT INTO students VALUES (1, 'Alice'), (2, 'Bob'), (6, 'Alex');
INSERT INTO subjects VALUES ('Math'), ('Physics'), ('Programming');
INSERT INTO examinations VALUES
  (1, 'Math'), (1, 'Physics'), (1, 'Programming'), (2, 'Programming'),
  (1, 'Physics'), (1, 'Math'), (6, 'Math'), (1, 'Math'), (2, 'Math');
INSERT INTO accounts VALUES (3, 108939), (2, 12747), (8, 87709), (6, 91796);
`,
  hiddenExtraSql: `
INSERT INTO students VALUES (13, 'John');
INSERT INTO subjects VALUES ('Art');
INSERT INTO examinations VALUES (13, 'Art');
INSERT INTO students VALUES (20, 'Zoe');
DELETE FROM accounts WHERE income > 50000;
INSERT INTO accounts VALUES (11, 50000), (12, 20000), (14, 19999);
`,
};

export const drAdjacent: Dataset = {
  id: 'dr-adjacent',
  name: '天氣與數字紀錄',
  description: '每日氣溫，以及依 id 排列的數字紀錄。',
  schemaSql: `
CREATE TABLE weather (id INTEGER PRIMARY KEY, record_date DATE NOT NULL UNIQUE, temperature INTEGER NOT NULL);
CREATE TABLE logs (id INTEGER PRIMARY KEY, num INTEGER NOT NULL);
`,
  seedSql: `
INSERT INTO weather VALUES
  (1, '2024-01-01', 10), (2, '2024-01-02', 25), (3, '2024-01-03', 20), (4, '2024-01-04', 30);
INSERT INTO logs VALUES (1, 1), (2, 1), (3, 1), (4, 2), (5, 1), (6, 2), (7, 2);
`,
  hiddenExtraSql: `
-- 缺了 1/5：1/6 的「前一天」不存在，不能拿 1/4 比
INSERT INTO weather VALUES (5, '2024-01-06', 35), (6, '2024-01-07', 36);
-- id 不照日期順序
INSERT INTO weather VALUES (8, '2024-01-08', 12), (7, '2024-01-09', 15);
-- 同一個數字第二次連續出現三次（需要 DISTINCT）
INSERT INTO logs VALUES (8, 3), (9, 3), (10, 3), (11, 1), (12, 1), (13, 1);
`,
};

export const drDivision: Dataset = {
  id: 'dr-division',
  name: '購買與修課',
  description: '顧客購買紀錄與商品清單；學生選課與課程。',
  schemaSql: `
CREATE TABLE product (product_key INTEGER PRIMARY KEY);
CREATE TABLE customer (customer_id INTEGER NOT NULL, product_key INTEGER NOT NULL REFERENCES product (product_key));
CREATE TABLE courses (course_name VARCHAR(50) PRIMARY KEY, is_required BOOLEAN NOT NULL);
CREATE TABLE enrollments (student_name VARCHAR(50) NOT NULL, course_name VARCHAR(50) NOT NULL REFERENCES courses (course_name));
`,
  seedSql: `
INSERT INTO product VALUES (5), (6);
INSERT INTO customer VALUES (1, 5), (2, 6), (3, 5), (3, 6), (1, 6);
INSERT INTO courses VALUES ('SQL 基礎', TRUE), ('資料庫設計', TRUE), ('統計', FALSE);
INSERT INTO enrollments VALUES
  ('Amy', 'SQL 基礎'), ('Amy', '資料庫設計'),
  ('Ben', 'SQL 基礎'), ('Ben', '統計'),
  ('Cara', 'SQL 基礎'), ('Cara', '資料庫設計'), ('Cara', '統計');
`,
  hiddenExtraSql: `
INSERT INTO product VALUES (7);
INSERT INTO customer VALUES (1, 7), (4, 5), (4, 6), (4, 6);
INSERT INTO courses VALUES ('資料視覺化', TRUE);
INSERT INTO enrollments VALUES ('Amy', '資料視覺化'), ('Dan', 'SQL 基礎'), ('Dan', '統計'), ('Dan', '資料庫設計');
`,
};

export const drRatio: Dataset = {
  id: 'dr-ratio',
  name: '註冊確認、搜尋品質、叫車',
  description: '使用者註冊與確認訊息、搜尋結果評分、叫車行程與使用者。',
  schemaSql: `
CREATE TABLE signups (user_id INTEGER PRIMARY KEY, time_stamp TIMESTAMP NOT NULL);
CREATE TABLE confirmations (user_id INTEGER NOT NULL REFERENCES signups (user_id), time_stamp TIMESTAMP NOT NULL, action VARCHAR(10) NOT NULL);
CREATE TABLE queries (query_name VARCHAR(30) NOT NULL, result VARCHAR(50) NOT NULL, position INTEGER NOT NULL, rating INTEGER NOT NULL);
CREATE TABLE users (users_id INTEGER PRIMARY KEY, banned VARCHAR(3) NOT NULL, role VARCHAR(10) NOT NULL);
CREATE TABLE trips (id INTEGER PRIMARY KEY, client_id INTEGER NOT NULL, driver_id INTEGER NOT NULL, city_id INTEGER NOT NULL, status VARCHAR(30) NOT NULL, request_at DATE NOT NULL);
`,
  seedSql: `
INSERT INTO signups VALUES (3, '2024-03-21 10:16:13'), (7, '2024-01-04 13:57:59'), (2, '2024-07-29 23:09:44'), (6, '2024-12-09 10:39:37');
INSERT INTO confirmations VALUES
  (3, '2024-03-21 10:20:00', 'timeout'), (3, '2024-03-22 09:00:00', 'timeout'),
  (7, '2024-06-12 11:57:29', 'confirmed'), (7, '2024-06-13 12:58:28', 'confirmed'), (7, '2024-06-14 13:59:27', 'confirmed'),
  (2, '2024-01-22 00:00:00', 'confirmed'), (2, '2024-02-28 23:59:59', 'timeout');
INSERT INTO queries VALUES
  ('Dog', 'Golden Retriever', 1, 5), ('Dog', 'German Shepherd', 2, 5), ('Dog', 'Mule', 200, 1),
  ('Cat', 'Shirazi', 5, 2), ('Cat', 'Siamese', 3, 3), ('Cat', 'Sphynx', 7, 4);
INSERT INTO users VALUES
  (1, 'No', 'client'), (2, 'Yes', 'client'), (3, 'No', 'client'), (4, 'No', 'client'),
  (10, 'No', 'driver'), (11, 'No', 'driver'), (12, 'No', 'driver'), (13, 'No', 'driver');
INSERT INTO trips VALUES
  (1, 1, 10, 1, 'completed', '2024-10-01'),
  (2, 2, 11, 1, 'cancelled_by_driver', '2024-10-01'),
  (3, 3, 12, 6, 'completed', '2024-10-01'),
  (4, 4, 13, 6, 'cancelled_by_client', '2024-10-01'),
  (5, 1, 10, 1, 'completed', '2024-10-02'),
  (6, 2, 11, 6, 'completed', '2024-10-02'),
  (7, 3, 12, 6, 'completed', '2024-10-02'),
  (8, 2, 12, 12, 'completed', '2024-10-03'),
  (9, 3, 10, 12, 'completed', '2024-10-03'),
  (10, 4, 13, 12, 'cancelled_by_driver', '2024-10-03');
`,
  hiddenExtraSql: `
INSERT INTO signups VALUES (9, '2024-05-01 08:00:00');
INSERT INTO queries VALUES ('Fish', 'Goldfish', 3, 2), ('Fish', 'Guppy', 4, 1);
-- 被封鎖的司機；10/04 超出範圍；09/30 只有被封鎖者的行程
INSERT INTO users VALUES (14, 'Yes', 'driver');
INSERT INTO trips VALUES
  (11, 1, 14, 1, 'cancelled_by_driver', '2024-10-02'),
  (12, 1, 10, 1, 'cancelled_by_client', '2024-10-04'),
  (13, 2, 11, 1, 'cancelled_by_client', '2024-09-30'),
  (14, 3, 11, 1, 'cancelled_by_client', '2024-10-02');
`,
};

export const drAsOf: Dataset = {
  id: 'dr-asof',
  name: '價格異動與遊戲登入',
  description: '商品價格異動紀錄；玩家每日登入紀錄。',
  schemaSql: `
CREATE TABLE price_changes (product_id INTEGER NOT NULL, new_price INTEGER NOT NULL, change_date DATE NOT NULL, PRIMARY KEY (product_id, change_date));
CREATE TABLE activity (player_id INTEGER NOT NULL, device_id INTEGER NOT NULL, event_date DATE NOT NULL, games_played INTEGER NOT NULL, PRIMARY KEY (player_id, event_date));
`,
  seedSql: `
INSERT INTO price_changes VALUES
  (1, 20, '2024-08-14'), (2, 50, '2024-08-14'), (1, 30, '2024-08-15'),
  (1, 35, '2024-08-16'), (2, 65, '2024-08-17'), (3, 20, '2024-08-18');
INSERT INTO activity VALUES
  (1, 2, '2024-03-01', 5), (1, 2, '2024-03-02', 6),
  (2, 3, '2024-06-25', 1),
  (3, 1, '2024-03-02', 0), (3, 4, '2024-07-03', 5);
`,
  hiddenExtraSql: `
INSERT INTO price_changes VALUES (4, 99, '2024-08-16'), (4, 88, '2024-08-01'), (5, 70, '2024-08-20');
-- 玩家 4：第 1 天登入、第 3、4 天連續登入，但「首次登入的隔天」沒有登入
INSERT INTO activity VALUES (4, 1, '2024-05-01', 1), (4, 1, '2024-05-03', 1), (4, 1, '2024-05-04', 1);
`,
};

export const drQueue: Dataset = {
  id: 'dr-queue',
  name: '電梯排隊',
  description: '排隊搭電梯的人，turn 是上電梯的順序。',
  schemaSql: `
CREATE TABLE queue (person_id INTEGER PRIMARY KEY, person_name VARCHAR(30) NOT NULL, weight INTEGER NOT NULL, turn INTEGER NOT NULL UNIQUE);
`,
  seedSql: `
INSERT INTO queue VALUES
  (5, 'Alice', 250, 1), (4, 'Bob', 175, 5), (3, 'Alex', 350, 2),
  (6, 'John Cena', 400, 3), (1, 'Winston', 500, 6), (2, 'Marie', 200, 4);
`,
  hiddenExtraSql: `
UPDATE queue SET weight = 100 WHERE person_name = 'Bob';
INSERT INTO queue VALUES (7, 'Tina', 0, 7);
`,
};

export const drSeat: Dataset = {
  id: 'dr-seat',
  name: '座位表',
  description: '教室座位，id 連續從 1 開始。',
  schemaSql: `CREATE TABLE seat (id INTEGER PRIMARY KEY, student VARCHAR(30) NOT NULL);`,
  seedSql: `INSERT INTO seat VALUES (1, 'Abbot'), (2, 'Doris'), (3, 'Emerson'), (4, 'Green'), (5, 'Jeames');`,
  hiddenExtraSql: `INSERT INTO seat VALUES (6, 'Kelly');`,
};

export const drTies: Dataset = {
  id: 'dr-ties',
  name: '電影評分與好友',
  description: '電影、使用者、評分紀錄；好友邀請接受紀錄。',
  schemaSql: `
CREATE TABLE movies (movie_id INTEGER PRIMARY KEY, title VARCHAR(50) NOT NULL);
CREATE TABLE users (user_id INTEGER PRIMARY KEY, name VARCHAR(50) NOT NULL);
CREATE TABLE movie_rating (movie_id INTEGER NOT NULL REFERENCES movies (movie_id), user_id INTEGER NOT NULL REFERENCES users (user_id), rating INTEGER NOT NULL, created_at DATE NOT NULL, PRIMARY KEY (movie_id, user_id));
CREATE TABLE request_accepted (requester_id INTEGER NOT NULL, accepter_id INTEGER NOT NULL, accept_date DATE NOT NULL, PRIMARY KEY (requester_id, accepter_id));
`,
  seedSql: `
INSERT INTO movies VALUES (1, 'Avengers'), (2, 'Frozen 2'), (3, 'Joker');
INSERT INTO users VALUES (1, 'Daniel'), (2, 'Monica'), (3, 'Maria'), (4, 'James');
INSERT INTO movie_rating VALUES
  (1, 1, 3, '2024-01-12'), (1, 2, 4, '2024-02-11'), (1, 3, 2, '2024-02-12'), (1, 4, 1, '2024-01-01'),
  (2, 1, 5, '2024-02-17'), (2, 2, 2, '2024-02-01'), (2, 3, 2, '2024-03-01'),
  (3, 1, 3, '2024-02-22'), (3, 2, 4, '2024-02-25');
INSERT INTO request_accepted VALUES (1, 2, '2024-06-03'), (1, 3, '2024-06-08'), (2, 3, '2024-06-08'), (3, 4, '2024-06-09');
`,
  hiddenExtraSql: `
-- Monica 追平 Daniel 的評分數（名字字母序 Daniel 仍在前）；Joker 在二月的平均追平 Frozen 2
INSERT INTO movies VALUES (4, 'Daniel');
INSERT INTO movie_rating VALUES (4, 2, 5, '2024-02-10'), (4, 1, 5, '2024-02-10'), (3, 4, 5, '2024-02-03');
INSERT INTO request_accepted VALUES (4, 1, '2024-06-10'), (4, 2, '2024-06-11'), (5, 4, '2024-06-12');
`,
};

export const drText: Dataset = {
  id: 'dr-text',
  name: '文字資料',
  description: '使用者名稱、病患症狀代碼、會員 Email、每日售出商品。',
  schemaSql: `
CREATE TABLE users (user_id INTEGER PRIMARY KEY, name VARCHAR(40) NOT NULL);
CREATE TABLE patients (patient_id INTEGER PRIMARY KEY, patient_name VARCHAR(30) NOT NULL, conditions VARCHAR(100) NOT NULL);
CREATE TABLE members (user_id INTEGER PRIMARY KEY, name VARCHAR(30) NOT NULL, mail VARCHAR(60) NOT NULL);
CREATE TABLE sales_log (sell_date DATE NOT NULL, product VARCHAR(30) NOT NULL);
`,
  seedSql: `
INSERT INTO users VALUES (1, 'aLice'), (2, 'bOB');
INSERT INTO patients VALUES
  (1, 'Daniel', 'YFEV COUGH'), (2, 'Alice', ''), (3, 'Bob', 'DIAB100 MYOP'),
  (4, 'George', 'ACNE DIAB100'), (5, 'Alain', 'DIAB201'), (6, 'Kim', 'SADIAB100');
INSERT INTO members VALUES
  (1, 'Winston', 'winston@sqlpg.com'), (2, 'Jonathan', 'jonathanisgreat'),
  (3, 'Annabelle', 'bella-@sqlpg.com'), (4, 'Sally', 'sally.come@sqlpg.com'),
  (5, 'Marwan', 'quarz#2020@sqlpg.com'), (6, 'David', 'david69@gmail.com'),
  (7, 'Shapiro', '.shapo@sqlpg.com');
INSERT INTO sales_log VALUES
  ('2024-05-30', 'Headphone'), ('2024-06-01', 'Pencil'), ('2024-06-02', 'Mask'),
  ('2024-05-30', 'Basketball'), ('2024-06-01', 'Bible'), ('2024-06-02', 'Mask'),
  ('2024-05-30', 'T-Shirt');
`,
  hiddenExtraSql: `
INSERT INTO users VALUES (3, 'ÉMILE'), (4, 'x'), (5, 'mary ANN');
INSERT INTO patients VALUES (7, 'Lee', 'ACNE +DIAB100'), (8, 'Wu', 'COUGH DIAB1');
INSERT INTO members VALUES
  (8, 'Ken', 'ken@SQLPG.COM'), (9, 'Ann', 'ann@sqlpgxcom'), (10, 'Bo', 'B_o.k-1@sqlpg.com'), (11, 'Cy', '1cy@sqlpg.com');
INSERT INTO sales_log VALUES ('2024-06-03', 'Apple'), ('2024-06-03', 'Apple'), ('2024-06-01', 'Bible');
`,
};

export const drDedupe: Dataset = {
  id: 'dr-dedupe',
  name: '重複 Email',
  description: '人員 Email 名單，裡面有重複。',
  schemaSql: `CREATE TABLE person (id INTEGER PRIMARY KEY, email VARCHAR(60) NOT NULL);`,
  seedSql: `INSERT INTO person VALUES (1, 'john@example.com'), (2, 'bob@example.com'), (3, 'john@example.com');`,
  hiddenExtraSql: `INSERT INTO person VALUES (4, 'amy@example.com'), (5, 'bob@example.com'), (6, 'bob@example.com'), (7, 'cat@example.com');`,
};

export const drillDatasets = [drZero, drAdjacent, drDivision, drRatio, drAsOf, drQueue, drSeat, drTies, drText, drDedupe];
