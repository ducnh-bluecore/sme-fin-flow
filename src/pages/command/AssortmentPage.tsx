import { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers3, AlertTriangle, RefreshCw, Search, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AssortmentPage() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'scs' | 'style'>('scs');

  const { data: scsRows, isLoading: scsLoading } = useQuery({
    queryKey: ['command-scs-detail', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('kpi_size_completeness' as any)
        .order('as_of_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

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
        map.set(fc.id, fc.fc_name || fc.fc_code || fc.id);
      }
      return map;
    },
    enabled: !!tenantId && isReady,
  });

  // Fetch store names for display
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
        map.set(s.id, s.store_name || s.store_code || s.id);
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
      toast.success(`KPI Engine completed: ${data.scs_rows} SCS, ${data.chi_rows} CHI, ${data.idi_rows} IDI`);
      queryClient.invalidateQueries({ queryKey: ['command-scs'] });
      queryClient.invalidateQueries({ queryKey: ['command-chi'] });
      queryClient.invalidateQueries({ queryKey: ['command-scs-detail'] });
      queryClient.invalidateQueries({ queryKey: ['command-chi-detail'] });
      queryClient.invalidateQueries({ queryKey: ['command-distortion'] });
      queryClient.invalidateQueries({ queryKey: ['command-network-gap'] });
    },
    onError: (err: any) => toast.error(`KPI Engine failed: ${err.message}`),
  });

  // Aggregated stats
  const stats = {
    total: scsRows?.length || 0,
    broken: scsRows?.filter((r: any) => r.status === 'BROKEN').length || 0,
    atRisk: scsRows?.filter((r: any) => r.status === 'AT_RISK').length || 0,
    healthy: scsRows?.filter((r: any) => r.status === 'HEALTHY').length || 0,
  };

  const chiMap = new Map((chiRows || []).map((r: any) => [r.style_id, r]));
  const avgCHI = chiRows && chiRows.length > 0
    ? chiRows.reduce((s: number, r: any) => s + (r.curve_health_index || 0), 0) / chiRows.length
    : null;

  // Filter & sort
  let filtered = scsRows || [];
  if (statusFilter !== 'all') filtered = filtered.filter((r: any) => r.status === statusFilter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((r: any) => 
      (fcNames?.get(r.style_id) || r.style_id || '').toLowerCase().includes(q) || 
      (storeNames?.get(r.store_id) || r.store_id || '').toLowerCase().includes(q)
    );
  }
  if (sortBy === 'scs') {
    filtered = [...filtered].sort((a: any, b: any) => (a.size_completeness_score || 0) - (b.size_completeness_score || 0));
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assortment Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">Size Curve Health & Completeness Score — Detect broken runs before markdown</p>
        </div>
        <Button onClick={() => runKpiEngine.mutate()} disabled={runKpiEngine.isPending} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${runKpiEngine.isPending ? 'animate-spin' : ''}`} />
          {runKpiEngine.isPending ? 'Computing...' : 'Run KPI Engine'}
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Avg Curve Health</p>
            <p className="text-2xl font-bold mt-1">{avgCHI !== null ? `${(avgCHI * 100).toFixed(1)}%` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Healthy</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.healthy}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">At Risk</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{stats.atRisk}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Broken</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.broken}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">High MD Risk</p>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {chiRows?.filter((r: any) => r.markdown_risk_band === 'HIGH' || r.markdown_risk_band === 'CRITICAL').length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CHI by Risk Band */}
      {chiRows && chiRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Curve Health by Markdown Risk Band</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(band => {
                const count = chiRows.filter((r: any) => r.markdown_risk_band === band).length;
                const colors: Record<string, string> = { LOW: 'bg-emerald-500/10 text-emerald-700', MEDIUM: 'bg-yellow-500/10 text-yellow-700', HIGH: 'bg-orange-500/10 text-orange-700', CRITICAL: 'bg-red-500/10 text-red-700' };
                return (
                  <div key={band} className={`p-3 rounded-lg ${colors[band]}`}>
                    <p className="text-xs font-medium opacity-70">{band}</p>
                    <p className="text-xl font-bold">{count} styles</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers3 className="h-4 w-4" /> Size Completeness Details
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search style/store..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-48" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="BROKEN">Broken</SelectItem>
                  <SelectItem value="AT_RISK">At Risk</SelectItem>
                  <SelectItem value="HEALTHY">Healthy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {scsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No size completeness data</p>
              <p className="text-xs mt-1">Click "Run KPI Engine" to compute from inventory positions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead className="text-center">Sizes</TableHead>
                    <TableHead className="text-center">SCS</TableHead>
                    <TableHead>Missing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>CHI</TableHead>
                    <TableHead>MD Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((row: any) => {
                    const chi = chiMap.get(row.style_id);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs font-medium">{fcNames?.get(row.style_id) || row.style_id}</TableCell>
                        <TableCell className="text-xs">{storeNames?.get(row.store_id) || (row.store_id as string)?.slice(0, 8)}</TableCell>
                        <TableCell className="text-center">{row.sizes_present}/{row.sizes_total}</TableCell>
                        <TableCell className="text-center font-semibold">
                          {row.size_completeness_score ? `${(row.size_completeness_score * 100).toFixed(0)}%` : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(row.missing_sizes as string[] || []).slice(0, 3).map((s: string) => (
                              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                            ))}
                            {(row.missing_sizes as string[] || []).length > 3 && (
                              <Badge variant="outline" className="text-xs">+{(row.missing_sizes as string[]).length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'BROKEN' ? 'destructive' : row.status === 'AT_RISK' ? 'secondary' : 'default'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {chi ? `${(chi.curve_health_index * 100).toFixed(0)}%` : '—'}
                        </TableCell>
                        <TableCell>
                          {chi?.markdown_risk_band && (
                            <Badge variant={chi.markdown_risk_band === 'CRITICAL' || chi.markdown_risk_band === 'HIGH' ? 'destructive' : 'secondary'}>
                              {chi.markdown_risk_band}
                            </Badge>
                          )}
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
