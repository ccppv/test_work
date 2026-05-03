'use client';

import { MetricRow } from '@/lib/types';
import { AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react';

interface Props {
  data: MetricRow[];
}

interface Anomaly {
  type: 'danger' | 'warning';
  message: string;
}

function detectAnomalies(data: MetricRow[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];

    // CAC вырос >20%
    const cacDelta = (curr.cac - prev.cac) / prev.cac;
    if (cacDelta > 0.2) {
      anomalies.push({
        type: 'warning',
        message: `${curr.month}: CAC вырос на ${(cacDelta * 100).toFixed(0)}% — ${prev.cac.toLocaleString('ru-RU')} → ${curr.cac.toLocaleString('ru-RU')} ₽`,
      });
    }

    // Маржа упала >3 п.п.
    const marginDelta = curr.margin - prev.margin;
    if (marginDelta < -3) {
      anomalies.push({
        type: 'danger',
        message: `${curr.month}: Маржа упала на ${Math.abs(marginDelta).toFixed(0)} п.п. — ${prev.margin}% → ${curr.margin}%`,
      });
    }

    // Отток вырос >1 п.п.
    const churnDelta = curr.churn - prev.churn;
    if (churnDelta > 1) {
      anomalies.push({
        type: 'danger',
        message: `${curr.month}: Отток вырос на ${churnDelta.toFixed(1)} п.п. — ${prev.churn}% → ${curr.churn}%`,
      });
    }

    // LTV упал >5%
    const ltvDelta = (curr.ltv - prev.ltv) / prev.ltv;
    if (ltvDelta < -0.05) {
      anomalies.push({
        type: 'warning',
        message: `${curr.month}: LTV снизился на ${(Math.abs(ltvDelta) * 100).toFixed(0)}% — ${prev.ltv.toLocaleString('ru-RU')} → ${curr.ltv.toLocaleString('ru-RU')} ₽`,
      });
    }

    // Выручка упала >5%
    const revDelta = (curr.revenue - prev.revenue) / prev.revenue;
    if (revDelta < -0.05) {
      anomalies.push({
        type: 'warning',
        message: `${curr.month}: Выручка упала на ${(Math.abs(revDelta) * 100).toFixed(0)}% — ${(prev.revenue / 1e6).toFixed(2)}М → ${(curr.revenue / 1e6).toFixed(2)}М ₽`,
      });
    }
  }

  return anomalies;
}

export default function AnomalyBadge({ data }: Props) {
  const anomalies = detectAnomalies(data);

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        {anomalies.length > 0 ? (
          <>
            <AlertTriangle size={18} className="text-amber-400" />
            Аномалии за период
            <span className="ml-1 bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full font-semibold">
              {anomalies.length}
            </span>
          </>
        ) : (
          <>
            <CheckCircle size={18} className="text-emerald-400" />
            Аномалий не обнаружено
          </>
        )}
      </h3>

      {anomalies.length === 0 && (
        <p className="text-gray-500 text-sm">
          Все метрики в пределах нормы для выбранного периода.
        </p>
      )}

      <ul className="space-y-2 max-h-[168px] overflow-y-auto pr-1">
        {anomalies.map((a, i) => (
          <li
            key={i}
            className={`text-sm flex items-start gap-2 px-3 py-2 rounded-lg ${
              a.type === 'danger'
                ? 'bg-red-950/40 text-red-300 border border-red-800/40'
                : 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
            }`}
          >
            <TrendingDown size={14} className="mt-0.5 shrink-0" />
            {a.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
