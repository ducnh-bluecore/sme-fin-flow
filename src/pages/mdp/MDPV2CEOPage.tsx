import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useMarketingDecisionEngine } from '@/hooks/useMarketingDecisionEngine';
import { CEOOneScreenView, DecisionCardStack, ScaleOpportunities } from '@/components/mdp/v2';
import { MarketingDecisionCard } from '@/types/mdp-v2';
import { toast } from 'sonner';

/**
 * MDP V2 - CEO VIEW
 * 
 * Decision-First, CFO/CEO-Grade
 * NOT a dashboard. NOT analytics.
 * 
 * One screen that answers:
 * 1. Is marketing creating or destroying money?
 * 2. How much cash is at risk or locked?
 * 3. Which campaign must be paused/killed immediately?
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
    // In production, this would call an API
    console.log('Decision action:', { card, action, comment });
    toast.success(`${action}: ${card.recommendedAction} cho ${card.campaignName}`);
  };

  const handleScale = (campaign: any) => {
    toast.success(`Đề xuất scale ${campaign.campaign_name} +30%`);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
        <AlertDescription>Không thể tải dữ liệu MDP. Vui lòng thử lại.</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CEO One-Screen View - The Main Decision Interface */}
      <CEOOneScreenView 
        snapshot={ceoSnapshot} 
        onDecisionAction={(card) => handleDecisionAction(card, 'APPROVE')} 
      />

      {/* Scale Opportunities */}
      <ScaleOpportunities 
        opportunities={scaleOpportunities} 
        onScale={handleScale} 
      />

      {/* Full Decision Card Stack */}
      <DecisionCardStack 
        cards={decisionCards} 
        onAction={handleDecisionAction} 
      />
    </div>
  );
}
