'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Copy, CheckCheck } from 'lucide-react';
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
    <div className="bg-gray-800 rounded-xl p-5 border border-indigo-800/50">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-400" />
            AI-инсайт по данным
          </h3>
          {periodLabel && (
            <p className="text-gray-500 text-xs mt-0.5">Период: {periodLabel}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-gray-600 text-xs font-medium">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setProvider(p.value); setInsight(''); setError(''); }}
                className={`px-3 py-1.5 transition-colors ${
                  provider === p.value
                    ? p.value === 'gemini'
                      ? 'bg-blue-600 text-white'
                      : 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchInsight}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Анализирую...' : 'Получить инсайт'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800/40 text-red-300 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {insight && (
        <div className="relative">
          <div className="bg-gray-900 rounded-lg p-4 text-gray-200 text-sm whitespace-pre-wrap leading-relaxed border border-gray-700">
            {insight}
          </div>
          <button
            onClick={copy}
            title="Скопировать"
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 transition-colors p-1"
          >
            {copied ? <CheckCheck size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>
      )}

      {!insight && !error && !loading && (
        <p className="text-gray-500 text-sm leading-relaxed">
          Выберите модель и нажмите «Получить инсайт» —{' '}
          <span className="text-gray-400">{provider === 'gemini' ? 'Gemini' : 'Claude'}</span>{' '}
          проанализирует данные за выбранный период и выдаст управленческие выводы на основе
          конкретных цифр.
        </p>
      )}
    </div>
  );
}
