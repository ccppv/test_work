export interface MetricRow {
  month: string;
  revenue: number;
  newClients: number;
  ltv: number;
  churn: number;
  margin: number;
  cac: number;
}

export interface InsightRequest {
  data: MetricRow[];
  period: { start: number; end: number };
}

export interface InsightResponse {
  insight: string;
  error?: string;
}
