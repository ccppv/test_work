from pydantic import BaseModel, ConfigDict


class MetricRowSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    month: str
    month_order: int
    revenue: float
    new_clients: int
    ltv: float
    churn: float
    margin: float
    cac: float


class MetricsResponse(BaseModel):
    data: list[MetricRowSchema]
    total: int
