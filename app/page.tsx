'use client';

import { useState, useEffect } from 'react';
import { fetchMetrics } from '@/lib/parseMetrics';
import { MetricRow } from '@/lib/types';
import KPICard from '@/components/KPICard';
import RevenueChart from '@/components/RevenueChart';
import MarginCACChart from '@/components/MarginCACChart';
import ClientsLTVChart from '@/components/ClientsLTVChart';
import AnomalyBadge from '@/components/AnomalyBadge';
import AIInsightBlock from '@/components/AIInsightBlock';

const MONTHS_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

function pct(curr: number, prev: number) {
  if (!prev) return 0;
  return parseFloat(((curr - prev) / prev * 100).toFixed(1));
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}М ₽`;
  return `${(n / 1_000).toFixed(0)}К ₽`;
}

export default function Home() {
  const [allData, setAllData] = useState<MetricRow[]>([]);
  const [period, setPeriod] = useState({ start: 0, end: 11 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMetrics()
      .then((data) => {
        setAllData(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Не удалось загрузить данные');
        setLoading(false);
      });
  }, []);

  const data = allData.slice(period.start, period.end + 1);
  const first = data[0];
  const last = data[data.length - 1];

  function toggleMonth(i: number) {
    if (i < period.start) {
      setPeriod((p) => ({ ...p, start: i }));
    } else if (i > period.end) {
      setPeriod((p) => ({ ...p, end: i }));
    } else if (i === period.start && i < period.end) {
      setPeriod((p) => ({ ...p, start: i + 1 }));
    } else if (i === period.end && i > period.start) {
      setPeriod((p) => ({ ...p, end: i - 1 }));
    } else {
      // inside range - expand to nearest edge
      const distStart = i - period.start;
      const distEnd = period.end - i;
      if (distStart <= distEnd) {
        setPeriod((p) => ({ ...p, start: i }));
      } else {
        setPeriod((p) => ({ ...p, end: i }));
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">Загрузка данных…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400 text-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Бизнес-дашборд</h1>
          <p className="text-gray-400 text-sm mt-1">
            Ключевые метрики за 12 месяцев · данные из CSV
          </p>
        </div>

        {/* Period filter */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-400 text-sm font-medium shrink-0">Период:</span>
            <div className="flex gap-1.5 flex-wrap">
              {MONTHS_SHORT.map((m, i) => {
                const active = i >= period.start && i <= period.end;
                const isEdge = i === period.start || i === period.end;
                return (
                  <button
                    key={i}
                    onClick={() => toggleMonth(i)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      isEdge
                        ? 'bg-indigo-600 text-white'
                        : active
                        ? 'bg-indigo-900/60 text-indigo-300'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPeriod({ start: 0, end: 11 })}
              className="ml-auto text-xs text-gray-400 hover:text-white underline shrink-0"
            >
              Весь год
            </button>
          </div>
        </div>

        {/* KPI cards */}
        {first && last && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Выручка"
              value={fmt(last.revenue)}
              delta={pct(last.revenue, first.revenue)}
              deltaLabel="%"
              isGoodWhenUp={true}
            />
            <KPICard
              title="Новые клиенты"
              value={last.newClients.toString()}
              delta={pct(last.newClients, first.newClients)}
              deltaLabel="%"
              isGoodWhenUp={true}
            />
            <KPICard
              title="Маржа"
              value={`${last.margin}%`}
              delta={parseFloat((last.margin - first.margin).toFixed(1))}
              deltaLabel=" п.п."
              isGoodWhenUp={true}
            />
            <KPICard
              title="CAC"
              value={fmt(last.cac)}
              delta={pct(last.cac, first.cac)}
              deltaLabel="%"
              isGoodWhenUp={false}
            />
          </div>
        )}

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RevenueChart data={data} />
          <MarginCACChart data={data} />
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ClientsLTVChart data={data} />
          <AnomalyBadge data={data} />
        </div>

        {/* AI insight */}
        <AIInsightBlock data={allData} period={period} />

      </div>
    </div>
  );
}
