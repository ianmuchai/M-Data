import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DataPoint } from '../../shared/analytics';

type TrendChartProps = {
  data: DataPoint[];
};

function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00a6a6" stopOpacity={0.5} />
            <stop offset="52%" stopColor="#2563eb" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" stroke="#6b7280" tickLine={false} axisLine={false} />
        <YAxis stroke="#6b7280" tickLine={false} axisLine={false} />
        <CartesianGrid stroke="#dbe4f0" vertical={false} />
        <Tooltip
          cursor={{ stroke: '#00a6a6', strokeDasharray: '4 4' }}
          contentStyle={{
            background: 'rgba(255, 255, 255, 0.96)',
            borderRadius: 8,
            borderColor: '#a7f3d0',
            boxShadow: '0 18px 42px rgba(15, 23, 42, 0.16)',
          }}
        />
        <Area type="monotone" dataKey="value" name="Actual" stroke="#00a6a6" strokeWidth={3} fill="url(#volumeGradient)" />
        <Line type="monotone" dataKey="target" name="Target" stroke="#f97316" strokeDasharray="5 5" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default TrendChart;
