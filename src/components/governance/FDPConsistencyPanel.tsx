/**
 * ============================================
 * FDP CROSS-SCREEN CONSISTENCY PANEL
 * ============================================
 * 
 * Displays cross-screen consistency check results
 * for the FDP module. Used in SSOTComplianceDashboard.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowLeftRight,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  useFDPCrossScreenConsistency, 
  type ConsistencyCheck 
} from '@/hooks/useFDPCrossScreenConsistency';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

function formatValue(value: number | null): string {
  if (value === null) return 'N/A';
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(2);
}

function StatusIcon({ status }: { status: ConsistencyCheck['status'] }) {
  switch (status) {
    case 'MATCH':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'MISMATCH':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'MISSING_DATA':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    default:
      return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
  }
}

function StatusBadge({ status }: { status: ConsistencyCheck['status'] }) {
  const variants: Record<ConsistencyCheck['status'], { label: string; className: string }> = {
    MATCH: { label: 'Khớp', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    MISMATCH: { label: 'Lệch', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    MISSING_DATA: { label: 'Thiếu dữ liệu', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    CHECKING: { label: 'Đang kiểm tra', className: 'bg-muted text-muted-foreground' },
  };

  const variant = variants[status];
  
  return (
    <Badge variant="outline" className={cn('text-xs', variant.className)}>
      {variant.label}
    </Badge>
  );
}

function ConsistencyCheckRow({ check }: { check: ConsistencyCheck }) {
  return (
    <div 
      className={cn(
        'p-3 rounded-lg border transition-colors',
        check.status === 'MATCH' && 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20',
        check.status === 'MISMATCH' && 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20',
        check.status === 'MISSING_DATA' && 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
        check.status === 'CHECKING' && 'border-muted'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <StatusIcon status={check.status} />
          <div>
            <div className="font-medium text-sm">{check.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <span>{check.screen1}</span>
              <ArrowLeftRight className="h-3 w-3" />
              <span>{check.screen2}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={check.status} />
      </div>
      
      {check.status !== 'CHECKING' && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-background/50 rounded px-2 py-1">
            <div className="text-muted-foreground">{check.source1}</div>
            <div className="font-mono font-medium">{formatValue(check.value1)}</div>
          </div>
          <div className="bg-background/50 rounded px-2 py-1">
            <div className="text-muted-foreground">{check.source2}</div>
            <div className="font-mono font-medium">{formatValue(check.value2)}</div>
          </div>
        </div>
      )}
      
      {check.status === 'MISMATCH' && check.differencePercent !== null && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          Chênh lệch: {check.differencePercent.toFixed(1)}% ({formatValue(check.difference)})
        </div>
      )}
    </div>
  );
}

export function FDPConsistencyPanel() {
  const { data, isLoading, refetch, isFetching } = useFDPCrossScreenConsistency();

  const criticalChecks = data?.checks.filter(c => c.severity === 'critical') ?? [];
  const warningChecks = data?.checks.filter(c => c.severity === 'warning') ?? [];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            FDP Cross-Screen Consistency
          </CardTitle>
          <div className="flex items-center gap-2">
            {data && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(data.lastRunAt, { addSuffix: true, locale: vi })}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {data && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <Badge 
              variant="outline" 
              className={cn(
                'px-3 py-1',
                data.overallStatus === 'HEALTHY' && 'bg-green-100 text-green-800 border-green-300',
                data.overallStatus === 'DEGRADED' && 'bg-amber-100 text-amber-800 border-amber-300',
                data.overallStatus === 'CRITICAL' && 'bg-red-100 text-red-800 border-red-300'
              )}
            >
              {data.overallStatus === 'HEALTHY' && '✓ Healthy'}
              {data.overallStatus === 'DEGRADED' && '⚠ Degraded'}
              {data.overallStatus === 'CRITICAL' && '✕ Critical'}
            </Badge>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600">✓ {data.passCount} khớp</span>
              {data.failCount > 0 && (
                <span className="text-red-600">✕ {data.failCount} lệch</span>
              )}
              {data.warningCount > 0 && (
                <span className="text-amber-600">⚠ {data.warningCount} thiếu</span>
              )}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Đang kiểm tra...
          </div>
        )}

        {/* Critical Checks */}
        {criticalChecks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Critical Checks ({criticalChecks.length})
            </h4>
            <div className="space-y-2">
              {criticalChecks.map((check, idx) => (
                <ConsistencyCheckRow key={`critical-${check.id}-${idx}`} check={check} />
              ))}
            </div>
          </div>
        )}

        {/* Warning Checks */}
        {warningChecks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Warning Checks ({warningChecks.length})
            </h4>
            <div className="space-y-2">
              {warningChecks.map((check, idx) => (
                <ConsistencyCheckRow key={`warning-${check.id}-${idx}`} check={check} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
