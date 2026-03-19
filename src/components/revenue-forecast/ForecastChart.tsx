import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import type { ForecastMonth } from '@/hooks/useRevenueForecast';

function hasLunarNewYearMonths(data: ForecastMonth[]) {
  return data.some((m) => {
    const month = parseInt(m.month.split('-')[1], 10);
    return month === 12 || month === 1 || month === 2;
  });
}

function fmtAxis(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

function fmtTooltip(v: number) {
  return v.toLocaleString('vi-VN') + ' ₫';
}

interface Props {
  data: ForecastMonth[];
}

export function ForecastChart({ data }: Props) {
  const chartData = data.map((m) => ({
    month: m.month,
    'Khách cũ': m.returning_revenue,
    'Khách mới': m.new_revenue,
    Ads: m.ads_revenue,
    Conservative: m.total_conservative,
    Optimistic: m.total_optimistic,
    seasonal: m.seasonal_multiplier ?? 1,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Dự báo doanh thu theo tháng</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip
                formatter={(v: number, name: string) => [fmtTooltip(v), name]}
                contentStyle={{
                  borderRadius: 8,
                  fontSize: 12,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--background))',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Khách cũ" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Khách mới" stackId="a" fill="hsl(142 71% 45%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Ads" stackId="a" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="Conservative"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                dot={false}
                strokeWidth={1.5}
              />
              <Line
                type="monotone"
                dataKey="Optimistic"
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                dot={false}
                strokeWidth={1.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
