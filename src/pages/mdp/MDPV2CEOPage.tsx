import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMarketingDecisionEngine } from '@/hooks/useMarketingDecisionEngine';
import { CEOOneScreenView, DecisionCardStack, ScaleOpportunities, DecisionContextRail } from '@/components/mdp/v2';
import { ChannelBudgetConfigPanel } from '@/components/mdp/cmo-mode/ChannelBudgetConfigPanel';
import { MarketingDecisionCard, formatVND } from '@/types/mdp-v2';
import { DecisionCard, DecisionCardList } from '@/components/decisions';
import { toast } from 'sonner';
import { 
  Target, 
  Settings2, 
  TrendingUp, 
  TrendingDown,
  ArrowLeft,
  AlertTriangle,
  DollarSign,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * MDP CEO VIEW - Light Professional Theme
 * 
 * Decision-First, CFO/CEO-Grade
 * One screen that answers:
 * 1. Is marketing creating or destroying money?
 * 2. How much cash is at risk or locked?
 * 3. Which campaign must be paused/killed?
 */
export default function MDPV2CEOPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
      <div className="p-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">Unable to load data</p>
                <p className="text-sm text-muted-foreground">Please try again later.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
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
      </div>
    );
  }

  // Calculate exposure values from snapshot
  const totalCashAtRisk = ceoSnapshot.cashReceived * 0.15 + ceoSnapshot.cashPending * 0.3;
  const totalLockedCash = ceoSnapshot.cashLocked;
  const worstCaseLoss = ceoSnapshot.totalMarginDestroyed;
  const pendingDecisionsCount = decisionCards.filter(c => c.status === 'PENDING').length;

  // Convert marketing decision cards to unified decision format
  const unifiedDecisions = decisionCards.slice(0, 3).map(card => ({
    id: card.id,
    statement: `${card.recommendedAction}: ${card.campaignName} requires immediate attention`,
    severity: card.urgency === 'IMMEDIATE' ? 'critical' as const : 
              card.urgency === 'TODAY' ? 'warning' as const : 'info' as const,
    confidence: 'confirmed' as const,
    impacts: [
      { type: 'financial', label: 'Impact', value: formatVND(card.impactAmount), trend: 'down' },
      { type: 'financial', label: 'Projected Loss', value: formatVND(card.projectedLoss) },
    ],
    ownership: {
      assignee: card.owner,
      status: card.status,
      deadline: `${card.deadlineHours}h`,
    },
    actions: [
      { id: 'action', label: card.recommendedAction, variant: 'default' },
    ],
  }));

  return (
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
              <h1 className="text-xl font-semibold">Marketing Decision Center</h1>
              <p className="text-sm text-muted-foreground">
                Profit-first marketing decisions
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {pendingDecisionsCount} pending
          </Badge>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50">
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
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card className={cn(
                  "border-l-4",
                  ceoSnapshot.netMarginPosition >= 0 
                    ? "border-l-emerald-500" 
                    : "border-l-amber-500"
                )}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      Net Marketing Impact
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-2xl font-semibold tabular-nums",
                        ceoSnapshot.netMarginPosition >= 0 
                          ? "text-emerald-600" 
                          : "text-amber-600"
                      )}>
                        {ceoSnapshot.netMarginPosition >= 0 ? '+' : ''}{formatVND(ceoSnapshot.netMarginPosition)}
                      </span>
                      {ceoSnapshot.marginTrend === 'improving' && (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      )}
                      {ceoSnapshot.marginTrend === 'deteriorating' && (
                        <TrendingDown className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ceoSnapshot.isCreatingMoney ? 'Positive contribution' : 'Negative contribution'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      Created
                    </div>
                    <p className="text-2xl font-semibold text-emerald-600 tabular-nums">
                      +{formatVND(ceoSnapshot.totalMarginCreated)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Profitable campaigns
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <TrendingDown className="h-4 w-4 text-amber-500" />
                      Lost
                    </div>
                    <p className={cn(
                      "text-2xl font-semibold tabular-nums",
                      ceoSnapshot.totalMarginDestroyed > 0 ? "text-amber-600" : "text-muted-foreground"
                    )}>
                      -{formatVND(ceoSnapshot.totalMarginDestroyed)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Underperforming campaigns
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Cash Position */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    Cash Position
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Received</p>
                      <p className="text-xl font-medium text-emerald-600 tabular-nums">
                        {formatVND(ceoSnapshot.cashReceived)}
                      </p>
                      <p className="text-xs text-muted-foreground">Available</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Pending</p>
                      <p className="text-xl font-medium tabular-nums">
                        {formatVND(ceoSnapshot.cashPending)}
                      </p>
                      <p className="text-xs text-muted-foreground">Awaiting collection</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Locked</p>
                      <p className={cn(
                        "text-xl font-medium tabular-nums",
                        ceoSnapshot.cashLocked > 0 ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        {formatVND(ceoSnapshot.cashLocked)}
                      </p>
                      <p className="text-xs text-muted-foreground">In ads/inventory</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Conversion</p>
                      <p className={cn(
                        "text-xl font-medium tabular-nums",
                        ceoSnapshot.cashConversionRate >= 0.7 ? "text-emerald-600" : 
                        ceoSnapshot.cashConversionRate >= 0.5 ? "text-amber-600" : "text-foreground"
                      )}>
                        {(ceoSnapshot.cashConversionRate * 100).toFixed(0)}%
                      </p>
                      <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            ceoSnapshot.cashConversionRate >= 0.7 ? "bg-emerald-500" : 
                            ceoSnapshot.cashConversionRate >= 0.5 ? "bg-amber-500" : "bg-muted-foreground"
                          )}
                          style={{ width: `${ceoSnapshot.cashConversionRate * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Decision Cards - Using Unified Component */}
              {unifiedDecisions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium">Required Decisions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DecisionCardList
                      emptyMessage="All campaigns operating within thresholds"
                      isEmpty={unifiedDecisions.length === 0}
                    >
                      {unifiedDecisions.map((decision) => (
                        <DecisionCard
                          key={decision.id}
                          id={decision.id}
                          statement={decision.statement}
                          severity={decision.severity}
                          confidence={decision.confidence}
                          impacts={decision.impacts.map(i => ({
                            ...i,
                            type: i.type as 'cash' | 'margin' | 'compliance' | 'risk',
                            trend: i.trend === 'down' ? 'negative' : i.trend === 'up' ? 'positive' : undefined,
                          }))}
                          ownership={decision.ownership ? {
                            assignee: decision.ownership.assignee,
                            status: decision.ownership.status as 'open' | 'in_progress' | 'resolved' | 'dismissed',
                            deadline: decision.ownership.deadline,
                          } : undefined}
                          actions={decision.actions?.map(a => ({
                            ...a,
                            variant: a.variant as 'primary' | 'secondary' | 'outline',
                            onClick: () => {
                              const card = decisionCards.find(c => c.id === decision.id);
                              if (card) handleDecisionAction(card, 'APPROVE');
                            },
                          }))}
                          compact
                        />
                      ))}
                    </DecisionCardList>
                  </CardContent>
                </Card>
              )}

              {/* Scale Opportunities */}
              {scaleOpportunities.length > 0 && (
                <ScaleOpportunities 
                  opportunities={scaleOpportunities} 
                  onScale={handleScale} 
                />
              )}

              {/* Decision Queue - Secondary */}
              {decisionCards.length > 3 && (
                <DecisionCardStack 
                  cards={decisionCards.slice(3)} 
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
