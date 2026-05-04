"""Тесты API /api/v1/insight."""

from unittest.mock import AsyncMock, patch


from app.models.insight_log import InsightLog
from sqlalchemy import select


MOCK_INSIGHT = "Тестовый инсайт: выручка выросла на 60% за год."


class TestInsightAPI:
    # --- Успешные сценарии ---

    async def test_claude_success(self, client, sample_metrics):
        """Успешный запрос к Claude возвращает инсайт."""
        with patch(
            "app.services.insight_service._call_claude",
            new=AsyncMock(return_value=MOCK_INSIGHT),
        ):
            response = await client.post(
                "/api/v1/insight",
                json={"provider": "claude", "period_start": 0, "period_end": 11},
            )
        assert response.status_code == 200
        body = response.json()
        assert body["insight"] == MOCK_INSIGHT
        assert body["provider"] == "claude"
        assert isinstance(body["latency_ms"], int)
        assert body["latency_ms"] >= 0

    async def test_gemini_success(self, client, sample_metrics):
        """Успешный запрос к Gemini возвращает инсайт."""
        with patch(
            "app.services.insight_service._call_gemini",
            new=AsyncMock(return_value=MOCK_INSIGHT),
        ):
            response = await client.post(
                "/api/v1/insight",
                json={"provider": "gemini", "period_start": 0, "period_end": 5},
            )
        assert response.status_code == 200
        body = response.json()
        assert body["provider"] == "gemini"
        assert body["insight"] == MOCK_INSIGHT

    async def test_partial_period(self, client, sample_metrics):
        """Запрос за частичный период (3 месяца) проходит корректно."""
        with patch(
            "app.services.insight_service._call_claude",
            new=AsyncMock(return_value=MOCK_INSIGHT),
        ):
            response = await client.post(
                "/api/v1/insight",
                json={"provider": "claude", "period_start": 0, "period_end": 2},
            )
        assert response.status_code == 200

    # --- Логирование в БД ---

    async def test_insight_logged_to_db(self, client, db_session, sample_metrics):
        """После генерации инсайта запись появляется в insight_logs."""
        with patch(
            "app.services.insight_service._call_claude",
            new=AsyncMock(return_value=MOCK_INSIGHT),
        ):
            await client.post(
                "/api/v1/insight",
                json={"provider": "claude", "period_start": 0, "period_end": 11},
            )

        result = await db_session.execute(select(InsightLog))
        logs = result.scalars().all()
        assert len(logs) >= 1
        log = logs[-1]
        assert log.provider == "claude"
        assert log.response_text == MOCK_INSIGHT
        assert log.months_count == 12
        assert log.period_start == 0
        assert log.period_end == 11

    # --- Валидация входных данных ---

    async def test_invalid_period_negative(self, client):
        """Отрицательный индекс периода → 422."""
        response = await client.post(
            "/api/v1/insight",
            json={"provider": "claude", "period_start": -1, "period_end": 5},
        )
        assert response.status_code == 422

    async def test_invalid_period_out_of_range(self, client):
        """Индекс > 11 → 422."""
        response = await client.post(
            "/api/v1/insight",
            json={"provider": "claude", "period_start": 0, "period_end": 12},
        )
        assert response.status_code == 422

    async def test_invalid_period_end_less_than_start(self, client):
        """period_end < period_start → 422."""
        response = await client.post(
            "/api/v1/insight",
            json={"provider": "claude", "period_start": 5, "period_end": 3},
        )
        assert response.status_code == 422

    async def test_invalid_provider(self, client):
        """Неизвестный провайдер → 422."""
        response = await client.post(
            "/api/v1/insight",
            json={"provider": "openai", "period_start": 0, "period_end": 5},
        )
        assert response.status_code == 422

    async def test_empty_period_data(self, client):
        """Период без данных в БД → 422 с понятным сообщением."""
        # БД пустая (нет sample_metrics)
        response = await client.post(
            "/api/v1/insight",
            json={"provider": "claude", "period_start": 0, "period_end": 5},
        )
        assert response.status_code == 422
        assert "Нет данных" in response.json()["detail"]

    # --- Обработка ошибок провайдера ---

    async def test_missing_api_key_returns_500(self, client, sample_metrics):
        """Если API-ключ не настроен, возвращается 500 с читаемым сообщением."""

        async def _raise_key_error(msg: str) -> str:
            raise ValueError("ANTHROPIC_API_KEY не настроен")

        with patch(
            "app.services.insight_service._call_claude",
            new=_raise_key_error,
        ):
            response = await client.post(
                "/api/v1/insight",
                json={"provider": "claude", "period_start": 0, "period_end": 5},
            )
        assert response.status_code == 500
        assert "ANTHROPIC_API_KEY" in response.json()["detail"]

    async def test_missing_body_returns_422(self, client):
        """Запрос без тела → 422."""
        response = await client.post("/api/v1/insight")
        assert response.status_code == 422
