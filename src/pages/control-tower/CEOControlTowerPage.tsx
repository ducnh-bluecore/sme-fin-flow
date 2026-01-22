import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  StrategicDecisionCard, 
  StrategicDecision, 
  ExecutionHealth 
} from '@/components/control-tower/ceo/StrategicDecisionCard';
import { StrategicDecisionDetail } from '@/components/control-tower/ceo/StrategicDecisionDetail';
import { useDecisionCards } from '@/hooks/useDecisionCards';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * CEO CONTROL TOWER - Strategic Command View (Light Professional Theme)
 * 
 * PURPOSE: Give CEO confidence and control, not operational detail
 * 
 * ANSWERS THESE QUESTIONS:
 * - "Are my key decisions working?"
 * - "Where should I intervene?"
 * - "What is getting worse?"
 * 
 * RULES:
 * - Max 5-7 strategic decisions visible
 * - NO charts, tables, task counts, user names
 * - Calm, confident, minimal visual language
 */

// Map decision cards to strategic decisions format
function mapToStrategicDecision(card: any): StrategicDecision {
  // Determine execution health based on status and variance
  let executionHealth: ExecutionHealth = 'on_track';
  const targetValue = card.impact_amount || 0;
  const actualValue = card.facts?.find((f: any) => f.fact_key === 'actual_value')?.numeric_value || targetValue * 0.85;
  const variance = targetValue > 0 ? (actualValue - targetValue) / targetValue : 0;
  
  if (card.status === 'OPEN' && variance < -0.2) {
    executionHealth = 'off_track';
  } else if (card.status === 'IN_PROGRESS' || variance < -0.1) {
    executionHealth = 'friction';
  }

  // Determine trend
  const trendFact = card.facts?.find((f: any) => f.fact_key === 'trend');
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (trendFact?.trend === 'UP' || variance > 0.05) trend = 'up';
  else if (trendFact?.trend === 'DOWN' || variance < -0.05) trend = 'down';

  return {
    id: card.id,
    title: card.title,
    objective: card.question || card.impact_description || 'Đạt mục tiêu chiến lược',
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
  const navigate = useNavigate();
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  
  // Fetch decision cards for CEO (all owner roles, focus on high priority)
  const { data: cards, isLoading } = useDecisionCards({
    status: ['OPEN', 'IN_PROGRESS'],
    priority: ['P1', 'P2'],
  });

  // Map to strategic decisions format and limit to 7
  const strategicDecisions = useMemo(() => {
    if (!cards) return [];
    return cards
      .slice(0, 7)
      .map(mapToStrategicDecision)
      .sort((a, b) => {
        // Sort by health (off_track first, then friction, then on_track)
        const healthOrder = { off_track: 0, friction: 1, on_track: 2 };
        return healthOrder[a.executionHealth] - healthOrder[b.executionHealth];
      });
  }, [cards]);

  const selectedDecision = useMemo(() => {
    if (!selectedDecisionId) return null;
    return strategicDecisions.find(d => d.id === selectedDecisionId) || null;
  }, [selectedDecisionId, strategicDecisions]);

  // Count decisions by health status
  const healthCounts = useMemo(() => ({
    offTrack: strategicDecisions.filter(d => d.executionHealth === 'off_track').length,
    friction: strategicDecisions.filter(d => d.executionHealth === 'friction').length,
    onTrack: strategicDecisions.filter(d => d.executionHealth === 'on_track').length,
  }), [strategicDecisions]);

  // CEO Actions (placeholder implementations)
  const handleAdjustTarget = () => toast.info('Điều chỉnh mục tiêu - Coming soon');
  const handleExtend = () => toast.info('Gia hạn quyết định - Coming soon');
  const handlePause = () => toast.info('Tạm dừng quyết định - Coming soon');
  const handleEscalate = () => toast.info('Escalate - Coming soon');
  const handleRequestReview = () => toast.info('Yêu cầu review - Coming soon');

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Empty state - All decisions on track
  if (strategicDecisions.length === 0) {
    return (
      <>
        <Helmet>
          <title>CEO Control Tower</title>
        </Helmet>
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center px-6">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold mb-2">
            All decisions are on track
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            No strategic decisions require your intervention at this time.
          </p>
          <Button 
            variant="outline" 
            className="mt-6"
            onClick={() => navigate('/portal')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portal
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>CEO Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/portal')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Strategic Decisions</h1>
                <p className="text-sm text-muted-foreground">
                  {healthCounts.offTrack + healthCounts.friction} decisions need attention
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {healthCounts.offTrack > 0 && (
              <Badge variant="destructive" className="text-xs">
                {healthCounts.offTrack} Off Track
              </Badge>
            )}
            {healthCounts.friction > 0 && (
              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                {healthCounts.friction} Friction
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {healthCounts.onTrack} On Track
            </Badge>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left: Strategic Decision Cards Stack */}
          <div className="space-y-3">
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
              <Card>
                <CardContent className="pt-6">
                  <StrategicDecisionDetail
                    decision={selectedDecision}
                    onAdjustTarget={handleAdjustTarget}
                    onExtend={handleExtend}
                    onPause={handlePause}
                    onEscalate={handleEscalate}
                    onRequestReview={handleRequestReview}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-muted/30">
                <CardContent className="pt-12 pb-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    Select a decision to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
