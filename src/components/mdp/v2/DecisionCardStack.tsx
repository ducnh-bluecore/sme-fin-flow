import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  MarketingDecisionCard, 
  formatVND, 
  DECISION_LANGUAGE,
} from '@/types/mdp-v2';
import { toast } from 'sonner';

interface DecisionCardStackProps {
  cards: MarketingDecisionCard[];
  onAction: (card: MarketingDecisionCard, action: 'APPROVE' | 'REJECT' | 'SNOOZE', comment?: string) => void;
}

/**
 * DECISION CARD STACK
 * 
 * Design: Calm, hierarchical, no visual overload
 * Only show what's necessary for decision
 */
export function DecisionCardStack({ cards, onAction }: DecisionCardStackProps) {
  const [selectedCard, setSelectedCard] = useState<MarketingDecisionCard | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: 'APPROVE' | 'REJECT' | 'SNOOZE') => {
    if (!selectedCard) return;
    
    setIsProcessing(true);
    try {
      await onAction(selectedCard, action, comment);
      toast.success(
        action === 'APPROVE' 
          ? 'Action confirmed' 
          : action === 'REJECT'
          ? 'Decision rejected'
          : 'Snoozed for 24h'
      );
      setDialogOpen(false);
      setComment('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Group by urgency
  const immediate = cards.filter(c => c.urgency === 'IMMEDIATE');
  const today = cards.filter(c => c.urgency === 'TODAY');
  const later = cards.filter(c => c.urgency === '48H' || c.urgency === 'THIS_WEEK');

  if (cards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Decision Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 py-6">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">No pending decisions</p>
              <p className="text-xs text-muted-foreground">All campaigns within thresholds</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Decision Queue</CardTitle>
            <Badge variant="secondary" className="text-xs font-normal">
              {cards.length} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {immediate.length > 0 && (
            <DecisionGroup 
              title="Immediate" 
              cards={immediate}
              onSelect={(card) => { setSelectedCard(card); setDialogOpen(true); }}
              urgent
            />
          )}
          {today.length > 0 && (
            <DecisionGroup 
              title="Today" 
              cards={today}
              onSelect={(card) => { setSelectedCard(card); setDialogOpen(true); }}
            />
          )}
          {later.length > 0 && (
            <DecisionGroup 
              title="This Week" 
              cards={later}
              onSelect={(card) => { setSelectedCard(card); setDialogOpen(true); }}
            />
          )}
        </CardContent>
      </Card>

      {/* Decision Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedCard && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>{selectedCard.urgency}</span>
                  <span>·</span>
                  <span>{selectedCard.channel}</span>
                  <span>·</span>
                  <span>{selectedCard.owner}</span>
                </div>
                <DialogTitle className="text-lg">
                  {DECISION_LANGUAGE[selectedCard.type].title}
                </DialogTitle>
                <DialogDescription>
                  {selectedCard.campaignName}
                </DialogDescription>
              </DialogHeader>

              {/* Impact */}
              <div className="grid grid-cols-3 gap-4 py-4 border-y">
                <div>
                  <p className="text-xs text-muted-foreground">Current Loss</p>
                  <p className="text-xl font-semibold tabular-nums">
                    -{formatVND(selectedCard.impactAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Projected</p>
                  <p className="text-xl font-medium text-amber-600 tabular-nums">
                    +{formatVND(selectedCard.projectedLoss)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cash at Risk</p>
                  <p className="text-xl font-medium tabular-nums">
                    {formatVND(selectedCard.cashAtRisk)}
                  </p>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                {selectedCard.metrics.map((m, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className={cn(
                      "font-medium",
                      m.severity === 'critical' && "text-amber-600"
                    )}>
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Comment */}
              <div className="pt-2">
                <Textarea 
                  placeholder="Notes (optional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction('SNOOZE')}
                  disabled={isProcessing}
                >
                  Snooze 24h
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('REJECT')}
                  disabled={isProcessing}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAction('APPROVE')}
                  disabled={isProcessing}
                >
                  {DECISION_LANGUAGE[selectedCard.type].action}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// === DECISION GROUP ===
function DecisionGroup({ 
  title, 
  cards, 
  onSelect,
  urgent = false
}: { 
  title: string; 
  cards: MarketingDecisionCard[];
  onSelect: (card: MarketingDecisionCard) => void;
  urgent?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-xs uppercase tracking-wide",
          urgent ? "text-amber-600 font-medium" : "text-muted-foreground"
        )}>
          {title}
        </span>
        <span className="text-xs text-muted-foreground">({cards.length})</span>
      </div>
      
      {cards.map((card) => (
        <DecisionRow 
          key={card.id} 
          card={card} 
          onSelect={onSelect}
          highlighted={urgent}
        />
      ))}
    </div>
  );
}

// === DECISION ROW ===
function DecisionRow({ 
  card, 
  onSelect,
  highlighted
}: { 
  card: MarketingDecisionCard;
  onSelect: (card: MarketingDecisionCard) => void;
  highlighted?: boolean;
}) {
  const language = DECISION_LANGUAGE[card.type];
  
  return (
    <button
      onClick={() => onSelect(card)}
      className={cn(
        "w-full flex items-center justify-between gap-4 p-3 rounded-lg text-left transition-colors border",
        highlighted 
          ? "bg-amber-50 border-amber-200 hover:bg-amber-100/80" 
          : "bg-card border-border hover:bg-muted/50"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{language.title}</p>
        <p className="text-xs text-muted-foreground truncate">{card.campaignName}</p>
      </div>
      
      <div className="flex items-center gap-4 shrink-0">
        <span className={cn(
          "text-sm font-medium tabular-nums",
          highlighted ? "text-amber-700" : "text-foreground"
        )}>
          -{formatVND(card.impactAmount)}
        </span>
        <Badge variant="secondary" className="text-xs font-normal">
          {card.deadlineHours}h
        </Badge>
      </div>
    </button>
  );
}
