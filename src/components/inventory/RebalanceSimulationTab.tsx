import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Warehouse, Store, AlertTriangle, CheckCircle2, XCircle, Zap, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';
import { useInventoryPositions } from '@/hooks/inventory/useInventoryPositions';
import { useInventoryDemand } from '@/hooks/inventory/useInventoryDemand';
import { useInventoryStores } from '@/hooks/inventory/useInventoryStores';
import { useConstraintRegistry } from '@/hooks/inventory/useConstraintRegistry';

interface Props {
  suggestions: RebalanceSuggestion[];
}

type Verdict = 'recommended' | 'caution' | 'not_recommended';

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

function getConstraintValue(constraints: any[], key: string, valueKey: string, fallback: number): number {
  const c = constraints.find((x: any) => x.constraint_key === key);
  if (!c) return fallback;
  return Number(c.constraint_value?.[valueKey]) || fallback;
}

function getConstraintBool(constraints: any[], key: string, valueKey: string, fallback: boolean): boolean {
  const c = constraints.find((x: any) => x.constraint_key === key);
  if (!c) return fallback;
  return c.constraint_value?.[valueKey] === true;
}

export function RebalanceSimulationTab({ suggestions }: Props) {
  const { data: stores = [] } = useInventoryStores();
  const { data: constraints = [] } = useConstraintRegistry();

  // Extract constraint values
  const minCoverWeeks = getConstraintValue(constraints, 'min_cover_weeks', 'weeks', 2);
  const maxCoverWeeks = getConstraintValue(constraints, 'max_cover_weeks', 'weeks', 6);
  const seasonalFactor = getConstraintValue(constraints, 'seasonal_safety_factor', 'factor', 1.0);
  const minNetBenefit = getConstraintValue(constraints, 'min_lateral_net_benefit', 'amount', 500000);

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

  const fromPosition = positions.find(p => p.store_id === fromStoreId);
  const toPosition = positions.find(p => p.store_id === toStoreId);
  const fromDemand = demand.find(d => d.store_id === fromStoreId);
  const toDemand = demand.find(d => d.store_id === toStoreId);

  const fromStoreName = stores.find(s => s.id === fromStoreId)?.store_name || 'Kho nguồn';
  const toStoreName = stores.find(s => s.id === toStoreId)?.store_name || 'Kho đích';

  // Available to transfer (respecting safety stock & seasonal factor)
  const availableToTransfer = useMemo(() => {
    if (!fromPosition) return 0;
    const safetyAdjusted = (fromPosition.safety_stock || 0) * seasonalFactor;
    return Math.max(0, (fromPosition.on_hand || 0) - (fromPosition.reserved || 0) - safetyAdjusted);
  }, [fromPosition, seasonalFactor]);

  const isFeasible = transferQty <= (fromPosition?.on_hand || 0);

  // Simulation computation
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

    const riskLevel = (cover: number) => {
      if (cover < 1) return 'Cao';
      if (cover < minCoverWeeks) return 'Trung bình';
      return 'Thấp';
    };

    // Revenue: only count units that actually fill a shortage at dest
    const shortageAtDest = Math.max(0, minCoverWeeks * toVelocity * 7 - toOnHand);
    const effectiveUnits = Math.min(transferQty, shortageAtDest);
    const fcSuggestions = suggestions.filter(s => s.fc_id === selectedFC);
    const totalSuggestedQty = fcSuggestions.reduce((s, r) => s + r.qty, 0);
    const totalSuggestedRevenue = fcSuggestions.reduce((s, r) => s + r.potential_revenue_gain, 0);
    const avgRevenuePerUnit = totalSuggestedQty > 0 ? totalSuggestedRevenue / totalSuggestedQty : 0;
    const revenueGain = effectiveUnits * avgRevenuePerUnit;

    // Overstock cost at destination
    const overstockWeeks = Math.max(0, toCoverAfter - maxCoverWeeks);
    const overstockCost = overstockWeeks * toVelocity * 7 * avgRevenuePerUnit * 0.3; // ~30% cost ratio

    return {
      from: {
        onHandBefore: fromOnHand,
        onHandAfter: fromOnHand - transferQty,
        coverBefore: fromCoverBefore,
        coverAfter: fromCoverAfter,
        velocity: fromVelocity,
        riskBefore: riskLevel(fromCoverBefore),
        riskAfter: riskLevel(fromCoverAfter),
        safetyStock: fromPosition.safety_stock || 0,
      },
      to: {
        onHandBefore: toOnHand,
        onHandAfter: toOnHand + transferQty,
        coverBefore: toCoverBefore,
        coverAfter: toCoverAfter,
        velocity: toVelocity,
        riskBefore: riskLevel(toCoverBefore),
        riskAfter: riskLevel(toCoverAfter),
      },
      revenueGain,
      overstockCost,
      overstockWeeks,
      shortageAtDest,
      effectiveUnits,
    };
  }, [selectedFC, fromStoreId, toStoreId, transferQty, fromPosition, toPosition, fromDemand, toDemand, suggestions, minCoverWeeks, maxCoverWeeks]);

  // Optimal qty calculation (must be before verdict since verdict references it)
  const optimalQty = useMemo(() => {
    if (!fromPosition || !toPosition || !fromDemand || !toDemand) return 0;

    const fromOnHand = fromPosition.on_hand || 0;
    const toOnHand = toPosition.on_hand || 0;
    const fromVelocity = fromDemand?.sales_velocity || 1;
    const toVelocity = toDemand?.sales_velocity || 1;
    const safetyAdjusted = (fromPosition.safety_stock || 0) * seasonalFactor;

    const minSourceKeep = minCoverWeeks * seasonalFactor * fromVelocity * 7 + safetyAdjusted;
    const maxFromSource = Math.max(0, Math.floor(fromOnHand - minSourceKeep));
    const maxToDest = Math.max(0, Math.floor(maxCoverWeeks * toVelocity * 7 - toOnHand));

    return Math.min(maxFromSource, maxToDest);
  }, [fromPosition, toPosition, fromDemand, toDemand, minCoverWeeks, maxCoverWeeks, seasonalFactor]);

  // Verdict logic
  const verdict: { type: Verdict; title: string; reasons: string[]; suggestion?: string } | null = useMemo(() => {
    if (!simulation || !fromPosition) return null;

    const reasons: string[] = [];
    const fromOnHand = fromPosition.on_hand || 0;

    if (transferQty > fromOnHand) {
      reasons.push(`Kho nguồn chỉ có ${fromOnHand} units, không đủ ${transferQty} units yêu cầu (thiếu ${transferQty - fromOnHand})`);
    }
    if (simulation.from.coverAfter < minCoverWeeks) {
      reasons.push(`Kho nguồn sẽ còn ${simulation.from.coverAfter.toFixed(1)} tuần cover — dưới ngưỡng tối thiểu ${minCoverWeeks} tuần`);
    }
    if (simulation.to.coverAfter > maxCoverWeeks * 1.5) {
      reasons.push(`Kho đích sẽ có ${simulation.to.coverAfter.toFixed(1)} tuần cover — vượt xa ngưỡng ${maxCoverWeeks} tuần (overstock nghiêm trọng)`);
    }

    if (reasons.length > 0) {
      return {
        type: 'not_recommended' as Verdict,
        title: `KHÔNG NÊN chuyển ${transferQty} units`,
        reasons,
        suggestion: optimalQty > 0 ? `Nên chuyển tối đa ${optimalQty} units để giữ kho nguồn ≥ ${minCoverWeeks} tuần cover` : 'Không nên chuyển trong kịch bản này',
      };
    }

    const cautionReasons: string[] = [];
    if (simulation.from.coverAfter < minCoverWeeks * seasonalFactor) {
      cautionReasons.push(`Kho nguồn sẽ còn ${simulation.from.coverAfter.toFixed(1)} tuần — dưới ngưỡng mùa cao điểm (${(minCoverWeeks * seasonalFactor).toFixed(1)} tuần)`);
    }
    if (simulation.to.coverAfter > maxCoverWeeks) {
      cautionReasons.push(`Kho đích sẽ có ${simulation.to.coverAfter.toFixed(1)} tuần cover — vượt ngưỡng ${maxCoverWeeks} tuần`);
    }
    if (simulation.revenueGain < minNetBenefit && simulation.revenueGain > 0) {
      cautionReasons.push(`Revenue dự kiến ${formatCurrency(simulation.revenueGain)}đ — dưới ngưỡng lợi ích tối thiểu ${formatCurrency(minNetBenefit)}đ`);
    }

    if (cautionReasons.length > 0) {
      return {
        type: 'caution' as Verdict,
        title: `CẦN CÂN NHẮC khi chuyển ${transferQty} units`,
        reasons: cautionReasons,
        suggestion: optimalQty > 0 && optimalQty < transferQty ? `Đề xuất chuyển ${optimalQty} units thay vì ${transferQty}` : undefined,
      };
    }

    const recReasons: string[] = [];
    if (simulation.to.coverBefore < minCoverWeeks) {
      recReasons.push(`Kho đích đang thiếu hàng (${simulation.to.coverBefore.toFixed(1)} tuần cover)`);
    }
    if (simulation.revenueGain > 0) {
      recReasons.push(`Revenue dự kiến tăng +${formatCurrency(simulation.revenueGain)}đ`);
    }
    recReasons.push(`Kho nguồn vẫn an toàn: ${simulation.from.coverAfter.toFixed(1)} tuần cover`);

    return {
      type: 'recommended' as Verdict,
      title: `NÊN CHUYỂN ${transferQty} units`,
      reasons: recReasons,
    };
  }, [simulation, fromPosition, transferQty, minCoverWeeks, maxCoverWeeks, seasonalFactor, minNetBenefit, optimalQty]);

  const riskColor = (risk: string) => {
    if (risk === 'Cao') return 'text-destructive';
    if (risk === 'Trung bình') return 'text-amber-500';
    return 'text-emerald-500';
  };

  const verdictStyles: Record<Verdict, { bg: string; border: string; icon: React.ReactNode; textColor: string }> = {
    not_recommended: {
      bg: 'bg-destructive/10',
      border: 'border-destructive/40',
      icon: <XCircle className="h-6 w-6 text-destructive" />,
      textColor: 'text-destructive',
    },
    caution: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/40',
      icon: <AlertTriangle className="h-6 w-6 text-amber-500" />,
      textColor: 'text-amber-500',
    },
    recommended: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/40',
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
      textColor: 'text-emerald-500',
    },
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
              {fromPosition && (
                <p className="text-[11px] text-muted-foreground">
                  Khả dụng: <span className="font-medium text-foreground">{availableToTransfer}</span> units
                  {fromPosition.on_hand !== availableToTransfer && (
                    <span> (tồn: {fromPosition.on_hand}, đã giữ: {fromPosition.reserved + Math.round((fromPosition.safety_stock || 0) * seasonalFactor)})</span>
                  )}
                </p>
              )}
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
                className={cn(!isFeasible && fromPosition && 'border-destructive')}
              />
              {!isFeasible && fromPosition && (
                <p className="text-[11px] text-destructive font-medium">
                  ⚠ Không khả thi: Kho nguồn chỉ có {fromPosition.on_hand} units
                </p>
              )}
            </div>
          </div>

          {/* Seasonal factor info */}
          {seasonalFactor !== 1.0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 rounded-md px-3 py-1.5">
              <Leaf className="h-3.5 w-3.5" />
              Hệ số mùa: {seasonalFactor}x (cao điểm) — safety stock và ngưỡng cover được nhân {seasonalFactor}x
            </div>
          )}
          {seasonalFactor === 1.0 && constraints.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5">
              <Leaf className="h-3.5 w-3.5" />
              Hệ số mùa: 1.0x (bình thường)
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-way Comparison */}
      {simulation && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* From Store */}
          <Card className={cn(simulation.from.onHandAfter < 0 && 'border-destructive/50')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                {fromStoreName}
                <Badge variant="outline" className="text-[10px]">Nguồn</Badge>
                {simulation.from.onHandAfter < 0 && <Badge variant="destructive" className="text-[10px]">⚠ Âm kho</Badge>}
                {simulation.from.onHandAfter >= 0 && simulation.from.coverAfter < minCoverWeeks && (
                  <Badge variant="destructive" className="text-[10px]">⚠ Dưới ngưỡng</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SimRow label="Tồn kho" before={`${simulation.from.onHandBefore} units`} after={`${simulation.from.onHandAfter} units`} isNegative={simulation.from.onHandAfter < simulation.from.onHandBefore} isDanger={simulation.from.onHandAfter < 0} />
              <SimRow label="Weeks of cover" before={`${simulation.from.coverBefore.toFixed(1)}w`} after={`${simulation.from.coverAfter.toFixed(1)}w`} isNegative={simulation.from.coverAfter < simulation.from.coverBefore} isDanger={simulation.from.coverAfter < minCoverWeeks} />
              <SimRow label="Tốc độ bán" before={`${simulation.from.velocity.toFixed(1)}/ngày`} after={`${simulation.from.velocity.toFixed(1)}/ngày`} />
              <SimRow label="Safety stock" before={`${simulation.from.safetyStock}`} after={`${Math.round(simulation.from.safetyStock * seasonalFactor)} (×${seasonalFactor})`} />
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
          <Card className={cn(simulation.to.coverAfter > maxCoverWeeks && 'border-amber-500/50')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                {toStoreName}
                <Badge variant="outline" className="text-[10px]">Đích</Badge>
                {simulation.to.coverAfter > maxCoverWeeks && (
                  <Badge className="text-[10px] bg-amber-500/20 text-amber-500 border-amber-500/30">
                    ⚠ Overstock: {simulation.to.coverAfter.toFixed(1)}w &gt; {maxCoverWeeks}w
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SimRow label="Tồn kho" before={`${simulation.to.onHandBefore} units`} after={`${simulation.to.onHandAfter} units`} isPositive={simulation.to.onHandAfter > simulation.to.onHandBefore} />
              <SimRow label="Weeks of cover" before={`${simulation.to.coverBefore.toFixed(1)}w`} after={`${simulation.to.coverAfter.toFixed(1)}w`} isPositive={simulation.to.coverAfter > simulation.to.coverBefore} isWarning={simulation.to.coverAfter > maxCoverWeeks} />
              <SimRow label="Tốc độ bán" before={`${simulation.to.velocity.toFixed(1)}/ngày`} after={`${simulation.to.velocity.toFixed(1)}/ngày`} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Stockout risk</span>
                <div className="flex items-center gap-2">
                  <span className={riskColor(simulation.to.riskBefore)}>{simulation.to.riskBefore}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className={cn('font-medium', riskColor(simulation.to.riskAfter))}>{simulation.to.riskAfter}</span>
                </div>
              </div>
              {simulation.overstockCost > 0 && (
                <div className="text-xs text-amber-500 bg-amber-500/10 rounded px-2 py-1 mt-1">
                  💰 Chi phí tồn kho dư: ~{formatCurrency(simulation.overstockCost)}đ ({simulation.overstockWeeks.toFixed(1)} tuần vượt ngưỡng)
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Summary */}
      {simulation && (
        <Card>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Revenue dự kiến từ kịch bản</span>
              <span className={cn('text-lg font-bold', simulation.revenueGain > 0 ? 'text-emerald-500' : 'text-muted-foreground')}>
                {simulation.revenueGain > 0 ? `+${formatCurrency(simulation.revenueGain)}đ` : 'Không có thêm revenue'}
              </span>
            </div>
            {simulation.shortageAtDest <= 0 && transferQty > 0 && (
              <p className="text-xs text-amber-500">
                ⚠ Kho đích không thực sự thiếu hàng — chuyển thêm sẽ không tạo revenue mới, chỉ tăng overstock.
              </p>
            )}
            {simulation.effectiveUnits < transferQty && simulation.effectiveUnits > 0 && (
              <p className="text-xs text-muted-foreground">
                ℹ Chỉ {simulation.effectiveUnits}/{transferQty} units thực sự lấp thiếu hụt. Phần còn lại ({transferQty - simulation.effectiveUnits} units) sẽ thành tồn dư.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Verdict Card */}
      {verdict && simulation && (
        <Card className={cn('border-2', verdictStyles[verdict.type].border, verdictStyles[verdict.type].bg)}>
          <CardContent className="py-5">
            <div className="flex items-start gap-4">
              <div className="mt-0.5">{verdictStyles[verdict.type].icon}</div>
              <div className="flex-1 space-y-3">
                <h3 className={cn('text-lg font-bold', verdictStyles[verdict.type].textColor)}>
                  {verdict.title}
                </h3>
                <ul className="space-y-1">
                  {verdict.reasons.map((r, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-foreground/40 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
                {verdict.suggestion && (
                  <p className="text-sm font-medium text-foreground/90 bg-background/50 rounded-md px-3 py-2">
                    💡 {verdict.suggestion}
                  </p>
                )}
                {optimalQty > 0 && optimalQty !== transferQty && (
                  <Button
                    size="sm"
                    variant={verdict.type === 'recommended' ? 'default' : 'outline'}
                    className="gap-2"
                    onClick={() => setTransferQty(optimalQty)}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Áp dụng đề xuất: {optimalQty} units
                  </Button>
                )}
              </div>
            </div>
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

function SimRow({ label, before, after, isPositive, isNegative, isDanger, isWarning }: {
  label: string; before: string; after: string; isPositive?: boolean; isNegative?: boolean; isDanger?: boolean; isWarning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span>{before}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className={cn(
          'font-medium',
          isDanger && 'text-destructive font-bold',
          !isDanger && isWarning && 'text-amber-500',
          !isDanger && !isWarning && isPositive && 'text-emerald-500',
          !isDanger && !isWarning && isNegative && 'text-destructive',
        )}>{after}</span>
      </div>
    </div>
  );
}
