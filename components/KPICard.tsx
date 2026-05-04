'use client';

interface KPICardProps {
  title: string;
  value: string;
  delta: number;
  deltaLabel: string;
  isGoodWhenUp?: boolean;
}

export default function KPICard({
  title,
  value,
  delta,
  deltaLabel,
  isGoodWhenUp = true,
}: KPICardProps) {
  const isGood = isGoodWhenUp ? delta > 0 : delta < 0;
  const isNeutral = delta === 0;

  const deltaColor = isNeutral
    ? 'text-zinc-500'
    : isGood
    ? 'text-emerald-400'
    : 'text-rose-400';

  const deltaBg = isNeutral
    ? 'bg-zinc-800'
    : isGood
    ? 'bg-emerald-950/60'
    : 'bg-rose-950/60';

  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '—';

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
      <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">{title}</p>
      <p className="text-3xl font-bold text-white leading-none tracking-tight">{value}</p>
      <div className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-semibold ${deltaBg} ${deltaColor}`}>
        <span>{arrow}</span>
        <span>{Math.abs(delta).toFixed(1)}{deltaLabel}</span>
        <span className="text-zinc-600 font-normal">за период</span>
      </div>
    </div>
  );
}
