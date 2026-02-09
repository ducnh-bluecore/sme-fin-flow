import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Warehouse, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';
import { useInventoryPositions } from '@/hooks/inventory/useInventoryPositions';
import { useInventoryDemand } from '@/hooks/inventory/useInventoryDemand';
import { useInventoryStores } from '@/hooks/inventory/useInventoryStores';

interface Props {
  suggestions: RebalanceSuggestion[];
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

export function RebalanceSimulationTab({ suggestions }: Props) {
  const { data: stores = [] } = useInventoryStores();

  const uniqueFCs = useMemo(() => {
    const map = new Map<string, string>();
    suggestions.forEach(s => map.set(s.fc_id, s.fc_name || s.fc_id));
    return Array.from(map.entries());
  }, [suggestions]);

  const [selectedFC, setSelectedFC] = useState('');
  const [fromStoreId, setFromStoreId] = useState('');
  const [toStoreId, setToStoreId] = useState('');
  const [transferQty, setTransferQty] = useState(200);

  const { data: positions = [] } = useInventoryPositions(selectedFC || undefined);
  const { data: demand = [] } = useInventoryDemand(selectedFC || undefined);

  // Find position & demand for from/to stores
  const fromPosition = positions.find(p => p.store_id === fromStoreId);
  const toPosition = positions.find(p => p.store_id === toStoreId);
  const fromDemand = demand.find(d => d.store_id === fromStoreId);
  const toDemand = demand.find(d => d.store_id === toStoreId);

  const fromStoreName = stores.find(s => s.id === fromStoreId)?.store_name || 'Kho nguồn';
  const toStoreName = stores.find(s => s.id === toStoreId)?.store_name || 'Kho đích';

  // Compute simulation
  const simulation = useMemo(() => {
    if (!selectedFC || !fromStoreId || !toStoreId || !fromPosition || !toPosition) return null;

    const fromOnHand = fromPosition.on_hand || 0;
    const toOnHand = toPosition.on_hand || 0;
    const fromVelocity = fromDemand?.sales_velocity || 1;
    const toVelocity = toDemand?.sales_velocity || 1;

    const fromCoverBefore = fromOnHand / (fromVelocity * 7);
    const toCoverBefore = toOnHand / (toVelocity * 7);
    const fromCoverAfter = (fromOnHand - transferQty) / (fromVelocity * 7);
    const toCoverAfter = (toOnHand + transferQty) / (toVelocity * 7);

    const fromStockoutRiskBefore = fromCoverBefore < 1 ? 'Cao' : fromCoverBefore < 2 ? 'Trung bình' : 'Thấp';
    const fromStockoutRiskAfter = fromCoverAfter < 1 ? 'Cao' : fromCoverAfter < 2 ? 'Trung bình' : 'Thấp';
    const toStockoutRiskBefore = toCoverBefore < 1 ? 'Cao' : toCoverBefore < 2 ? 'Trung bình' : 'Thấp';
    const toStockoutRiskAfter = toCoverAfter < 1 ? 'Cao' : toCoverAfter < 2 ? 'Trung bình' : 'Thấp';

    // Revenue impact estimate (simplified)
    const avgPrice = suggestions.find(s => s.fc_id === selectedFC)?.potential_revenue_gain || 0;
    const revenueGainAtDest = toCoverBefore < 2 ? transferQty * (avgPrice / Math.max(1, suggestions.filter(s => s.fc_id === selectedFC).reduce((s, r) => s + r.qty, 0))) : 0;

    return {
      from: {
        onHandBefore: fromOnHand,
        onHandAfter: Math.max(0, fromOnHand - transferQty),
        coverBefore: fromCoverBefore,
        coverAfter: fromCoverAfter,
        velocity: fromVelocity,
        riskBefore: fromStockoutRiskBefore,
        riskAfter: fromStockoutRiskAfter,
      },
      to: {
        onHandBefore: toOnHand,
        onHandAfter: toOnHand + transferQty,
        coverBefore: toCoverBefore,
        coverAfter: toCoverAfter,
        velocity: toVelocity,
        riskBefore: toStockoutRiskBefore,
        riskAfter: toStockoutRiskAfter,
      },
      revenueGain: revenueGainAtDest,
      isViable: fromCoverAfter >= 1, // source still safe
    };
  }, [selectedFC, fromStoreId, toStoreId, transferQty, fromPosition, toPosition, fromDemand, toDemand, suggestions]);

  const riskColor = (risk: string) => {
    if (risk === 'Cao') return 'text-red-400';
    if (risk === 'Trung bình') return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mô phỏng What-If</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Chọn Family Code</Label>
              <Select value={selectedFC} onValueChange={(v) => { setSelectedFC(v); setFromStoreId(''); setToStoreId(''); }}>
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
              <Label className="text-xs flex items-center gap-1"><Warehouse className="h-3 w-3" /> Kho nguồn (Từ)</Label>
              <Select value={fromStoreId} onValueChange={setFromStoreId} disabled={!selectedFC}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn kho nguồn..." />
                </SelectTrigger>
                <SelectContent>
                  {stores.filter(s => s.id !== toStoreId).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.store_name} ({s.store_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1"><Store className="h-3 w-3" /> Kho đích (Đến)</Label>
              <Select value={toStoreId} onValueChange={setToStoreId} disabled={!selectedFC}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn kho đích..." />
                </SelectTrigger>
                <SelectContent>
                  {stores.filter(s => s.id !== fromStoreId).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.store_name} ({s.store_type})
                    </SelectItem>
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-way Comparison */}
      {simulation && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* From Store */}
          <Card className={cn(!simulation.isViable && 'border-red-500/50')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                {fromStoreName}
                <Badge variant="outline" className="text-[10px]">Nguồn</Badge>
                {!simulation.isViable && <Badge variant="destructive" className="text-[10px]">⚠ Dưới ngưỡng an toàn</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SimRow label="Tồn kho" before={`${simulation.from.onHandBefore} units`} after={`${simulation.from.onHandAfter} units`} isNegative={simulation.from.onHandAfter < simulation.from.onHandBefore} />
              <SimRow label="Weeks of cover" before={`${simulation.from.coverBefore.toFixed(1)}w`} after={`${simulation.from.coverAfter.toFixed(1)}w`} isNegative={simulation.from.coverAfter < simulation.from.coverBefore} />
              <SimRow label="Tốc độ bán" before={`${simulation.from.velocity.toFixed(1)}/ngày`} after={`${simulation.from.velocity.toFixed(1)}/ngày`} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Stockout risk</span>
                <div className="flex items-center gap-2">
                  <span className={riskColor(simulation.from.riskBefore)}>{simulation.from.riskBefore}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className={cn('font-medium', riskColor(simulation.from.riskAfter))}>{simulation.from.riskAfter}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* To Store */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                {toStoreName}
                <Badge variant="outline" className="text-[10px]">Đích</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SimRow label="Tồn kho" before={`${simulation.to.onHandBefore} units`} after={`${simulation.to.onHandAfter} units`} isPositive={simulation.to.onHandAfter > simulation.to.onHandBefore} />
              <SimRow label="Weeks of cover" before={`${simulation.to.coverBefore.toFixed(1)}w`} after={`${simulation.to.coverAfter.toFixed(1)}w`} isPositive={simulation.to.coverAfter > simulation.to.coverBefore} />
              <SimRow label="Tốc độ bán" before={`${simulation.to.velocity.toFixed(1)}/ngày`} after={`${simulation.to.velocity.toFixed(1)}/ngày`} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Stockout risk</span>
                <div className="flex items-center gap-2">
                  <span className={riskColor(simulation.to.riskBefore)}>{simulation.to.riskBefore}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className={cn('font-medium', riskColor(simulation.to.riskAfter))}>{simulation.to.riskAfter}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Summary */}
      {simulation && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Revenue dự kiến từ kịch bản</span>
              <span className={cn('text-lg font-bold', simulation.revenueGain > 0 ? 'text-emerald-400' : 'text-muted-foreground')}>
                {simulation.revenueGain > 0 ? `+${formatCurrency(simulation.revenueGain)}đ` : 'Không có thêm revenue'}
              </span>
            </div>
            {!simulation.isViable && (
              <p className="text-xs text-red-400 mt-2">
                ⚠ Cảnh báo: Kho nguồn sẽ còn dưới 1 tuần cover sau khi chuyển. Cân nhắc giảm số lượng.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedFC && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Chọn Family Code, kho nguồn và kho đích để chạy mô phỏng</p>
        </div>
      )}

      {selectedFC && (!fromStoreId || !toStoreId) && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Chọn kho nguồn và kho đích để xem kết quả mô phỏng</p>
        </div>
      )}

      {selectedFC && fromStoreId && toStoreId && !simulation && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Không có dữ liệu tồn kho cho kho được chọn với FC này</p>
        </div>
      )}
    </div>
  );
}

function SimRow({ label, before, after, isPositive, isNegative }: {
  label: string; before: string; after: string; isPositive?: boolean; isNegative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span>{before}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className={cn(
          'font-medium',
          isPositive && 'text-emerald-400',
          isNegative && 'text-red-400',
        )}>{after}</span>
      </div>
    </div>
  );
}
