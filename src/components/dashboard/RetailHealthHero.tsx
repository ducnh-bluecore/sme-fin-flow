import { useRetailHealthScore, type HealthStatus } from '@/hooks/useRetailHealthScore';
import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, ShieldCheck, AlertTriangle, XOctagon, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const statusConfig: Record<HealthStatus, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  GOOD: { bg: 'bg-success/10 border-success/30', text: 'text-success', icon: <ShieldCheck className="h-6 w-6" />, label: 'GOOD' },
  WARNING: { bg: 'bg-warning/10 border-warning/30', text: 'text-warning', icon: <AlertTriangle className="h-6 w-6" />, label: 'WARNING' },
  CRITICAL: { bg: 'bg-destructive/10 border-destructive/30', text: 'text-destructive', icon: <XOctagon className="h-6 w-6" />, label: 'CRITICAL' },
};

const metricStatusDot: Record<HealthStatus, string> = {
  GOOD: 'bg-success',
  WARNING: 'bg-warning',
  CRITICAL: 'bg-destructive',
};

export function RetailHealthHero() {
  const { data: score, isLoading } = useRetailHealthScore();
  const { data: snapshot } = useFinanceTruthSnapshot();

  if (isLoading) {
    return <Skeleton className="h-28" />;
  }

  if (!score) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          Chưa có dữ liệu để tính Retail Health Score
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[score.overall];
  const dq = snapshot?.dataQuality;
  const missingData: string[] = [];
  if (dq && !dq.hasExpenseData) missingData.push('COGS/Chi phí');
  if (dq && !dq.hasCashData) missingData.push('Cash');
  if (dq && !dq.hasInventoryData) missingData.push('Inventory chi tiết');

  return (
    <Card className={`border ${config.bg}`}>
      <CardContent className="py-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Health Score Badge */}
          <div className={`flex items-center gap-3 ${config.text}`}>
            {config.icon}
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-3 w-3" />
                Retail Health Score
                {missingData.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[250px]">
                      <p className="text-xs font-normal normal-case tracking-normal">
                        Thiếu dữ liệu: {missingData.join(', ')}. Score có thể chưa chính xác.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className={`text-2xl font-bold ${config.text}`}>{config.label}</div>
            </div>
          </div>

          {/* Separator */}
          <div className="hidden md:block w-px h-12 bg-border" />

          {/* 5 Hero Metrics */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Object.values(score.metrics).map((metric) => (
              <div key={metric.label} className="text-center">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                  {metric.label}
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${metricStatusDot[metric.status]}`} />
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}
                  </span>
                  <span className="text-xs text-muted-foreground">{metric.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data quality note */}
        {missingData.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3 flex-shrink-0" />
            <span>Thiếu: {missingData.join(', ')} — một số metrics hiển thị N/A hoặc 0</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
