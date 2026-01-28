import { Helmet } from 'react-helmet-async';
import { DecisionCardOS } from '@/components/decision-os/DecisionCardOS';
import { useDecisionCards } from '@/hooks/useDecisionCards';
import { Loader2, Inbox } from 'lucide-react';

export default function DecisionBoardPage() {
  const { data: cards, isLoading } = useDecisionCards({
    status: ['OPEN', 'IN_PROGRESS'],
    priority: ['P1', 'P2', 'P3'],
  });

  // Limit to 7 cards max as per manifesto
  const displayCards = (cards || []).slice(0, 7);

  return (
    <>
      <Helmet>
        <title>Decision Board | BlueCore Decision OS</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Decision Board
          </h2>
          <p className="text-muted-foreground">
            What requires my attention today, in order of priority?
          </p>
        </div>

        {/* Decision Cards Stack */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : displayCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              No pending decisions
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              All critical decisions have been addressed. The system will surface new decisions as they are detected.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayCards.map((card) => (
              <DecisionCardOS
                key={card.id}
                id={card.id}
                title={card.title}
                context={card.question}
                impactAmount={card.impact_amount}
                impactCurrency={card.impact_currency}
                impactWindowDays={card.impact_window_days}
                riskDescription={card.impact_description || undefined}
                priority={card.priority}
                confidence={card.confidence}
                ownerRole={card.owner_role}
                deadlineAt={card.deadline_at}
                actions={card.actions}
                sourceModules={card.source_modules}
              />
            ))}
          </div>
        )}

        {/* Count indicator */}
        {!isLoading && displayCards.length > 0 && (
          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              Showing {displayCards.length} of {cards?.length || 0} decisions
              {displayCards.length < (cards?.length || 0) && ' (limited to 7 priorities)'}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
