import { useState } from 'react';
import { motion } from 'framer-motion';
import { Network, AlertTriangle, ArrowRight, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useNavigate } from 'react-router-dom';

function formatVND(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '₫0';
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `₫${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `₫${(value / 1e6).toFixed(0)}M`;
  return `₫${value?.toFixed(0) || 0}`;
}

export default function NetworkGapPage() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Fetch family code names for mapping
  const { data: fcList } = useQuery({
    queryKey: ['command-fc-names-gap', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('inv_family_codes' as any)
        .select('id,fc_name,fc_code')
        .eq('is_active', true)
        .limit(5000);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  const fcMap = new Map<string, string>();
  for (const fc of fcList || []) {
    fcMap.set(fc.id, fc.fc_name || fc.fc_code || fc.id);
  }

  const { data: gapRows, isLoading } = useQuery({
    queryKey: ['command-network-gap-detail', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('kpi_network_gap' as any)
        .order('revenue_at_risk', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  const totalShortage = gapRows?.reduce((s: number, r: any) => s + (r.true_shortage_units || 0), 0) || 0;
  const totalRevenueAtRisk = gapRows?.reduce((s: number, r: any) => s + (r.revenue_at_risk || 0), 0) || 0;
  const totalNetGap = gapRows?.reduce((s: number, r: any) => s + (r.net_gap_units || 0), 0) || 0;
  const totalReallocatable = gapRows?.reduce((s: number, r: any) => s + (r.reallocatable_units || 0), 0) || 0;

  let filtered = gapRows || [];
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((r: any) => {
      const name = fcMap.get(r.style_id) || r.style_id || '';
      return name.toLowerCase().includes(q);
    });
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Network Gap Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">True shortage after allocation + rebalance — bridge to production</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/command/production')}>
          Production Candidates <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">True Shortage</p>
            <p className="text-2xl font-bold mt-1">{totalShortage.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">units</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Revenue at Risk</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{formatVND(totalRevenueAtRisk)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Reallocatable</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{totalReallocatable.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">units available to move</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Net Gap (need production)</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{totalNetGap.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">units</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual: shortage vs reallocatable */}
      {gapRows && gapRows.length > 0 && totalShortage > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Coverage Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Network demand coverage</span>
                <span className="font-medium">
                  {totalReallocatable > 0 ? `${Math.min(100, Math.round((totalReallocatable / (totalShortage + totalReallocatable)) * 100))}%` : '0%'} covered by reallocation
                </span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all" 
                  style={{ width: `${Math.min(100, Math.round((totalReallocatable / Math.max(1, totalShortage + totalReallocatable)) * 100))}%` }} 
                />
                <div 
                  className="bg-red-500 h-full transition-all" 
                  style={{ width: `${Math.min(100, Math.round((totalShortage / Math.max(1, totalShortage + totalReallocatable)) * 100))}%` }} 
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Reallocatable</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> True Shortage</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Gap Drilldown by Style
            </CardTitle>
            <Input placeholder="Search style..." value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No network gap data</p>
              <p className="text-xs mt-1">Run KPI Engine from Assortment page to compute gaps</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style</TableHead>
                    <TableHead className="text-right">Reallocatable</TableHead>
                    <TableHead className="text-right">True Shortage</TableHead>
                    <TableHead className="text-right">Net Gap</TableHead>
                    <TableHead className="text-right">Revenue at Risk</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((row: any) => {
                    const severity = row.true_shortage_units > 100 ? 'CRITICAL' : row.true_shortage_units > 20 ? 'HIGH' : 'MEDIUM';
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium text-sm">{fcMap.get(row.style_id) || row.style_id?.slice(0, 8)}</TableCell>
                        <TableCell className="text-right text-emerald-600">{(row.reallocatable_units || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">{(row.true_shortage_units || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-orange-600">{(row.net_gap_units || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">{formatVND(row.revenue_at_risk)}</TableCell>
                        <TableCell>
                          <Badge variant={severity === 'CRITICAL' ? 'destructive' : 'secondary'}>{severity}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filtered.length > 100 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">Showing 100 of {filtered.length}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
