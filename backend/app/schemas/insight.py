from typing import Literal

from pydantic import BaseModel, field_validator


class InsightRequest(BaseModel):
    provider: Literal["claude", "gemini"] = "claude"
    period_start: int
    period_end: int

    @field_validator("period_start", "period_end")
    @classmethod
    def validate_period_range(cls, v: int) -> int:
        if not (0 <= v <= 11):
            raise ValueError("Индекс периода должен быть от 0 до 11")
        return v

    @field_validator("period_end")
    @classmethod
    def validate_period_order(cls, v: int, info) -> int:
        start = info.data.get("period_start")
        if start is not None and v < start:
            raise ValueError("period_end не может быть меньше period_start")
        return v


class InsightResponse(BaseModel):
    insight: str
    provider: str
    latency_ms: int
