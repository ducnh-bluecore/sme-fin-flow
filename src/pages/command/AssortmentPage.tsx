import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layers3, AlertTriangle, RefreshCw, ShieldAlert, TrendingDown, DollarSign, Activity, Clock, ArrowRightLeft, Lock, Flame, FileText, ChevronDown, ChevronRight, Store, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TransferSuggestionsCard from '@/components/command/TransferSuggestionsCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useSizeIntelligence } from '@/hooks/inventory/useSizeIntelligence';
import { useSizeIntelligenceSummary } from '@/hooks/inventory/useSizeIntelligenceSummary';
import { useSizeHealthGroups } from '@/hooks/inventory/useSizeHealthGroups';
import SizeHealthActionGroups from '@/components/command/SizeHealthActionGroups';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatVNDCompact } from '@/lib/formatters';

export default function AssortmentPage() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const [evidenceProductId, setEvidenceProductId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('overview');

  // DB-aggregated summaries (no 1000-row limit)
  const { summary: dbSummary, transferByDest, isLoading: summaryLoading } = useSizeIntelligenceSummary();

  // Detail-level data (for detail table & evidence - still limited but OK for drill-down)
  const {
    healthMap, lostRevenueMap, markdownRiskMap,
    cashLockMap, marginLeakMap, evidencePackMap,
    isLoading: siLoading, lostRevenue, sizeTransfers
  } = useSizeIntelligence();

  // Action Groups (server-side aggregation + pagination)
  const { groups: healthGroups, isLoading: groupsLoading, detailCache, loadingStates, loadGroupDetails, PAGE_SIZE } = useSizeHealthGroups();

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

  const runKpiEngine = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('inventory-kpi-engine', {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Engine: ${data.size_health_rows} Health, ${data.cash_lock_rows || 0} Cash Lock, ${data.margin_leak_rows || 0} Margin Leak, ${data.evidence_pack_rows || 0} Evidence`);
      ['si-health-summary', 'si-lost-rev-summary', 'si-md-risk-summary', 'si-transfer-by-dest', 'si-cash-lock-summary', 'si-margin-leak-summary',
       'si-health-by-state', 'size-health', 'store-size-health', 'lost-revenue', 'markdown-risk', 'size-transfers', 'cash-lock', 'margin-leak', 'evidence-packs'].forEach(k =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );
    },
    onError: (err: any) => toast.error(`Engine failed: ${err.message}`),
  });

  // Split groups for tabs
  const actionGroups = useMemo(() => healthGroups.filter(g => g.curve_state === 'broken' || g.curve_state === 'risk'), [healthGroups]);
  const auditGroups = useMemo(() => healthGroups.filter(g => g.curve_state === 'watch' || g.curve_state === 'healthy'), [healthGroups]);
  const actionCount = actionGroups.reduce((s, g) => s + g.style_count, 0);
  const auditCount = auditGroups.reduce((s, g) => s + g.style_count, 0);

  const topLostRevStyles = (lostRevenue.data || []).slice(0, 5);

  // Group transfers by dest for detail expansion
  const transfersByDest = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const t of (sizeTransfers.data || []) as any[]) {
      const key = t.dest_store_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [sizeTransfers.data]);

  // Use DB summary for hero KPIs (accurate, no 1000-row limit)
  const summary = dbSummary;

  // Evidence drawer data
  const evidencePack = evidenceProductId ? evidencePackMap.get(evidenceProductId) : null;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Size Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">Revenue Protection Engine — Detect curve breaks before markdown</p>
        </div>
        <Button onClick={() => runKpiEngine.mutate()} disabled={runKpiEngine.isPending} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${runKpiEngine.isPending ? 'animate-spin' : ''}`} />
          {runKpiEngine.isPending ? 'Computing...' : 'Run Engine'}
        </Button>
      </motion.div>

      {/* ── Hero KPIs (from DB views - accurate) — always visible ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className={summary.avgHealthScore !== null && summary.avgHealthScore < 60 ? 'border-l-4 border-l-destructive' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Activity className="h-3 w-3" /> Size Health
            </div>
            <p className={`text-xl font-bold ${
              summary.avgHealthScore === null ? '' :
              summary.avgHealthScore >= 80 ? 'text-emerald-600' :
              summary.avgHealthScore >= 60 ? 'text-amber-600' : 'text-destructive'
            }`}>
              {summary.avgHealthScore !== null ? `${Number(summary.avgHealthScore).toFixed(0)}` : '—'}
            </p>
            {summary.totalProducts > 0 && <p className="text-[10px] text-muted-foreground">{summary.totalProducts} styles</p>}
          </CardContent>
        </Card>

        <Card className={summary.totalLostRevenue > 0 ? 'border-l-4 border-l-destructive' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" /> Lost Revenue
            </div>
            <p className="text-xl font-bold text-destructive">
              {summary.totalLostRevenue > 0 ? formatVNDCompact(summary.totalLostRevenue) : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <ShieldAlert className="h-3 w-3" /> Broken
            </div>
            <p className="text-xl font-bold text-destructive">{summary.brokenCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <TrendingDown className="h-3 w-3" /> MD Risk
            </div>
            <p className="text-xl font-bold text-destructive">
              {summary.highMarkdownRiskCount}
              {summary.criticalMarkdownCount > 0 && (
                <span className="text-sm font-normal ml-1">({summary.criticalMarkdownCount} crit)</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className={summary.totalCashLocked > 0 ? 'border-l-4 border-l-orange-500' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Lock className="h-3 w-3" /> Cash Locked
            </div>
            <p className="text-xl font-bold text-orange-600">
              {summary.totalCashLocked > 0 ? formatVNDCompact(summary.totalCashLocked) : '—'}
            </p>
          </CardContent>
        </Card>

        <Card className={summary.totalMarginLeak > 0 ? 'border-l-4 border-l-red-500' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Flame className="h-3 w-3" /> Margin Leak
            </div>
            <p className="text-xl font-bold text-red-600">
              {summary.totalMarginLeak > 0 ? formatVNDCompact(summary.totalMarginLeak) : '—'}
            </p>
          </CardContent>
        </Card>

        <Card className={summary.transferOpportunities > 0 ? 'border-l-4 border-l-amber-500' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <ArrowRightLeft className="h-3 w-3" /> Transfers
            </div>
            <p className="text-xl font-bold text-amber-600">{summary.transferOpportunities}</p>
            {summary.totalTransferNetBenefit > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{formatVNDCompact(summary.totalTransferNetBenefit)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 3-Tab Layout ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" /> Actions
            {actionCount > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1">{actionCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Audit
            {auditCount > 0 && <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">{auditCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Overview ── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Revenue Risk Feed */}
          {topLostRevStyles.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-destructive" /> Revenue at Risk — Top Styles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topLostRevStyles.map((lr) => {
                  const health = healthMap.get(lr.product_id);
                  const md = markdownRiskMap.get(lr.product_id);
                  const cl = cashLockMap.get(lr.product_id);
                  const ml = marginLeakMap.get(lr.product_id) || 0;
                  const name = fcNames?.get(lr.product_id) || lr.product_id;
                  const hasEvidence = evidencePackMap.has(lr.product_id);
                  return (
                    <div key={lr.id} className="border-l-2 border-l-destructive rounded-r-md p-3 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors" onClick={() => hasEvidence && setEvidenceProductId(lr.product_id)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Lost: <span className="font-semibold text-destructive">{formatVNDCompact(lr.lost_revenue_est)}</span>
                            {' · '}{lr.lost_units_est} units · Driver: {lr.driver}
                            {health?.core_size_missing && ' · Core missing'}
                            {cl && <> · <Lock className="h-3 w-3 inline" /> {formatVNDCompact(cl.cash_locked_value)}</>}
                            {ml > 0 && <> · <Flame className="h-3 w-3 inline" /> {formatVNDCompact(ml)}</>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {hasEvidence && <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                          {health && (
                            <Badge variant={health.curve_state === 'broken' ? 'destructive' : 'secondary'} className="text-xs">
                              {health.curve_state} ({health.size_health_score.toFixed(0)})
                            </Badge>
                          )}
                          {md && md.markdown_eta_days && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" /> {md.markdown_eta_days}d
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Smart Transfer Suggestions */}
          {transferByDest.length > 0 && (
            <TransferSuggestionsCard
              transferByDest={transferByDest}
              detailRows={transfersByDest}
              storeNames={storeNames}
              fcNames={fcNames}
              totalOpportunities={summary.transferOpportunities}
            />
          )}
        </TabsContent>

        {/* ── Tab 2: Actions (Broken + Risk) ── */}
        <TabsContent value="actions" className="space-y-4 mt-4">
          <SizeHealthActionGroups
            groups={actionGroups}
            isLoading={groupsLoading || summaryLoading}
            detailCache={detailCache}
            loadingStates={loadingStates}
            onExpandGroup={loadGroupDetails}
            onViewEvidence={(productId) => evidencePackMap.has(productId) && setEvidenceProductId(productId)}
            pageSize={PAGE_SIZE}
          />
        </TabsContent>

        {/* ── Tab 3: Audit (Watch + Healthy) ── */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          <SizeHealthActionGroups
            groups={auditGroups}
            isLoading={groupsLoading || summaryLoading}
            detailCache={detailCache}
            loadingStates={loadingStates}
            onExpandGroup={loadGroupDetails}
            onViewEvidence={(productId) => evidencePackMap.has(productId) && setEvidenceProductId(productId)}
            pageSize={PAGE_SIZE}
          />
        </TabsContent>
      </Tabs>

      {/* ── Evidence Pack Drawer ── */}
      <Sheet open={!!evidenceProductId} onOpenChange={(open) => !open && setEvidenceProductId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Evidence Pack
            </SheetTitle>
            <SheetDescription>
              {evidenceProductId && (fcNames?.get(evidenceProductId) || evidenceProductId)}
            </SheetDescription>
          </SheetHeader>
          
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
                  <h4 className="text-sm font-semibold flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Size Health</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Score</span>
                      <p className="font-bold text-lg">{evidencePack.data_snapshot.health.score?.toFixed(0)}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">State</span>
                      <p className="font-bold text-lg capitalize">{evidencePack.data_snapshot.health.state}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Core Missing</span>
                      <p className="font-semibold">{evidencePack.data_snapshot.health.core_missing ? 'Yes ⚠️' : 'No'}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Deviation</span>
                      <p className="font-semibold">{evidencePack.data_snapshot.health.deviation?.toFixed(3)}</p>
                    </div>
                  </div>
                </div>
              )}

              {evidencePack.data_snapshot?.lost_revenue && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Lost Revenue</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-destructive/5">
                        <span className="text-muted-foreground">Revenue Lost</span>
                        <p className="font-bold text-destructive">{formatVNDCompact(evidencePack.data_snapshot.lost_revenue.revenue)}</p>
                      </div>
                      <div className="p-2 rounded bg-destructive/5">
                        <span className="text-muted-foreground">Units Lost</span>
                        <p className="font-bold">{evidencePack.data_snapshot.lost_revenue.units}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Driver: {evidencePack.data_snapshot.lost_revenue.driver}</p>
                  </div>
                </>
              )}

              {evidencePack.data_snapshot?.cash_lock && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Cash Lock</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded bg-orange-500/5">
                        <span className="text-muted-foreground">Locked</span>
                        <p className="font-bold text-orange-600">{formatVNDCompact(evidencePack.data_snapshot.cash_lock.value)}</p>
                      </div>
                      <div className="p-2 rounded bg-orange-500/5">
                        <span className="text-muted-foreground">Lock %</span>
                        <p className="font-bold">{evidencePack.data_snapshot.cash_lock.pct}%</p>
                      </div>
                      <div className="p-2 rounded bg-orange-500/5">
                        <span className="text-muted-foreground">Release</span>
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
                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5" /> Markdown Risk</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">Risk Score</span>
                        <p className="font-bold">{evidencePack.data_snapshot.markdown_risk.score}</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">ETA</span>
                        <p className="font-bold">{evidencePack.data_snapshot.markdown_risk.eta_days}d</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Reason: {evidencePack.data_snapshot.markdown_risk.reason}</p>
                  </div>
                </>
              )}

              {evidencePack.data_snapshot?.margin_leak && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><Flame className="h-3.5 w-3.5" /> Margin Leak</h4>
                    <div className="p-2 rounded bg-red-500/5 text-xs">
                      <span className="text-muted-foreground">Total Margin Leak</span>
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
                <p className="font-semibold mb-1">Source Tables</p>
                <div className="flex flex-wrap gap-1">
                  {evidencePack.source_tables?.map((t: string) => (
                    <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">No evidence pack available</div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
