import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { GitCompare, AlertTriangle, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { cn } from '@/lib/utils';

/**
 * VARIANCE PAGE - Cross-module monitoring
 * 
 * Tracks data consistency between FDP, MDP, CDP
 * Visualizes cascade effects when modules disagree
 */

const formatCurrency = (amount: number): string => {
  if (Math.abs(amount) >= 1_000_000_000) return `₫${(amount / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(amount) >= 1_000_000) return `₫${(amount / 1_000_000).toFixed(0)}M`;
  return `₫${amount.toLocaleString('vi-VN')}`;
};

const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
};

interface VarianceItem {
  id: string;
  sourceModule: string;
  targetModule: string;
  metric: string;
  expected: number;
  actual: number;
  variancePct: number;
  severity: 'critical' | 'warning' | 'info';
  description: string;
}

// Cross-module data flows we monitor
const MONITORED_FLOWS = [
  { source: 'CDP', target: 'FDP', metric: 'Revenue Forecast', key: 'revenue_forecast' },
  { source: 'FDP', target: 'MDP', metric: 'COGS %', key: 'cogs_ratio' },
  { source: 'MDP', target: 'CDP', metric: 'CAC', key: 'customer_acquisition_cost' },
  { source: 'CDP', target: 'MDP', metric: 'Segment LTV', key: 'segment_ltv' },
  { source: 'FDP', target: 'CDP', metric: 'Actual Revenue', key: 'actual_revenue' },
];

export default function VariancePage() {
  const { activeTenant } = useTenantContext();

  // Fetch cross-domain variance alerts if available
  const { data: varianceAlerts = [], isLoading } = useQuery({
    queryKey: ['cross-domain-variance', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      
      // Try to fetch from cross_domain_variance_alerts if exists
      const { data, error } = await supabase
        .from('alert_instances')
        .select('*')
        .eq('tenant_id', activeTenant.id)
        .eq('alert_type', 'cross_module_variance')
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching variance alerts:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!activeTenant?.id,
  });

  // Generate mock variance data for demo
  const varianceItems = useMemo((): VarianceItem[] => {
    // If we have real data, use it
    if (varianceAlerts.length > 0) {
      return varianceAlerts.map((alert: any) => ({
        id: alert.id,
        sourceModule: alert.metadata?.source_module || 'FDP',
        targetModule: alert.metadata?.target_module || 'MDP',
        metric: alert.metric_name || 'Unknown Metric',
        expected: alert.threshold_value || 0,
        actual: alert.current_value || 0,
        variancePct: alert.change_percent || 0,
        severity: alert.severity as 'critical' | 'warning' | 'info',
        description: alert.message || '',
      }));
    }

    // Demo data showing typical cross-module variances
    return [
      {
        id: '1',
        sourceModule: 'CDP',
        targetModule: 'FDP',
        metric: 'Revenue Forecast',
        expected: 2_500_000_000,
        actual: 2_100_000_000,
        variancePct: -0.16,
        severity: 'critical',
        description: 'CDP dự báo cao hơn thực tế FDP ghi nhận',
      },
      {
        id: '2',
        sourceModule: 'FDP',
        targetModule: 'MDP',
        metric: 'COGS %',
        expected: 0.55,
        actual: 0.62,
        variancePct: 0.127,
        severity: 'warning',
        description: 'Chi phí thực tế cao hơn ước tính MDP',
      },
      {
        id: '3',
        sourceModule: 'MDP',
        targetModule: 'CDP',
        metric: 'CAC',
        expected: 85000,
        actual: 102000,
        variancePct: 0.20,
        severity: 'warning',
        description: 'CAC tăng ảnh hưởng LTV calculations',
      },
    ];
  }, [varianceAlerts]);

  // Calculate cascade effects
  const cascadeEffects = useMemo(() => {
    const criticalVariances = varianceItems.filter(v => v.severity === 'critical');
    if (criticalVariances.length === 0) return [];

    // Generate cascade chain
    return criticalVariances.map(v => ({
      trigger: v,
      effects: [
        `${v.targetModule} nhận data sai từ ${v.sourceModule}`,
        `Quyết định ${v.targetModule} dựa trên số liệu không chính xác`,
        `Có thể gây thiệt hại khi hành động theo ${v.targetModule}`,
      ],
    }));
  }, [varianceItems]);

  return (
    <>
      <Helmet>
        <title>Variance Monitor | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <GitCompare className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">Cross-Module Variance</h1>
            <p className="text-sm text-muted-foreground">
              Theo dõi sự đồng bộ dữ liệu giữa FDP, MDP, CDP
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className={cn(
            varianceItems.some(v => v.severity === 'critical') && 'border-destructive/50'
          )}>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Critical Variances</p>
              <p className="text-2xl font-bold text-destructive">
                {varianceItems.filter(v => v.severity === 'critical').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Warning Variances</p>
              <p className="text-2xl font-bold text-amber-500">
                {varianceItems.filter(v => v.severity === 'warning').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Monitored Flows</p>
              <p className="text-2xl font-bold">{MONITORED_FLOWS.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Variance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Variances</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : varianceItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Không có variance đáng chú ý
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
                  <div className="col-span-2">Flow</div>
                  <div className="col-span-3">Metric</div>
                  <div className="col-span-2 text-right">Expected</div>
                  <div className="col-span-2 text-right">Actual</div>
                  <div className="col-span-2 text-right">Variance</div>
                  <div className="col-span-1">Severity</div>
                </div>

                {/* Rows */}
                {varianceItems.map((item) => (
                  <div 
                    key={item.id}
                    className={cn(
                      'grid grid-cols-12 gap-4 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors',
                      item.severity === 'critical' && 'bg-destructive/5 border-l-2 border-l-destructive'
                    )}
                  >
                    <div className="col-span-2 flex items-center gap-1 text-sm">
                      <Badge variant="outline">{item.sourceModule}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline">{item.targetModule}</Badge>
                    </div>
                    <div className="col-span-3">
                      <p className="font-medium">{item.metric}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <div className="col-span-2 text-right font-mono text-sm">
                      {item.metric.includes('%') 
                        ? `${(item.expected * 100).toFixed(1)}%`
                        : formatCurrency(item.expected)
                      }
                    </div>
                    <div className="col-span-2 text-right font-mono text-sm">
                      {item.metric.includes('%')
                        ? `${(item.actual * 100).toFixed(1)}%`
                        : formatCurrency(item.actual)
                      }
                    </div>
                    <div className="col-span-2 text-right flex items-center justify-end gap-1">
                      {item.variancePct < 0 ? (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                      )}
                      <span className={cn(
                        'font-semibold',
                        item.variancePct < 0 ? 'text-destructive' : 'text-amber-500'
                      )}>
                        {formatPercent(item.variancePct)}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <Badge variant={item.severity === 'critical' ? 'destructive' : 'outline'}>
                        {item.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cascade Effects */}
        {cascadeEffects.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Cascade Effects
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cascadeEffects.map((cascade, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Trigger</Badge>
                    <span className="font-medium">
                      {cascade.trigger.sourceModule} → {cascade.trigger.targetModule}: {cascade.trigger.metric}
                    </span>
                  </div>
                  <div className="pl-6 space-y-1">
                    {cascade.effects.map((effect, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ArrowRight className="h-3 w-3" />
                        <span>{effect}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
