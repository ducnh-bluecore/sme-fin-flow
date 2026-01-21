import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2 } from 'lucide-react';
import { 
  StrategicDecisionCard, 
  StrategicDecision, 
  ExecutionHealth 
} from '@/components/control-tower/ceo/StrategicDecisionCard';
import { StrategicDecisionDetail } from '@/components/control-tower/ceo/StrategicDecisionDetail';
import { useDecisionCards } from '@/hooks/useDecisionCards';
import { toast } from 'sonner';

/**
 * CEO CONTROL TOWER - Strategic Command View
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

  // CEO Actions (placeholder implementations)
  const handleAdjustTarget = () => toast.info('Điều chỉnh mục tiêu - Coming soon');
  const handleExtend = () => toast.info('Gia hạn quyết định - Coming soon');
  const handlePause = () => toast.info('Tạm dừng quyết định - Coming soon');
  const handleEscalate = () => toast.info('Escalate - Coming soon');
  const handleRequestReview = () => toast.info('Yêu cầu review - Coming soon');

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-3 h-3 bg-slate-500 rounded-full animate-pulse mx-auto" />
          <p className="text-slate-500 text-sm mt-4">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Empty state - No active strategic decisions
  if (strategicDecisions.length === 0) {
    return (
      <>
        <Helmet>
          <title>Strategic Control Tower</title>
        </Helmet>
        <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-6">
          <CheckCircle2 className="h-16 w-16 text-emerald-400/60 mb-6" />
          <h1 className="text-2xl font-medium text-slate-200 mb-2">
            Không có quyết định chiến lược đang hoạt động
          </h1>
          <p className="text-slate-500 text-sm max-w-md">
            Khi một quyết định được đưa ra, tiến độ và kết quả sẽ hiển thị tại đây.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Strategic Control Tower</title>
      </Helmet>

      <div className="min-h-[calc(100vh-120px)]">
        {/* Header - Minimal */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100">Strategic Control Tower</h1>
          <p className="text-slate-500 text-sm mt-1">
            Các quyết định chiến lược đang hoạt động và kết quả thực tế.
          </p>
        </div>

        {/* Two-column layout on larger screens */}
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
                  Chọn một quyết định để xem chi tiết kết quả
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
