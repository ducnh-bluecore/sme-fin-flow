import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  Banknote,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CEOMarketingSnapshot, 
  MarketingDecisionCard, 
  formatVND, 
  getUrgencyStyle, 
  getActionStyle,
  CEO_VIEW_COPY,
  DECISION_LANGUAGE,
} from '@/types/mdp-v2';

interface CEOOneScreenViewProps {
  snapshot: CEOMarketingSnapshot;
  onDecisionAction: (card: MarketingDecisionCard) => void;
}

/**
 * CEO ONE-SCREEN VIEW - CFO-GRADE DECISION SURFACE
 * 
 * Design Principles:
 * - Calm, authoritative, surgical
 * - One primary signal per screen
 * - Red is a scalpel, not a paint bucket
 * - Numbers > icons
 */
export function CEOOneScreenView({ snapshot, onDecisionAction }: CEOOneScreenViewProps) {
  const [showSecondaryCards, setShowSecondaryCards] = useState(false);
  
  // Split cards: first critical one + rest
  const primaryCard = snapshot.criticalCards[0];
  const secondaryCards = snapshot.criticalCards.slice(1);
  
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* === HEADER: Net Impact - Single Dominant Signal === */}
      <Card className={cn(
        "border",
        snapshot.isCreatingMoney 
          ? "border-emerald-500/30" 
          : "border-destructive/30"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">
                {CEO_VIEW_COPY.sections.netImpact}
              </p>
              <div className="flex items-center gap-3">
                <h1 className={cn(
                  "text-4xl font-bold tracking-tight tabular-nums",
                  snapshot.netMarginPosition >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                )}>
                  {snapshot.netMarginPosition >= 0 ? '+' : ''}{formatVND(snapshot.netMarginPosition)}
                </h1>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    snapshot.marginTrend === 'improving' && "text-emerald-600 border-emerald-500/30",
                    snapshot.marginTrend === 'deteriorating' && "text-destructive border-destructive/30",
                  )}
                >
                  {snapshot.marginTrend === 'improving' && <TrendingUp className="h-3 w-3 mr-1" />}
                  {snapshot.marginTrend === 'deteriorating' && <TrendingDown className="h-3 w-3 mr-1" />}
                  {snapshot.marginTrend === 'improving' ? 'Improving' : 
                   snapshot.marginTrend === 'deteriorating' ? 'Declining' : 'Stable'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {snapshot.isCreatingMoney 
                  ? CEO_VIEW_COPY.status.positive
                  : CEO_VIEW_COPY.status.negative}
              </p>
            </div>
            
            {/* Margin Breakdown - Compact */}
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
                <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{formatVND(snapshot.totalMarginCreated)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Lost</p>
                <p className={cn(
                  "text-xl font-semibold tabular-nums",
                  snapshot.totalMarginDestroyed > 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  -{formatVND(snapshot.totalMarginDestroyed)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === CASH POSITION - Clean Grid === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            {CEO_VIEW_COPY.sections.cashPosition}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {/* Cash Received */}
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Received</p>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatVND(snapshot.cashReceived)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Available</p>
            </div>

            {/* Cash Pending */}
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pending</p>
              <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                {formatVND(snapshot.cashPending)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting collection</p>
            </div>

            {/* Cash Locked */}
            <div className={cn(
              "p-4 rounded-lg",
              snapshot.cashLocked > 0 ? "bg-muted/30" : "bg-muted/30"
            )}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Locked</p>
              <p className={cn(
                "text-2xl font-semibold tabular-nums",
                snapshot.cashLocked > 0 ? "text-foreground" : "text-muted-foreground"
              )}>
                {formatVND(snapshot.cashLocked)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">In ads/inventory</p>
            </div>

            {/* Cash Conversion Rate */}
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Conversion</p>
              <p className={cn(
                "text-2xl font-semibold tabular-nums",
                snapshot.cashConversionRate >= 0.7 ? "text-emerald-600 dark:text-emerald-400" :
                snapshot.cashConversionRate >= 0.5 ? "text-amber-600 dark:text-amber-400" : "text-destructive"
              )}>
                {(snapshot.cashConversionRate * 100).toFixed(0)}%
              </p>
              <Progress 
                value={snapshot.cashConversionRate * 100} 
                className="h-1 mt-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === REQUIRED DECISIONS === */}
      <Card className={cn(
        "border",
        snapshot.immediateActions > 0 && primaryCard?.urgency === 'IMMEDIATE'
          ? "border-destructive/30" 
          : ""
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertCircle className={cn(
                "h-4 w-4",
                snapshot.immediateActions > 0 ? "text-destructive" : "text-muted-foreground"
              )} />
              {CEO_VIEW_COPY.sections.decisions}
            </CardTitle>
            {snapshot.immediateActions > 0 && (
              <Badge variant="outline" className="text-xs font-normal">
                {CEO_VIEW_COPY.actions.pending(snapshot.immediateActions)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {snapshot.criticalCards.length > 0 ? (
            <div className="space-y-3">
              {/* PRIMARY DECISION CARD - Full attention */}
              {primaryCard && (
                <PrimaryDecisionCard 
                  card={primaryCard} 
                  onAction={onDecisionAction}
                />
              )}

              {/* SECONDARY CARDS - Collapsed by default */}
              {secondaryCards.length > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowSecondaryCards(!showSecondaryCards)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2"
                  >
                    {showSecondaryCards ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span>{secondaryCards.length} additional issue{secondaryCards.length > 1 ? 's' : ''}</span>
                  </button>
                  
                  {showSecondaryCards && (
                    <div className="space-y-2 mt-2">
                      {secondaryCards.map((card) => (
                        <SecondaryDecisionCard 
                          key={card.id}
                          card={card}
                          onAction={onDecisionAction}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-6">
              <div className="p-2 rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">
                  {CEO_VIEW_COPY.actions.none}
                </p>
                <p className="text-sm text-muted-foreground">
                  All campaigns operating within thresholds
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === DATA CONFIDENCE - Minimal Footer === */}
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            snapshot.dataConfidence === 'high' ? "bg-emerald-500" :
            snapshot.dataConfidence === 'medium' ? "bg-amber-500" : "bg-destructive"
          )} />
          <span>{CEO_VIEW_COPY.confidence[snapshot.dataConfidence]}</span>
        </div>
        <span>Updated {new Date(snapshot.lastUpdated).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}</span>
      </div>
    </div>
  );
}

// === PRIMARY DECISION CARD ===
function PrimaryDecisionCard({ 
  card, 
  onAction 
}: { 
  card: MarketingDecisionCard; 
  onAction: (card: MarketingDecisionCard) => void;
}) {
  const language = DECISION_LANGUAGE[card.type];
  
  return (
    <div className={cn(
      "p-5 rounded-lg border",
      card.urgency === 'IMMEDIATE' 
        ? "border-destructive/40 bg-destructive/5" 
        : "border-border bg-muted/20"
    )}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("text-sm", getUrgencyStyle(card.urgency))}>
              {card.urgency === 'IMMEDIATE' ? 'Immediate' : 
               card.urgency === 'TODAY' ? 'Today' : 
               `Within ${card.deadlineHours}h`}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{card.channel}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{card.owner}</span>
          </div>

          {/* Problem Statement */}
          <h3 className={cn(
            "text-lg font-semibold mb-1",
            card.urgency === 'IMMEDIATE' ? "text-destructive" : "text-foreground"
          )}>
            {language.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{card.campaignName}</p>

          {/* Key Metrics */}
          <div className="flex gap-4">
            {card.metrics.slice(0, 3).map((m, idx) => (
              <div key={idx} className="text-sm">
                <span className="text-muted-foreground">{m.label}: </span>
                <span className={cn(
                  "font-medium",
                  m.severity === 'critical' ? "text-destructive" :
                  m.severity === 'warning' ? "text-amber-600 dark:text-amber-400" : ""
                )}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Side */}
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Impact</p>
          <p className={cn(
            "text-2xl font-bold tabular-nums",
            card.urgency === 'IMMEDIATE' ? "text-destructive" : "text-foreground"
          )}>
            -{formatVND(card.impactAmount)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            +{formatVND(card.projectedLoss)} if unresolved
          </p>
          
          <Button 
            size="sm"
            className={cn("mt-4 gap-1.5", getActionStyle(card.recommendedAction, card.urgency === 'IMMEDIATE'))}
            onClick={() => onAction(card)}
          >
            {language.action}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// === SECONDARY DECISION CARD (Compact) ===
function SecondaryDecisionCard({ 
  card, 
  onAction 
}: { 
  card: MarketingDecisionCard; 
  onAction: (card: MarketingDecisionCard) => void;
}) {
  const language = DECISION_LANGUAGE[card.type];
  
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={cn("text-xs", getUrgencyStyle(card.urgency))}>
            {card.deadlineHours}h
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{language.title}</p>
          <p className="text-xs text-muted-foreground truncate">{card.campaignName}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          -{formatVND(card.impactAmount)}
        </span>
        <Button 
          size="sm"
          variant="outline"
          className="text-xs h-7"
          onClick={() => onAction(card)}
        >
          {language.action}
        </Button>
      </div>
    </div>
  );
}
