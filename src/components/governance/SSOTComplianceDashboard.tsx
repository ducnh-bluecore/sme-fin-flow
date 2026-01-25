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
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Define critical health checks
  const criticalChecks: Omit<HealthCheck, 'status' | 'message' | 'lastChecked'>[] = [
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
    {
      name: 'Finance Snapshots',
      view: 'central_metrics_snapshots',
      expectedBehavior: 'Phải có snapshot gần nhất trong 24h'
    }
  ];

  const runHealthChecks = useCallback(async () => {
    if (!tenantId) return;
    
    setIsRunningHealthChecks(true);
    const results: HealthCheck[] = [];

    for (const check of criticalChecks) {
      try {
        if (check.view === 'v_cdp_equity_snapshot') {
          const { data, error } = await supabase
            .from('v_cdp_equity_snapshot')
            .select('total_equity_12m, total_equity_24m')
            .eq('tenant_id', tenantId)
            .maybeSingle();

          // Check source data exists
          const { data: sourceData } = await supabase
            .from('cdp_customer_equity_computed')
            .select('equity_12m')
            .eq('tenant_id', tenantId)
            .not('equity_12m', 'is', null)
            .limit(1);

          const hasSourceData = sourceData && sourceData.length > 0;
          const hasViewData = data && data.total_equity_12m !== null;

          if (hasSourceData && !hasViewData) {
            results.push({
              ...check,
              status: 'failing',
              message: `REGRESSION: Source có data, nhưng view trả về NULL`,
              lastChecked: new Date()
            });
          } else if (hasSourceData && hasViewData) {
            results.push({
              ...check,
              status: 'passing',
              message: `OK: View trả về ${formatValue(data.total_equity_12m)} equity`,
              lastChecked: new Date()
            });
          } else {
            results.push({
              ...check,
              status: 'warning',
              message: 'Chưa có dữ liệu equity trong source table',
              lastChecked: new Date()
            });
          }
        } else if (check.view === 'v_cdp_data_quality') {
          const { data, error } = await supabase
            .from('v_cdp_data_quality')
            .select('confidence_level, is_reliable')
            .eq('tenant_id', tenantId)
            .maybeSingle();

          if (error) {
            results.push({
              ...check,
              status: 'failing',
              message: `Error: ${error.message}`,
              lastChecked: new Date()
            });
          } else if (data) {
            results.push({
              ...check,
              status: 'passing',
              message: `OK: confidence=${data.confidence_level}`,
              lastChecked: new Date()
            });
          } else {
            results.push({
              ...check,
              status: 'warning',
              message: 'No data quality record',
              lastChecked: new Date()
            });
          }
        } else if (check.view === 'central_metrics_snapshots') {
          const { data, error } = await supabase
            .from('central_metrics_snapshots')
            .select('snapshot_at')
            .eq('tenant_id', tenantId)
            .order('snapshot_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            results.push({
              ...check,
              status: 'failing',
              message: `Error: ${error.message}`,
              lastChecked: new Date()
            });
          } else if (data) {
            const hoursAgo = (Date.now() - new Date(data.snapshot_at).getTime()) / (1000 * 60 * 60);
            results.push({
              ...check,
              status: hoursAgo < 24 ? 'passing' : 'warning',
              message: `Last snapshot: ${hoursAgo.toFixed(1)}h ago`,
              lastChecked: new Date()
            });
          } else {
            results.push({
              ...check,
              status: 'warning',
              message: 'No snapshots found',
              lastChecked: new Date()
            });
          }
        }
      } catch (err) {
        results.push({
          ...check,
          status: 'failing',
          message: `Exception: ${err}`,
          lastChecked: new Date()
        });
      }
    }

    setHealthChecks(results);
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
