import { forwardRef, useMemo } from 'react';
import { RotateCcw, BarChart3, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlanChart } from './charts/SafeChart';
import { MonthlyPlanSliders } from './MonthlyPlanSliders';
import { QuarterlySummary } from './QuarterlySummary';

interface MonthlyData {
  month: string;
  value: number;
  locked: boolean;
  percentOfTotal: number;
}

interface PlanTabProps {
  monthlyData: MonthlyData[];
  currentTotal: number;
  targetTotal: number;
  actualValues: number[];
  formatValue: (value: number) => string;
  onValueChange: (index: number, newValue: number) => void;
  onToggleLock: (index: number) => void;
  onResetToEven: () => void;
  onApplySeasonalPattern: () => void;
  onSave?: (monthlyValues: number[]) => void;
  isLoading?: boolean;
}

export const PlanTab = forwardRef<HTMLDivElement, PlanTabProps>(function PlanTab({
  monthlyData,
  currentTotal,
  targetTotal,
  actualValues,
  formatValue,
  onValueChange,
  onToggleLock,
  onResetToEven,
  onApplySeasonalPattern,
  onSave,
  isLoading,
}, ref) {
  const currentMonthlyAvg = currentTotal / 12;
  const totalPlanned = useMemo(
    () => monthlyData.reduce((sum, m) => sum + m.value, 0),
    [monthlyData]
  );

  const chartData = useMemo(() => {
    return monthlyData.map((m, idx) => ({
      month: m.month,
      planned: m.value,
      actual: actualValues[idx] || 0,
      current: currentMonthlyAvg,
      percentOfTotal: m.percentOfTotal,
      locked: m.locked,
      variance: m.value - currentMonthlyAvg,
      cumulativePlanned: monthlyData.slice(0, idx + 1).reduce((sum, d) => sum + d.value, 0),
      cumulativeActual: actualValues.slice(0, idx + 1).reduce((sum, v) => sum + (v || 0), 0),
    }));
  }, [monthlyData, currentMonthlyAvg, actualValues]);

  return (
    <div ref={ref}>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <Card className="p-3 bg-muted/30">
          <p className="text-xs text-muted-foreground">Hiện tại (năm)</p>
          <p className="font-semibold">{formatValue(currentTotal)}</p>
        </Card>
        <Card className="p-3 bg-primary/10 border-primary/20">
          <p className="text-xs text-muted-foreground">Mục tiêu (năm)</p>
          <p className="font-semibold text-primary">{formatValue(targetTotal)}</p>
        </Card>
        <Card className="p-3 bg-info/10 border-info/20">
          <p className="text-xs text-muted-foreground">TB/tháng hiện tại</p>
          <p className="font-semibold text-info">{formatValue(currentMonthlyAvg)}</p>
        </Card>
        <Card className="p-3 bg-success/10 border-success/20">
          <p className="text-xs text-muted-foreground">TB/tháng kế hoạch</p>
          <p className="font-semibold text-success">{formatValue(targetTotal / 12)}</p>
        </Card>
      </div>

      {/* Chart */}
      <div className="h-48 mb-4">
        <PlanChart data={chartData} currentMonthlyAvg={currentMonthlyAvg} formatValue={formatValue} />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-3">
        <Button variant="outline" size="sm" onClick={onResetToEven}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Chia đều
        </Button>
        <Button variant="outline" size="sm" onClick={onApplySeasonalPattern}>
          <BarChart3 className="w-3 h-3 mr-1" />
          Mùa vụ
        </Button>
        <div className="flex-1" />
        {onSave && (
          <Button
            size="sm"
            onClick={() => onSave(monthlyData.map((m) => m.value))}
            disabled={isLoading}
          >
            <Save className="w-3 h-3 mr-1" />
            {isLoading ? 'Đang lưu...' : 'Lưu kế hoạch'}
          </Button>
        )}
      </div>

      {/* Monthly Sliders */}
      <MonthlyPlanSliders
        monthlyData={monthlyData}
        targetTotal={targetTotal}
        onValueChange={onValueChange}
        onToggleLock={onToggleLock}
      />

      {/* Quarterly Summary */}
      <QuarterlySummary
        monthlyData={monthlyData}
        totalPlanned={totalPlanned}
        targetTotal={targetTotal}
        formatValue={formatValue}
      />
    </div>
  );
});

PlanTab.displayName = 'PlanTab';
