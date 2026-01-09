import { useMemo, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatVNDCompact, formatDateShort } from '@/lib/formatters';
import { useCashForecasts } from '@/hooks/useDashboardData';
import { useForecastInputs, generateForecast } from '@/hooks/useForecastInputs';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/DataStateWrapper';
import { Database } from 'lucide-react';

const MIN_CASH_THRESHOLD = 1_500_000_000;

type ChartPoint = {
  week: string;
  dateLabel: string;
  actual: number | null;
  forecast: number | null;
  balance: number;
  type: 'actual' | 'forecast' | null;
};

function getForecastDays(dateRange: string): number {
  // Dashboard selector mixes presets + numeric strings.
  if (!dateRange) return 90;

  if (/^\d+$/.test(dateRange)) {
    const n = Number(dateRange);
    if (n > 0) return Math.min(365, n);
  }

  switch (dateRange) {
    case 'today':
      return 14;
    case 'this_month':
      return 60;
    case 'last_month':
      return 60;
    case 'this_quarter':
      return 120;
    case 'this_year':
      return 365;
    case 'last_year':
      return 365;
    case 'all':
      return 365;
    default:
      // e.g. specific year like '2025'
      if (/^20\d\d$/.test(dateRange)) return 365;
      return 90;
  }
}

const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload as ChartPoint | undefined;
    const value = dataPoint?.balance;
    const type = dataPoint?.type;

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold mb-2">
          {label} - {dataPoint?.dateLabel}
        </p>
        <p className={`text-sm ${type === 'actual' ? 'text-chart-1' : 'text-chart-2'}`}>
          {type === 'actual' ? 'Thực tế' : 'Dự báo'}:{' '}
          <span className="font-medium">{formatVNDCompact(value)}</span>
        </p>
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = 'CustomTooltip';

export interface CashForecastChartProps {
  dateRange?: string;
}

function CashForecastChartComponent({ dateRange: propDateRange }: CashForecastChartProps) {
  const { dateRange: contextDateRange } = useDateRangeForQuery();
  const effectiveDateRange = propDateRange || contextDateRange;
  const days = useMemo(() => getForecastDays(effectiveDateRange), [effectiveDateRange]);

  const { data: forecasts, isLoading: isLoadingDb } = useCashForecasts();
  const { inputs, isLoading: isLoadingInputs } = useForecastInputs();

  const data = useMemo<ChartPoint[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Show 7 days of history + forecast days
    const historyDays = 7;
    const start = new Date(today);
    start.setDate(start.getDate() - historyDays);
    
    const end = new Date(today);
    end.setDate(end.getDate() + days);

    // Prefer DB cash_forecasts if available for this window.
    const dbPoints = (forecasts || [])
      .filter((f) => {
        const d = new Date(f.forecast_date);
        return !Number.isNaN(d.getTime()) && d >= start && d <= end;
      })
      .map((item, index) => {
        // Map forecast_type correctly - weekly/daily types should be treated as forecast
        const rawType = item.forecast_type;
        const type: 'actual' | 'forecast' = rawType === 'actual' ? 'actual' : 'forecast';

        return {
          week: `T${index + 1}`,
          dateLabel: formatDateShort(item.forecast_date),
          actual: type === 'actual' ? item.closing_balance : null,
          forecast: type === 'forecast' ? item.closing_balance : null,
          balance: item.closing_balance,
          type,
        };
      });

    if (dbPoints.length) return dbPoints;

    // Fallback: generate forecast from available data.
    const gen = generateForecast(inputs, days);

    // For long horizons, downsample to weekly points to keep chart readable.
    const step = days >= 60 ? 7 : 1;
    const sampled = gen.filter((_, idx) => idx === 0 || idx % step === 0);

    return sampled.map((p, index) => ({
      week: `T${index + 1}`,
      dateLabel: formatDateShort(p.date),
      actual: p.isActual ? p.balance : null,
      forecast: !p.isActual ? p.balance : null,
      balance: p.balance,
      type: p.isActual ? 'actual' : 'forecast',
    }));
  }, [days, forecasts, inputs]);

  const isLoading = isLoadingDb || isLoadingInputs;
  const yAxisTickFormatter = useCallback((value: number) => formatVNDCompact(value), []);

  // Empty state when no data available
  if (!isLoading && data.length === 0) {
    return (
      <div className="data-card">
        <EmptyState
          message="Chưa có dữ liệu dự báo"
          description="Dữ liệu dự báo sẽ được tạo tự động khi bạn có số dư ngân hàng và giao dịch."
          icon={<Database className="h-8 w-8 text-muted-foreground" />}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="data-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Dự báo tiền mặt</h3>
          <p className="text-sm text-muted-foreground">Cash Flow Forecast</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-chart-1" />
            <span>Thực tế</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-chart-2" />
            <span>Dự báo</span>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={yAxisTickFormatter}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={MIN_CASH_THRESHOLD}
              stroke="hsl(var(--destructive))"
              strokeDasharray="5 5"
              label={{
                value: 'Ngưỡng tối thiểu',
                position: 'insideTopRight',
                fill: 'hsl(var(--destructive))',
                fontSize: 10,
              }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#colorActual)"
              dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(var(--chart-1))' }}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#colorForecast)"
              dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(var(--chart-2))' }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export const CashForecastChart = memo(CashForecastChartComponent);
