import { Package, AlertTriangle, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';

interface StoreCapacityData {
  store_name: string;
  total_on_hand: number;
  capacity: number;
}

interface Props {
  suggestions: RebalanceSuggestion[];
  storeCapacityData?: StoreCapacityData[];
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

export function InventoryHeroHeader({ suggestions, storeCapacityData = [] }: Props) {
  // Urgency warnings disabled — data not accurate yet
  const p1Suggestions: RebalanceSuggestion[] = [];
  const totalRevenueAtRisk = 0;
  const uniqueStores = 0;
  const uniqueFCs = 0;
  const hasUrgency = false;

  // Capacity warning disabled — data not reliable yet
  const nearFullStores: typeof storeCapacityData = [];
  const hasCapacityWarning = false;

  return (
    <div className={cn(
      "relative rounded-xl overflow-hidden p-6",
      hasUrgency
        ? "bg-gradient-to-r from-red-500/15 via-orange-500/10 to-transparent border border-red-500/20"
        : "bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent border border-emerald-500/20"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-3 rounded-xl shrink-0",
          hasUrgency ? "bg-red-500/15" : "bg-emerald-500/15"
        )}>
          <Package className={cn("h-8 w-8", hasUrgency ? "text-red-400" : "text-emerald-400")} />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Inventory Allocation Engine</h1>
          {hasUrgency ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <p className="text-sm text-red-400 font-medium">
                {uniqueStores} store thiếu hàng ở {uniqueFCs} family codes
                {totalRevenueAtRisk > 0 && `, ước tính mất ${formatCurrency(totalRevenueAtRisk)}đ`} — cần xử lý trong 48h
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <p className="text-sm text-emerald-400">
                Tất cả stores đều đủ hàng. Không cần hành động.
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 text-right space-y-1">
          {hasUrgency && (
            <div>
              <div className="flex items-center gap-1.5 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">{uniqueStores} store / {p1Suggestions.length} đề xuất P1</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">cần xử lý gấp</p>
            </div>
          )}
          {hasCapacityWarning && (
            <div className="flex items-center gap-1.5 text-amber-400">
              <Warehouse className="h-4 w-4" />
              <span className="text-sm font-semibold">{nearFullStores.length} store gần đầy</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
