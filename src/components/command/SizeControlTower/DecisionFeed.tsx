import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, ShieldAlert, ChevronDown, ChevronRight, Store, ArrowRight, TrendingDown, Lock, Scissors, MapPin } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';
import type { SizeHealthDetailRow } from '@/hooks/inventory/useSizeHealthGroups';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

interface DecisionFeedProps {
  brokenDetails: SizeHealthDetailRow[];
  onViewEvidence?: (productId: string) => void;
}

/** Generate AI narrative explaining WHY this product is critical */
function generateNarrative(signal: SizeHealthDetailRow, sizeData?: { missing: string[]; present: string[]; partial: string[] }, storesMissing?: number, totalStores?: number): string {
  const parts: string[] = [];

  // Core size missing narrative
  if (signal.core_size_missing && sizeData) {
    const criticalSizes = sizeData.partial.length > 0 ? sizeData.partial : sizeData.missing;
    if (criticalSizes.length > 0) {
      parts.push(`Size ${criticalSizes.slice(0, 2).join(', ')} là size bán chạy nhưng đang thiếu`);
      if (storesMissing && totalStores) {
        parts.push(`tại ${storesMissing}/${totalStores} cửa hàng`);
      }
    }
  }

  // Cash lock narrative
  if (signal.cash_locked_value > 0 && signal.lost_revenue_est > 0) {
    parts.push(`${formatVNDCompact(signal.cash_locked_value)} vốn đang bị khóa trong tồn kho lệch size`);
  }

  // Markdown risk
  if (signal.markdown_risk_score >= 80) {
    parts.push(`Nguy cơ giảm giá cao (${Math.round(signal.markdown_risk_score)}%)`);
    if (signal.markdown_eta_days) {
      parts.push(`dự kiến trong ${signal.markdown_eta_days} ngày`);
    }
  } else if (signal.markdown_risk_score >= 50) {
    parts.push(`Biên lợi nhuận đang bị rò rỉ do mất cân đối size`);
  }

  // Margin leak
  if (signal.margin_leak_value > 0 && parts.length < 2) {
    parts.push(`Rò biên ${formatVNDCompact(signal.margin_leak_value)} từ markdown + stockout`);
  }

  if (parts.length === 0) {
    parts.push('Sản phẩm cần theo dõi do sức khỏe size thấp');
  }

  return parts.join('. ') + '.';
}

export default function DecisionFeed({ brokenDetails, onViewEvidence }: DecisionFeedProps) {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Top 5 critical signals: broken + core missing, sorted by lost revenue
  const signals = brokenDetails
    .filter(r => r.core_size_missing || r.lost_revenue_est > 0)
    .sort((a, b) => (b.lost_revenue_est || 0) - (a.lost_revenue_est || 0))
    .slice(0, 5);

  const productIds = signals.map(s => s.product_id);

  // Fetch size data with store-level aggregation
  const { data: sizeDetailMap } = useQuery({
    queryKey: ['decision-feed-size-detail', tenantId, productIds.join(',')],
    queryFn: async () => {
      if (productIds.length === 0) return new Map<string, { missing: string[]; present: string[]; partial: string[]; storesMissing: number; totalStores: number; storeBreakdown: { store_id: string; missing: string[] }[] }>();
      const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
      const sortSizes = (arr: string[]) => arr.sort((a, b) => {
        const ia = order.indexOf(a), ib = order.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });

      const { data: compData } = await buildQuery('kpi_size_completeness' as any)
        .select('style_id,store_id,missing_sizes')
        .in('style_id', productIds)
        .limit(2000);

      const storeCountMap = new Map<string, number>();
      const sizeMissCountMap = new Map<string, Map<string, number>>();
      const storeBreakdownMap = new Map<string, { store_id: string; missing: string[] }[]>();

      for (const row of (compData || []) as any[]) {
        const pid = row.style_id as string;
        storeCountMap.set(pid, (storeCountMap.get(pid) || 0) + 1);
        const sizes = row.missing_sizes as string[];
        if (!sizes || sizes.length === 0) continue;

        // Store breakdown
        if (!storeBreakdownMap.has(pid)) storeBreakdownMap.set(pid, []);
        storeBreakdownMap.get(pid)!.push({ store_id: row.store_id, missing: sizes });

        if (!sizeMissCountMap.has(pid)) sizeMissCountMap.set(pid, new Map());
        const sizeMap = sizeMissCountMap.get(pid)!;
        for (const s of sizes) sizeMap.set(s, (sizeMap.get(s) || 0) + 1);
      }

      const { data: skuData } = await buildQuery('inv_sku_fc_mapping' as any)
        .select('fc_id,size')
        .in('fc_id', productIds)
        .eq('is_active', true)
        .limit(500);

      const allSizesMap = new Map<string, Set<string>>();
      for (const row of (skuData || []) as any[]) {
        if (!row.size) continue;
        if (!allSizesMap.has(row.fc_id)) allSizesMap.set(row.fc_id, new Set());
        allSizesMap.get(row.fc_id)!.add(row.size);
      }

      const result = new Map<string, { missing: string[]; present: string[]; partial: string[]; storesMissing: number; totalStores: number; storeBreakdown: { store_id: string; missing: string[] }[] }>();
      for (const pid of productIds) {
        const allSizes = allSizesMap.has(pid) ? [...allSizesMap.get(pid)!] : [];
        const totalStores = storeCountMap.get(pid) || 1;
        const sizeMap = sizeMissCountMap.get(pid) || new Map();
        const missing: string[] = [];
        const partial: string[] = [];
        const present: string[] = [];
        for (const size of allSizes) {
          const missCount = sizeMap.get(size) || 0;
          if (missCount >= totalStores) missing.push(size);
          else if (missCount > 0) partial.push(size);
          else present.push(size);
        }
        const storeBreakdown = storeBreakdownMap.get(pid) || [];
        const storesMissing = storeBreakdown.length;
        if (missing.length > 0 || partial.length > 0 || present.length > 0) {
          result.set(pid, {
            missing: sortSizes(missing),
            present: sortSizes(present),
            partial: sortSizes(partial),
            storesMissing,
            totalStores,
            storeBreakdown: storeBreakdown.slice(0, 5), // Top 5 stores
          });
        }
      }
      return result;
    },
    enabled: !!tenantId && isReady && productIds.length > 0,
  });

  // Fetch store names for expanded details
  const expandedStoreIds = useMemo(() => {
    if (!expandedId || !sizeDetailMap) return [];
    const detail = sizeDetailMap.get(expandedId);
    return detail?.storeBreakdown.map(s => s.store_id) || [];
  }, [expandedId, sizeDetailMap]);

  const { data: storeNames } = useQuery({
    queryKey: ['decision-feed-store-names', tenantId, expandedStoreIds.join(',')],
    queryFn: async () => {
      if (expandedStoreIds.length === 0) return new Map<string, string>();
      const { data } = await buildQuery('stores' as any)
        .select('id,name')
        .in('id', expandedStoreIds)
        .limit(20);
      const map = new Map<string, string>();
      for (const r of (data || []) as any[]) map.set(r.id, r.name);
      return map;
    },
    enabled: !!tenantId && isReady && expandedStoreIds.length > 0,
  });

  if (signals.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Tín Hiệu Quan Trọng
          <Badge variant="secondary" className="text-[10px]">Top {signals.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {signals.map((signal) => {
          const severity = signal.size_health_score < 30 ? 'critical' :
            signal.size_health_score < 50 ? 'high' : 'medium';
          const sizeData = sizeDetailMap?.get(signal.product_id);
          const isExpanded = expandedId === signal.product_id;
          const narrative = generateNarrative(signal, sizeData, sizeData?.storesMissing, sizeData?.totalStores);
          const totalDamage = (signal.lost_revenue_est || 0) + (signal.cash_locked_value || 0) + (signal.margin_leak_value || 0);

          return (
            <div
              key={signal.product_id}
              className={`rounded-lg border-l-4 transition-all ${
                severity === 'critical' ? 'border-l-destructive bg-destructive/5' :
                severity === 'high' ? 'border-l-orange-500 bg-orange-500/5' :
                'border-l-amber-400 bg-amber-400/5'
              }`}
            >
              {/* Main card - clickable */}
              <div
                className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(prev => prev === signal.product_id ? null : signal.product_id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <ShieldAlert className={`h-3.5 w-3.5 shrink-0 ${
                        severity === 'critical' ? 'text-destructive' :
                        severity === 'high' ? 'text-orange-600' : 'text-amber-600'
                      }`} />
                      <span className="text-sm font-semibold truncate">{signal.product_name}</span>
                      {signal.core_size_missing && (
                        <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30 shrink-0">
                          Size core thiếu
                        </Badge>
                      )}
                      {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />}
                    </div>

                    {/* Size map */}
                    {sizeData && (sizeData.present.length > 0 || sizeData.partial.length > 0 || sizeData.missing.length > 0) && (
                      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                        {sizeData.present.map(size => (
                          <Badge key={`p-${size}`} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium text-emerald-700 border-emerald-500/40 bg-emerald-500/10">
                            {size}
                          </Badge>
                        ))}
                        {sizeData.partial.map(size => (
                          <Badge key={`w-${size}`} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-semibold text-amber-700 border-amber-500/40 bg-amber-500/10">
                            {size}
                          </Badge>
                        ))}
                        {sizeData.missing.map(size => (
                          <Badge key={`m-${size}`} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-bold text-destructive border-destructive/40 bg-destructive/5 line-through">
                            {size}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Inline metrics row */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {signal.lost_revenue_est > 0 && (
                        <span className="flex items-center gap-0.5">
                          <TrendingDown className="h-3 w-3" />
                          Mất: <span className="font-semibold text-destructive">{formatVNDCompact(signal.lost_revenue_est)}</span>
                        </span>
                      )}
                      {signal.cash_locked_value > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Lock className="h-3 w-3" />
                          Khóa: <span className="font-semibold text-orange-600">{formatVNDCompact(signal.cash_locked_value)}</span>
                        </span>
                      )}
                      {signal.margin_leak_value > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Scissors className="h-3 w-3" />
                          Rò: <span className="font-semibold text-red-600">{formatVNDCompact(signal.margin_leak_value)}</span>
                        </span>
                      )}
                      {signal.markdown_eta_days && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> {signal.markdown_eta_days}d → MD
                        </span>
                      )}
                      {sizeData && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" /> {sizeData.storesMissing}/{sizeData.totalStores} store thiếu
                        </span>
                      )}
                    </div>

                    {/* AI Narrative */}
                    <p className="text-[11px] text-muted-foreground mt-1.5 italic leading-relaxed">
                      💡 {narrative}
                    </p>
                  </div>

                  {/* Health score */}
                  <div className={`text-2xl font-black tabular-nums shrink-0 ${
                    signal.size_health_score < 30 ? 'text-destructive' :
                    signal.size_health_score < 50 ? 'text-orange-600' : 'text-amber-600'
                  }`}>
                    {Math.round(signal.size_health_score)}
                  </div>
                </div>
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-dashed border-muted-foreground/20 pt-2 space-y-3">
                  {/* Financial breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-md bg-background/60 p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Tổng thiệt hại</p>
                      <p className="text-sm font-bold text-destructive">{formatVNDCompact(totalDamage)}</p>
                    </div>
                    <div className="rounded-md bg-background/60 p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Deviation</p>
                      <p className="text-sm font-bold">{Math.round(signal.deviation_score)}%</p>
                    </div>
                    <div className="rounded-md bg-background/60 p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">MD Risk</p>
                      <p className={`text-sm font-bold ${signal.markdown_risk_score >= 80 ? 'text-destructive' : signal.markdown_risk_score >= 50 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                        {Math.round(signal.markdown_risk_score)}%
                      </p>
                    </div>
                    <div className="rounded-md bg-background/60 p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Curve State</p>
                      <Badge variant="outline" className={`text-[10px] mt-0.5 ${
                        signal.curve_state === 'broken' ? 'text-destructive border-destructive/30' :
                        signal.curve_state === 'risk' ? 'text-orange-600 border-orange-500/30' :
                        'text-amber-600 border-amber-500/30'
                      }`}>
                        {signal.curve_state}
                      </Badge>
                    </div>
                  </div>

                  {/* Store breakdown */}
                  {sizeData && sizeData.storeBreakdown.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Store className="h-3 w-3" /> Cửa hàng đang thiếu size
                      </p>
                      <div className="space-y-1">
                        {sizeData.storeBreakdown.map((sb) => (
                          <div key={sb.store_id} className="flex items-center justify-between text-xs p-1.5 rounded bg-background/60">
                            <span className="font-medium truncate max-w-[180px]">
                              {storeNames?.get(sb.store_id) || sb.store_id.slice(0, 12)}
                            </span>
                            <div className="flex items-center gap-1">
                              {sb.missing.map(size => (
                                <Badge key={size} variant="outline" className="text-[9px] px-1 py-0 h-4 text-destructive border-destructive/30">
                                  {size}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                        {sizeData.storesMissing > 5 && (
                          <p className="text-[10px] text-muted-foreground italic">
                            +{sizeData.storesMissing - 5} cửa hàng khác cũng thiếu size
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action link */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={(e) => { e.stopPropagation(); onViewEvidence?.(signal.product_id); }}
                    >
                      Xem chi tiết & đề xuất <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
