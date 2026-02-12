import { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers3, AlertTriangle, RefreshCw, Search, ShieldAlert, TrendingDown, DollarSign, Activity, Clock, ArrowRightLeft, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [sortBy, setSortBy] = useState<'health' | 'lost_revenue' | 'markdown'>('lost_revenue');

  // Size Intelligence data
  const { summary: siSummary, healthMap, lostRevenueMap, markdownRiskMap, isLoading: siLoading, lostRevenue, sizeTransfers } = useSizeIntelligence();

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
      toast.success(`Engine: ${data.size_health_rows} Health, ${data.size_transfer_rows} Transfers, ${data.store_health_rows} Store Health`);
      queryClient.invalidateQueries({ queryKey: ['size-health'] });
      queryClient.invalidateQueries({ queryKey: ['store-size-health'] });
      queryClient.invalidateQueries({ queryKey: ['lost-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['markdown-risk'] });
      queryClient.invalidateQueries({ queryKey: ['size-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['command-chi-detail'] });
    },
    onError: (err: any) => toast.error(`Engine failed: ${err.message}`),
  });

  const avgCHI = chiRows && chiRows.length > 0
    ? chiRows.reduce((s: number, r: any) => s + (r.curve_health_index || 0), 0) / chiRows.length
    : null;

  // Build unified style list from healthMap
  const allStyles = [...healthMap.keys()];

  // Filter & sort
  let filtered = allStyles;
  if (statusFilter !== 'all') {
    filtered = filtered.filter(fcId => {
      const h = healthMap.get(fcId);
      return h?.curve_state === statusFilter;
    });
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(fcId =>
      (fcNames?.get(fcId) || fcId).toLowerCase().includes(q)
    );
  }

  // Sort
  if (sortBy === 'lost_revenue') {
    filtered = [...filtered].sort((a, b) => (lostRevenueMap.get(b)?.lost_revenue_est || 0) - (lostRevenueMap.get(a)?.lost_revenue_est || 0));
  } else if (sortBy === 'health') {
    filtered = [...filtered].sort((a, b) => (healthMap.get(a)?.size_health_score || 100) - (healthMap.get(b)?.size_health_score || 100));
  } else if (sortBy === 'markdown') {
    filtered = [...filtered].sort((a, b) => (markdownRiskMap.get(b)?.markdown_risk_score || 0) - (markdownRiskMap.get(a)?.markdown_risk_score || 0));
  }

  // Top lost revenue styles for Revenue Risk Feed
  const topLostRevStyles = (lostRevenue.data || []).slice(0, 5);

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={siSummary.avgHealthScore !== null && siSummary.avgHealthScore < 60 ? 'border-l-4 border-l-destructive' : ''}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Activity className="h-3 w-3" /> Network Size Health
            </div>
            <p className={`text-2xl font-bold ${
              siSummary.avgHealthScore === null ? '' :
              siSummary.avgHealthScore >= 80 ? 'text-emerald-600' :
              siSummary.avgHealthScore >= 60 ? 'text-amber-600' : 'text-destructive'
            }`}>
              {siSummary.avgHealthScore !== null ? `${siSummary.avgHealthScore.toFixed(0)}` : '—'}
            </p>
          </CardContent>
        </Card>

        <Card className={siSummary.totalLostRevenue > 0 ? 'border-l-4 border-l-destructive' : ''}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" /> Lost Revenue
            </div>
            <p className="text-2xl font-bold text-destructive">
              {siSummary.totalLostRevenue > 0 ? formatVNDCompact(siSummary.totalLostRevenue) : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <ShieldAlert className="h-3 w-3" /> Broken Styles
            </div>
            <p className="text-2xl font-bold text-destructive">{siSummary.brokenCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <TrendingDown className="h-3 w-3" /> Markdown Risk
            </div>
            <p className="text-2xl font-bold text-destructive">
              {siSummary.highMarkdownRiskCount}
              {siSummary.criticalMarkdownCount > 0 && (
                <span className="text-sm font-normal ml-1">({siSummary.criticalMarkdownCount} critical)</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className={siSummary.transferOpportunities > 0 ? 'border-l-4 border-l-amber-500' : ''}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <ArrowRightLeft className="h-3 w-3" /> Transfer Opportunities
            </div>
            <p className="text-2xl font-bold text-amber-600">{siSummary.transferOpportunities}</p>
            {siSummary.totalTransferNetBenefit > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">Net benefit: {formatVNDCompact(siSummary.totalTransferNetBenefit)}</p>
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
              const name = fcNames?.get(lr.product_id) || lr.product_id;
              return (
                <div key={lr.id} className="border-l-2 border-l-destructive rounded-r-md p-3 bg-destructive/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Lost: <span className="font-semibold text-destructive">{formatVNDCompact(lr.lost_revenue_est)}</span>
                        {' · '}{lr.lost_units_est} units · Driver: {lr.driver}
                        {health?.core_size_missing && ' · Core size missing'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
                    <TableHead className="text-center">Core Missing</TableHead>
                    <TableHead className="text-right">Lost Revenue</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-center">MD Risk</TableHead>
                    <TableHead className="text-center">MD ETA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((fcId) => {
                    const h = healthMap.get(fcId)!;
                    const lr = lostRevenueMap.get(fcId);
                    const md = markdownRiskMap.get(fcId);
                    const name = fcNames?.get(fcId) || fcId;

                    return (
                      <TableRow key={fcId}>
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
                        <TableCell className="text-center">
                          {h.core_size_missing ? (
                            <Badge variant="destructive" className="text-xs">Yes</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {lr ? (
                            <span className="text-destructive">{formatVNDCompact(lr.lost_revenue_est)}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {lr?.driver || '—'}
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
    </div>
  );
}
