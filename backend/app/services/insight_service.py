import asyncio
import sys
import time

from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.insight_log import InsightLog
from app.models.metric import MetricEntry
from app.schemas.insight import InsightRequest

SYSTEM_PROMPT = """Ты — финансовый аналитик портфельной компании. \
Тебе предоставлены бизнес-метрики за выбранный период.

Твоя задача:
1. Выдели 3–5 ключевых наблюдений, опираясь ТОЛЬКО на конкретные цифры из таблицы
2. Укажи тревожные сигналы: рост оттока, падение маржи, рост CAC, снижение LTV
3. Отметь позитивную динамику там, где она есть
4. Сформулируй 1–2 конкретных вопроса, которые стоит проверить в первую очередь

Требования к ответу:
- Короткие пункты с конкретными цифрами — без воды и общих фраз
- Не выдумывай факты, которых нет в данных
- Если данных недостаточно для уверенного вывода — так и напиши
- Ответ на русском языке"""


def _build_table(metrics: list[MetricEntry]) -> str:
    rows = []
    for m in metrics:
        rows.append(
            f"{m.month}: выручка {float(m.revenue) / 1_000_000:.2f} млн руб, "
            f"новые клиенты {m.new_clients}, LTV {float(m.ltv):,.0f} руб, "
            f"отток {m.churn}%, маржа {m.margin}%, CAC {float(m.cac):,.0f} руб"
        )
    return "\n".join(rows)


async def _call_claude(user_message: str) -> str:
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY не настроен")
    client = AsyncAnthropic(api_key=api_key)
    msg = await client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )
    content = msg.content[0]
    if content.type != "text":
        raise ValueError("Неожиданный формат ответа от Claude")
    return content.text


async def _call_gemini(user_message: str) -> str:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY не настроен")

    def _sync_call() -> str:
        import google.generativeai as genai  # noqa: PLC0415

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=SYSTEM_PROMPT,
        )
        result = model.generate_content(user_message)
        return result.text

    return await asyncio.to_thread(_sync_call)


_PROVIDER_MODELS = {
    "claude": "claude-3-5-sonnet-20241022",
    "gemini": "gemini-2.5-flash",
}


async def generate_insight(
    request: InsightRequest,
    metrics: list[MetricEntry],
    db: AsyncSession,
) -> tuple[str, int]:
    """Вызывает AI-провайдера и логирует результат в БД."""
    table = _build_table(metrics)
    period_label = f"{metrics[0].month} – {metrics[-1].month}"
    user_message = f"Данные за период ({period_label}):\n{table}"

    model_name = _PROVIDER_MODELS[request.provider]

    start = time.monotonic()
    # Резолвим функцию через атрибут модуля в рантайме — чтобы unittest.mock.patch работал.
    # Если использовать словарь {provider: func} на уровне модуля, patch заменит атрибут,
    # но словарь будет держать старую ссылку. getattr(sys.modules[__name__], ...) всегда
    # читает актуальный атрибут.
    call_fn = getattr(sys.modules[__name__], f"_call_{request.provider}")
    text = await call_fn(user_message)
    latency_ms = int((time.monotonic() - start) * 1000)

    log = InsightLog(
        provider=request.provider,
        model_name=model_name,
        period_start=request.period_start,
        period_end=request.period_end,
        months_count=len(metrics),
        response_text=text,
        latency_ms=latency_ms,
    )
    db.add(log)
    await db.commit()

    return text, latency_ms
