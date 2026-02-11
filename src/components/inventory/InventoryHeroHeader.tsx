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
  const p1Suggestions = suggestions.filter(s => s.priority === 'P1' && s.status === 'pending');
  const totalRevenueAtRisk = p1Suggestions.reduce((sum, s) => sum + (s.potential_revenue_gain || 0), 0);
  const uniqueStores = new Set(p1Suggestions.map(s => s.to_location)).size;
  const hasUrgency = p1Suggestions.length > 0;

  const nearFullStores = storeCapacityData.filter(s => s.capacity > 0 && s.total_on_hand / s.capacity > 0.85);
  const hasCapacityWarning = nearFullStores.length > 0;

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
                {uniqueStores} stores đang thiếu hàng, ước tính mất {formatCurrency(totalRevenueAtRisk)}đ nếu không xử lý trong 48h
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
                <span className="text-sm font-semibold">{p1Suggestions.length} P1</span>
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
