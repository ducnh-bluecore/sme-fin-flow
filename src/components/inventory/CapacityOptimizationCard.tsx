import { AlertTriangle, ArrowDown, ArrowUp, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  if (nearFull.length === 0 && hasSpace.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Warehouse className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Tối ưu sức chứa</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {nearFull.length > 0 && (
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
        )}

        {hasSpace.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <ArrowDown className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                {hasSpace.length} store có thể nhận thêm
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasSpace.slice(0, 3).map(s => s.store_name).join(', ')}
                {hasSpace.length > 3 && ` +${hasSpace.length - 3}`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
