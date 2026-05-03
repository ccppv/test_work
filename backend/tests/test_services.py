"""Unit-тесты сервисного слоя (без HTTP)."""
from unittest.mock import AsyncMock, patch

import pytest

from app.models.insight_log import InsightLog
from app.models.metric import MetricEntry
from app.schemas.insight import InsightRequest
from app.services.insight_service import _build_table, generate_insight
from app.services.metrics_service import get_all_metrics, get_metrics_by_period
from sqlalchemy import select


class TestMetricsService:
    async def test_get_all_metrics_empty(self, db_session):
        """Пустая БД → пустой список."""
        result = await get_all_metrics(db_session)
        assert result == []

    async def test_get_all_metrics_returns_sorted(self, db_session, sample_metrics):
        """get_all_metrics сортирует по month_order."""
        result = await get_all_metrics(db_session)
        orders = [m.month_order for m in result]
        assert orders == list(range(1, 13))

    async def test_get_all_metrics_count(self, db_session, sample_metrics):
        """Все 12 строк возвращаются."""
        result = await get_all_metrics(db_session)
        assert len(result) == 12

    async def test_get_metrics_by_period_full(self, db_session, sample_metrics):
        """Полный период [0, 11] → 12 строк."""
        result = await get_metrics_by_period(db_session, 0, 11)
        assert len(result) == 12

    async def test_get_metrics_by_period_first_quarter(self, db_session, sample_metrics):
        """Период [0, 2] → 3 строки (Январь–Март)."""
        result = await get_metrics_by_period(db_session, 0, 2)
        assert len(result) == 3
        assert result[0].month == "Январь"
        assert result[2].month == "Март"

    async def test_get_metrics_by_period_single_month(self, db_session, sample_metrics):
        """Период [5, 5] → 1 строка (Июнь)."""
        result = await get_metrics_by_period(db_session, 5, 5)
        assert len(result) == 1
        assert result[0].month == "Июнь"
        assert result[0].month_order == 6

    async def test_get_metrics_by_period_last_month(self, db_session, sample_metrics):
        """Период [11, 11] → Декабрь."""
        result = await get_metrics_by_period(db_session, 11, 11)
        assert len(result) == 1
        assert result[0].month == "Декабрь"

    async def test_get_metrics_by_period_empty_db(self, db_session):
        """Пустая БД → пустой список для любого периода."""
        result = await get_metrics_by_period(db_session, 0, 11)
        assert result == []


class TestBuildTable:
    def test_build_table_format(self, sample_metrics):
        """_build_table формирует строку с корректным форматом."""
        # sample_metrics здесь — список MetricEntry из фикстуры
        table = _build_table(sample_metrics[:1])
        assert "Январь" in table
        assert "млн руб" in table
        assert "новые клиенты" in table
        assert "отток" in table
        assert "CAC" in table

    def test_build_table_12_lines(self, sample_metrics):
        """Для 12 метрик — 12 строк в таблице."""
        table = _build_table(sample_metrics)
        lines = table.strip().split("\n")
        assert len(lines) == 12


class TestGenerateInsight:
    async def test_generate_insight_claude(self, db_session, sample_metrics):
        """generate_insight вызывает _call_claude и логирует в БД."""
        request = InsightRequest(provider="claude", period_start=0, period_end=5)
        mock_text = "Инсайт: рост выручки на 31% за полугодие."

        with patch(
            "app.services.insight_service._call_claude",
            new=AsyncMock(return_value=mock_text),
        ):
            text, latency_ms = await generate_insight(
                request, sample_metrics[:6], db_session
            )

        assert text == mock_text
        assert latency_ms >= 0

        log_result = await db_session.execute(select(InsightLog))
        logs = log_result.scalars().all()
        assert any(
            log.provider == "claude" and log.response_text == mock_text
            for log in logs
        )

    async def test_generate_insight_gemini(self, db_session, sample_metrics):
        """generate_insight вызывает _call_gemini для провайдера gemini."""
        request = InsightRequest(provider="gemini", period_start=6, period_end=11)
        mock_text = "Инсайт: восстановление во втором полугодии."

        with patch(
            "app.services.insight_service._call_gemini",
            new=AsyncMock(return_value=mock_text),
        ):
            text, latency_ms = await generate_insight(
                request, sample_metrics[6:], db_session
            )

        assert text == mock_text

    async def test_generate_insight_logs_correct_months_count(
        self, db_session, sample_metrics
    ):
        """months_count в логе соответствует переданному количеству строк."""
        request = InsightRequest(provider="claude", period_start=0, period_end=2)

        with patch(
            "app.services.insight_service._call_claude",
            new=AsyncMock(return_value="ok"),
        ):
            await generate_insight(request, sample_metrics[:3], db_session)

        log_result = await db_session.execute(
            select(InsightLog).order_by(InsightLog.created_at.desc())
        )
        log = log_result.scalars().first()
        assert log is not None
        assert log.months_count == 3
