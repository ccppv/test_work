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
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-zinc-500 text-base animate-pulse">Загрузка данных…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-rose-400 text-base">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="pb-2 border-b border-zinc-800">
          <h1 className="text-xl font-semibold text-white tracking-tight">Бизнес-дашборд</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Ключевые метрики за 12 месяцев
          </p>
        </div>

        {/* Period filter */}
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider shrink-0">Период</span>
            <div className="flex gap-1 flex-wrap">
              {MONTHS_SHORT.map((m, i) => {
                const active = i >= period.start && i <= period.end;
                const isEdge = i === period.start || i === period.end;
                return (
                  <button
                    key={i}
                    onClick={() => toggleMonth(i)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      isEdge
                        ? 'bg-indigo-600 text-white'
                        : active
                        ? 'bg-indigo-950/70 text-indigo-300'
                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPeriod({ start: 0, end: 11 })}
              className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
            >
              Сбросить
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
