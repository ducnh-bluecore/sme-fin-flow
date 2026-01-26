/**
 * ============================================
 * SSOT COMPLIANCE DASHBOARD COMPONENT
 * ============================================
 * 
 * Real-time monitoring of critical data views to detect regressions
 * BEFORE they reach users.
 * 
 * Usage: Add ?governance=1 to any URL to see compliance status
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useTenant';
import { 
  useMetricRegistry, 
  useMetricConsistency, 
  useGovernanceDashboard 
} from '@/hooks/useMetricGovernance';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Database, 
  RefreshCw,
  Shield,
  Activity,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsightQualityCard } from './InsightQualityCard';
import { FDPConsistencyPanel } from './FDPConsistencyPanel';

interface HealthCheck {
  name: string;
  view: string;
  status: 'passing' | 'failing' | 'warning' | 'checking';
  message: string;
  expectedBehavior: string;
  lastChecked: Date | null;
}

export function SSOTComplianceDashboard() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;
  
  const { data: registry, isLoading: registryLoading, refetch: refetchRegistry } = useMetricRegistry();
  const { data: consistency, isLoading: consistencyLoading, refetch: refetchConsistency } = useMetricConsistency();
  const { data: governance, isLoading: governanceLoading } = useGovernanceDashboard();
  
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [isRunningHealthChecks, setIsRunningHealthChecks] = useState(false);

  const isLoading = registryLoading || consistencyLoading || governanceLoading;

  // Define critical health checks for ALL modules
  const criticalChecks: Omit<HealthCheck, 'status' | 'message' | 'lastChecked'>[] = [
    // ═══════════════════════════════════════════════════════════════════
    // CDP - Customer Data Platform
    // ═══════════════════════════════════════════════════════════════════
    {
      name: 'CDP Equity Snapshot',
      view: 'v_cdp_equity_snapshot',
      expectedBehavior: 'Phải trả về total_equity_12m > 0 khi có dữ liệu equity trong cdp_customer_equity_computed'
    },
    {
      name: 'CDP Data Quality',
      view: 'v_cdp_data_quality',
      expectedBehavior: 'Phải trả về confidence_level không null khi có orders'
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // FDP - Financial Data Platform
    // ═══════════════════════════════════════════════════════════════════
    {
      name: 'FDP Finance Summary',
      view: 'v_fdp_finance_summary',
      expectedBehavior: 'Phải trả về net_revenue > 0 khi có delivered orders'
    },
    {
      name: 'FDP Period Summary (RPC)',
      view: 'get_fdp_period_summary',
      expectedBehavior: 'RPC phải trả về totalRevenue > 0 khi có orders trong date range'
    },
    {
      name: 'Central Metrics Snapshots',
      view: 'central_metrics_snapshots',
      expectedBehavior: 'Phải có snapshot gần nhất trong 24h'
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // MDP - Marketing Data Platform
    // ═══════════════════════════════════════════════════════════════════
    {
      name: 'MDP Campaign Performance',
      view: 'v_mdp_campaign_performance',
      expectedBehavior: 'Phải trả về campaigns khi có data trong promotion_campaigns'
    },
    {
      name: 'MDP Mode Summary',
      view: 'v_mdp_mode_summary',
      expectedBehavior: 'Phải trả về tổng spend và orders khi có campaigns'
    },
    {
      name: 'MDP Funnel Summary',
      view: 'v_mdp_funnel_summary',
      expectedBehavior: 'Phải trả về funnel data khi có campaigns'
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // CONTROL TOWER
    // ═══════════════════════════════════════════════════════════════════
    {
      name: 'Control Tower Summary (RPC)',
      view: 'get_control_tower_summary',
      expectedBehavior: 'RPC phải trả về totalRevenue > 0 khi có orders'
    },
    {
      name: 'Decision Cards',
      view: 'decision_cards',
      expectedBehavior: 'Table phải accessible và không có orphan records'
    },
    {
      name: 'Early Warning Alerts',
      view: 'early_warning_alerts',
      expectedBehavior: 'Table phải accessible với proper schema'
    }
  ];

  const runHealthChecks = useCallback(async () => {
    if (!tenantId) return;
    
    setIsRunningHealthChecks(true);
    const results: HealthCheck[] = [];

    // Helper: Run all checks in parallel for speed
    const checkPromises = criticalChecks.map(async (check) => {
      try {
        // ═══════════════════════════════════════════════════════════════════
        // CDP CHECKS
        // ═══════════════════════════════════════════════════════════════════
        if (check.view === 'v_cdp_equity_snapshot') {
          const [viewResult, sourceResult] = await Promise.all([
            supabase.from('v_cdp_equity_snapshot')
              .select('total_equity_12m, total_equity_24m')
              .eq('tenant_id', tenantId)
              .maybeSingle(),
            supabase.from('cdp_customer_equity_computed')
              .select('equity_12m')
              .eq('tenant_id', tenantId)
              .not('equity_12m', 'is', null)
              .limit(1)
          ]);

          const hasSourceData = sourceResult.data && sourceResult.data.length > 0;
          const hasViewData = viewResult.data && viewResult.data.total_equity_12m !== null;

          if (hasSourceData && !hasViewData) {
            return { ...check, status: 'failing' as const, message: `REGRESSION: Source có data, nhưng view trả về NULL`, lastChecked: new Date() };
          } else if (hasSourceData && hasViewData) {
            return { ...check, status: 'passing' as const, message: `OK: ${formatValue(viewResult.data.total_equity_12m)} equity`, lastChecked: new Date() };
          } else {
            return { ...check, status: 'warning' as const, message: 'Chưa có dữ liệu equity trong source', lastChecked: new Date() };
          }
        }
        
        if (check.view === 'v_cdp_data_quality') {
          const { data, error } = await supabase
            .from('v_cdp_data_quality')
            .select('confidence_level, is_reliable')
            .eq('tenant_id', tenantId)
            .maybeSingle();

          if (error) return { ...check, status: 'failing' as const, message: `Error: ${error.message}`, lastChecked: new Date() };
          if (data) return { ...check, status: 'passing' as const, message: `OK: confidence=${data.confidence_level}`, lastChecked: new Date() };
          return { ...check, status: 'warning' as const, message: 'No data quality record', lastChecked: new Date() };
        }

        // ═══════════════════════════════════════════════════════════════════
        // FDP CHECKS
        // ═══════════════════════════════════════════════════════════════════
        if (check.view === 'v_fdp_finance_summary') {
          const [viewResult, sourceResult] = await Promise.all([
            supabase.from('v_fdp_finance_summary')
              .select('net_revenue, gross_revenue')
              .eq('tenant_id', tenantId)
              .maybeSingle(),
            supabase.from('external_orders')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('status', 'delivered')
              .limit(1)
          ]);

          const hasSourceData = sourceResult.data && sourceResult.data.length > 0;
          const hasViewData = viewResult.data && (viewResult.data.net_revenue ?? 0) > 0;

          if (hasSourceData && !hasViewData) {
            return { ...check, status: 'failing' as const, message: `REGRESSION: Có delivered orders nhưng view trả về 0`, lastChecked: new Date() };
          } else if (hasViewData) {
            return { ...check, status: 'passing' as const, message: `OK: Net Revenue = ${formatValue(viewResult.data.net_revenue)}`, lastChecked: new Date() };
          }
          return { ...check, status: 'warning' as const, message: 'Chưa có delivered orders', lastChecked: new Date() };
        }

        if (check.view === 'get_fdp_period_summary') {
          const today = new Date();
          const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const endDate = today.toISOString().split('T')[0];
          
          const { data, error } = await supabase.rpc('get_fdp_period_summary', {
            p_tenant_id: tenantId,
            p_start_date: startDate,
            p_end_date: endDate,
          });

          if (error) return { ...check, status: 'failing' as const, message: `RPC Error: ${error.message}`, lastChecked: new Date() };
          
          const result = data as Record<string, unknown>;
          const totalRevenue = (result?.totalRevenue as number) ?? 0;
          
          if (totalRevenue > 0) {
            return { ...check, status: 'passing' as const, message: `OK: Revenue = ${formatValue(totalRevenue)}`, lastChecked: new Date() };
          }
          return { ...check, status: 'warning' as const, message: 'RPC trả về 0 revenue', lastChecked: new Date() };
        }

        if (check.view === 'central_metrics_snapshots') {
          const { data, error } = await supabase
            .from('central_metrics_snapshots')
            .select('snapshot_at')
            .eq('tenant_id', tenantId)
            .order('snapshot_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) return { ...check, status: 'failing' as const, message: `Error: ${error.message}`, lastChecked: new Date() };
          if (data) {
            const hoursAgo = (Date.now() - new Date(data.snapshot_at).getTime()) / (1000 * 60 * 60);
            return { ...check, status: hoursAgo < 24 ? 'passing' as const : 'warning' as const, message: `Last snapshot: ${hoursAgo.toFixed(1)}h ago`, lastChecked: new Date() };
          }
          return { ...check, status: 'warning' as const, message: 'No snapshots found', lastChecked: new Date() };
        }

        // ═══════════════════════════════════════════════════════════════════
        // MDP CHECKS
        // ═══════════════════════════════════════════════════════════════════
        if (check.view === 'v_mdp_campaign_performance') {
          const [viewResult, sourceResult] = await Promise.all([
            supabase.from('v_mdp_campaign_performance')
              .select('campaign_id, spend')
              .eq('tenant_id', tenantId)
              .limit(5),
            supabase.from('promotion_campaigns')
              .select('id')
              .eq('tenant_id', tenantId)
              .limit(1)
          ]);

          const hasSourceData = sourceResult.data && sourceResult.data.length > 0;
          const hasViewData = viewResult.data && viewResult.data.length > 0;

          if (hasSourceData && !hasViewData) {
            return { ...check, status: 'failing' as const, message: `REGRESSION: Có campaigns nhưng view trống`, lastChecked: new Date() };
          } else if (hasViewData) {
            return { ...check, status: 'passing' as const, message: `OK: ${viewResult.data.length} campaigns visible`, lastChecked: new Date() };
          }
          return { ...check, status: 'warning' as const, message: 'Chưa có campaign data', lastChecked: new Date() };
        }

        if (check.view === 'v_mdp_mode_summary') {
          const { data, error } = await supabase
            .from('v_mdp_mode_summary')
            .select('total_spend, total_orders')
            .eq('tenant_id', tenantId)
            .maybeSingle();

          if (error) return { ...check, status: 'failing' as const, message: `Error: ${error.message}`, lastChecked: new Date() };
          if (data) return { ...check, status: 'passing' as const, message: `OK: Spend=${formatValue(data.total_spend ?? 0)}`, lastChecked: new Date() };
          return { ...check, status: 'warning' as const, message: 'No mode summary data', lastChecked: new Date() };
        }

        if (check.view === 'v_mdp_funnel_summary') {
          const { data, error } = await supabase
            .from('v_mdp_funnel_summary')
            .select('impressions, orders')
            .eq('tenant_id', tenantId)
            .maybeSingle();

          if (error) return { ...check, status: 'failing' as const, message: `Error: ${error.message}`, lastChecked: new Date() };
          if (data) return { ...check, status: 'passing' as const, message: `OK: ${data.orders ?? 0} orders in funnel`, lastChecked: new Date() };
          return { ...check, status: 'warning' as const, message: 'No funnel data', lastChecked: new Date() };
        }

        // ═══════════════════════════════════════════════════════════════════
        // CONTROL TOWER CHECKS
        // ═══════════════════════════════════════════════════════════════════
        if (check.view === 'get_control_tower_summary') {
          const today = new Date();
          const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const endDate = today.toISOString().split('T')[0];
          
          const { data, error } = await supabase.rpc('get_control_tower_summary', {
            p_tenant_id: tenantId,
            p_start_date: startDate,
            p_end_date: endDate,
          });

          if (error) return { ...check, status: 'failing' as const, message: `RPC Error: ${error.message}`, lastChecked: new Date() };
          
          const result = data as Record<string, unknown>;
          const totalRevenue = (result?.totalRevenue as number) ?? 0;
          
          if (totalRevenue > 0) {
            return { ...check, status: 'passing' as const, message: `OK: Revenue = ${formatValue(totalRevenue)}`, lastChecked: new Date() };
          }
          return { ...check, status: 'warning' as const, message: 'RPC trả về 0 revenue', lastChecked: new Date() };
        }

        if (check.view === 'decision_cards') {
          const { error, count } = await supabase
            .from('decision_cards')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

          if (error) return { ...check, status: 'failing' as const, message: `Error: ${error.message}`, lastChecked: new Date() };
          return { ...check, status: 'passing' as const, message: `OK: ${count ?? 0} decision cards accessible`, lastChecked: new Date() };
        }

        if (check.view === 'early_warning_alerts') {
          const { error, count } = await supabase
            .from('early_warning_alerts')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

          if (error) return { ...check, status: 'failing' as const, message: `Error: ${error.message}`, lastChecked: new Date() };
          return { ...check, status: 'passing' as const, message: `OK: ${count ?? 0} alerts accessible`, lastChecked: new Date() };
        }

        // Default fallback
        return { ...check, status: 'warning' as const, message: 'Check not implemented', lastChecked: new Date() };
        
      } catch (err) {
        return { ...check, status: 'failing' as const, message: `Exception: ${err}`, lastChecked: new Date() };
      }
    });

    const resolvedResults = await Promise.all(checkPromises);
    setHealthChecks(resolvedResults);
    setIsRunningHealthChecks(false);
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      runHealthChecks();
    }
  }, [tenantId, runHealthChecks]);

  // Calculate compliance stats
  const totalMetrics = registry?.length || 0;
  const consistencyChecks = consistency || [];
  const okChecks = consistencyChecks.filter(c => c.status === 'OK').length;
  const mismatchChecks = consistencyChecks.filter(c => c.status === 'MISMATCH').length;
  
  const complianceRate = consistencyChecks.length > 0 
    ? Math.round((okChecks / consistencyChecks.length) * 100) 
    : 100;

  // Module stats from governance
  const moduleStats = governance || [];

  // Health check stats
  const failingHealthChecks = healthChecks.filter(c => c.status === 'failing').length;
  const warningHealthChecks = healthChecks.filter(c => c.status === 'warning').length;

  const handleRefresh = () => {
    refetchRegistry();
    refetchConsistency();
    runHealthChecks();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">🛡️ SSOT Governance Dashboard</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {failingHealthChecks > 0 && (
            <Badge variant="destructive">{failingHealthChecks} FAILING</Badge>
          )}
          {failingHealthChecks === 0 && healthChecks.length > 0 && (
            <Badge className="bg-success">ALL SYSTEMS OK</Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRunningHealthChecks}>
            <RefreshCw className={cn("w-4 h-4 mr-1", isRunningHealthChecks && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Critical Health Checks */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Critical View Health Checks
          </h4>
          <div className="space-y-2">
            {healthChecks.map((check, idx) => (
              <div 
                key={idx}
                className={cn(
                  "p-3 rounded-lg border",
                  check.status === 'failing' && "border-destructive/50 bg-destructive/5",
                  check.status === 'warning' && "border-warning/50 bg-warning/5",
                  check.status === 'passing' && "border-success/50 bg-success/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {check.status === 'passing' && <CheckCircle2 className="w-4 h-4 text-success" />}
                    {check.status === 'failing' && <XCircle className="w-4 h-4 text-destructive" />}
                    {check.status === 'warning' && <AlertTriangle className="w-4 h-4 text-warning" />}
                    <span className="font-medium text-sm">{check.name}</span>
                  </div>
                  <Badge 
                    variant={check.status === 'passing' ? 'default' : check.status === 'failing' ? 'destructive' : 'outline'}
                    className={check.status === 'passing' ? 'bg-success' : ''}
                  >
                    {check.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{check.message}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Expected: {check.expectedBehavior}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FDP Cross-Screen Consistency - New */}
        <FDPConsistencyPanel />

        {/* Insight Quality Gate - Phase 3 */}
        <InsightQualityCard />

        {/* Compliance Score */}
        <div className="grid grid-cols-4 gap-4">
          <ComplianceCard 
            label="Compliance Rate"
            value={`${complianceRate}%`}
            status={complianceRate >= 95 ? 'success' : complianceRate >= 80 ? 'warning' : 'error'}
            icon={<Activity className="w-4 h-4" />}
          />
          <ComplianceCard 
            label="Registered Metrics"
            value={totalMetrics}
            status="neutral"
            icon={<Database className="w-4 h-4" />}
          />
          <ComplianceCard 
            label="Consistency OK"
            value={okChecks}
            status="success"
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
          <ComplianceCard 
            label="Mismatches"
            value={mismatchChecks}
            status={mismatchChecks > 0 ? 'error' : 'success'}
            icon={<XCircle className="w-4 h-4" />}
          />
        </div>

        {/* Module Status */}
        <div>
          <h4 className="text-sm font-medium mb-3">Module Status</h4>
          <div className="space-y-2">
            {moduleStats.length > 0 ? moduleStats.map((mod) => (
              <div key={mod.module} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{mod.module}</Badge>
                  <span className="text-sm text-muted-foreground">{mod.category}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs">
                    {mod.total_metrics} metrics
                  </span>
                  {mod.violations_7d > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {mod.violations_7d} violations
                    </Badge>
                  )}
                  {mod.critical_unresolved > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {mod.critical_unresolved} critical
                    </Badge>
                  )}
                  {mod.violations_7d === 0 && mod.critical_unresolved === 0 && (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  )}
                </div>
              </div>
            )) : (
              <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                No governance data available yet
              </div>
            )}
          </div>
        </div>

        {/* Consistency Check Violations */}
        {mismatchChecks > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              SSOT Violations Detected
            </h4>
            <div className="space-y-2">
              {consistencyChecks
                .filter(c => c.status === 'MISMATCH')
                .map((check, idx) => (
                  <div key={idx} className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{check.metric_pair}</span>
                      <Badge variant="destructive" className="text-xs">
                        {check.deviation_percent.toFixed(1)}% variance
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">{check.source_a}:</span>{' '}
                        {formatValue(check.value_a)}
                      </div>
                      <div>
                        <span className="font-medium">{check.source_b}:</span>{' '}
                        {formatValue(check.value_b)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* All Clear */}
        {mismatchChecks === 0 && failingHealthChecks === 0 && healthChecks.length > 0 && (
          <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <div>
              <p className="font-medium text-success">All Systems Compliant</p>
              <p className="text-xs text-muted-foreground">
                {healthChecks.length} critical checks passed. No SSOT violations detected.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper components
interface ComplianceCardProps {
  label: string;
  value: string | number;
  status: 'success' | 'warning' | 'error' | 'neutral';
  icon: React.ReactNode;
}

function ComplianceCard({ label, value, status, icon }: ComplianceCardProps) {
  const statusStyles = {
    success: 'bg-success/10 border-success/20 text-success',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    error: 'bg-destructive/10 border-destructive/20 text-destructive',
    neutral: 'bg-muted/30 border-muted text-foreground',
  };

  return (
    <div className={cn('p-4 rounded-lg border', statusStyles[status])}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function formatValue(value: number): string {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}
