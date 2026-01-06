import { memo, useCallback } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MonthlyData {
  month: string;
  value: number;
  locked: boolean;
  percentOfTotal: number;
}

interface MonthlyPlanSlidersProps {
  monthlyData: MonthlyData[];
  targetTotal: number;
  onValueChange: (index: number, newValue: number) => void;
  onToggleLock: (index: number) => void;
}

export const MonthlyPlanSliders = memo(function MonthlyPlanSliders({
  monthlyData,
  targetTotal,
  onValueChange,
  onToggleLock,
}: MonthlyPlanSlidersProps) {
  const handleSliderChange = useCallback(
    (index: number, percent: number[]) => {
      const newValue = (percent[0] / 100) * targetTotal;
      onValueChange(index, newValue);
    },
    [targetTotal, onValueChange]
  );

  return (
    <div className="border-t border-border">
      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2 mb-2">
          <div className="col-span-1">Tháng</div>
          <div className="col-span-2 text-right">Giá trị</div>
          <div className="col-span-7 text-center">Điều chỉnh (kéo để thay đổi)</div>
          <div className="col-span-1 text-center">%</div>
          <div className="col-span-1 text-center">Khóa</div>
        </div>

        <TooltipProvider>
          {monthlyData.map((month, idx) => (
            <div
              key={month.month}
              className={cn(
                'grid grid-cols-12 gap-2 items-center px-2 py-2 rounded-lg transition-colors',
                month.locked ? 'bg-muted/50' : 'hover:bg-muted/30'
              )}
            >
              <div className="col-span-1 font-medium">{month.month}</div>
              <div className="col-span-2 text-right">
                <Input
                  type="number"
                  value={(month.value / 1000000).toFixed(0)}
                  onChange={(e) => {
                    const newValue = parseFloat(e.target.value) * 1000000;
                    if (!isNaN(newValue)) onValueChange(idx, newValue);
                  }}
                  disabled={month.locked}
                  className="h-8 text-right"
                />
              </div>
              <div className="col-span-7">
                <Slider
                  value={[Math.round((month.value / targetTotal) * 100)]}
                  onValueChange={(val) => handleSliderChange(idx, val)}
                  disabled={month.locked}
                  max={100}
                  step={1}
                />
              </div>
              <div className="col-span-1 text-center text-sm font-medium">
                {month.percentOfTotal.toFixed(1)}
              </div>
              <div className="col-span-1 flex justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onToggleLock(idx)}
                    >
                      {month.locked ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Unlock className="w-3 h-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {month.locked ? 'Mở khóa để chỉnh sửa' : 'Khóa giá trị này'}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
});
