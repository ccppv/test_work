'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { MetricRow } from '@/lib/types';

interface Props {
  data: MetricRow[];
}

export default function ClientsLTVChart({ data }: Props) {
  const chartData = data.map((row) => ({
    month: row.month,
    newClients: row.newClients,
    ltv: Math.round(row.ltv / 1000),
  }));

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
      <h3 className="text-white font-semibold mb-4 text-base">Новые клиенты и LTV</h3>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#71717a', fontSize: 11 }}
            width={30}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickFormatter={(v) => `${v}k`}
            width={35}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: 10,
            }}
            labelStyle={{ color: '#fafafa' }}
            formatter={(val, name) => {
              if (name === 'LTV (тыс. ₽)') return [`${val}k ₽`, name as string];
              return [val as number, name as string];
            }}
          />
          <Legend wrapperStyle={{ color: '#71717a', fontSize: 12 }} />
          <Bar
            yAxisId="left"
            dataKey="newClients"
            name="Новые клиенты"
            fill="#6366F1"
            opacity={0.8}
            radius={[3, 3, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ltv"
            name="LTV (тыс. ₽)"
            stroke="#EC4899"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#EC4899', strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
