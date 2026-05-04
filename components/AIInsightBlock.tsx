'use client';

import { useState } from 'react';
import { Loader2, Copy, CheckCheck, ChevronRight } from 'lucide-react';
import { MetricRow } from '@/lib/types';

type Provider = 'claude' | 'gemini';

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
];

interface Props {
  data: MetricRow[];
  period: { start: number; end: number };
}

export default function AIInsightBlock({ data, period }: Props) {
  const [provider, setProvider] = useState<Provider>('claude');
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function fetchInsight() {
    setLoading(true);
    setError('');
    setInsight('');
    try {
      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, period, provider }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error ?? `Ошибка сервера: ${res.status}`);
      } else {
        setInsight(json.insight);
      }
    } catch {
      setError('Ошибка сети — не удалось получить инсайт');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(insight);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const periodLabel =
    data.length > 0
      ? `${data[period.start]?.month} – ${data[period.end]?.month}`
      : '';

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <h3 className="text-white font-semibold text-base">Аналитический обзор</h3>
          {periodLabel && (
            <p className="text-zinc-500 text-xs mt-1">Период: {periodLabel}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-zinc-700 text-xs font-medium">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setProvider(p.value); setInsight(''); setError(''); }}
                className={`px-3 py-1.5 transition-colors ${
                  provider === p.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchInsight}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
            {loading ? 'Формирую отчёт...' : 'Сформировать отчёт'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/40 text-rose-300 text-sm rounded-xl p-4 mt-1">
          {error}
        </div>
      )}

      {insight && (
        <div className="relative mt-1">
          <div className="bg-zinc-950 rounded-xl p-5 text-zinc-200 text-sm whitespace-pre-wrap leading-relaxed border border-zinc-800">
            {insight}
          </div>
          <button
            onClick={copy}
            title="Скопировать"
            className="absolute top-3 right-3 text-zinc-600 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-zinc-800"
          >
            {copied ? <CheckCheck size={15} className="text-emerald-400" /> : <Copy size={15} />}
          </button>
        </div>
      )}

      {!insight && !error && !loading && (
        <p className="text-zinc-600 text-sm leading-relaxed mt-1">
          Выберите модель и нажмите «Сформировать отчёт» —
          система проанализирует данные за выбранный период
          и сформирует управленческие выводы на основе конкретных цифр.
        </p>
      )}
    </div>
  );
}
