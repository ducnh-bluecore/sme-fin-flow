import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Activity, AlertTriangle, TrendingDown, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useActiveAlerts } from '@/hooks/useAlertInstances';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * COMMAND PAGE - Control Tower Default View
 * 
 * Manifesto Compliance:
 * - CHỈ hiển thị "ĐIỀU GÌ SAI"
 * - Tối đa 7 alerts
 * - Mỗi alert: Impact + Deadline + Owner
 * - Không dashboard, không charts vô nghĩa
 */

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000_000) return `₫${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `₫${(amount / 1_000_000).toFixed(0)}M`;
  return `₫${amount.toLocaleString('vi-VN')}`;
};

type SystemState = 'CRITICAL' | 'WARNING' | 'STABLE';

interface ModuleHealth {
  module: string;
  alertCount: number;
  exposure: number;
  status: 'critical' | 'warning' | 'stable';
}

export default function CommandPage() {
  const { data: alerts = [], isLoading } = useActiveAlerts();

  // Calculate module health
  const moduleHealth = useMemo((): ModuleHealth[] => {
    const fdpAlerts = alerts.filter(a => a.category === 'finance' || a.category === 'cash');
    const mdpAlerts = alerts.filter(a => a.category === 'marketing' || a.category === 'channel');
    const cdpAlerts = alerts.filter(a => a.category === 'customer' || a.category === 'segment');

    const getStatus = (count: number, hasCritical: boolean): 'critical' | 'warning' | 'stable' => {
      if (hasCritical) return 'critical';
      if (count > 0) return 'warning';
      return 'stable';
    };

    return [
      {
        module: 'FDP',
        alertCount: fdpAlerts.length,
        exposure: fdpAlerts.reduce((sum, a) => sum + (a.impact_amount || 0), 0),
        status: getStatus(fdpAlerts.length, fdpAlerts.some(a => a.severity === 'critical')),
      },
      {
        module: 'MDP',
        alertCount: mdpAlerts.length,
        exposure: mdpAlerts.reduce((sum, a) => sum + (a.impact_amount || 0), 0),
        status: getStatus(mdpAlerts.length, mdpAlerts.some(a => a.severity === 'critical')),
      },
      {
        module: 'CDP',
        alertCount: cdpAlerts.length,
        exposure: cdpAlerts.reduce((sum, a) => sum + (a.impact_amount || 0), 0),
        status: getStatus(cdpAlerts.length, cdpAlerts.some(a => a.severity === 'critical')),
      },
    ];
  }, [alerts]);

  // System state
  const systemState = useMemo((): SystemState => {
    const hasCritical = alerts.some(a => a.severity === 'critical');
    const hasWarning = alerts.some(a => a.severity === 'warning');
    if (hasCritical) return 'CRITICAL';
    if (hasWarning) return 'WARNING';
    return 'STABLE';
  }, [alerts]);

  // Top 7 critical alerts
  const criticalAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => {
        // Severity first
        const sevOrder = { critical: 0, warning: 1, info: 2 };
        const sevA = sevOrder[a.severity as keyof typeof sevOrder] ?? 3;
        const sevB = sevOrder[b.severity as keyof typeof sevOrder] ?? 3;
        if (sevA !== sevB) return sevA - sevB;
        // Then by impact
        return (b.impact_amount || 0) - (a.impact_amount || 0);
      })
      .slice(0, 7);
  }, [alerts]);

  // Total exposure
  const totalExposure = useMemo(() => {
    return alerts.reduce((sum, a) => sum + (a.impact_amount || 0), 0);
  }, [alerts]);

  // Nearest deadline
  const nearestDeadline = useMemo(() => {
    const withDeadline = alerts.filter(a => a.deadline_at);
    if (withDeadline.length === 0) return null;
    return withDeadline.sort(
      (a, b) => new Date(a.deadline_at!).getTime() - new Date(b.deadline_at!).getTime()
    )[0].deadline_at;
  }, [alerts]);

  const stateConfig = {
    CRITICAL: {
      bg: 'bg-destructive/10',
      border: 'border-destructive/30',
      text: 'text-destructive',
      label: 'CRITICAL - Cần xử lý ngay',
      icon: AlertTriangle,
    },
    WARNING: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-500',
      label: 'WARNING - Cần chú ý',
      icon: TrendingDown,
    },
    STABLE: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-500',
      label: 'STABLE - Hệ thống ổn định',
      icon: CheckCircle2,
    },
  };

  const config = stateConfig[systemState];

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Activity className="h-6 w-6 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Command Center | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* System Pulse Banner */}
        <Card className={cn('border-2', config.border, config.bg)}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <config.icon className={cn('h-6 w-6', config.text)} />
                <div>
                  <h1 className={cn('text-lg font-semibold', config.text)}>
                    {config.label}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {alerts.length} vấn đề đang hoạt động • Cập nhật {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              {nearestDeadline && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase">Deadline gần nhất</p>
                  <p className={cn('text-sm font-medium', differenceInHours(new Date(nearestDeadline), new Date()) < 6 ? 'text-destructive' : 'text-foreground')}>
                    {formatDistanceToNow(new Date(nearestDeadline), { locale: vi, addSuffix: true })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Module Health Summary */}
        <div className="grid grid-cols-3 gap-4">
          {moduleHealth.map((mod) => (
            <Card 
              key={mod.module}
              className={cn(
                'transition-all',
                mod.status === 'critical' && 'border-destructive/50 bg-destructive/5',
                mod.status === 'warning' && 'border-amber-500/50 bg-amber-500/5'
              )}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{mod.module}</span>
                  <Badge 
                    variant={mod.status === 'stable' ? 'outline' : 'destructive'}
                    className={cn(
                      mod.status === 'warning' && 'bg-amber-500/20 text-amber-600 border-amber-500/30'
                    )}
                  >
                    {mod.alertCount} alerts
                  </Badge>
                </div>
                <p className={cn(
                  'text-xl font-bold',
                  mod.exposure > 0 ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {mod.exposure > 0 ? formatCurrency(mod.exposure) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">at risk</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Critical Alerts List */}
        {criticalAlerts.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Critical Decisions ({criticalAlerts.length})
            </h2>
            
            <div className="space-y-2">
              {criticalAlerts.map((alert, index) => (
                <Card 
                  key={alert.id}
                  className={cn(
                    'transition-all hover:shadow-md cursor-pointer',
                    alert.severity === 'critical' && 'border-l-4 border-l-destructive'
                  )}
                >
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                          <Badge variant="outline" className="text-xs">
                            {alert.category?.toUpperCase() || 'SYSTEM'}
                          </Badge>
                          {alert.severity === 'critical' && (
                            <Badge variant="destructive" className="text-xs">CRITICAL</Badge>
                          )}
                        </div>
                        <h3 className="font-medium truncate">{alert.title}</h3>
                        {alert.message && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{alert.message}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0">
                        {/* Impact */}
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Impact</p>
                          <p className={cn(
                            'text-sm font-semibold',
                            (alert.impact_amount || 0) > 0 ? 'text-destructive' : 'text-muted-foreground'
                          )}>
                            {alert.impact_amount ? formatCurrency(alert.impact_amount) : '—'}
                          </p>
                        </div>
                        
                        {/* Deadline */}
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Deadline</p>
                          <p className={cn(
                            'text-sm font-medium',
                            alert.deadline_at && differenceInHours(new Date(alert.deadline_at), new Date()) < 6
                              ? 'text-destructive'
                              : 'text-foreground'
                          )}>
                            {alert.deadline_at 
                              ? formatDistanceToNow(new Date(alert.deadline_at), { locale: vi, addSuffix: false })
                              : '—'}
                          </p>
                        </div>

                        {/* Action */}
                        <Button size="sm" variant="outline">
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="bg-emerald-500/5 border-emerald-500/30">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-emerald-600">Không có vấn đề cần xử lý</h2>
              <p className="text-sm text-muted-foreground mt-1">Hệ thống đang hoạt động ổn định</p>
            </CardContent>
          </Card>
        )}

        {/* Exposure Footer */}
        <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Cập nhật lúc {new Date().toLocaleTimeString('vi-VN')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground mr-2">Total Exposure:</span>
            <span className={cn(
              'text-lg font-bold',
              totalExposure > 0 ? 'text-destructive' : 'text-foreground'
            )}>
              {totalExposure > 0 ? formatCurrency(totalExposure) : '₫0'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
