import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useFinanceMonthlySummary } from '@/hooks/useFinanceMonthlySummary';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DSOTrendChartComponent = () => {
  const { data: monthlySummary, isLoading } = useFinanceMonthlySummary({ months: 12 });

  const chartData = useMemo(() => {
    if (!monthlySummary?.length) return [];
    
    return monthlySummary.map((month) => ({
      month: month.yearMonth.slice(5), // "2025-12" -> "12"
      monthLabel: new Date(month.monthStart).toLocaleDateString('vi-VN', { month: 'short' }),
      dso: Math.round(month.dso * 10) / 10,
      arBalance: month.arBalance,
    }));
  }, [monthlySummary]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return null;
    const latest = chartData[chartData.length - 1]?.dso ?? 0;
    const previous = chartData[chartData.length - 2]?.dso ?? 0;
    const change = latest - previous;
    return {
      value: Math.abs(change).toFixed(1),
      direction: change > 0 ? 'up' : 'down',
      isGood: change < 0, // DSO giảm là tốt
    };
  }, [chartData]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="data-card"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Xu hướng DSO</h3>
            <p className="text-sm text-muted-foreground">DSO Trend - 12 tháng gần nhất</p>
          </div>
        </div>
        <Skeleton className="h-48 w-full" />
      </motion.div>
    );
  }

  if (!chartData.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="data-card"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Xu hướng DSO</h3>
            <p className="text-sm text-muted-foreground">DSO Trend - 12 tháng gần nhất</p>
          </div>
        </div>
        <div className="h-48 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Chưa có dữ liệu DSO theo tháng</p>
          </div>
        </div>
      </motion.div>
    );
  }

  const latestDSO = chartData[chartData.length - 1]?.dso ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="data-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Xu hướng DSO</h3>
          <p className="text-sm text-muted-foreground">DSO Trend - 12 tháng gần nhất</p>
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <Badge variant={trend.isGood ? 'default' : 'destructive'} className="flex items-center gap-1">
              {trend.direction === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend.value} ngày
            </Badge>
          )}
          <Badge variant="secondary">{latestDSO} ngày</Badge>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
              domain={['dataMin - 5', 'dataMax + 5']}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number) => [`${value} ngày`, 'DSO']}
              labelFormatter={(label) => `Tháng: ${label}`}
            />
            <ReferenceLine
              y={45}
              stroke="hsl(var(--warning))"
              strokeDasharray="5 5"
              label={{ value: 'Target 45', position: 'insideTopRight', fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="dso"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export const DSOTrendChart = memo(DSOTrendChartComponent);
