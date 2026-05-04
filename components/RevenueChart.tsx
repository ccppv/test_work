'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MetricRow } from '@/lib/types';

interface Props {
  data: MetricRow[];
}

const formatM = (val: number) => `${(val / 1_000_000).toFixed(1)}М`;

export default function RevenueChart({ data }: Props) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
      <h3 className="text-white font-semibold mb-4 text-base">Выручка по месяцам</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} />
          <YAxis tickFormatter={formatM} tick={{ fill: '#71717a', fontSize: 11 }} width={45} />
          <Tooltip
            formatter={(val) => [`${Number(val).toLocaleString('ru-RU')} ₽`, 'Выручка']}  
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: 10,
              color: '#fafafa',
            }}
            labelStyle={{ color: '#fafafa' }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#6366F1"
            strokeWidth={2.5}
            fill="url(#revenueGrad)"
            dot={{ r: 4, fill: '#6366F1', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
