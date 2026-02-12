import { AlertTriangle, ArrowDown, ArrowUp, Warehouse, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StoreCapacityInfo {
  id: string;
  store_name: string;
  tier: string;
  total_on_hand: number;
  capacity: number;
  utilization: number;
}

interface Props {
  stores: StoreCapacityInfo[];
}

export function CapacityOptimizationCard({ stores }: Props) {
  const nearFull = stores.filter(s => s.capacity > 0 && s.utilization > 0.85);
  const hasSpace = stores.filter(s => s.capacity > 0 && s.utilization < 0.7);

  // Only show this card if there are overloaded stores
  if (nearFull.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Warehouse className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Tối ưu sức chứa</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Sức chứa kho (capacity) là tổng không gian lưu trữ, không phải thiếu SKU cụ thể. Store "gần đầy" cần giảm tải hàng tồn, store "còn chỗ" có thể nhận thêm hàng.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <ArrowUp className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">
              {nearFull.length} store cần giảm tải
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {nearFull.slice(0, 3).map(s => s.store_name).join(', ')}
              {nearFull.length > 3 && ` +${nearFull.length - 3}`}
            </p>
          </div>
        </div>

        {hasSpace.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <ArrowDown className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                {hasSpace.length} store có thể nhận thêm
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Có thể chuyển hàng từ store quá tải sang đây
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
