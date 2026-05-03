from fastapi import APIRouter

from app.api.v1 import insight, metrics

router = APIRouter()
router.include_router(metrics.router)
router.include_router(insight.router)
