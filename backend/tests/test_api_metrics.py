"""Тесты API /api/v1/metrics."""
import pytest


class TestGetMetrics:
    async def test_empty_db_returns_empty_list(self, client):
        """При пустой БД возвращается пустой список."""
        response = await client.get("/api/v1/metrics")
        assert response.status_code == 200
        body = response.json()
        assert body["data"] == []
        assert body["total"] == 0

    async def test_returns_all_12_rows(self, client, sample_metrics):
        """Все 12 месяцев возвращаются корректно."""
        response = await client.get("/api/v1/metrics")
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 12
        assert len(body["data"]) == 12

    async def test_sorted_by_month_order(self, client, sample_metrics):
        """Строки отсортированы по month_order (1..12)."""
        response = await client.get("/api/v1/metrics")
        orders = [row["month_order"] for row in response.json()["data"]]
        assert orders == list(range(1, 13))

    async def test_first_row_january(self, client, sample_metrics):
        """Первая строка — Январь с корректными значениями."""
        response = await client.get("/api/v1/metrics")
        first = response.json()["data"][0]
        assert first["month"] == "Январь"
        assert first["month_order"] == 1
        assert float(first["revenue"]) == pytest.approx(3_200_000.0)
        assert first["new_clients"] == 180
        assert float(first["churn"]) == pytest.approx(5.20)

    async def test_last_row_december(self, client, sample_metrics):
        """Последняя строка — Декабрь."""
        response = await client.get("/api/v1/metrics")
        last = response.json()["data"][-1]
        assert last["month"] == "Декабрь"
        assert last["month_order"] == 12

    async def test_response_schema_all_fields_present(self, client, sample_metrics):
        """Каждая строка содержит все ожидаемые поля."""
        response = await client.get("/api/v1/metrics")
        row = response.json()["data"][0]
        expected_fields = {
            "month", "month_order", "revenue", "new_clients",
            "ltv", "churn", "margin", "cac",
        }
        assert expected_fields.issubset(row.keys())

    async def test_health_endpoint(self, client):
        """Health check возвращает статус ok."""
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
