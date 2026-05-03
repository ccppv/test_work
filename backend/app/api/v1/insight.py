from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limiter import limiter
from app.db.session import get_db
from app.schemas.insight import InsightRequest, InsightResponse
from app.services.insight_service import generate_insight
from app.services.metrics_service import get_metrics_by_period

router = APIRouter(prefix="/insight", tags=["insight"])


@router.post("", response_model=InsightResponse)
@limiter.limit("5/minute")
async def get_insight(
    request: Request,
    body: InsightRequest,
    db: AsyncSession = Depends(get_db),
) -> InsightResponse:
    metrics = await get_metrics_by_period(db, body.period_start, body.period_end)
    if not metrics:
        raise HTTPException(
            status_code=422,
            detail="Нет данных для указанного периода. Убедитесь, что БД заполнена.",
        )

    try:
        text, latency_ms = await generate_insight(body, metrics, db)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return InsightResponse(
        insight=text,
        provider=body.provider,
        latency_ms=latency_ms,
    )
