import { Brain, Calculator } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type ForecastMethod = 'ai' | 'simple';

interface ForecastMethodToggleProps {
  value: ForecastMethod;
  onChange: (value: ForecastMethod) => void;
}

export function ForecastMethodToggle({ value, onChange }: ForecastMethodToggleProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Phương pháp:</span>
        <ToggleGroup 
          type="single" 
          value={value} 
          onValueChange={(v) => v && onChange(v as ForecastMethod)}
          className="bg-muted/50 p-0.5 rounded-lg"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem 
                value="ai" 
                aria-label="AI/Xác suất"
                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 py-1.5 text-xs gap-1.5"
              >
                <Brain className="w-3.5 h-3.5" />
                AI/Xác suất
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-semibold mb-1">Phương pháp AI/Xác suất</p>
              <ul className="text-xs space-y-1">
                <li>• Thu hồi AR theo xác suất (85% chưa hạn → 10% quá 90 ngày)</li>
                <li>• Confidence bands tăng 1.2%/ngày (tối đa 60%)</li>
                <li>• Dự báo tăng trưởng doanh số 2%/tuần</li>
              </ul>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem 
                value="simple" 
                aria-label="Đơn giản"
                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 py-1.5 text-xs gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5" />
                Đơn giản
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-semibold mb-1">Phương pháp Đơn giản</p>
              <ul className="text-xs space-y-1">
                <li>• Thu hồi AR cố định 15%/tuần (~2.14%/ngày)</li>
                <li>• Không có confidence bands</li>
                <li>• Doanh số không tăng trưởng</li>
                <li>• Dễ kiểm tra, dễ hiểu</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </ToggleGroup>
      </div>
    </TooltipProvider>
  );
}
