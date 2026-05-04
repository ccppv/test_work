'use client';

import { MetricRow } from '@/lib/types';
import { TrendingDown } from 'lucide-react';

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
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-base">Отклонения</h3>
        {anomalies.length > 0 ? (
          <span className="bg-amber-500/15 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-500/20">
            {anomalies.length} найдено
          </span>
        ) : (
          <span className="bg-emerald-500/10 text-emerald-400 text-xs font-medium px-2.5 py-1 rounded-full border border-emerald-500/20">
            в норме
          </span>
        )}
      </div>

      {anomalies.length === 0 && (
        <p className="text-zinc-500 text-sm">
          Все метрики в пределах нормы для выбранного периода.
        </p>
      )}

      <ul className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
        {anomalies.map((a, i) => (
          <li
            key={i}
            className={`text-sm flex items-start gap-2 px-3 py-2 rounded-xl ${
              a.type === 'danger'
                ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                : 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
            }`}
          >
            <TrendingDown size={13} className="mt-0.5 shrink-0 opacity-70" />
            {a.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
