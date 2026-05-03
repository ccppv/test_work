import Papa from 'papaparse';
import { MetricRow } from './types';

function parseRuMoney(val: string): number {
  return parseFloat(
    val
      .replace('р.', '')
      .replace(/\s/g, '')
      .replace(',', '.')
  );
}

function parseRuPercent(val: string): number {
  return parseFloat(val.replace('%', '').replace(',', '.'));
}

export async function fetchMetrics(): Promise<MetricRow[]> {
  const response = await fetch('/data/metrics.csv');
  const text = await response.text();

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data
    .filter((row) => row['Месяц'] && row['Выручка'])
    .map((row) => ({
      month: row['Месяц'],
      revenue: parseRuMoney(row['Выручка']),
      newClients: parseInt(row['Новые клиенты'], 10),
      ltv: parseRuMoney(row['LTV']),
      churn: parseRuPercent(row['Отток']),
      margin: parseFloat(row['Маржа']),
      cac: parseRuMoney(row['CAC']),
    }));
}
