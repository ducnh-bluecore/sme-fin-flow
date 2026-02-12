import { useMemo, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Target } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';

import type { TimeHorizon } from '@/hooks/useWhatIfScenarios';

interface MonthlyProfitTrendChartProps {
  baseValues: {
    revenue: number;
    cogs: number;
    opex: number;
    ebitda: number;
    grossMargin: number;
  };
  projectedValues: {
    revenue: number;
    cogs: number;
    opex: number;
    ebitda: number;
    grossMargin: number;
    revenueChange: number;
    ebitdaChange: number;
  };
  controlMode: 'simple' | 'retail';
  timeHorizon?: TimeHorizon;
}

function generateLabels(timeHorizon: TimeHorizon): string[] {
  if (timeHorizon === 1) return ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
  return Array.from({ length: timeHorizon }, (_, i) => `T${i + 1}`);
}

function getChartTitle(timeHorizon: TimeHorizon): string {
  switch (timeHorizon) {
    case 1: return 'Xu hướng EBITDA theo tuần';
    case 3: return 'Xu hướng EBITDA 3 tháng tới';
    case 6: return 'Xu hướng EBITDA 6 tháng tới';
    case 12: return 'Xu hướng EBITDA theo tháng';
    case 24: return 'Xu hướng EBITDA 2 năm';
  }
}

function getPeriodLabel(timeHorizon: TimeHorizon): string {
  switch (timeHorizon) {
    case 1: return '1 tháng';
    case 3: return '3 tháng';
    case 6: return '6 tháng';
    case 12: return 'năm';
    case 24: return '2 năm';
  }
}

const tooltipStyle = { 
  background: 'hsl(var(--card))', 
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

function MonthlyProfitTrendChartComponent({
  baseValues,
  projectedValues,
  controlMode,
  timeHorizon = 12,
}: MonthlyProfitTrendChartProps) {
  const labels = useMemo(() => generateLabels(timeHorizon), [timeHorizon]);
  const chartTitle = useMemo(() => getChartTitle(timeHorizon), [timeHorizon]);
  const periodLabel = useMemo(() => getPeriodLabel(timeHorizon), [timeHorizon]);
  const periodCount = labels.length; // number of data points (4 weeks or N months)
  // Generate monthly trend data with gradual growth/decline
  const monthlyTrendData = useMemo(() => {
    const months = labels.map((label, index) => {
      // Calculate gradual transition from base to projected over the year
      // Use a growth curve that accelerates mid-year
      const lastIndex = periodCount - 1;
      const progressFactor = lastIndex > 0 ? index / lastIndex : 1;
      
      // Apply an S-curve for more realistic growth pattern
      const sCurve = (x: number) => {
        const smoothness = 3;
        return 1 / (1 + Math.exp(-smoothness * (x - 0.5)));
      };
      
      const growthProgress = sCurve(progressFactor);
      
      // Base per-period values
      const basePeriodRevenue = baseValues.revenue / periodCount;
      const basePeriodEbitda = baseValues.ebitda / periodCount;
      const basePeriodGrossProfit = (baseValues.revenue - baseValues.cogs) / periodCount;
      
      // Projected per-period values
      const projectedPeriodRevenue = projectedValues.revenue / periodCount;
      const projectedPeriodEbitda = projectedValues.ebitda / periodCount;
      const projectedPeriodGrossProfit = (projectedValues.revenue - projectedValues.cogs) / periodCount;
      
      // Interpolated values based on growth progress
      const currentRevenue = basePeriodRevenue + (projectedPeriodRevenue - basePeriodRevenue) * growthProgress;
      const currentEbitda = basePeriodEbitda + (projectedPeriodEbitda - basePeriodEbitda) * growthProgress;
      const currentGrossProfit = basePeriodGrossProfit + (projectedPeriodGrossProfit - basePeriodGrossProfit) * growthProgress;
      
      // Add some seasonal variance for realism (skip for weekly view)
      const seasonalFactor = timeHorizon === 1 ? 1 : 1 + 0.08 * Math.sin((index + 3) * Math.PI / 6);
      
      return {
        month: label,
        monthIndex: index + 1,
        // Base scenario (no changes applied)
        baseRevenue: basePeriodRevenue * seasonalFactor,
        baseEbitda: basePeriodEbitda * seasonalFactor,
        baseGrossProfit: basePeriodGrossProfit * seasonalFactor,
        // Projected scenario (with what-if changes)
        projectedRevenue: currentRevenue * seasonalFactor,
        projectedEbitda: currentEbitda * seasonalFactor,
        projectedGrossProfit: currentGrossProfit * seasonalFactor,
        // Cumulative values
        cumulativeBaseEbitda: 0, // Will be calculated below
        cumulativeProjectedEbitda: 0,
      };
    });
    
    // Calculate cumulative values
    let cumulativeBase = 0;
    let cumulativeProjected = 0;
    months.forEach((m) => {
      cumulativeBase += m.baseEbitda;
      cumulativeProjected += m.projectedEbitda;
      m.cumulativeBaseEbitda = cumulativeBase;
      m.cumulativeProjectedEbitda = cumulativeProjected;
    });
    
    return months;
  }, [baseValues, projectedValues, labels, periodCount, timeHorizon]);

  // Summary statistics
  const summary = useMemo(() => {
    const lastMonth = monthlyTrendData[monthlyTrendData.length - 1];
    const totalBaseEbitda = monthlyTrendData.reduce((sum, m) => sum + m.baseEbitda, 0);
    const totalProjectedEbitda = monthlyTrendData.reduce((sum, m) => sum + m.projectedEbitda, 0);
    const ebitdaDiff = totalProjectedEbitda - totalBaseEbitda;
    const ebitdaChangePercent = totalBaseEbitda !== 0 
      ? ((totalProjectedEbitda / totalBaseEbitda) - 1) * 100 
      : 0;
    
    // Find break-even month (where projected overtakes base)
    let breakEvenMonth = -1;
    if (projectedValues.ebitdaChange > 0) {
      for (let i = 0; i < monthlyTrendData.length; i++) {
        if (monthlyTrendData[i].projectedEbitda > monthlyTrendData[i].baseEbitda * 1.05) {
          breakEvenMonth = i + 1;
          break;
        }
      }
    }
    
    // Best and worst months
    const sortedByGain = [...monthlyTrendData].sort((a, b) => 
      (b.projectedEbitda - b.baseEbitda) - (a.projectedEbitda - a.baseEbitda)
    );
    
    return {
      totalBaseEbitda,
      totalProjectedEbitda,
      ebitdaDiff,
      ebitdaChangePercent,
      breakEvenMonth,
      bestMonth: sortedByGain[0],
      worstMonth: sortedByGain[sortedByGain.length - 1],
    };
  }, [monthlyTrendData, projectedValues]);

  const isPositiveChange = projectedValues.ebitdaChange > 0;

  const yAxisTickFormatter = useCallback((val: number) => formatVNDCompact(val), []);

  const trendTooltipFormatter = useCallback((val: number, name: string) => [
    formatVNDCompact(val),
    name === 'baseEbitda' ? 'Kịch bản cơ sở' : 'Kịch bản What-If'
  ], []);

  const trendLabelFormatter = useCallback((label: string) => timeHorizon === 1 ? label : `Tháng ${label}`, [timeHorizon]);

  const trendLegendFormatter = useCallback(
    (value: string) => value === 'baseEbitda' ? 'Kịch bản cơ sở' : 'Kịch bản What-If',
    []
  );

  const cumulativeTooltipFormatter = useCallback((val: number, name: string) => [
    formatVNDCompact(val),
    name === 'cumulativeBaseEbitda' ? 'Cơ sở (lũy kế)' : 'What-If (lũy kế)'
  ], []);

  const cumulativeLabelFormatter = useCallback((label: string) => `Đến ${label}`, []);

  const cumulativeLegendFormatter = useCallback(
    (value: string) => value === 'cumulativeBaseEbitda' ? 'Cơ sở (lũy kế)' : 'What-If (lũy kế)',
    []
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">EBITDA Dự kiến ({periodLabel})</span>
              </div>
              <p className="text-lg font-bold">{formatVNDCompact(summary.totalProjectedEbitda)}</p>
              <Badge 
                variant="outline" 
                className={cn(
                  'text-xs mt-1',
                  isPositiveChange 
                    ? 'border-success/50 text-success bg-success/10' 
                    : 'border-destructive/50 text-destructive bg-destructive/10'
                )}
              >
                {isPositiveChange ? '+' : ''}{summary.ebitdaChangePercent.toFixed(1)}%
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                {isPositiveChange ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                )}
                <span className="text-xs text-muted-foreground">Chênh lệch</span>
              </div>
              <p className={cn(
                'text-lg font-bold',
                isPositiveChange ? 'text-success' : 'text-destructive'
              )}>
                {isPositiveChange ? '+' : ''}{formatVNDCompact(summary.ebitdaDiff)}
              </p>
              <span className="text-xs text-muted-foreground">so với không thay đổi</span>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Tháng tốt nhất</span>
              </div>
              <p className="text-lg font-bold">{summary.bestMonth.month}</p>
              <span className="text-xs text-success">
                +{formatVNDCompact(summary.bestMonth.projectedEbitda - summary.bestMonth.baseEbitda)}
              </span>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {summary.breakEvenMonth > 0 ? 'Thấy hiệu quả từ' : 'Tháng thấp nhất'}
                </span>
              </div>
              <p className="text-lg font-bold">
                {summary.breakEvenMonth > 0 
                  ? `Tháng ${summary.breakEvenMonth}` 
                  : summary.worstMonth.month
                }
              </p>
              <span className="text-xs text-muted-foreground">
                {summary.breakEvenMonth > 0 
                  ? 'tăng trưởng rõ rệt'
                  : formatVNDCompact(summary.worstMonth.projectedEbitda - summary.worstMonth.baseEbitda)
                }
              </span>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Chart - EBITDA Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {chartTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyTrendData} margin={{ left: 10, right: 10 }}>
                <defs>
                  <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="baseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis 
                  tickFormatter={yAxisTickFormatter} 
                  tick={{ fontSize: 11 }}
                  width={70}
                />
                <Tooltip
                  formatter={trendTooltipFormatter}
                  labelFormatter={trendLabelFormatter}
                  contentStyle={tooltipStyle}
                />
                <Legend formatter={trendLegendFormatter} />
                <Area
                  type="monotone"
                  dataKey="baseEbitda"
                  stroke="hsl(var(--muted-foreground))"
                  fill="url(#baseGradient)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Area
                  type="monotone"
                  dataKey="projectedEbitda"
                  stroke="hsl(var(--primary))"
                  fill="url(#projectedGradient)"
                  strokeWidth={2}
                />
                <ReferenceLine 
                  y={0} 
                  stroke="hsl(var(--border))" 
                  strokeDasharray="3 3" 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cumulative Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">EBITDA Lũy kế</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis 
                  tickFormatter={yAxisTickFormatter} 
                  tick={{ fontSize: 11 }}
                  width={70}
                />
                <Tooltip
                  formatter={cumulativeTooltipFormatter}
                  labelFormatter={cumulativeLabelFormatter}
                  contentStyle={tooltipStyle}
                />
                <Legend formatter={cumulativeLegendFormatter} />
                <Line
                  type="monotone"
                  dataKey="cumulativeBaseEbitda"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeProjectedEbitda"
                  stroke={isPositiveChange ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                  strokeWidth={2}
                  dot={{ r: 3, fill: isPositiveChange ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* End of year comparison */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">EBITDA cuối kỳ (Cơ sở)</p>
              <p className="font-semibold">{formatVNDCompact(summary.totalBaseEbitda)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">EBITDA cuối kỳ (What-If)</p>
              <p className={cn(
                'font-semibold',
                isPositiveChange ? 'text-success' : 'text-destructive'
              )}>
                {formatVNDCompact(summary.totalProjectedEbitda)}
                <span className="text-xs ml-2">
                  ({isPositiveChange ? '+' : ''}{formatVNDCompact(summary.ebitdaDiff)})
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const MonthlyProfitTrendChart = memo(MonthlyProfitTrendChartComponent);
