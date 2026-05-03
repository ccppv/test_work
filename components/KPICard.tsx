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
  const color = isNeutral
    ? 'text-gray-400'
    : isGood
    ? 'text-emerald-400'
    : 'text-red-400';
  const bgColor = isNeutral
    ? ''
    : isGood
    ? 'border-emerald-800/30'
    : 'border-red-800/30';
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';

  return (
    <div className={`bg-gray-800 rounded-xl p-5 border ${bgColor || 'border-gray-700'} flex flex-col gap-1`}>
      <div className="text-gray-400 text-sm font-medium">{title}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className={`text-sm font-semibold ${color}`}>
        {arrow} {Math.abs(delta).toFixed(1)}{deltaLabel}
        <span className="text-gray-500 font-normal ml-1">за период</span>
      </div>
    </div>
  );
}
