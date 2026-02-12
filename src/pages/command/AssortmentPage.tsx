import { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers3, AlertTriangle, RefreshCw, Search, ShieldAlert, TrendingDown, DollarSign, Activity, Clock, ArrowRightLeft, ArrowRight, Lock, Flame, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useSizeIntelligence } from '@/hooks/inventory/useSizeIntelligence';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatVNDCompact } from '@/lib/formatters';

export default function AssortmentPage() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'health' | 'lost_revenue' | 'markdown' | 'cash_lock'>('lost_revenue');
  const [evidenceProductId, setEvidenceProductId] = useState<string | null>(null);

  // Size Intelligence data
  const {
    summary: siSummary, healthMap, lostRevenueMap, markdownRiskMap,
    cashLockMap, marginLeakMap, evidencePackMap,
    isLoading: siLoading, lostRevenue, sizeTransfers
  } = useSizeIntelligence();

  // CHI data (existing)
  const { data: chiRows } = useQuery({
    queryKey: ['command-chi-detail', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('kpi_curve_health' as any)
        .order('as_of_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  // Fetch FC names for display
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

  // Fetch store names for transfer display
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
      ['size-health', 'store-size-health', 'lost-revenue', 'markdown-risk', 'size-transfers', 'cash-lock', 'margin-leak', 'evidence-packs', 'command-chi-detail'].forEach(k =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );
    },
    onError: (err: any) => toast.error(`Engine failed: ${err.message}`),
  });

  // Build unified style list from healthMap
  const allStyles = [...healthMap.keys()];

  // Filter & sort
  let filtered = allStyles;
  if (statusFilter !== 'all') {
    filtered = filtered.filter(fcId => healthMap.get(fcId)?.curve_state === statusFilter);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(fcId => (fcNames?.get(fcId) || fcId).toLowerCase().includes(q));
  }

  if (sortBy === 'lost_revenue') {
    filtered = [...filtered].sort((a, b) => (lostRevenueMap.get(b)?.lost_revenue_est || 0) - (lostRevenueMap.get(a)?.lost_revenue_est || 0));
  } else if (sortBy === 'health') {
    filtered = [...filtered].sort((a, b) => (healthMap.get(a)?.size_health_score || 100) - (healthMap.get(b)?.size_health_score || 100));
  } else if (sortBy === 'markdown') {
    filtered = [...filtered].sort((a, b) => (markdownRiskMap.get(b)?.markdown_risk_score || 0) - (markdownRiskMap.get(a)?.markdown_risk_score || 0));
  } else if (sortBy === 'cash_lock') {
    filtered = [...filtered].sort((a, b) => (cashLockMap.get(b)?.cash_locked_value || 0) - (cashLockMap.get(a)?.cash_locked_value || 0));
  }

  const topLostRevStyles = (lostRevenue.data || []).slice(0, 5);

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

      {/* ── Hero KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className={siSummary.avgHealthScore !== null && siSummary.avgHealthScore < 60 ? 'border-l-4 border-l-destructive' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Activity className="h-3 w-3" /> Size Health
            </div>
            <p className={`text-xl font-bold ${
              siSummary.avgHealthScore === null ? '' :
              siSummary.avgHealthScore >= 80 ? 'text-emerald-600' :
              siSummary.avgHealthScore >= 60 ? 'text-amber-600' : 'text-destructive'
            }`}>
              {siSummary.avgHealthScore !== null ? `${siSummary.avgHealthScore.toFixed(0)}` : '—'}
            </p>
          </CardContent>
        </Card>

        <Card className={siSummary.totalLostRevenue > 0 ? 'border-l-4 border-l-destructive' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" /> Lost Revenue
            </div>
            <p className="text-xl font-bold text-destructive">
              {siSummary.totalLostRevenue > 0 ? formatVNDCompact(siSummary.totalLostRevenue) : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <ShieldAlert className="h-3 w-3" /> Broken
            </div>
            <p className="text-xl font-bold text-destructive">{siSummary.brokenCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <TrendingDown className="h-3 w-3" /> MD Risk
            </div>
            <p className="text-xl font-bold text-destructive">
              {siSummary.highMarkdownRiskCount}
              {siSummary.criticalMarkdownCount > 0 && (
                <span className="text-sm font-normal ml-1">({siSummary.criticalMarkdownCount} crit)</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Phase 3: Cash Lock */}
        <Card className={siSummary.totalCashLocked > 0 ? 'border-l-4 border-l-orange-500' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Lock className="h-3 w-3" /> Cash Locked
            </div>
            <p className="text-xl font-bold text-orange-600">
              {siSummary.totalCashLocked > 0 ? formatVNDCompact(siSummary.totalCashLocked) : '—'}
            </p>
          </CardContent>
        </Card>

        {/* Phase 3: Margin Leak */}
        <Card className={siSummary.totalMarginLeak > 0 ? 'border-l-4 border-l-red-500' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Flame className="h-3 w-3" /> Margin Leak
            </div>
            <p className="text-xl font-bold text-red-600">
              {siSummary.totalMarginLeak > 0 ? formatVNDCompact(siSummary.totalMarginLeak) : '—'}
            </p>
          </CardContent>
        </Card>

        <Card className={siSummary.transferOpportunities > 0 ? 'border-l-4 border-l-amber-500' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <ArrowRightLeft className="h-3 w-3" /> Transfers
            </div>
            <p className="text-xl font-bold text-amber-600">{siSummary.transferOpportunities}</p>
            {siSummary.totalTransferNetBenefit > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{formatVNDCompact(siSummary.totalTransferNetBenefit)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Revenue Risk Feed ── */}
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

      {/* ── Smart Transfer Opportunities ── */}
      {(sizeTransfers.data || []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-amber-600" /> Smart Transfer Suggestions
              <Badge variant="secondary" className="text-xs ml-auto">{(sizeTransfers.data || []).length} opportunities</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Net Benefit</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sizeTransfers.data || []).slice(0, 30).map((t) => {
                    const name = fcNames?.get(t.product_id) || t.product_id;
                    const srcName = storeNames?.get(t.source_store_id) || t.source_store_id.slice(0, 8);
                    const dstName = storeNames?.get(t.dest_store_id) || t.dest_store_id.slice(0, 8);
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs font-medium max-w-[160px] truncate">{name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{t.size_code}</Badge></TableCell>
                        <TableCell className="text-xs">
                          <span className="text-muted-foreground">{srcName}</span>
                          <ArrowRight className="h-3 w-3 inline mx-1" />
                          <span className="font-medium">{dstName}</span>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-sm">{t.transfer_qty}</TableCell>
                        <TableCell className="text-right text-xs font-medium text-emerald-600">
                          {formatVNDCompact(t.net_benefit)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.reason}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {(sizeTransfers.data || []).length > 30 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">Showing 30 of {(sizeTransfers.data || []).length}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Enhanced Detail Table ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers3 className="h-4 w-4" /> Size Health Details
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search style..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-48" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="broken">Broken</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="watch">Watch</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lost_revenue">By Lost Revenue</SelectItem>
                  <SelectItem value="health">By Health Score</SelectItem>
                  <SelectItem value="markdown">By MD Risk</SelectItem>
                  <SelectItem value="cash_lock">By Cash Lock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {siLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No size health data</p>
              <p className="text-xs mt-1">Click "Run Engine" to compute Size Intelligence</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style</TableHead>
                    <TableHead className="text-center">Health</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">Lost Rev</TableHead>
                    <TableHead className="text-right">Cash Lock</TableHead>
                    <TableHead className="text-right">Margin Leak</TableHead>
                    <TableHead className="text-center">MD Risk</TableHead>
                    <TableHead className="text-center">ETA</TableHead>
                    <TableHead className="text-center">Evidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((fcId) => {
                    const h = healthMap.get(fcId)!;
                    const lr = lostRevenueMap.get(fcId);
                    const md = markdownRiskMap.get(fcId);
                    const cl = cashLockMap.get(fcId);
                    const ml = marginLeakMap.get(fcId) || 0;
                    const name = fcNames?.get(fcId) || fcId;
                    const hasEvidence = evidencePackMap.has(fcId);

                    return (
                      <TableRow key={fcId} className={hasEvidence ? 'cursor-pointer hover:bg-muted/50' : ''} onClick={() => hasEvidence && setEvidenceProductId(fcId)}>
                        <TableCell className="text-xs font-medium max-w-[200px] truncate">{name}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold text-sm ${
                            h.size_health_score >= 80 ? 'text-emerald-600' :
                            h.size_health_score >= 60 ? 'text-amber-600' :
                            h.size_health_score >= 40 ? 'text-orange-600' : 'text-destructive'
                          }`}>
                            {h.size_health_score.toFixed(0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            h.curve_state === 'broken' ? 'destructive' :
                            h.curve_state === 'risk' ? 'secondary' : 'default'
                          } className="text-xs capitalize">
                            {h.curve_state}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {lr ? <span className="text-destructive">{formatVNDCompact(lr.lost_revenue_est)}</span> : '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {cl ? <span className="text-orange-600">{formatVNDCompact(cl.cash_locked_value)}</span> : '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {ml > 0 ? <span className="text-red-600">{formatVNDCompact(ml)}</span> : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {md ? (
                            <span className={`font-semibold text-xs ${
                              md.markdown_risk_score >= 80 ? 'text-destructive' :
                              md.markdown_risk_score >= 60 ? 'text-orange-600' :
                              md.markdown_risk_score >= 40 ? 'text-amber-600' : 'text-muted-foreground'
                            }`}>
                              {md.markdown_risk_score}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {md?.markdown_eta_days ? `${md.markdown_eta_days}d` : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {hasEvidence ? <FileText className="h-3.5 w-3.5 mx-auto text-muted-foreground" /> : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filtered.length > 100 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">Showing 100 of {filtered.length} rows</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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

              {/* Health */}
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

              {/* Lost Revenue */}
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

              {/* Cash Lock */}
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

              {/* Markdown Risk */}
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

              {/* Margin Leak */}
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
