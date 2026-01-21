import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Activity, Radio } from 'lucide-react';
import { SignalRow, SignalData, SignalSeverity } from '@/components/control-tower/executive/SignalRow';
import { useNotificationCenter } from '@/hooks/useNotificationCenter';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * SIGNALS PAGE - Dark, Compressed, Serious
 * 
 * BLUECORE DNA: Dark surfaces, emphasis on impact & exposure
 * Red ONLY when risk is irreversible
 * 
 * ANSWERS: "What signals may escalate into decisions?"
 */

const formatExposure = (amount: number): string => {
  if (amount >= 1_000_000_000) return `₫${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `₫${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `₫${(amount / 1_000).toFixed(0)}K`;
  return `₫${amount.toLocaleString('vi-VN')}`;
};

export default function SignalsPage() {
  const navigate = useNavigate();
  
  const { 
    instances, 
    isLoading,
    acknowledgeAlert,
  } = useNotificationCenter();

  // Map alerts to signals format
  const signals = useMemo((): SignalData[] => {
    if (!instances) return [];
    
    return instances
      .filter(a => a.status !== 'resolved')
      .slice(0, 20)
      .map(alert => ({
        id: alert.id,
        title: alert.title,
        summary: alert.message || 'Signal detected',
        severity: (alert.severity as SignalSeverity) || 'info',
        timestamp: formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: vi }),
        exposure: (alert as any).impact_amount ? formatExposure((alert as any).impact_amount) : undefined,
        timeToAction: (alert as any).deadline_at 
          ? formatDistanceToNow(new Date((alert as any).deadline_at), { addSuffix: false, locale: vi })
          : undefined,
        details: (alert as any).impact_description || undefined,
        acknowledged: alert.status === 'acknowledged',
      }));
  }, [instances]);

  const handleAcknowledge = async (signalId: string) => {
    await acknowledgeAlert.mutateAsync(signalId);
  };

  const handleOpenInWorkspace = (signalId: string) => {
    navigate(`/control-tower/decisions?signal=${signalId}`);
  };

  // Counts
  const counts = useMemo(() => ({
    critical: signals.filter(s => s.severity === 'critical').length,
    warning: signals.filter(s => s.severity === 'warning').length,
    info: signals.filter(s => s.severity === 'info').length,
    total: signals.length,
  }), [signals]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[hsl(var(--surface-sunken))]">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary animate-pulse" />
          <span className="text-muted-foreground">Loading signals...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Signals | Bluecore</title>
      </Helmet>

      <div className="min-h-[calc(100vh-120px)] bg-[hsl(var(--surface-sunken))]">
        {/* Header */}
        <div className="py-6 px-6 border-b border-border/30 bg-background">
          <h1 className="text-xl font-bold text-foreground">
            Signals
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Risk signals that may escalate into strategic decisions
          </p>
        </div>

        {/* Summary Bar */}
        <div className="flex items-center gap-6 py-4 px-6 border-b border-border/30 bg-[hsl(var(--surface-raised))]">
          {counts.critical > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm text-destructive font-medium">{counts.critical} Critical</span>
            </div>
          )}
          {counts.warning > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-warning" />
              <span className="text-sm text-warning font-medium">{counts.warning} Warning</span>
            </div>
          )}
          {counts.info > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
              <span className="text-sm text-muted-foreground">{counts.info} Informational</span>
            </div>
          )}
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">{counts.total} total signals</span>
        </div>

        {/* Signal List - Collapsed by default */}
        <div className="bg-card">
          {signals.map(signal => (
            <SignalRow
              key={signal.id}
              signal={signal}
              onAcknowledge={() => handleAcknowledge(signal.id)}
              onOpenInWorkspace={() => handleOpenInWorkspace(signal.id)}
            />
          ))}
        </div>

        {/* Empty State */}
        {signals.length === 0 && (
          <div className="py-16 px-6 text-center bg-card">
            <div className="w-14 h-14 rounded-xl bg-[hsl(var(--surface-raised))] flex items-center justify-center mx-auto mb-4 border border-border/50">
              <Radio className="h-7 w-7 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No active signals detected
            </h3>
            <p className="text-muted-foreground">
              Systems are monitoring in real time.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
