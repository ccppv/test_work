import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, Numeric, SmallInteger, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MetricEntry(Base):
    __tablename__ = "metric_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    month: Mapped[str] = mapped_column(String(20), nullable=False)
    month_order: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    revenue: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    new_clients: Mapped[int] = mapped_column(Integer, nullable=False)
    ltv: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    churn: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    margin: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    cac: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
