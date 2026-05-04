"""Фикстуры для всех тестов.

Используем SQLite in-memory вместо PostgreSQL — быстро и без внешних зависимостей.
Каждый тест получает свою БД (function-scope), поэтому данные не накапливаются.
Rate limiter сбрасывается перед каждым тестом.
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.limiter import limiter
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.metric import MetricEntry

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

# Данные за 12 месяцев совпадают с metrics.csv
MONTHS_DATA = [
    ("Январь", 1, 3_200_000, 180, 52_000, 5.20, 38, 9_200),
    ("Февраль", 2, 3_350_000, 188, 52_500, 5.00, 39, 9_100),
    ("Март", 3, 3_480_000, 195, 51_800, 5.40, 37, 9_600),
    ("Апрель", 4, 3_720_000, 230, 49_500, 6.10, 34, 11_800),
    ("Май", 5, 4_050_000, 285, 46_800, 7.30, 30, 15_600),
    ("Июнь", 6, 4_210_000, 310, 45_200, 8.10, 27, 18_400),
    ("Июль", 7, 3_980_000, 260, 46_100, 8.80, 25, 17_100),
    ("Август", 8, 3_860_000, 225, 47_400, 8.40, 28, 13_900),
    ("Сентябрь", 9, 4_140_000, 240, 48_900, 7.60, 31, 12_100),
    ("Октябрь", 10, 4_560_000, 265, 50_700, 6.80, 34, 10_800),
    ("Ноябрь", 11, 4_820_000, 278, 52_600, 6.20, 36, 9_800),
    ("Декабрь", 12, 5_150_000, 295, 54_100, 5.90, 38, 9_400),
]


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Сбрасываем состояние rate limiter перед каждым тестом."""
    if hasattr(limiter, "_storage") and hasattr(limiter._storage, "reset"):
        limiter._storage.reset()


@pytest_asyncio.fixture
async def engine():
    """Свежая SQLite in-memory БД для каждого теста — гарантирует изоляцию."""
    _engine = create_async_engine(TEST_DB_URL, echo=False)
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield _engine
    await _engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncSession:
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncClient:
    """HTTP-клиент с переопределённой зависимостью get_db."""

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def sample_metrics(db_session: AsyncSession) -> list[MetricEntry]:
    """12 строк метрик в тестовой БД."""
    entries = [
        MetricEntry(
            month=m[0],
            month_order=m[1],
            revenue=m[2],
            new_clients=m[3],
            ltv=m[4],
            churn=m[5],
            margin=m[6],
            cac=m[7],
        )
        for m in MONTHS_DATA
    ]
    db_session.add_all(entries)
    await db_session.commit()
    return entries
