import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';
import { useInventoryPositions } from '@/hooks/inventory/useInventoryPositions';
import { useInventoryDemand } from '@/hooks/inventory/useInventoryDemand';

interface Props {
  suggestions: RebalanceSuggestion[];
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

interface SimMetric {
  label: string;
  baseline: number;
  simulated: number;
  format: 'currency' | 'percent' | 'weeks';
  higherIsBetter: boolean;
}

export function RebalanceSimulationTab({ suggestions }: Props) {
  const uniqueFCs = useMemo(() => {
    const map = new Map<string, string>();
    suggestions.forEach(s => map.set(s.fc_id, s.fc_name || s.fc_id));
    return Array.from(map.entries());
  }, [suggestions]);

  const [selectedFC, setSelectedFC] = useState<string>('');
  const [transferQty, setTransferQty] = useState<number>(200);

  const { data: positions = [] } = useInventoryPositions(selectedFC || undefined);
  const { data: demand = [] } = useInventoryDemand(selectedFC || undefined);

  const fcSuggestions = suggestions.filter(s => s.fc_id === selectedFC);
  const defaultQty = fcSuggestions.reduce((s, r) => s + r.qty, 0);

  // Compute simulation metrics
  const metrics: SimMetric[] = useMemo(() => {
    if (!selectedFC || fcSuggestions.length === 0) return [];

    const totalRevenue = fcSuggestions.reduce((s, r) => s + (r.potential_revenue_gain || 0), 0);
    const avgToWeeksCover = fcSuggestions.reduce((s, r) => s + (r.to_weeks_cover || 0), 0) / fcSuggestions.length;
    const avgBalancedCover = fcSuggestions.reduce((s, r) => s + (r.balanced_weeks_cover || 0), 0) / fcSuggestions.length;
    const stockoutStores = fcSuggestions.filter(r => (r.to_weeks_cover || 0) < 0.5).length;
    const totalStores = fcSuggestions.length;

    // Scale simulation by transfer ratio
    const ratio = defaultQty > 0 ? transferQty / defaultQty : 1;
    const simRevenue = totalRevenue * ratio;
    const simCover = avgToWeeksCover + (avgBalancedCover - avgToWeeksCover) * ratio;
    const simStockoutRisk = Math.max(0, (stockoutStores / Math.max(totalStores, 1)) * 100 * (1 - ratio * 0.8));
    const baseStockoutRisk = (stockoutStores / Math.max(totalStores, 1)) * 100;

    // Overstock risk increases with more transfer
    const baseOverstock = 5;
    const simOverstock = baseOverstock + ratio * 10;

    return [
      { label: 'Revenue dự kiến', baseline: 0, simulated: simRevenue, format: 'currency', higherIsBetter: true },
      { label: 'Stockout risk', baseline: baseStockoutRisk, simulated: simStockoutRisk, format: 'percent', higherIsBetter: false },
      { label: 'Overstock risk', baseline: baseOverstock, simulated: simOverstock, format: 'percent', higherIsBetter: false },
      { label: 'Weeks of cover', baseline: avgToWeeksCover, simulated: simCover, format: 'weeks', higherIsBetter: true },
    ];
  }, [selectedFC, fcSuggestions, transferQty, defaultQty]);

  const formatValue = (val: number, fmt: string) => {
    if (fmt === 'currency') return `${formatCurrency(val)}đ`;
    if (fmt === 'percent') return `${val.toFixed(1)}%`;
    if (fmt === 'weeks') return `${val.toFixed(1)}w`;
    return val.toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mô phỏng What-If</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Chọn Family Code</Label>
              <Select value={selectedFC} onValueChange={setSelectedFC}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn sản phẩm..." />
                </SelectTrigger>
                <SelectContent>
                  {uniqueFCs.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Số units chuyển</Label>
              <Input
                type="number"
                value={transferQty}
                onChange={(e) => setTransferQty(Number(e.target.value) || 0)}
                min={0}
              />
              {defaultQty > 0 && (
                <p className="text-xs text-muted-foreground">Đề xuất gốc: {defaultQty} units</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison */}
      {selectedFC && metrics.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-3 text-center border-b border-border">
              <div className="p-4 font-semibold text-sm">Metric</div>
              <div className="p-4 font-semibold text-sm bg-muted/30">Giữ nguyên</div>
              <div className="p-4 font-semibold text-sm bg-primary/5">Chuyển {transferQty} units</div>
            </div>
            {metrics.map((m, idx) => {
              const diff = m.simulated - m.baseline;
              const isPositive = m.higherIsBetter ? diff > 0 : diff < 0;
              const isNegative = m.higherIsBetter ? diff < 0 : diff > 0;
              const pctChange = m.baseline !== 0 ? ((diff / Math.abs(m.baseline)) * 100) : (m.simulated > 0 ? 100 : 0);

              return (
                <div key={idx} className="grid grid-cols-3 text-center border-b border-border/50 last:border-0">
                  <div className="p-4 text-sm font-medium text-left pl-6">{m.label}</div>
                  <div className="p-4 text-sm bg-muted/30">{formatValue(m.baseline, m.format)}</div>
                  <div className={cn(
                    "p-4 text-sm font-semibold flex items-center justify-center gap-2",
                    isPositive && "text-emerald-400",
                    isNegative && "text-red-400",
                  )}>
                    <span>{formatValue(m.simulated, m.format)}</span>
                    {diff !== 0 && (
                      <Badge variant="outline" className={cn(
                        "text-[10px]",
                        isPositive && "border-emerald-500/30 text-emerald-400",
                        isNegative && "border-red-500/30 text-red-400",
                      )}>
                        {pctChange > 0 ? '+' : ''}{pctChange.toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {!selectedFC && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Chọn một Family Code để chạy mô phỏng</p>
        </div>
      )}
    </div>
  );
}
