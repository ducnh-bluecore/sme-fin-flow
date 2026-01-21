import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { StatusStrip, SystemPosture } from '@/components/control-tower/executive/StatusStrip';
import { DecisionRow, StrategicDecisionData, ConfidenceLevel, TrendDirection } from '@/components/control-tower/executive/DecisionRow';
import { useDecisionCards } from '@/hooks/useDecisionCards';
import { useActiveAlerts } from '@/hooks/useAlertInstances';
import { differenceInHours, formatDistanceToNow } from 'date-fns';

/**
 * CEO CONTROL TOWER - Executive Strategic Command
 * 
 * ANSWERS ONE QUESTION: "Do I need to intervene today?"
 * 
 * ABOVE THE FOLD:
 * - Status Strip: System posture, decisions at risk, time to impact
 * 
 * MAIN CONTENT:
 * - Vertical list of max 5-7 strategic decisions
 * - NO cards, NO borders, NO background blocks
 * 
 * VISUAL LANGUAGE:
 * - Calm, executive, sparse
 * - Large whitespace, strong typography
 * - Red reserved ONLY for irreversible risk
 */

function mapToDecisionData(card: any): StrategicDecisionData {
  const targetValue = card.impact_amount || 0;
  const actualValue = card.facts?.find((f: any) => f.fact_key === 'actual_value')?.numeric_value || targetValue * 0.85;
  const variance = targetValue > 0 ? (actualValue - targetValue) / targetValue : 0;
  
  let confidence: ConfidenceLevel = 'high';
  if (card.status === 'OPEN' && variance < -0.2) confidence = 'low';
  else if (card.status === 'IN_PROGRESS' || variance < -0.1) confidence = 'medium';

  const trendFact = card.facts?.find((f: any) => f.fact_key === 'trend');
  let trend: TrendDirection = 'flat';
  if (trendFact?.trend === 'UP' || variance > 0.05) trend = 'up';
  else if (trendFact?.trend === 'DOWN' || variance < -0.05) trend = 'down';

  return {
    id: card.id,
    title: card.title,
    objective: card.question || card.impact_description || 'Achieve strategic target',
    targetValue,
    actualValue,
    unit: card.impact_currency || 'VND',
    trend,
    confidence,
  };
}

export default function CEOControlTowerPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const { data: cards, isLoading: cardsLoading } = useDecisionCards({
    status: ['OPEN', 'IN_PROGRESS'],
    priority: ['P1', 'P2'],
  });

  const { data: alerts = [], isLoading: alertsLoading } = useActiveAlerts();

  // Calculate system posture
  const systemStatus = useMemo(() => {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;
    
    const alertsWithDeadline = alerts
      .filter(a => a.deadline_at)
      .sort((a, b) => new Date(a.deadline_at!).getTime() - new Date(b.deadline_at!).getTime());
    
    const nearestDeadline = alertsWithDeadline[0]?.deadline_at;
    const hoursToDeadline = nearestDeadline 
      ? differenceInHours(new Date(nearestDeadline), new Date())
      : null;

    let posture: SystemPosture = 'stable';
    if (criticalCount > 0) posture = 'intervention';
    else if (warningCount > 0) posture = 'watch';

    const decisionsAtRisk = cards?.filter(c => 
      c.status === 'OPEN' && c.priority === 'P1'
    ).length || 0;

    const timeToImpact = nearestDeadline && hoursToDeadline !== null
      ? hoursToDeadline <= 0 
        ? 'Overdue'
        : formatDistanceToNow(new Date(nearestDeadline), { addSuffix: false })
      : undefined;

    return { posture, decisionsAtRisk, timeToImpact };
  }, [alerts, cards]);

  // Map and sort decisions
  const decisions = useMemo(() => {
    if (!cards) return [];
    return cards
      .slice(0, 7)
      .map(mapToDecisionData)
      .sort((a, b) => {
        const confOrder = { low: 0, medium: 1, high: 2 };
        return confOrder[a.confidence] - confOrder[b.confidence];
      });
  }, [cards]);

  const isLoading = cardsLoading || alertsLoading;

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
        <title>CEO Control Tower</title>
      </Helmet>

      <div className="min-h-[calc(100vh-120px)]">
        {/* Status Strip - Above the fold */}
        <StatusStrip 
          posture={systemStatus.posture}
          decisionsAtRisk={systemStatus.decisionsAtRisk}
          timeToImpact={systemStatus.timeToImpact}
        />

        {/* Page Header */}
        <div className="pt-8 pb-6 px-4">
          <h1 className="text-2xl font-semibold text-foreground">
            Strategic Decisions
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Active decisions and their real-world outcomes
          </p>
        </div>

        {/* Decision List - Minimal rows, no cards */}
        <div className="divide-y divide-border/20">
          {decisions.map((decision) => (
            <DecisionRow
              key={decision.id}
              decision={decision}
              isSelected={selectedId === decision.id}
              onClick={() => setSelectedId(
                selectedId === decision.id ? null : decision.id
              )}
            />
          ))}
        </div>

        {/* Empty State */}
        {decisions.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">
              No active strategic decisions require attention.
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              This should feel reassuring, not empty.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
