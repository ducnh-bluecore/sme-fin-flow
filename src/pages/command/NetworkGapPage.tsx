import { useState, Fragment } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, TrendingDown, Factory, ShieldCheck, ShieldAlert, ShieldX, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  // Filter out bug rows: only keep rows with real shortage or revenue at risk
  const validRows = (gapRows || []).filter((r: any) => (r.true_shortage_units || 0) > 0 || (r.revenue_at_risk || 0) > 0);
  
  const totalShortage = validRows.reduce((s: number, r: any) => s + (r.true_shortage_units || 0), 0);
  const totalRevenueAtRisk = validRows.reduce((s: number, r: any) => s + (r.revenue_at_risk || 0), 0);
  const totalNetGap = validRows.reduce((s: number, r: any) => s + (r.net_gap_units || 0), 0);
  const totalReallocatable = (gapRows || []).reduce((s: number, r: any) => s + (r.reallocatable_units || 0), 0);
  const stylesAffected = validRows.length;
  const stylesNeedProduction = validRows.filter((r: any) => (r.true_shortage_units || 0) > 0).length;

  // Transfer solvability
  const transferCoverage = totalShortage > 0
    ? Math.min(100, Math.round((totalReallocatable / (totalShortage + totalReallocatable)) * 100))
    : 100;

  // Decision logic
  const decisionLevel: 'safe' | 'monitor' | 'action' = 
    totalShortage === 0 || transferCoverage >= 95 ? 'safe' :
    totalShortage < 50 ? 'monitor' : 'action';

  // Search filter
  let filtered = validRows;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((r: any) => {
      const name = fcMap.get(r.style_id) || r.style_id || '';
      return name.toLowerCase().includes(q);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Coverage Engine"
        subtitle="Identify supply risks before they become lost sales"
        icon={<Package className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/command/production')}>
            Production Candidates <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        }
      />

      {/* Decision Banner */}
      {!isLoading && (
        <DecisionBanner
          level={decisionLevel}
          totalShortage={totalShortage}
          totalRevenueAtRisk={totalRevenueAtRisk}
          stylesNeedProduction={stylesNeedProduction}
          transferCoverage={transferCoverage}
        />
      )}

      {/* KPI Bar — reordered for COO mental model */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Net Production Required</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{totalNetGap.toLocaleString()}</p>
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
            <p className="text-xs text-muted-foreground">Transfer Solvable</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{totalReallocatable.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">units via reallocation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Styles Affected</p>
            <p className="text-2xl font-bold mt-1">{stylesAffected}</p>
            <p className="text-xs text-muted-foreground">with real shortage</p>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Solvability Bar */}
      {totalShortage > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Transfer Solvability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shortage solvable without production</span>
                <span className="font-medium">{transferCoverage}%</span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${transferCoverage}%` }} />
                <div className="bg-red-500 h-full transition-all" style={{ width: `${100 - transferCoverage}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Transfer covers</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Needs production</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production Radar */}
      {stylesNeedProduction > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="h-4 w-4 text-orange-600" /> Production Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Styles need production</p>
                <p className="text-xl font-bold mt-0.5">{stylesNeedProduction}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Units required</p>
                <p className="text-xl font-bold mt-0.5">{totalShortage.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue exposure</p>
                <p className="text-xl font-bold mt-0.5 text-red-600">{formatVND(totalRevenueAtRisk)}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/command/production')}>
              Review Production Candidates <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Detail Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Gap Drilldown
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
              <p className="text-sm">No supply risk detected</p>
              <p className="text-xs mt-1">All demand is covered by current network inventory</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style</TableHead>
                    <TableHead className="text-right">Net Gap</TableHead>
                    <TableHead className="text-right">Revenue at Risk</TableHead>
                    <TableHead className="text-right">Transferable</TableHead>
                    <TableHead className="text-right">Shortage</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((row: any) => {
                    const needsProduction = (row.true_shortage_units || 0) > 0;
                    const isExpanded = expandedId === row.id;
                    const transferable = row.reallocatable_units || 0;
                    const shortage = row.true_shortage_units || 0;
                    const netGap = row.net_gap_units || 0;
                    const coverPct = netGap > 0 ? Math.min(100, Math.round((transferable / netGap) * 100)) : 100;
                    return (
                      <Fragment key={row.id}>
                        <TableRow 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                        >
                          <TableCell className="font-medium text-sm">{fcMap.get(row.style_id) || row.style_id?.slice(0, 8)}</TableCell>
                          <TableCell className="text-right text-orange-600">{netGap.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">{formatVND(row.revenue_at_risk)}</TableCell>
                          <TableCell className="text-right text-emerald-600">{transferable.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{shortage.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={needsProduction ? 'destructive' : 'secondary'}>
                              {needsProduction ? 'Needs Production' : 'Transfer Only'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/30 px-6 py-4">
                              <div className="space-y-4">
                                {/* Decision Reasoning */}
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Decision Reasoning</p>
                                  <div className="bg-background border rounded-lg p-3 space-y-2">
                                    {needsProduction ? (
                                      <>
                                        <p className="text-sm">
                                          <span className="font-medium text-foreground">Network gap of {netGap} units</span> detected. 
                                          Transfer can cover <span className="text-emerald-600 font-medium">{transferable} units ({coverPct}%)</span>, 
                                          leaving <span className="text-red-600 font-medium">{shortage} units</span> that require production.
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          Revenue exposure: <span className="font-medium text-red-600">{formatVND(row.revenue_at_risk)}</span> if shortage is not resolved.
                                        </p>
                                      </>
                                    ) : (
                                      <p className="text-sm">
                                        <span className="font-medium text-foreground">Network gap of {netGap} units</span> fully covered by 
                                        available transfer stock (<span className="text-emerald-600 font-medium">{transferable} units</span>). 
                                        No production required.
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Visual Waterfall */}
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Gap Waterfall</p>
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded px-3 py-2 text-center">
                                      <p className="text-muted-foreground">Net Gap</p>
                                      <p className="text-lg font-bold text-orange-600">{netGap}</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded px-3 py-2 text-center">
                                      <p className="text-muted-foreground">Transferable</p>
                                      <p className="text-lg font-bold text-emerald-600">−{transferable}</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className={`rounded px-3 py-2 text-center border ${shortage > 0 ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800'}`}>
                                      <p className="text-muted-foreground">Shortage</p>
                                      <p className={`text-lg font-bold ${shortage > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{shortage}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Meta */}
                                <p className="text-xs text-muted-foreground">Analysis date: {row.as_of_date || '—'}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
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

/* ─── Decision Banner ─── */
function DecisionBanner({ level, totalShortage, totalRevenueAtRisk, stylesNeedProduction, transferCoverage }: {
  level: 'safe' | 'monitor' | 'action';
  totalShortage: number;
  totalRevenueAtRisk: number;
  stylesNeedProduction: number;
  transferCoverage: number;
}) {
  if (level === 'safe') {
    return (
      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 p-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">Production NOT required</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
              {transferCoverage}% of shortage solvable by transfer. No immediate production needed.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (level === 'monitor') {
    return (
      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">Minor shortage — monitor only</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              {totalShortage} units / {formatVND(totalRevenueAtRisk)} revenue at risk across {stylesNeedProduction} style{stylesNeedProduction > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-4">
      <div className="flex items-center gap-3">
        <ShieldX className="h-6 w-6 text-red-600 shrink-0" />
        <div>
          <p className="font-semibold text-red-800 dark:text-red-300">Production REQUIRED</p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
            {stylesNeedProduction} style{stylesNeedProduction > 1 ? 's' : ''}, {totalShortage.toLocaleString()} units, {formatVND(totalRevenueAtRisk)} at risk
          </p>
        </div>
      </div>
    </motion.div>
  );
}
