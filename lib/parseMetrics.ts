import { MetricRow } from './types';

/**
 * Получает метрики через серверный роут /api/metrics.
 * Тот проксирует в FastAPI-backend (если запущен) или читает CSV напрямую.
 */
export async function fetchMetrics(): Promise<MetricRow[]> {
  const response = await fetch('/api/metrics');
  if (!response.ok) {
    throw new Error(`Не удалось загрузить метрики: ${response.status}`);
  }
  return response.json();
}
