import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

/**
 * 小型後端：只負責保管 ANTHROPIC_API_KEY，並把精熟題的作答轉給 Claude 批改。
 * SQL 本身在瀏覽器的 PGlite 中執行，後端不執行任何 SQL。
 */
// 不使用通用的 PORT 變數（很多工具會把它設成前端的 port）
const PORT = Number(process.env.API_PORT ?? 8787);
const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-5-5';
const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = hasKey ? new Anthropic() : null;

const SYSTEM = `你是一位資深資料分析師兼 SQL 教練，正在批改學生在「SQL 練習平台」精熟階段的作答。
學生的目標是學完後能無縫銜接 LeetCode SQL 題。資料庫是 PostgreSQL 16。

請用**繁體中文**回覆，使用以下 Markdown 結構（每段精簡、具體，針對學生實際寫的 SQL）：

## 判定
一句話說明答案是否正確，以及判題結果的意義。

## 錯誤解析
如果答案錯誤或執行失敗：指出是哪一行、哪個子句造成的，為什麼會導致輸出不同（可以引用預期輸出與實際輸出的差異）。
如果答案正確：指出寫法中可以改進的地方（可讀性、邊界情況、效能、隱藏陷阱）；若已經很好就直說。

## 更好的解法
給出一份你推薦的 SQL（放在 \`\`\`sql 程式碼區塊中），可以與參考解答不同，但必須正確。

## 差異比較
用條列比較學生寫法與推薦寫法的差異：正確性、可讀性、效能、可移植性（MySQL 與 PostgreSQL 的差異，LeetCode 預設是 MySQL）。

## LeetCode 小提醒
一到兩點這類題型在 LeetCode 上常見的陷阱或延伸題。

規則：
- 不要重述題目。不要說客套話。
- 程式碼區塊只用 \`\`\`sql。
- 整份回覆控制在 500 字以內（不含程式碼）。`;

interface ReviewBody {
  title: string;
  prompt: string;
  schema: string;
  userSql: string;
  passed: boolean;
  gradeSummary: string;
  userError: string | null;
  userOutput: string | null;
  expectedOutput: string | null;
  referenceSql: string;
  referenceNotes: string | null;
}

function buildUserMessage(b: ReviewBody): string {
  return [
    `<題目 title="${b.title}">\n${b.prompt}\n</題目>`,
    `<資料表結構>\n${b.schema}\n</資料表結構>`,
    `<學生的SQL>\n${b.userSql}\n</學生的SQL>`,
    `<判題結果 passed="${b.passed}">\n${b.gradeSummary}\n</判題結果>`,
    b.userError ? `<執行錯誤>\n${b.userError}\n</執行錯誤>` : '',
    b.userOutput ? `<學生的輸出（節錄）>\n${b.userOutput}\n</學生的輸出（節錄）>` : '',
    b.expectedOutput ? `<預期輸出（節錄）>\n${b.expectedOutput}\n</預期輸出（節錄）>` : '',
    `<參考解答>\n${b.referenceSql}\n</參考解答>`,
    b.referenceNotes ? `<參考說明>\n${b.referenceNotes}\n</參考說明>` : '',
    '請依指定格式批改。',
  ]
    .filter(Boolean)
    .join('\n\n');
}

const app = express();
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: hasKey, model: hasKey ? MODEL : null });
});

app.post('/api/review', async (req, res) => {
  if (!client) {
    res.status(503).json({ error: '後端尚未設定 ANTHROPIC_API_KEY。' });
    return;
  }
  const b = req.body as ReviewBody;
  if (!b || typeof b.userSql !== 'string' || typeof b.prompt !== 'string') {
    res.status(400).json({ error: '請求格式錯誤' });
    return;
  }
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [{ role: 'user', content: buildUserMessage(b) }],
    });

    if (response.stop_reason === 'refusal') {
      res.status(422).json({ error: 'AI 無法批改這份作答，請改看內建的參考解答。' });
      return;
    }
    const text = response.content
      .filter((c): c is Anthropic.Beta.BetaTextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('\n')
      .trim();
    if (!text) {
      res.status(502).json({ error: 'AI 沒有回傳內容，請稍後再試。' });
      return;
    }
    res.json({ feedback: text });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      res.status(401).json({ error: 'API key 無效，請檢查 .env 中的 ANTHROPIC_API_KEY。' });
    } else if (err instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: 'AI 請求太頻繁，請稍後再試。' });
    } else if (err instanceof Anthropic.APIError) {
      res.status(502).json({ error: `AI 服務錯誤（${err.status}）：${err.message}` });
    } else {
      console.error(err);
      res.status(500).json({ error: 'AI 批改失敗：' + (err as Error).message });
    }
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[api] http://localhost:${PORT}  AI 批改：${hasKey ? `已啟用（${MODEL}）` : '未啟用（未設定 ANTHROPIC_API_KEY）'}`);
});
