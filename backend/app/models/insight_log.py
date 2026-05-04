import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, SmallInteger, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InsightLog(Base):
    """Лог каждого обращения к AI-провайдеру."""

    __tablename__ = "insight_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)
    model_name: Mapped[str] = mapped_column(String(50), nullable=False)
    period_start: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    period_end: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    months_count: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    response_text: Mapped[str] = mapped_column(Text, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
