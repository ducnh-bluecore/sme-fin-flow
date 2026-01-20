import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMarketingDecisionEngine } from '@/hooks/useMarketingDecisionEngine';
import { CEOOneScreenView, DecisionCardStack, ScaleOpportunities, DecisionContextRail } from '@/components/mdp/v2';
import { ChannelBudgetConfigPanel } from '@/components/mdp/cmo-mode/ChannelBudgetConfigPanel';
import { MarketingDecisionCard } from '@/types/mdp-v2';
import { toast } from 'sonner';
import { Target, Settings2 } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('overview');
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
      <div className="flex gap-6">
        <div className="flex-1 space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
        </div>
        <div className="w-72 shrink-0 space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // Calculate exposure values from snapshot
  const totalCashAtRisk = ceoSnapshot.cashReceived * 0.15 + ceoSnapshot.cashPending * 0.3;
  const totalLockedCash = ceoSnapshot.cashLocked;
  const worstCaseLoss = ceoSnapshot.totalMarginDestroyed;
  const pendingDecisionsCount = decisionCards.filter(c => c.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 border">
          <TabsTrigger value="overview" className="gap-2">
            <Target className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Channel KPI Setup
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - Two Column Layout */}
        <TabsContent value="overview" className="mt-6">
          <div className="flex gap-6">
            {/* Main Content - Left */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* CEO One-Screen View */}
              <CEOOneScreenView 
                snapshot={ceoSnapshot} 
                onDecisionAction={(card) => handleDecisionAction(card, 'APPROVE')} 
              />

              {/* Scale Opportunities */}
              {scaleOpportunities.length > 0 && (
                <ScaleOpportunities 
                  opportunities={scaleOpportunities} 
                  onScale={handleScale} 
                />
              )}

              {/* Decision Queue - Secondary */}
              {decisionCards.length > 0 && (
                <DecisionCardStack 
                  cards={decisionCards} 
                  onAction={handleDecisionAction} 
                />
              )}
            </div>

            {/* Context Rail - Right */}
            <div className="w-72 shrink-0">
              <DecisionContextRail 
                totalCashAtRisk={totalCashAtRisk}
                totalLockedCash={totalLockedCash}
                worstCaseLoss={worstCaseLoss}
                activeRulesCount={4}
                pendingDecisionsCount={pendingDecisionsCount}
              />
            </div>
          </div>
        </TabsContent>

        {/* Channel KPI Setup Tab */}
        <TabsContent value="settings" className="mt-6">
          <ChannelBudgetConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
