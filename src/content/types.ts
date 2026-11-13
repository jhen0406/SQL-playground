/** 一個可在沙盒中重建的資料庫（schema + 種子資料）。 */
export interface Dataset {
  id: string;
  name: string;
  description: string;
  /** CREATE TABLE ... */
  schemaSql: string;
  /** INSERT ... 範例資料（畫面上會顯示） */
  seedSql: string;
  /**
   * 隱藏測資：在 seedSql 之後執行的額外 SQL（新增邊界資料、平手、NULL…），
   * 用來確認查詢不是針對範例資料「寫死」答案。
   */
  hiddenExtraSql?: string;
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Exercise {
  id: string;
  title: string;
  /** 題目敘述（簡易 Markdown） */
  prompt: string;
  datasetId: string;
  /** 只在這題額外執行的 SQL（在資料集載入後），例如建立題目專用的表 */
  extraSetupSql?: string;
  /** 標準解 */
  solution: string;
  /** 題目有要求排序時為 true，會比對列的順序 */
  orderMatters?: boolean;
  /** 比對欄位名稱（LeetCode 會比對欄名） */
  strictColumns?: boolean;
  /**
   * 修改資料類題目（INSERT/UPDATE/DELETE/CREATE…）：
   * 在使用者 SQL 執行後跑這段查詢，用它的結果來判題。
   */
  checkQuery?: string;
  /** 是否跑隱藏測資（預設：資料集有 hiddenExtraSql 時就跑） */
  useHidden?: boolean;
  hints: string[];
  /** 常見錯誤（沒有 AI 時顯示） */
  commonMistakes?: string[];
  /** 解法說明（沒有 AI 時顯示） */
  explanation?: string;
  /** 預期輸出欄位說明，例如「month | revenue」 */
  expectedColumns?: string;
  /**
   * 「表單輸入」題（SQL Injection）：使用者寫的不是 SQL，而是輸入框的內容，
   * 平台把它原封不動放進模板的 {{input}} 再執行。solution 存的是標準輸入值。
   */
  inputTemplate?: string;
  /** MySQL 版標準解（只在寫法和 PostgreSQL 不同時填）；LeetCode 預設用 MySQL */
  mysql?: string;
  /** MySQL 寫法的差異說明（一兩句） */
  mysqlNote?: string;
}

export interface LessonExample {
  title: string;
  sql: string;
  explain: string;
}

export type ChapterPart = 'basic' | 'database' | 'leetcode';

export interface Chapter {
  id: string;
  order: number;
  part: ChapterPart;
  title: string;
  /** 對應 w3schools 主題 */
  w3Topics: string;
  /** 概念說明（簡易 Markdown） */
  concept: string;
  examples: LessonExample[];
  /** 第 1 題練習 */
  practice: Exercise;
  /** 其餘練習（每個子主題一題）；全部答對才算完成本章 */
  morePractice?: Exercise[];
  review: Exercise;
  /** 重點摘要：複習時顯示 */
  summary: string;
}

export interface MasteryProblem extends Exercise {
  difficulty: Difficulty;
  /** 商業情境主題，例如「營收」「回購」 */
  topic: string;
  /** 對應 LeetCode 的題型 / 相似題 */
  leetcodeRef: string;
}

/** 題型特訓的一題 */
export interface DrillProblem extends Exercise {
  difficulty: Difficulty;
  /** 對應的 LeetCode 題號與題名 */
  leetcodeRef: string;
  patternId: string;
}

/** 題型特訓的一組題型 */
export interface DrillPattern {
  id: string;
  title: string;
  /** 一句話說明這類題目長什麼樣 */
  summary: string;
  /** 前置章節 id：全部學完才開放 */
  requires: string[];
  /** 解題模板說明（簡易 Markdown） */
  template: string;
  /** 模板範例 SQL（在 datasetId 上可直接執行） */
  templateSql: string;
  datasetId: string;
}
