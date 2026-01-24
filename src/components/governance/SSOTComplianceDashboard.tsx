/**
 * ============================================
 * SSOT COMPLIANCE DASHBOARD COMPONENT
 * ============================================
 * 
 * Shows real-time compliance status of the Database Governance Layer.
 * Displays:
 * - Metric consistency check results
 * - Data quality indicators
 * - SSOT violation alerts
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

export function SSOTComplianceDashboard() {
  const { data: registry, isLoading: registryLoading, refetch: refetchRegistry } = useMetricRegistry();
  const { data: consistency, isLoading: consistencyLoading, refetch: refetchConsistency } = useMetricConsistency();
  const { data: governance, isLoading: governanceLoading } = useGovernanceDashboard();

  const isLoading = registryLoading || consistencyLoading || governanceLoading;

  // Calculate compliance stats
  const totalMetrics = registry?.length || 0;
  const consistencyChecks = consistency || [];
  const okChecks = consistencyChecks.filter(c => c.status === 'OK').length;
  const mismatchChecks = consistencyChecks.filter(c => c.status === 'MISMATCH').length;
  const noDataChecks = consistencyChecks.filter(c => c.status === 'NO_DATA').length;
  
  const complianceRate = consistencyChecks.length > 0 
    ? Math.round((okChecks / consistencyChecks.length) * 100) 
    : 100;

  // Module stats from governance
  const moduleStats = governance || [];

  const handleRefresh = () => {
    refetchRegistry();
    refetchConsistency();
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">SSOT Compliance Dashboard</CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
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

        {/* Consistency Check Results */}
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
        {mismatchChecks === 0 && consistencyChecks.length > 0 && (
          <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <div>
              <p className="font-medium text-success">All Systems Compliant</p>
              <p className="text-xs text-muted-foreground">
                {okChecks} consistency checks passed. No SSOT violations detected.
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
