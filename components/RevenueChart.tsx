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
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <h3 className="text-white font-semibold mb-4">Выручка по месяцам</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <YAxis tickFormatter={formatM} tick={{ fill: '#9CA3AF', fontSize: 11 }} width={45} />
          <Tooltip
            formatter={(val) => [`${Number(val).toLocaleString('ru-RU')} ₽`, 'Выручка']}  
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: 8,
              color: '#F9FAFB',
            }}
            labelStyle={{ color: '#F9FAFB' }}
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
