/**
 * GET /api/metrics
 *
 * Прокси-маршрут: если задан BACKEND_URL — берёт данные из FastAPI.
 * Иначе — читает metrics.csv напрямую на сервере (fallback для standalone-режима).
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { NextResponse } from 'next/server';
import Papa from 'papaparse';

import type { MetricRow } from '@/lib/types';

function parseRuMoney(val: string): number {
  return parseFloat(
    val.replace('р.', '').replace(/\s/g, '').replace(',', '.')
  );
}

function parseRuPercent(val: string): number {
  return parseFloat(val.replace('%', '').replace(',', '.'));
}

function parseCsvFallback(): MetricRow[] {
  const csvPath = join(process.cwd(), 'public', 'data', 'metrics.csv');
  const text = readFileSync(csvPath, 'utf-8');
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

export async function GET() {
  const backendUrl = process.env.BACKEND_URL;

  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/v1/metrics`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = await res.json();
        // Backend возвращает { data: MetricRowSchema[], total: number }
        // Конвертируем snake_case → camelCase
        const data: MetricRow[] = json.data.map(
          (row: {
            month: string;
            revenue: number;
            new_clients: number;
            ltv: number;
            churn: number;
            margin: number;
            cac: number;
          }) => ({
            month: row.month,
            revenue: row.revenue,
            newClients: row.new_clients,
            ltv: row.ltv,
            churn: row.churn,
            margin: row.margin,
            cac: row.cac,
          })
        );
        return NextResponse.json(data);
      }
    } catch {
      // backend недоступен — используем CSV-fallback
    }
  }

  // Fallback: читаем CSV на сервере
  const data = parseCsvFallback();
  return NextResponse.json(data);
}
