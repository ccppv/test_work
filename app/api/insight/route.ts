import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MetricRow } from '@/lib/types';

export const runtime = 'nodejs';

// --- In-memory rate limiter: 5 запросов в минуту на IP ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count += 1;
  return false;
}

// --- Максимальный размер тела запроса ---
const MAX_BODY_BYTES = 32_768; // 32 KB

// --- Допустимые провайдеры ---
const ALLOWED_PROVIDERS = new Set(['claude', 'gemini']);

// --- Валидация одной строки данных ---
function isValidRow(row: unknown): row is MetricRow {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.month === 'string' &&
    r.month.length > 0 &&
    r.month.length <= 20 &&
    typeof r.revenue === 'number' && isFinite(r.revenue) && r.revenue >= 0 &&
    typeof r.newClients === 'number' && isFinite(r.newClients) && r.newClients >= 0 &&
    typeof r.ltv === 'number' && isFinite(r.ltv) && r.ltv >= 0 &&
    typeof r.churn === 'number' && isFinite(r.churn) && r.churn >= 0 && r.churn <= 100 &&
    typeof r.margin === 'number' && isFinite(r.margin) &&
    typeof r.cac === 'number' && isFinite(r.cac) && r.cac >= 0
  );
}

const SYSTEM_PROMPT = `Ты — финансовый аналитик портфельной компании. Тебе предоставлены бизнес-метрики за выбранный период.

Твоя задача:
1. Выдели 3–5 ключевых наблюдений, опираясь ТОЛЬКО на конкретные цифры из таблицы
2. Укажи тревожные сигналы: рост оттока, падение маржи, рост CAC, снижение LTV
3. Отметь позитивную динамику там, где она есть
4. Сформулируй 1–2 конкретных вопроса, которые стоит проверить в первую очередь

Требования к ответу:
- Короткие пункты с конкретными цифрами — без воды и общих фраз
- Не выдумывай факты, которых нет в данных
- Если данных недостаточно для уверенного вывода — так и напиши
- Ответ на русском языке`;

function buildTableText(filtered: MetricRow[]): string {
  return filtered
    .map(
      (row) =>
        `${row.month}: выручка ${(row.revenue / 1_000_000).toFixed(2)} млн руб, ` +
        `новые клиенты ${row.newClients}, LTV ${row.ltv.toLocaleString('ru-RU')} руб, ` +
        `отток ${row.churn}%, маржа ${row.margin}%, CAC ${row.cac.toLocaleString('ru-RU')} руб`
    )
    .join('\n');
}

async function runClaude(userMessage: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY не настроен. Добавьте его в .env.local');
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });
  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Неожиданный формат ответа от Claude');
  return content.text;
}

async function runGemini(userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY не настроен. Добавьте его в .env.local');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });
  const result = await model.generateContent(userMessage);
  return result.response.text();
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Подождите минуту.' },
      { status: 429 }
    );
  }

  // Ограничение размера тела
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Тело запроса слишком большое' }, { status: 413 });
  }

  let body: { data: unknown; period: unknown; provider?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Невалидный JSON' }, { status: 400 });
  }

  // Валидация provider
  const provider = typeof body.provider === 'string' && ALLOWED_PROVIDERS.has(body.provider)
    ? body.provider
    : 'claude';

  // Валидация data
  const rawData = body.data;
  if (!Array.isArray(rawData) || rawData.length === 0 || rawData.length > 12) {
    return NextResponse.json({ error: 'Невалидный массив данных' }, { status: 400 });
  }
  if (!rawData.every(isValidRow)) {
    return NextResponse.json({ error: 'Данные содержат невалидные строки' }, { status: 400 });
  }
  const data = rawData as MetricRow[];

  // Валидация period
  const rawPeriod = body.period;
  if (
    !rawPeriod ||
    typeof rawPeriod !== 'object' ||
    typeof (rawPeriod as Record<string, unknown>).start !== 'number' ||
    typeof (rawPeriod as Record<string, unknown>).end !== 'number'
  ) {
    return NextResponse.json({ error: 'Невалидный период' }, { status: 400 });
  }
  const period = rawPeriod as { start: number; end: number };
  if (
    !Number.isInteger(period.start) ||
    !Number.isInteger(period.end) ||
    period.start < 0 ||
    period.end >= data.length ||
    period.start > period.end
  ) {
    return NextResponse.json({ error: 'Период выходит за границы данных' }, { status: 400 });
  }

  const filtered = data.slice(period.start, period.end + 1);

  const tableText = buildTableText(filtered);
  const userMessage =
    `Данные за период (${filtered[0].month} – ${filtered[filtered.length - 1].month}):\n\n` +
    `${tableText}\n\nСделай управленческий анализ по этим данным.`;

  try {
    let insight: string;
    if (provider === 'gemini') {
      insight = await runGemini(userMessage);
    } else {
      insight = await runClaude(userMessage);
    }
    return NextResponse.json({ insight });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Неизвестная ошибка';
    console.error(`[/api/insight] provider=${provider} error:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
