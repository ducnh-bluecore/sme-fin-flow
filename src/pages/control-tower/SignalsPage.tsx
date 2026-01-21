import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { SignalRow, SignalData, SignalSeverity } from '@/components/control-tower/executive/SignalRow';
import { useNotificationCenter } from '@/hooks/useNotificationCenter';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * SIGNALS PAGE - Simplified Alerts View
 * 
 * ANSWERS: "What signals might require a decision?"
 * 
 * SIGNALS:
 * - Collapsed by default
 * - Show only summary
 * - Expand on demand
 * 
 * ALLOWED ACTIONS:
 * - Acknowledge
 * - Open in Decision Workspace
 * 
 * REMOVED:
 * - "Create task" buttons
 * - "Resolved" buttons
 */

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
    total: signals.length,
  }), [signals]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Signals</title>
      </Helmet>

      <div className="min-h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="py-6 px-4 border-b border-border/20">
          <h1 className="text-2xl font-semibold text-foreground">
            Signals
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Risk signals that may require leadership attention
          </p>
        </div>

        {/* Quick Summary */}
        <div className="flex items-center gap-6 py-4 px-4 border-b border-border/20 text-sm">
          {counts.critical > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[hsl(0,60%,55%)]" />
              <span className="text-muted-foreground">{counts.critical} critical</span>
            </div>
          )}
          {counts.warning > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[hsl(40,60%,55%)]" />
              <span className="text-muted-foreground">{counts.warning} warning</span>
            </div>
          )}
          <span className="text-muted-foreground/60">{counts.total} total</span>
        </div>

        {/* Signal List - Collapsed by default */}
        <div className="divide-y divide-border/10">
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
          <div className="py-20 text-center">
            <p className="text-muted-foreground">
              No signals detected
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Systems are monitoring in real time.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
