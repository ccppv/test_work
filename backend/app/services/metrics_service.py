from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.metric import MetricEntry


async def get_all_metrics(db: AsyncSession) -> list[MetricEntry]:
    result = await db.execute(
        select(MetricEntry).order_by(MetricEntry.month_order)
    )
    return list(result.scalars().all())


async def get_metrics_by_period(
    db: AsyncSession, start: int, end: int
) -> list[MetricEntry]:
    """
    Возвращает строки за период [start, end] включительно.
    start и end — индексы (0-based), month_order — 1-based (1..12).
    """
    result = await db.execute(
        select(MetricEntry)
        .where(MetricEntry.month_order >= start + 1)
        .where(MetricEntry.month_order <= end + 1)
        .order_by(MetricEntry.month_order)
    )
    return list(result.scalars().all())
