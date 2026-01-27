/**
 * BudgetVsActualSummary - Overview of planned vs actual expenses
 * 
 * Shows monthly comparison of budgeted vs actual spending
 * combining fixed baselines and variable estimates.
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useExpensePlanSummary } from '@/hooks/useExpensePlanSummary';
import { useExpenseBaselines } from '@/hooks/useExpenseBaselines';
import { useExpenseEstimates } from '@/hooks/useExpenseEstimates';

// =============================================================
// MAIN COMPONENT
// =============================================================

export function BudgetVsActualSummary() {
  const { currentMonth, ytdPlanned, ytdActual, ytdVariance, ytdVariancePercent, isLoading: summaryLoading } = useExpensePlanSummary(6);
  const { totalMonthlyFixed, isLoading: baselinesLoading } = useExpenseBaselines();
  const { totalEstimated, totalActual: variableActual, isLoading: estimatesLoading } = useExpenseEstimates();

  const isLoading = summaryLoading || baselinesLoading || estimatesLoading;

  // Combine data for current month
  const currentData = useMemo(() => {
    const planned = totalMonthlyFixed + totalEstimated;
    const actual = totalMonthlyFixed + variableActual; // Fixed is always as planned
    const variance = actual - planned;
    const variancePercent = planned > 0 ? (variance / planned) * 100 : 0;

    return {
      planned,
      actual,
      variance,
      variancePercent,
      fixedPlanned: totalMonthlyFixed,
      variablePlanned: totalEstimated,
      variableActual,
    };
  }, [totalMonthlyFixed, totalEstimated, variableActual]);

  // Chart data
  const chartData = useMemo(() => {
    return [
      {
        name: 'Chi phí cố định',
        planned: totalMonthlyFixed,
        actual: totalMonthlyFixed, // Fixed costs are always as planned
      },
      {
        name: 'Chi phí biến đổi',
        planned: totalEstimated,
        actual: variableActual,
      },
    ];
  }, [totalMonthlyFixed, totalEstimated, variableActual]);

  const now = new Date();
  const monthLabel = format(now, 'MMMM yyyy', { locale: vi });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Ngân sách vs Thực tế
            </CardTitle>
            <CardDescription>So sánh chi phí kế hoạch và thực tế - {monthLabel}</CardDescription>
          </div>
          <Badge variant="outline">{monthLabel}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Planned */}
              <div className="space-y-2 p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  Kế hoạch
                </div>
                <div className="text-2xl font-bold">{formatCurrency(currentData.planned)}</div>
                <div className="text-xs text-muted-foreground">
                  Cố định: {formatCurrency(currentData.fixedPlanned)} • Biến đổi: {formatCurrency(currentData.variablePlanned)}
                </div>
              </div>

              {/* Actual */}
              <div className="space-y-2 p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {currentData.actual > currentData.planned ? (
                    <TrendingUp className="h-4 w-4 text-destructive" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-600" />
                  )}
                  Thực tế
                </div>
                <div className="text-2xl font-bold">{formatCurrency(currentData.actual)}</div>
                <div className="text-xs text-muted-foreground">
                  Biến đổi thực: {formatCurrency(currentData.variableActual)}
                </div>
              </div>

              {/* Variance */}
              <div className={cn(
                "space-y-2 p-4 rounded-lg",
                currentData.variance > 0 ? "bg-destructive/10" : "bg-green-500/10"
              )}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {Math.abs(currentData.variancePercent) > 10 ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Chênh lệch
                </div>
                <div className={cn(
                  "text-2xl font-bold",
                  currentData.variance > 0 ? "text-destructive" : "text-green-600"
                )}>
                  {currentData.variance > 0 ? '+' : ''}{formatCurrency(currentData.variance)}
                </div>
                <Badge variant={currentData.variancePercent > 10 ? 'destructive' : currentData.variancePercent > 0 ? 'secondary' : 'default'}>
                  {currentData.variancePercent > 0 ? '+' : ''}{currentData.variancePercent.toFixed(1)}%
                </Badge>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelClassName="font-medium"
                  />
                  <Legend />
                  <Bar dataKey="planned" name="Kế hoạch" fill="hsl(var(--muted-foreground))" />
                  <Bar dataKey="actual" name="Thực tế" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* YTD Summary */}
            <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">Tổng YTD (Năm đến nay)</span>
              <div className="flex items-center gap-4">
                <span>Kế hoạch: <strong>{formatCurrency(ytdPlanned)}</strong></span>
                <span>Thực tế: <strong>{formatCurrency(ytdActual)}</strong></span>
                <Badge variant={ytdVariancePercent > 10 ? 'destructive' : ytdVariancePercent > 0 ? 'secondary' : 'default'}>
                  {ytdVariancePercent > 0 ? '+' : ''}{ytdVariancePercent.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
