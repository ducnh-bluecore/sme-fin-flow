import { Skeleton } from '@/components/ui/skeleton';
import { useMarketingDecisionEngine } from '@/hooks/useMarketingDecisionEngine';
import { CEOOneScreenView, DecisionCardStack, ScaleOpportunities } from '@/components/mdp/v2';
import { MarketingDecisionCard } from '@/types/mdp-v2';
import { toast } from 'sonner';

/**
 * MDP CEO VIEW
 * 
 * Decision-First, CFO/CEO-Grade
 * One screen that answers:
 * 1. Is marketing creating or destroying money?
 * 2. How much cash is at risk or locked?
 * 3. Which campaign must be paused/killed?
 */
export default function MDPV2CEOPage() {
  const {
    decisionCards,
    ceoSnapshot,
    scaleOpportunities,
    isLoading,
    error,
  } = useMarketingDecisionEngine();

  const handleDecisionAction = async (
    card: MarketingDecisionCard, 
    action: 'APPROVE' | 'REJECT' | 'SNOOZE',
    comment?: string
  ) => {
    console.log('Decision action:', { card, action, comment });
    toast.success(`${action}: ${card.recommendedAction} for ${card.campaignName}`);
  };

  const handleScale = (campaign: any) => {
    toast.success(`Scale recommendation: ${campaign.campaign_name} +30%`);
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">Unable to load data. Please try again.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CEO One-Screen View */}
      <CEOOneScreenView 
        snapshot={ceoSnapshot} 
        onDecisionAction={(card) => handleDecisionAction(card, 'APPROVE')} 
      />

      {/* Scale Opportunities */}
      {scaleOpportunities.length > 0 && (
        <div className="max-w-4xl">
          <ScaleOpportunities 
            opportunities={scaleOpportunities} 
            onScale={handleScale} 
          />
        </div>
      )}

      {/* Decision Queue - Secondary */}
      {decisionCards.length > 0 && (
        <div className="max-w-4xl">
          <DecisionCardStack 
            cards={decisionCards} 
            onAction={handleDecisionAction} 
          />
        </div>
      )}
    </div>
  );
}
