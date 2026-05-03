from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.metric import MetricRowSchema, MetricsResponse
from app.services.metrics_service import get_all_metrics

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("", response_model=MetricsResponse)
async def list_metrics(db: AsyncSession = Depends(get_db)) -> MetricsResponse:
    metrics = await get_all_metrics(db)
    return MetricsResponse(
        data=[MetricRowSchema.model_validate(m) for m in metrics],
        total=len(metrics),
    )
