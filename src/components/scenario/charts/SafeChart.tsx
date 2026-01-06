/**
 * SafeChart - Wrapper components for Recharts to avoid React ref warnings
 * Recharts functional components like CartesianGrid sometimes cause ref issues
 */

import { memo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Bar,
  Line,
  Cell,
  ReferenceLine,
  Legend,
} from 'recharts';
import { formatVNDCompact } from '@/lib/formatters';

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatValue: (value: number) => string;
  showActual?: boolean;
}

export const ChartTooltip = memo(function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
  showActual = false,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-semibold mb-2">Tháng {label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Kế hoạch:</span>
          <span className="font-medium text-primary">{formatValue(data.planned)}</span>
        </div>
        {showActual && data.actual !== undefined && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Thực tế:</span>
            <span className="font-medium text-success">{formatValue(data.actual)}</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">% tổng:</span>
          <span className="font-medium">
            {typeof data.percentOfTotal === 'number' ? data.percentOfTotal.toFixed(1) : '0.0'}%
          </span>
        </div>
      </div>
    </div>
  );
});

interface PlanChartProps {
  data: any[];
  currentMonthlyAvg: number;
  formatValue: (value: number) => string;
}

export const PlanChart = memo(function PlanChart({
  data,
  currentMonthlyAvg,
  formatValue,
}: PlanChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(v) => formatVNDCompact(v)}
          tick={{ fontSize: 10 }}
          width={60}
        />
        <RechartsTooltip
          content={(props) => (
            <ChartTooltip {...props} formatValue={formatValue} showActual={false} />
          )}
        />
        <ReferenceLine
          y={currentMonthlyAvg}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="5 5"
          label={{ value: 'TB hiện tại', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Bar dataKey="planned" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.locked
                  ? 'hsl(var(--muted-foreground))'
                  : entry.variance >= 0
                    ? 'hsl(var(--success))'
                    : 'hsl(var(--primary))'
              }
              fillOpacity={0.8}
            />
          ))}
        </Bar>
        <Line
          type="monotone"
          dataKey="cumulativePlanned"
          stroke="hsl(var(--warning))"
          strokeWidth={2}
          dot={false}
          name="Lũy kế"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});

interface TrackingChartProps {
  data: any[];
  formatValue: (value: number) => string;
}

export const TrackingChart = memo(function TrackingChart({
  data,
  formatValue,
}: TrackingChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(v) => formatVNDCompact(v)}
          tick={{ fontSize: 10 }}
          width={60}
        />
        <RechartsTooltip
          content={(props) => (
            <ChartTooltip {...props} formatValue={formatValue} showActual={true} />
          )}
        />
        <Legend />
        <Bar
          dataKey="planned"
          name="Kế hoạch"
          fill="hsl(var(--primary))"
          fillOpacity={0.4}
          radius={[4, 4, 0, 0]}
        />
        <Bar dataKey="actual" name="Thực tế" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.isPast
                  ? entry.variancePercent >= -5
                    ? 'hsl(var(--success))'
                    : 'hsl(var(--destructive))'
                  : entry.isCurrent
                    ? 'hsl(var(--warning))'
                    : 'hsl(var(--muted))'
              }
            />
          ))}
        </Bar>
        <Line
          type="monotone"
          dataKey="cumulativePlanned"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          name="Lũy kế KH"
        />
        <Line
          type="monotone"
          dataKey="cumulativeActual"
          stroke="hsl(var(--success))"
          strokeWidth={2}
          dot={false}
          name="Lũy kế TT"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});
