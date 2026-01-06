import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MonthlyData {
  month: string;
  value: number;
  locked: boolean;
  percentOfTotal: number;
}

interface QuarterlySummaryProps {
  monthlyData: MonthlyData[];
  totalPlanned: number;
  targetTotal: number;
  formatValue: (value: number) => string;
}

export const QuarterlySummary = memo(function QuarterlySummary({
  monthlyData,
  totalPlanned,
  targetTotal,
  formatValue,
}: QuarterlySummaryProps) {
  return (
    <div className="border-t border-border p-4">
      <h4 className="text-sm font-semibold mb-3">Tổng hợp theo quý</h4>
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((q) => {
          const startIdx = q * 3;
          const endIdx = startIdx + 3;
          const qData = monthlyData.slice(startIdx, endIdx);
          const qTotal = qData.reduce((sum, m) => sum + (m.value || 0), 0);
          const qPercent = totalPlanned > 0 ? (qTotal / totalPlanned) * 100 : 25;
          const qTarget = targetTotal / 4;

          return (
            <Card
              key={q}
              className={cn(
                'p-3',
                qTotal >= qTarget ? 'bg-success/5 border-success/20' : 'bg-muted/30'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Quý {q + 1}</span>
                <Badge variant="outline" className="text-xs">
                  {isNaN(qPercent) ? '25.0' : qPercent.toFixed(1)}%
                </Badge>
              </div>
              <p
                className={cn(
                  'font-semibold',
                  qTotal >= qTarget ? 'text-success' : 'text-foreground'
                )}
              >
                {formatValue(qTotal)}
              </p>
              <p className="text-xs text-muted-foreground">Mục tiêu: {formatValue(qTarget)}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
});
