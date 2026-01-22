import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Wallet,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CEOMarketingSnapshot, 
  MarketingDecisionCard, 
  formatVND, 
  DECISION_LANGUAGE,
} from '@/types/mdp-v2';

interface CEOOneScreenViewProps {
  snapshot: CEOMarketingSnapshot;
  onDecisionAction: (card: MarketingDecisionCard) => void;
}

/**
 * CEO ONE-SCREEN VIEW - Light Professional Theme
 * 
 * Design Principles:
 * - Calm, authoritative, surgical
 * - One primary signal per screen
 * - Numbers > icons > copy
 * - No emotional decoration
 */
export function CEOOneScreenView({ snapshot, onDecisionAction }: CEOOneScreenViewProps) {
  const [showSecondaryCards, setShowSecondaryCards] = useState(false);
  
  const primaryCard = snapshot.criticalCards[0];
  const secondaryCards = snapshot.criticalCards.slice(1);
  
  return (
    <div className="space-y-4">
      {/* === NET IMPACT - Single Dominant Signal === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Net Marketing Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-baseline gap-3">
                <span className={cn(
                  "text-3xl font-semibold tabular-nums tracking-tight",
                  snapshot.netMarginPosition >= 0 
                    ? "text-emerald-600" 
                    : "text-foreground"
                )}>
                  {snapshot.netMarginPosition >= 0 ? '+' : ''}{formatVND(snapshot.netMarginPosition)}
                </span>
                <Badge variant="outline" className="text-xs font-normal">
                  {snapshot.marginTrend === 'improving' && (
                    <><TrendingUp className="h-3 w-3 mr-1 text-emerald-600" />Improving</>
                  )}
                  {snapshot.marginTrend === 'deteriorating' && (
                    <><TrendingDown className="h-3 w-3 mr-1 text-amber-600" />Declining</>
                  )}
                  {snapshot.marginTrend === 'stable' && 'Stable'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {snapshot.isCreatingMoney 
                  ? 'Positive contribution' 
                  : 'Negative contribution'}
              </p>
            </div>
            
            {/* Margin Breakdown */}
            <div className="flex gap-8 text-right">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
                <p className="text-lg font-medium text-emerald-600 tabular-nums">
                  +{formatVND(snapshot.totalMarginCreated)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Lost</p>
                <p className={cn(
                  "text-lg font-medium tabular-nums",
                  snapshot.totalMarginDestroyed > 0 ? "text-foreground" : "text-muted-foreground"
                )}>
                  -{formatVND(snapshot.totalMarginDestroyed)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === CASH POSITION === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            Cash Position
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-4 gap-6">
            <CashMetric 
              label="Received" 
              value={snapshot.cashReceived} 
              status="positive"
              sublabel="Available"
            />
            <CashMetric 
              label="Pending" 
              value={snapshot.cashPending}
              status="neutral"
              sublabel="Awaiting collection"
            />
            <CashMetric 
              label="Locked" 
              value={snapshot.cashLocked}
              status={snapshot.cashLocked > 0 ? "warning" : "neutral"}
              sublabel="In ads/inventory"
            />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Conversion</p>
              <p className={cn(
                "text-xl font-medium tabular-nums",
                snapshot.cashConversionRate >= 0.7 
                  ? "text-emerald-600" 
                  : snapshot.cashConversionRate >= 0.5 
                  ? "text-amber-600" 
                  : "text-foreground"
              )}>
                {(snapshot.cashConversionRate * 100).toFixed(0)}%
              </p>
              <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    snapshot.cashConversionRate >= 0.7 
                      ? "bg-emerald-500" 
                      : snapshot.cashConversionRate >= 0.5 
                      ? "bg-amber-500" 
                      : "bg-muted-foreground"
                  )}
                  style={{ width: `${snapshot.cashConversionRate * 100}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === REQUIRED DECISIONS === */}
      <Card className={cn(
        snapshot.immediateActions > 0 && primaryCard?.urgency === 'IMMEDIATE'
          ? "border-l-4 border-l-amber-500" 
          : ""
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Required Decisions
            </CardTitle>
            {snapshot.immediateActions > 0 && (
              <Badge variant="secondary" className="text-xs">
                {snapshot.immediateActions} pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {snapshot.criticalCards.length > 0 ? (
            <div className="space-y-3">
              {/* PRIMARY DECISION */}
              {primaryCard && (
                <PrimaryDecision 
                  card={primaryCard} 
                  onAction={onDecisionAction}
                />
              )}

              {/* SECONDARY - Collapsed */}
              {secondaryCards.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowSecondaryCards(!showSecondaryCards)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    {showSecondaryCards ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    {secondaryCards.length} additional
                  </button>
                  
                  {showSecondaryCards && (
                    <div className="space-y-2 mt-1">
                      {secondaryCards.map((card) => (
                        <SecondaryDecision 
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
            <div className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">No immediate actions required</p>
                <p className="text-xs text-muted-foreground">
                  All campaigns operating within thresholds
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === FOOTER === */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            snapshot.dataConfidence === 'high' ? "bg-emerald-500" :
            snapshot.dataConfidence === 'medium' ? "bg-amber-500" : "bg-muted-foreground"
          )} />
          {snapshot.dataConfidence === 'high' ? 'High' : 
           snapshot.dataConfidence === 'medium' ? 'Medium' : 'Low'} confidence
        </div>
        <span>Updated {new Date(snapshot.lastUpdated).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}</span>
      </div>
    </div>
  );
}

// === CASH METRIC ===
function CashMetric({ 
  label, 
  value, 
  status, 
  sublabel 
}: { 
  label: string; 
  value: number; 
  status: 'positive' | 'warning' | 'neutral';
  sublabel: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn(
        "text-xl font-medium tabular-nums",
        status === 'positive' && "text-emerald-600",
        status === 'warning' && "text-amber-600",
        status === 'neutral' && "text-foreground"
      )}>
        {formatVND(value)}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
    </div>
  );
}

// === PRIMARY DECISION ===
function PrimaryDecision({ 
  card, 
  onAction 
}: { 
  card: MarketingDecisionCard; 
  onAction: (card: MarketingDecisionCard) => void;
}) {
  const language = DECISION_LANGUAGE[card.type];
  const isImmediate = card.urgency === 'IMMEDIATE';
  
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      isImmediate ? "border-amber-200 bg-amber-50" : "bg-muted/30"
    )}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span className={isImmediate ? "text-amber-700 font-medium" : ""}>
              {isImmediate ? 'Immediate' : card.urgency === 'TODAY' ? 'Today' : `${card.deadlineHours}h`}
            </span>
            <span>·</span>
            <span>{card.channel}</span>
            <span>·</span>
            <span>{card.owner}</span>
          </div>

          {/* Problem */}
          <h3 className="font-medium mb-0.5">{language.title}</h3>
          <p className="text-sm text-muted-foreground">{card.campaignName}</p>

          {/* Metrics */}
          <div className="flex gap-4 mt-3 text-xs">
            {card.metrics.slice(0, 3).map((m, idx) => (
              <div key={idx}>
                <span className="text-muted-foreground">{m.label}: </span>
                <span className={cn(
                  "font-medium",
                  m.severity === 'critical' && "text-amber-700"
                )}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground mb-1">Impact</p>
          <p className="text-xl font-semibold tabular-nums">
            -{formatVND(card.impactAmount)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            +{formatVND(card.projectedLoss)} if unresolved
          </p>
          
          <Button 
            size="sm"
            variant={isImmediate ? "default" : "secondary"}
            className="mt-3"
            onClick={() => onAction(card)}
          >
            {language.action}
          </Button>
        </div>
      </div>
    </div>
  );
}

// === SECONDARY DECISION ===
function SecondaryDecision({ 
  card, 
  onAction 
}: { 
  card: MarketingDecisionCard; 
  onAction: (card: MarketingDecisionCard) => void;
}) {
  const language = DECISION_LANGUAGE[card.type];
  
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs text-muted-foreground w-8">{card.deadlineHours}h</span>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{language.title}</p>
          <p className="text-xs text-muted-foreground truncate">{card.campaignName}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm tabular-nums text-muted-foreground">
          -{formatVND(card.impactAmount)}
        </span>
        <Button 
          size="sm"
          variant="ghost"
          className="text-xs h-7"
          onClick={() => onAction(card)}
        >
          {language.action}
        </Button>
      </div>
    </div>
  );
}
