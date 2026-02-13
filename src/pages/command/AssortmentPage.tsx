import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, FileText, Activity, DollarSign, Lock, Flame, TrendingDown, ShieldAlert, Store, Package } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useSizeIntelligence } from '@/hooks/inventory/useSizeIntelligence';
import { useSizeControlTower } from '@/hooks/inventory/useSizeControlTower';
import TransferSuggestionsCard from '@/components/command/TransferSuggestionsCard';
import HealthStrip from '@/components/command/SizeControlTower/HealthStrip';
import StoreHeatmap from '@/components/command/SizeControlTower/StoreHeatmap';
import ActionImpactPanel from '@/components/command/SizeControlTower/ActionImpactPanel';
import PrioritizedBreakdown from '@/components/command/SizeControlTower/PrioritizedBreakdown';
import DecisionFeed from '@/components/command/SizeControlTower/DecisionFeed';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatVNDCompact } from '@/lib/formatters';

export default function AssortmentPage() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const [evidenceProductId, setEvidenceProductId] = useState<string | null>(null);

  // Size Control Tower aggregate hook
  const {
    summary, transferByDest, heatmap,
    groups, detailCache, loadingStates, loadGroupDetails, PAGE_SIZE,
    projectedRecovery, projectedHealth, projectedHealthDelta,
    healthStatus, transferUnits, transferStyles, recoverableStyles,
    effortLevel, totalTransfers, isLoading,
  } = useSizeControlTower();

  // Detail data for evidence & transfers
  const { evidencePackMap, sizeTransfers } = useSizeIntelligence();

  // FC names
  const { data: fcNames } = useQuery({
    queryKey: ['command-fc-names', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('inv_family_codes' as any)
        .select('id,fc_name,fc_code')
        .eq('is_active', true)
        .limit(5000);
      if (error) throw error;
      const map = new Map<string, string>();
      for (const fc of (data || []) as any[]) {
        map.set(String(fc.id), fc.fc_name || fc.fc_code || String(fc.id));
      }
      return map;
    },
    enabled: !!tenantId && isReady,
  });

  // Store names
  const { data: storeNames } = useQuery({
    queryKey: ['command-store-names', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('inv_stores' as any)
        .select('id,store_name,store_code')
        .eq('is_active', true)
        .limit(500);
      if (error) throw error;
      const map = new Map<string, string>();
      for (const s of (data || []) as any[]) {
        map.set(String(s.id), s.store_name || s.store_code || String(s.id));
      }
      return map;
    },
    enabled: !!tenantId && isReady,
  });

  // Transfer detail rows grouped by destination
  const transfersByDest = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const t of (sizeTransfers.data || []) as any[]) {
      const key = t.dest_store_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [sizeTransfers.data]);

  const runKpiEngine = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('inventory-kpi-engine', {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Engine: ${data.size_health_rows} Health, ${data.cash_lock_rows || 0} Cash Lock, ${data.margin_leak_rows || 0} Margin Leak`);
      ['si-health-summary', 'si-lost-rev-summary', 'si-md-risk-summary', 'si-transfer-by-dest', 'si-cash-lock-summary', 'si-margin-leak-summary',
       'si-health-by-state', 'store-heatmap', 'size-health', 'store-size-health', 'lost-revenue', 'markdown-risk', 'size-transfers', 'cash-lock', 'margin-leak', 'evidence-packs'].forEach(k =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );
    },
    onError: (err: any) => toast.error(`Engine failed: ${err.message}`),
  });

  // Auto-load broken details when groups are available
  useEffect(() => {
    const brokenGroup = groups.find(g => g.curve_state === 'broken');
    if (brokenGroup && brokenGroup.style_count > 0 && !detailCache['broken']?.length && !loadingStates['broken']) {
      loadGroupDetails('broken');
    }
  }, [groups, detailCache, loadingStates, loadGroupDetails]);

  // Broken group data
  const brokenGroup = groups.find(g => g.curve_state === 'broken');
  const brokenDetails = detailCache['broken'] || [];
  const brokenLoading = loadingStates['broken'] || false;
  const brokenHasMore = brokenDetails.length < (brokenGroup?.style_count || 0) && brokenDetails.length >= PAGE_SIZE;

  // Evidence drawer
  const evidencePack = evidenceProductId ? evidencePackMap.get(evidenceProductId) : null;
  const evidenceRow = evidenceProductId ? brokenDetails.find(r => r.product_id === evidenceProductId) : null;

  // Size data for selected product in drawer (store-level aggregation)
  const { data: drawerSizeData } = useQuery({
    queryKey: ['drawer-size-data', tenantId, evidenceProductId],
    queryFn: async () => {
      if (!evidenceProductId) return { missing: [] as string[], present: [] as string[], partial: [] as string[] };
      const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
      const sortSizes = (arr: string[]) => arr.sort((a, b) => {
        const ia = order.indexOf(a), ib = order.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });

      // Per-store missing sizes
      const { data: compData } = await buildQuery('kpi_size_completeness' as any)
        .select('style_id,store_id,missing_sizes')
        .eq('style_id', evidenceProductId)
        .limit(500);
      
      let totalStores = 0;
      const sizeMissCount = new Map<string, number>();
      for (const row of (compData || []) as any[]) {
        totalStores++;
        const sizes = row.missing_sizes as string[];
        if (!sizes) continue;
        for (const s of sizes) sizeMissCount.set(s, (sizeMissCount.get(s) || 0) + 1);
      }
      if (totalStores === 0) totalStores = 1;

      // All expected sizes
      const { data: skuData } = await buildQuery('inv_sku_fc_mapping' as any)
        .select('size')
        .eq('fc_id', evidenceProductId)
        .eq('is_active', true)
        .limit(100);
      const allSizes: string[] = [];
      for (const row of (skuData || []) as any[]) {
        if (row.size && !allSizes.includes(row.size)) allSizes.push(row.size);
      }

      const missing: string[] = [];
      const partial: string[] = [];
      const present: string[] = [];
      for (const size of allSizes) {
        const missCount = sizeMissCount.get(size) || 0;
        if (missCount >= totalStores) missing.push(size);
        else if (missCount > 0) partial.push(size);
        else present.push(size);
      }
      return { missing: sortSizes(missing), present: sortSizes(present), partial: sortSizes(partial) };
    },
    enabled: !!tenantId && isReady && !!evidenceProductId,
  });

  // Fetch stores with surplus of missing/partial sizes (potential transfer sources)
  const problematicSizes = useMemo(() => {
    if (!drawerSizeData) return [] as string[];
    return [...(drawerSizeData.missing || []), ...(drawerSizeData.partial || [])];
  }, [drawerSizeData]);

  const { data: surplusStores } = useQuery({
    queryKey: ['drawer-surplus-stores', tenantId, evidenceProductId, problematicSizes.join(',')],
    queryFn: async () => {
      if (!evidenceProductId || problematicSizes.length === 0) return [];
      // Get SKUs for the problematic sizes
      const { data: skuRows } = await buildQuery('inv_sku_fc_mapping' as any)
        .select('sku,size')
        .eq('fc_id', evidenceProductId)
        .eq('is_active', true)
        .in('size', problematicSizes)
        .limit(50);
      if (!skuRows || skuRows.length === 0) return [];

      const skuToSize = new Map<string, string>();
      for (const r of skuRows as any[]) skuToSize.set(r.sku, r.size);
      const skus = [...skuToSize.keys()];

      // Get positions with on_hand > 0 for these SKUs
      const { data: posRows } = await buildQuery('inv_state_positions' as any)
        .select('store_id,sku,on_hand')
        .eq('fc_id', evidenceProductId)
        .in('sku', skus)
        .gt('on_hand', 0)
        .limit(500);

      // Aggregate by store
      const storeMap = new Map<string, { store_id: string; sizes: Map<string, number> }>();
      for (const r of (posRows || []) as any[]) {
        const size = skuToSize.get(r.sku);
        if (!size) continue;
        if (!storeMap.has(r.store_id)) storeMap.set(r.store_id, { store_id: r.store_id, sizes: new Map() });
        const entry = storeMap.get(r.store_id)!;
        entry.sizes.set(size, (entry.sizes.get(size) || 0) + (r.on_hand || 0));
      }

      // Fetch store names
      const storeIds = [...storeMap.keys()];
      if (storeIds.length === 0) return [];
      const { data: nameRows } = await buildQuery('inv_stores' as any)
        .select('id,store_name')
        .in('id', storeIds)
        .limit(50);
      const nameMap = new Map<string, string>();
      for (const r of (nameRows || []) as any[]) nameMap.set(r.id, r.store_name);

      return [...storeMap.values()]
        .map(s => ({
          store_id: s.store_id,
          store_name: nameMap.get(s.store_id) || s.store_id.slice(0, 12),
          sizes: Object.fromEntries(s.sizes),
          totalQty: [...s.sizes.values()].reduce((a, b) => a + b, 0),
        }))
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 10);
    },
    enabled: !!tenantId && isReady && !!evidenceProductId && problematicSizes.length > 0,
  });

  const enrichedTransferByDest = useMemo(() => {
    return transferByDest.map((d: any) => ({
      ...d,
      dest_store_name: storeNames?.get(d.dest_store_id) || d.dest_store_id?.slice(0, 12),
    }));
  }, [transferByDest, storeNames]);

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">SIZE CONTROL TOWER</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">Revenue Protection Center</p>
        </div>
        <Button onClick={() => runKpiEngine.mutate()} disabled={runKpiEngine.isPending} size="sm" variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${runKpiEngine.isPending ? 'animate-spin' : ''}`} />
          {runKpiEngine.isPending ? 'Đang tính...' : 'Chạy Engine'}
        </Button>
      </motion.div>

      {/* ── Section 1: Decision Feed (moved to top) ── */}
      <DecisionFeed brokenDetails={brokenDetails} onViewEvidence={(pid) => setEvidenceProductId(pid)} />

      {/* ── Section 2: Global Health Strip ── */}
      <HealthStrip
        avgHealthScore={summary.avgHealthScore}
        healthStatus={healthStatus}
        brokenCount={summary.brokenCount}
        riskCount={summary.riskCount}
        totalLostRevenue={summary.totalLostRevenue}
        totalCashLocked={summary.totalCashLocked}
        totalMarginLeak={summary.totalMarginLeak}
        projectedHealth={projectedHealth}
        projectedRecovery={projectedRecovery}
        transferUnits={transferUnits}
        recoverableStyles={recoverableStyles}
        effortLevel={effortLevel}
      />

      {/* ── Section 3: Tabbed Content ── */}
      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="breakdown">📋 Phân Tích SKU</TabsTrigger>
          <TabsTrigger value="transfers">🔄 Đề Xuất Điều Chuyển</TabsTrigger>
          <TabsTrigger value="heatmap">🗺️ Heatmap & Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown">
          <PrioritizedBreakdown
            details={brokenDetails}
            isLoading={brokenLoading}
            hasMore={brokenHasMore}
            totalCount={brokenGroup?.style_count || 0}
            onLoadMore={() => loadGroupDetails('broken', true)}
            onViewEvidence={(pid) => setEvidenceProductId(pid)}
          />
        </TabsContent>

        <TabsContent value="transfers">
          {transferByDest.length > 0 ? (
            <TransferSuggestionsCard
              transferByDest={transferByDest}
              detailRows={transfersByDest}
              storeNames={storeNames}
              fcNames={fcNames}
              totalOpportunities={summary.transferOpportunities}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Chưa có đề xuất điều chuyển
            </div>
          )}
        </TabsContent>

        <TabsContent value="heatmap">
          <div className="flex gap-4">
            <StoreHeatmap
              data={heatmap.data || []}
              isLoading={heatmap.isLoading}
            />
            <ActionImpactPanel
              projectedRecovery={projectedRecovery}
              transferUnits={transferUnits}
              recoverableStyles={recoverableStyles}
              effortLevel={effortLevel}
              totalTransfers={totalTransfers}
              transferByDest={enrichedTransferByDest}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Evidence Pack Drawer ── */}
      <Sheet open={!!evidenceProductId} onOpenChange={(open) => !open && setEvidenceProductId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Hồ Sơ Bằng Chứng
            </SheetTitle>
            <SheetDescription>
              {evidenceRow?.product_name || (evidenceProductId && (fcNames?.get(evidenceProductId) || evidenceProductId))}
            </SheetDescription>
          </SheetHeader>

          {/* Size map - present + missing */}
          {drawerSizeData && (drawerSizeData.present.length > 0 || drawerSizeData.partial.length > 0 || drawerSizeData.missing.length > 0) && (
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-destructive" /> Bản Đồ Size
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {drawerSizeData.present.map(size => (
                  <Badge key={`p-${size}`} variant="outline" className="text-xs px-2 py-0.5 font-medium text-emerald-700 border-emerald-500/40 bg-emerald-500/10">
                    ✓ {size}
                  </Badge>
                ))}
                {drawerSizeData.partial.map(size => (
                  <Badge key={`w-${size}`} variant="outline" className="text-xs px-2 py-0.5 font-semibold text-amber-700 border-amber-500/40 bg-amber-500/10">
                    ⚠ {size}
                  </Badge>
                ))}
                {drawerSizeData.missing.map(size => (
                  <Badge key={`m-${size}`} variant="outline" className="text-xs px-2 py-0.5 font-bold text-destructive border-destructive/40 bg-destructive/5">
                    ✗ {size}
                  </Badge>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-3">
                <span><span className="text-emerald-700">✓</span> Đủ hàng</span>
                <span><span className="text-amber-700">⚠</span> Lẻ (thiếu ở một số store)</span>
                <span><span className="text-destructive">✗</span> Hết toàn bộ</span>
              </div>
              {evidenceRow?.core_size_missing && (
                <p className="text-xs text-destructive font-medium">⚠️ Bao gồm size core — ảnh hưởng trực tiếp đến doanh thu</p>
              )}
            </div>
          )}

          {/* Surplus stores - stores with stock of missing/partial sizes */}
          {surplusStores && surplusStores.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-emerald-600" /> Nguồn Hàng Khả Dụng
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Cửa hàng đang có tồn kho size thiếu/lẻ — có thể điều chuyển
              </p>
              <div className="space-y-1.5">
                {surplusStores.map(s => (
                  <div key={s.store_id} className="flex items-center justify-between text-xs p-2 rounded-md bg-emerald-500/5 border border-emerald-500/15">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Store className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span className="font-medium truncate">{s.store_name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {Object.entries(s.sizes).map(([size, qty]) => (
                        <Badge key={size} variant="outline" className="text-[9px] px-1.5 py-0 h-5 font-semibold text-emerald-700 border-emerald-500/40 bg-emerald-500/10">
                          {size}: {qty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Basic info from detail row when no evidence pack */}
          {!evidencePack && evidenceRow && (
            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">Sức Khỏe</span>
                  <p className={`font-bold text-lg ${
                    evidenceRow.size_health_score < 40 ? 'text-destructive' :
                    evidenceRow.size_health_score < 60 ? 'text-orange-600' : 'text-amber-600'
                  }`}>{Math.round(evidenceRow.size_health_score)}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">Trạng Thái</span>
                  <p className="font-bold text-lg capitalize">{evidenceRow.curve_state}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2 text-xs">
                {evidenceRow.lost_revenue_est > 0 && (
                  <div className="p-2 rounded bg-destructive/5">
                    <span className="text-muted-foreground">DT Mất</span>
                    <p className="font-bold text-destructive">{formatVNDCompact(evidenceRow.lost_revenue_est)}</p>
                  </div>
                )}
                {evidenceRow.cash_locked_value > 0 && (
                  <div className="p-2 rounded bg-orange-500/5">
                    <span className="text-muted-foreground">Vốn Khóa</span>
                    <p className="font-bold text-orange-600">{formatVNDCompact(evidenceRow.cash_locked_value)}</p>
                  </div>
                )}
                {evidenceRow.margin_leak_value > 0 && (
                  <div className="p-2 rounded bg-destructive/5">
                    <span className="text-muted-foreground">Rò Biên</span>
                    <p className="font-bold text-destructive">{formatVNDCompact(evidenceRow.margin_leak_value)}</p>
                  </div>
                )}
                {evidenceRow.markdown_eta_days && (
                  <div className="p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">MD ETA</span>
                    <p className="font-bold">{evidenceRow.markdown_eta_days} ngày</p>
                  </div>
                )}
              </div>
              {evidenceRow.markdown_risk_score >= 80 && (
                <div className="p-2 rounded bg-destructive/10 text-xs text-destructive font-medium">
                  ⚠️ Rủi ro markdown cao ({evidenceRow.markdown_risk_score}%) — Cân nhắc thanh lý sớm
                </div>
              )}
            </div>
          )}
          
          {evidencePack ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={
                  evidencePack.severity === 'critical' ? 'destructive' :
                  evidencePack.severity === 'high' ? 'secondary' : 'default'
                } className="capitalize">{evidencePack.severity}</Badge>
                <span className="text-xs text-muted-foreground">{evidencePack.as_of_date}</span>
              </div>

              <Separator />

              {evidencePack.data_snapshot?.health && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Sức Khỏe Size</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Điểm</span>
                      <p className="font-bold text-lg">{evidencePack.data_snapshot.health.score?.toFixed(0)}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Trạng Thái</span>
                      <p className="font-bold text-lg capitalize">{evidencePack.data_snapshot.health.state}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Thiếu Size Chính</span>
                      <p className="font-semibold">{evidencePack.data_snapshot.health.core_missing ? 'Có ⚠️' : 'Không'}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Độ Lệch</span>
                      <p className="font-semibold">{evidencePack.data_snapshot.health.deviation?.toFixed(3)}</p>
                    </div>
                  </div>
                </div>
              )}

              {evidencePack.data_snapshot?.lost_revenue && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Doanh Thu Mất</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-destructive/5">
                        <span className="text-muted-foreground">DT Mất</span>
                        <p className="font-bold text-destructive">{formatVNDCompact(evidencePack.data_snapshot.lost_revenue.revenue)}</p>
                      </div>
                      <div className="p-2 rounded bg-destructive/5">
                        <span className="text-muted-foreground">SL Mất</span>
                        <p className="font-bold">{evidencePack.data_snapshot.lost_revenue.units}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Nguyên nhân: {evidencePack.data_snapshot.lost_revenue.driver}</p>
                  </div>
                </>
              )}

              {evidencePack.data_snapshot?.cash_lock && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Vốn Bị Khóa</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded bg-orange-500/5">
                        <span className="text-muted-foreground">Bị Khóa</span>
                        <p className="font-bold text-orange-600">{formatVNDCompact(evidencePack.data_snapshot.cash_lock.value)}</p>
                      </div>
                      <div className="p-2 rounded bg-orange-500/5">
                        <span className="text-muted-foreground">Tỷ Lệ</span>
                        <p className="font-bold">{evidencePack.data_snapshot.cash_lock.pct}%</p>
                      </div>
                      <div className="p-2 rounded bg-orange-500/5">
                        <span className="text-muted-foreground">Giải Phóng</span>
                        <p className="font-bold">{evidencePack.data_snapshot.cash_lock.release_days}d</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {evidencePack.data_snapshot?.markdown_risk && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5" /> Rủi Ro Giảm Giá</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">Điểm Rủi Ro</span>
                        <p className="font-bold">{evidencePack.data_snapshot.markdown_risk.score}</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">ETA</span>
                        <p className="font-bold">{evidencePack.data_snapshot.markdown_risk.eta_days}d</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Lý do: {evidencePack.data_snapshot.markdown_risk.reason}</p>
                  </div>
                </>
              )}

              {evidencePack.data_snapshot?.margin_leak && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><Flame className="h-3.5 w-3.5" /> Rò Rỉ Biên LN</h4>
                    <div className="p-2 rounded bg-red-500/5 text-xs">
                      <span className="text-muted-foreground">Tổng Rò Rỉ</span>
                      <p className="font-bold text-red-600">{formatVNDCompact(evidencePack.data_snapshot.margin_leak.total)}</p>
                    </div>
                    {evidencePack.data_snapshot.margin_leak.drivers?.map((d: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs px-2">
                        <span className="text-muted-foreground capitalize">{d.driver.replace('_', ' ')}</span>
                        <span className="font-medium">{formatVNDCompact(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <Separator />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold mb-1">Bảng Nguồn</p>
                <div className="flex flex-wrap gap-1">
                  {evidencePack.source_tables?.map((t: string) => (
                    <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : !evidenceRow ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Không có dữ liệu chi tiết</div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
