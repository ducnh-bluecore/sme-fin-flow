import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { useDecisionCards, useDecideCard, useDismissCard, useSnoozeCard } from '@/hooks/useDecisionCards';
import { DecisionDocument } from '@/components/control-tower/DecisionDocument';
import { DecisionListItem } from '@/components/control-tower/DecisionListItem';

/**
 * DECISIONS PAGE
 * 
 * Control Tower Manifesto:
 * - Decisions are heavier than alerts
 * - No tabs, no filters, no customization
 * - Most urgent decision shown first
 * - List of pending decisions below
 */

export default function DecisionsPage() {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  
  const { data: cards = [], isLoading } = useDecisionCards({
    status: ['OPEN', 'IN_PROGRESS'],
  });

  const makeDecision = useDecideCard();
  const dismissCard = useDismissCard();
  const snoozeCard = useSnoozeCard();

  // Sort by priority then deadline
  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      // Priority first (P1 > P2 > P3)
      const priorityOrder = { P1: 0, P2: 1, P3: 2 };
      const pA = priorityOrder[a.priority] ?? 3;
      const pB = priorityOrder[b.priority] ?? 3;
      if (pA !== pB) return pA - pB;
      
      // Then deadline
      return new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime();
    });
  }, [cards]);

  // Get selected card or first card
  const selectedCard = useMemo(() => {
    if (selectedCardId) {
      return sortedCards.find(c => c.id === selectedCardId) || sortedCards[0];
    }
    return sortedCards[0] || null;
  }, [sortedCards, selectedCardId]);

  // Remaining cards
  const remainingCards = useMemo(() => {
    return sortedCards.filter(c => c.id !== selectedCard?.id);
  }, [sortedCards, selectedCard]);

  const handleDecide = (actionType: string, comment?: string) => {
    if (!selectedCard) return;
    makeDecision.mutate({
      cardId: selectedCard.id,
      actionType: actionType as any,
      comment,
    });
  };

  const handleDismiss = (reason: string, comment: string) => {
    if (!selectedCard) return;
    dismissCard.mutate({
      cardId: selectedCard.id,
      reason: 'OTHER' as any,
      comment,
    });
  };

  const handleSnooze = (hours: number, _reason: string) => {
    if (!selectedCard) return;
    snoozeCard.mutate({
      cardId: selectedCard.id,
      hours,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  // No decisions state
  if (sortedCards.length === 0) {
    return (
      <>
        <Helmet>
          <title>Quyết định | Control Tower</title>
        </Helmet>
        
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center px-6">
          <CheckCircle2 className="h-16 w-16 text-emerald-400/50 mb-6" />
          <h1 className="text-xl font-medium text-slate-200 mb-2">
            Không có quyết định chờ xử lý
          </h1>
          <p className="text-slate-500 text-sm">
            Tất cả các quyết định đã được xử lý.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Quyết định ({sortedCards.length}) | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              Quyết định chờ xử lý
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {sortedCards.length} quyết định cần ký duyệt
            </p>
          </div>
        </div>

        {/* Primary Decision Document */}
        {selectedCard && (
          <DecisionDocument
            card={selectedCard}
            onDecide={handleDecide}
            onDismiss={handleDismiss}
            onSnooze={handleSnooze}
            isProcessing={makeDecision.isPending || dismissCard.isPending || snoozeCard.isPending}
          />
        )}

        {/* Remaining Decisions Queue */}
        {remainingCards.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-3 px-1">
              Quyết định tiếp theo ({remainingCards.length})
            </h2>
            <div className="space-y-0">
              {remainingCards.map((card) => (
                <DecisionListItem
                  key={card.id}
                  card={card}
                  onClick={() => setSelectedCardId(card.id)}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
