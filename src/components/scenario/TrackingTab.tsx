import { forwardRef, useMemo } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TrackingChart } from './charts/SafeChart';
import { TrackingTable } from './TrackingTable';

interface MonthlyData {
  month: string;
  value: number;
  locked: boolean;
  percentOfTotal: number;
}

interface TrackingTabProps {
  hasSavedPlan: boolean;
  monthlyData: MonthlyData[];
  actualValues: number[];
  formatValue: (value: number) => string;
  onSwitchToPlan: () => void;
  onSaveActual?: (month: number, value: number) => void;
}

export const TrackingTab = forwardRef<HTMLDivElement, TrackingTabProps>(function TrackingTab({
  hasSavedPlan,
  monthlyData,
  actualValues,
  formatValue,
  onSwitchToPlan,
  onSaveActual,
}, ref) {
  const currentMonth = new Date().getMonth();

  const trackingData = useMemo(() => {
    return monthlyData.map((m, idx) => {
      const planned = m.value;
      const actual = actualValues[idx] || 0;
      const variance = actual - planned;
      const variancePercent = planned > 0 ? (variance / planned) * 100 : 0;
      const isPast = idx < currentMonth;
      const isCurrent = idx === currentMonth;

      return {
        month: m.month,
        monthIndex: idx + 1,
        planned,
        actual,
        variance,
        variancePercent,
        isPast,
        isCurrent,
        status: isPast ? (variancePercent >= -5 ? 'on-track' : 'behind') : isCurrent ? 'current' : 'future',
        cumulativePlanned: monthlyData.slice(0, idx + 1).reduce((sum, d) => sum + d.value, 0),
        cumulativeActual: actualValues.slice(0, idx + 1).reduce((sum, v) => sum + (v || 0), 0),
        percentOfTotal: m.percentOfTotal,
      };
    });
  }, [monthlyData, actualValues, currentMonth]);

  const ytdPlanned = trackingData.slice(0, currentMonth + 1).reduce((sum, d) => sum + d.planned, 0);
  const ytdActual = trackingData.slice(0, currentMonth + 1).reduce((sum, d) => sum + d.actual, 0);
  const ytdVariance = ytdActual - ytdPlanned;
  const ytdVariancePercent = ytdPlanned > 0 ? (ytdVariance / ytdPlanned) * 100 : 0;

  if (!hasSavedPlan) {
    return (
      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold">Chưa có kế hoạch để theo dõi</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Vui lòng lưu "Lập kế hoạch" trước để xem so sánh kế hoạch vs thực tế.
            </p>
            <div className="mt-3">
              <Button size="sm" onClick={onSwitchToPlan}>
                Đi tới Lập kế hoạch
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div ref={ref}>
      {/* YTD Summary */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <Card className="p-3 bg-primary/10 border-primary/20">
          <p className="text-xs text-muted-foreground">KH lũy kế (YTD)</p>
          <p className="font-semibold text-primary">{formatValue(ytdPlanned)}</p>
        </Card>
        <Card className="p-3 bg-success/10 border-success/20">
          <p className="text-xs text-muted-foreground">Thực tế lũy kế</p>
          <p className="font-semibold text-success">{formatValue(ytdActual)}</p>
        </Card>
        <Card
          className={cn(
            'p-3',
            ytdVariance >= 0
              ? 'bg-success/10 border-success/20'
              : 'bg-destructive/10 border-destructive/20'
          )}
        >
          <p className="text-xs text-muted-foreground">Chênh lệch</p>
          <p
            className={cn('font-semibold', ytdVariance >= 0 ? 'text-success' : 'text-destructive')}
          >
            {ytdVariance >= 0 ? '+' : ''}
            {formatValue(ytdVariance)}
          </p>
        </Card>
        <Card
          className={cn(
            'p-3',
            ytdVariancePercent >= -5
              ? 'bg-success/10 border-success/20'
              : 'bg-destructive/10 border-destructive/20'
          )}
        >
          <p className="text-xs text-muted-foreground">% Hoàn thành</p>
          <p
            className={cn(
              'font-semibold flex items-center gap-1',
              ytdVariancePercent >= -5 ? 'text-success' : 'text-destructive'
            )}
          >
            {ytdVariancePercent >= -5 ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {ytdPlanned > 0 ? ((ytdActual / ytdPlanned) * 100).toFixed(1) : 0}%
          </p>
        </Card>
      </div>

      {/* Tracking Chart */}
      <div className="h-56 mb-4">
        <TrackingChart data={trackingData} formatValue={formatValue} />
      </div>

      {/* Monthly Tracking Table */}
      <TrackingTable
        trackingData={trackingData}
        formatValue={formatValue}
        onSaveActual={onSaveActual}
      />
    </div>
  );
});

TrackingTab.displayName = 'TrackingTab';
