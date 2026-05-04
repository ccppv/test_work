"""Загрузка данных из CSV в PostgreSQL.

Запуск:
    cd backend
    python -m scripts.seed
"""

import asyncio
import csv
import sys
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Добавляем корень backend/ в sys.path, чтобы импорты app.* работали
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings  # noqa: E402
from app.models.metric import MetricEntry  # noqa: E402

# Порядок месяцев (1-based)
MONTH_ORDER: dict[str, int] = {
    "Январь": 1,
    "Февраль": 2,
    "Март": 3,
    "Апрель": 4,
    "Май": 5,
    "Июнь": 6,
    "Июль": 7,
    "Август": 8,
    "Сентябрь": 9,
    "Октябрь": 10,
    "Ноябрь": 11,
    "Декабрь": 12,
}


def _parse_ru_money(val: str) -> float:
    return float(
        val.replace("р.", "").replace("\xa0", "").replace(" ", "").replace(",", ".")
    )


def _parse_ru_percent(val: str) -> float:
    return float(val.replace("%", "").replace(",", "."))


def _find_csv() -> Path:
    """Ищет metrics.csv рядом с backend/ или в public/data/."""
    candidates = [
        Path(__file__).resolve().parent.parent.parent
        / "public"
        / "data"
        / "metrics.csv",
        Path(__file__).resolve().parent.parent / "data" / "metrics.csv",
    ]
    for p in candidates:
        if p.exists():
            return p
    raise FileNotFoundError(
        f"metrics.csv не найден. Проверялось: {[str(c) for c in candidates]}"
    )


async def seed() -> None:
    engine = create_async_engine(settings.DATABASE_URL)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    csv_path = _find_csv()

    async with SessionLocal() as db:
        count_result = await db.execute(select(func.count(MetricEntry.id)))
        existing = count_result.scalar() or 0
        if existing > 0:
            print(f"[seed] Уже загружено {existing} строк. Пропуск.")
            return

        rows_loaded = 0
        with open(csv_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                month = row["Месяц"].strip()
                if not month or month not in MONTH_ORDER:
                    continue
                entry = MetricEntry(
                    month=month,
                    month_order=MONTH_ORDER[month],
                    revenue=_parse_ru_money(row["Выручка"]),
                    new_clients=int(row["Новые клиенты"]),
                    ltv=_parse_ru_money(row["LTV"]),
                    churn=_parse_ru_percent(row["Отток"]),
                    margin=float(row["Маржа"]),
                    cac=_parse_ru_money(row["CAC"]),
                )
                db.add(entry)
                rows_loaded += 1

        await db.commit()
        print(f"[seed] Загружено {rows_loaded} строк из {csv_path}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
