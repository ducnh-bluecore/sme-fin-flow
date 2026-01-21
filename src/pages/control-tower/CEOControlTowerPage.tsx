import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { 
  StrategicDecisionCard, 
  StrategicDecision, 
  ExecutionHealth 
} from '@/components/control-tower/ceo/StrategicDecisionCard';
import { StrategicDecisionDetail } from '@/components/control-tower/ceo/StrategicDecisionDetail';
import { useDecisionCards } from '@/hooks/useDecisionCards';
import { useActiveAlerts } from '@/hooks/useAlertInstances';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { differenceInHours, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * CEO CONTROL TOWER - Strategic Command View
 * 
 * Merged from: Situation Room + Board View + Strategic Decisions
 * 
 * PURPOSE: Give CEO confidence and control
 * 
 * ANSWERS ONE QUESTION:
 * "Are my strategic decisions working?"
 * 
 * SHOWS:
 * - System health overview (from Board View)
 * - Active situation summary (from Situation Room)
 * - Strategic decisions with outcome tracking
 * 
 * DOES NOT SHOW:
 * - Tasks, alerts list, people, deadlines, status columns
 */

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000_000) return `₫${(amount / 1_000_000_000).toFixed(1)} tỷ`;
  if (amount >= 1_000_000) return `₫${(amount / 1_000_000).toFixed(0)} triệu`;
  return `₫${amount.toLocaleString('vi-VN')}`;
};

// Map decision cards to strategic decisions format
function mapToStrategicDecision(card: any): StrategicDecision {
  let executionHealth: ExecutionHealth = 'on_track';
  const targetValue = card.impact_amount || 0;
  const actualValue = card.facts?.find((f: any) => f.fact_key === 'actual_value')?.numeric_value || targetValue * 0.85;
  const variance = targetValue > 0 ? (actualValue - targetValue) / targetValue : 0;
  
  if (card.status === 'OPEN' && variance < -0.2) {
    executionHealth = 'off_track';
  } else if (card.status === 'IN_PROGRESS' || variance < -0.1) {
    executionHealth = 'friction';
  }

  const trendFact = card.facts?.find((f: any) => f.fact_key === 'trend');
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (trendFact?.trend === 'UP' || variance > 0.05) trend = 'up';
  else if (trendFact?.trend === 'DOWN' || variance < -0.05) trend = 'down';

  return {
    id: card.id,
    title: card.title,
    objective: card.question || card.impact_description || 'Achieve strategic target',
    targetValue: targetValue,
    actualValue: actualValue,
    unit: card.impact_currency || 'VND',
    trend,
    executionHealth,
    blockedStreams: card.status === 'OPEN' ? 2 : card.status === 'IN_PROGRESS' ? 1 : 0,
    createdAt: card.created_at,
  };
}

export default function CEOControlTowerPage() {
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  
  // Fetch decision cards for CEO
  const { data: cards, isLoading: cardsLoading } = useDecisionCards({
    status: ['OPEN', 'IN_PROGRESS'],
    priority: ['P1', 'P2'],
  });

  // Fetch alerts for system health overview
  const { data: alerts = [], isLoading: alertsLoading } = useActiveAlerts();

  // Calculate system health metrics (from Board View)
  const systemHealth = useMemo(() => {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;
    const totalExposure = alerts.reduce((sum, a) => sum + (a.impact_amount || 0), 0);
    
    const alertsWithDeadline = alerts
      .filter(a => a.deadline_at)
      .sort((a, b) => new Date(a.deadline_at!).getTime() - new Date(b.deadline_at!).getTime());
    
    const nearestDeadline = alertsWithDeadline[0]?.deadline_at;
    const hoursToDeadline = nearestDeadline 
      ? differenceInHours(new Date(nearestDeadline), new Date())
      : null;

    let state: 'CRITICAL' | 'WARNING' | 'STABLE' = 'STABLE';
    if (criticalCount > 0) state = 'CRITICAL';
    else if (warningCount > 0) state = 'WARNING';

    return { criticalCount, warningCount, totalExposure, nearestDeadline, hoursToDeadline, state };
  }, [alerts]);

  // Map to strategic decisions format and limit to 7
  const strategicDecisions = useMemo(() => {
    if (!cards) return [];
    return cards
      .slice(0, 7)
      .map(mapToStrategicDecision)
      .sort((a, b) => {
        const healthOrder = { off_track: 0, friction: 1, on_track: 2 };
        return healthOrder[a.executionHealth] - healthOrder[b.executionHealth];
      });
  }, [cards]);

  const selectedDecision = useMemo(() => {
    if (!selectedDecisionId) return null;
    return strategicDecisions.find(d => d.id === selectedDecisionId) || null;
  }, [selectedDecisionId, strategicDecisions]);

  // CEO Actions
  const handleAdjustTarget = () => toast.info('Adjust target – Coming soon');
  const handleExtend = () => toast.info('Extend decision – Coming soon');
  const handlePause = () => toast.info('Pause decision – Coming soon');
  const handleEscalate = () => toast.info('Escalate execution – Coming soon');
  const handleRequestReview = () => toast.info('Request outcome review – Coming soon');

  const isLoading = cardsLoading || alertsLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-3 h-3 bg-slate-500 rounded-full animate-pulse mx-auto" />
          <p className="text-slate-500 text-sm mt-4">Loading strategic overview...</p>
        </div>
      </div>
    );
  }

  const stateStyles = {
    CRITICAL: { bg: 'bg-red-950/30', border: 'border-red-500/30', accent: 'text-red-400' },
    WARNING: { bg: 'bg-amber-950/20', border: 'border-amber-500/30', accent: 'text-amber-400' },
    STABLE: { bg: 'bg-emerald-950/20', border: 'border-emerald-500/30', accent: 'text-emerald-400' },
  };
  const style = stateStyles[systemHealth.state];

  return (
    <>
      <Helmet>
        <title>CEO Control Tower</title>
      </Helmet>

      <div className="min-h-[calc(100vh-120px)] space-y-8">
        
        {/* === SECTION 1: System Health Overview (from Board View) === */}
        <section className={cn('p-6 rounded-lg border', style.bg, style.border)}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            
            {/* System State */}
            <div>
              <p className="text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase mb-1">
                System Status
              </p>
              <h2 className={cn('text-xl font-semibold', style.accent)}>
                {systemHealth.state === 'CRITICAL' ? 'Intervention required' :
                 systemHealth.state === 'WARNING' ? 'Attention needed' : 'Operating normally'}
              </h2>
            </div>

            {/* Key Metrics - Horizontal */}
            <div className="flex flex-wrap gap-8">
              {/* Critical Situations */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Critical situations</p>
                <p className={cn('text-3xl font-bold', systemHealth.criticalCount > 0 ? 'text-red-400' : 'text-foreground')}>
                  {systemHealth.criticalCount}
                </p>
              </div>

              {/* Financial Exposure */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Total exposure</p>
                <p className="text-3xl font-bold text-foreground">
                  {systemHealth.totalExposure > 0 ? formatCurrency(systemHealth.totalExposure) : '₫0'}
                </p>
              </div>

              {/* Time to Next Risk */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Time to irreversible</p>
                <p className={cn('text-3xl font-bold', 
                  systemHealth.hoursToDeadline !== null && systemHealth.hoursToDeadline < 24 ? 'text-red-400' : 'text-foreground'
                )}>
                  {systemHealth.nearestDeadline 
                    ? (systemHealth.hoursToDeadline !== null && systemHealth.hoursToDeadline <= 0 
                        ? 'Overdue'
                        : formatDistanceToNow(new Date(systemHealth.nearestDeadline), { locale: vi, addSuffix: false }))
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* === SECTION 2: Strategic Decisions === */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Strategic Decisions</h1>
              <p className="text-slate-500 text-sm mt-1">
                Your active strategic decisions and their real-world outcomes.
              </p>
            </div>
          </div>

          {/* Empty state */}
          {strategicDecisions.length === 0 && (
            <div className="p-12 rounded-xl bg-slate-900/30 border border-slate-800/50 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400/60 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-200 mb-2">
                No active strategic decisions
              </h3>
              <p className="text-slate-500 text-sm">
                When a decision is made, its progress and outcome will appear here.
              </p>
            </div>
          )}

          {/* Two-column layout */}
          {strategicDecisions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left: Strategic Decision Cards Stack */}
              <div className="space-y-4">
                {strategicDecisions.map((decision) => (
                  <StrategicDecisionCard
                    key={decision.id}
                    decision={decision}
                    isSelected={selectedDecisionId === decision.id}
                    onClick={() => setSelectedDecisionId(
                      selectedDecisionId === decision.id ? null : decision.id
                    )}
                  />
                ))}
              </div>

              {/* Right: Selected Decision Detail */}
              <div className="lg:sticky lg:top-6 lg:self-start">
                {selectedDecision ? (
                  <div className="p-6 rounded-xl bg-slate-900/30 border border-slate-800/50">
                    <StrategicDecisionDetail
                      decision={selectedDecision}
                      onAdjustTarget={handleAdjustTarget}
                      onExtend={handleExtend}
                      onPause={handlePause}
                      onEscalate={handleEscalate}
                      onRequestReview={handleRequestReview}
                    />
                  </div>
                ) : (
                  <div className="p-12 rounded-xl bg-slate-900/20 border border-slate-800/30 text-center">
                    <p className="text-slate-500">
                      Select a decision to view outcome details
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
