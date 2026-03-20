import {
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
  isBacktest?: boolean;
}

export function ForecastChart({ data, isBacktest }: Props) {
  const hasAdditionalAds = data.some((m) => m.ads_revenue > 0);
  const hasActuals = isBacktest && data.some((m) => m.actual_revenue !== undefined);

  const chartData = data.map((m) => ({
    month: m.month,
    'Khách cũ': m.returning_revenue,
    'Khách mới': m.new_revenue,
    ...(hasAdditionalAds ? { 'Ads bổ sung': m.ads_revenue } : {}),
    Conservative: m.total_conservative,
    Optimistic: m.total_optimistic,
    ...(hasActuals && m.actual_revenue !== undefined ? { 'Thực tế': m.actual_revenue } : {}),
  }));

  const showLunarWarning = hasLunarNewYearMonths(data);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {isBacktest ? 'Backtest: Dự báo vs Thực tế' : 'Dự báo doanh thu theo tháng'}
        </CardTitle>
        {showLunarWarning && (
          <div className="flex items-start gap-1.5 mt-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
            <span className="text-[11px] text-amber-700 dark:text-amber-400 leading-tight">
              Tháng 12–2 chịu ảnh hưởng Tết Âm lịch (mỗi năm lệch ~10 ngày). Độ chính xác seasonal có thể thấp hơn các tháng khác.
            </span>
          </div>
        )}
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
              <Bar dataKey="Khách mới" stackId="a" fill="hsl(142 71% 45%)" radius={hasAdditionalAds ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
              {hasAdditionalAds && (
                <Bar dataKey="Ads bổ sung" stackId="a" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
              )}
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
              {hasActuals && (
                <Line
                  type="monotone"
                  dataKey="Thực tế"
                  stroke="hsl(0 84% 60%)"
                  dot={{ r: 4, fill: 'hsl(0 84% 60%)' }}
                  strokeWidth={2.5}
                  activeDot={{ r: 6 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
