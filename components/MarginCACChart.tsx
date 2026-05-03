'use client';

import {
  ComposedChart,
  Line,
  Bar,
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

export default function MarginCACChart({ data }: Props) {
  const chartData = data.map((row) => ({
    month: row.month,
    margin: row.margin,
    churn: row.churn,
    cac: Math.round(row.cac / 1000),
  }));

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <h3 className="text-white font-semibold mb-4">Маржа, Отток и CAC</h3>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            domain={[0, 50]}
            width={30}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickFormatter={(v) => `${v}k`}
            width={35}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: 8,
            }}
            labelStyle={{ color: '#F9FAFB' }}
            formatter={(val, name) => {
              if (name === 'CAC (тыс. ₽)') return [`${val}k ₽`, name as string];
              return [`${val}%`, name as string];
            }}
          />
          <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }} />
          <Bar
            yAxisId="right"
            dataKey="cac"
            name="CAC (тыс. ₽)"
            fill="#F59E0B"
            opacity={0.65}
            radius={[3, 3, 0, 0]}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="margin"
            name="Маржа %"
            stroke="#10B981"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="churn"
            name="Отток %"
            stroke="#EF4444"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3, fill: '#EF4444', strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
