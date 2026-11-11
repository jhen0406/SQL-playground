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
  practice: Exercise;
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
