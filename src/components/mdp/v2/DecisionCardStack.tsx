import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle,
  Flame,
  Lock,
  RefreshCcw,
  Package,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  MarketingDecisionCard, 
  DecisionCardType,
  formatVND, 
  getUrgencyColor, 
  getActionColor 
} from '@/types/mdp-v2';
import { toast } from 'sonner';

interface DecisionCardStackProps {
  cards: MarketingDecisionCard[];
  onAction: (card: MarketingDecisionCard, action: 'APPROVE' | 'REJECT' | 'SNOOZE', comment?: string) => void;
}

const CARD_ICONS: Record<DecisionCardType, React.ComponentType<{ className?: string }>> = {
  CAMPAIGN_BURNING_CASH: Flame,
  FAKE_GROWTH_ALERT: AlertTriangle,
  DELAYED_CASH_TRAP: Lock,
  RETURN_BOMB_RISK: RefreshCcw,
  SKU_POISONING_CAMPAIGN: Package,
};

/**
 * DECISION CARD STACK
 * 
 * Displays marketing decision cards that require CEO/CFO action
 * Each card MUST have: Title, Financial Impact, Time Horizon, Owner, Clear Action
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
          ? `✓ ${selectedCard.recommendedAction} đã được thực hiện` 
          : action === 'REJECT'
          ? 'Quyết định đã bị từ chối'
          : 'Tạm hoãn 24h'
      );
      
      setDialogOpen(false);
      setComment('');
    } finally {
      setIsProcessing(false);
    }
  };

  const groupedCards = {
    immediate: cards.filter(c => c.urgency === 'IMMEDIATE'),
    today: cards.filter(c => c.urgency === 'TODAY'),
    later: cards.filter(c => c.urgency === '48H' || c.urgency === 'THIS_WEEK'),
  };

  const renderCardGroup = (groupCards: MarketingDecisionCard[], title: string, urgent: boolean) => {
    if (groupCards.length === 0) return null;
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {urgent && <Flame className="h-4 w-4 text-red-400 animate-pulse" />}
          <h3 className={cn(
            "text-sm font-bold uppercase tracking-wide",
            urgent ? "text-red-400" : "text-muted-foreground"
          )}>
            {title} ({groupCards.length})
          </h3>
        </div>
        
        {groupCards.map((card) => {
          const CardIcon = CARD_ICONS[card.type];
          
          return (
            <Card 
              key={card.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg",
                card.urgency === 'IMMEDIATE' 
                  ? "border-red-500/50 bg-red-500/5 hover:bg-red-500/10" 
                  : card.urgency === 'TODAY'
                  ? "border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10"
                  : "border-border hover:bg-muted/50"
              )}
              onClick={() => {
                setSelectedCard(card);
                setDialogOpen(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    card.urgency === 'IMMEDIATE' ? "bg-red-500/20" : "bg-orange-500/20"
                  )}>
                    <CardIcon className={cn(
                      "h-5 w-5",
                      card.urgency === 'IMMEDIATE' ? "text-red-400" : "text-orange-400"
                    )} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getUrgencyColor(card.urgency)}>
                        {card.urgency === 'IMMEDIATE' ? '⚡ NGAY' : 
                         card.urgency === 'TODAY' ? '⏰ HÔM NAY' : 
                         `${card.deadlineHours}h`}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{card.channel}</Badge>
                      <Badge variant="secondary" className="text-xs">{card.owner}</Badge>
                    </div>
                    
                    <p className="font-bold text-base">{card.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{card.headline}</p>
                    
                    {/* Compact Metrics */}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      {card.metrics.slice(0, 2).map((m, idx) => (
                        <span key={idx} className={cn(
                          "font-medium",
                          m.severity === 'critical' ? "text-red-400" : "text-muted-foreground"
                        )}>
                          {m.label}: {m.value}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Impact */}
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black text-red-400">
                      -{formatVND(card.impactAmount)}
                    </p>
                    <Button 
                      size="sm" 
                      className={cn("mt-2 gap-1", getActionColor(card.recommendedAction))}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCard(card);
                        setDialogOpen(true);
                      }}
                    >
                      {card.recommendedAction}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Marketing Decision Cards
            {cards.length > 0 && (
              <Badge className="bg-red-500 text-white ml-2">{cards.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {cards.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-lg font-medium text-emerald-400">Không có quyết định cần xử lý</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tất cả campaigns đang hoạt động trong ngưỡng an toàn
              </p>
            </div>
          ) : (
            <>
              {renderCardGroup(groupedCards.immediate, '⚡ Cần xử lý ngay', true)}
              {renderCardGroup(groupedCards.today, '📅 Trong hôm nay', false)}
              {renderCardGroup(groupedCards.later, '📋 Trong tuần', false)}
            </>
          )}
        </CardContent>
      </Card>

      {/* Decision Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedCard && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge className={getUrgencyColor(selectedCard.urgency)}>
                    {selectedCard.urgency}
                  </Badge>
                  <Badge variant="outline">{selectedCard.channel}</Badge>
                </div>
                <DialogTitle className="text-xl mt-2">{selectedCard.title}</DialogTitle>
                <DialogDescription className="text-base">
                  {selectedCard.headline}
                </DialogDescription>
              </DialogHeader>

              {/* Impact Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground">Đang mất</p>
                  <p className="text-2xl font-black text-red-400">
                    -{formatVND(selectedCard.impactAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sẽ mất thêm</p>
                  <p className="text-2xl font-bold text-orange-400">
                    +{formatVND(selectedCard.projectedLoss)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cash bị khóa</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {formatVND(selectedCard.cashAtRisk)}
                  </p>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Chi tiết:</p>
                <div className="grid grid-cols-3 gap-2">
                  {selectedCard.metrics.map((m, idx) => (
                    <div key={idx} className="p-2 rounded bg-muted/30">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className={cn(
                        "font-bold",
                        m.severity === 'critical' ? "text-red-400" :
                        m.severity === 'warning' ? "text-yellow-400" : "text-emerald-400"
                      )}>
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Action */}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm font-medium text-primary mb-1">Khuyến nghị:</p>
                <p className="font-bold">{selectedCard.actionDescription}</p>
              </div>

              {/* Comment */}
              <div>
                <p className="text-sm font-medium mb-2">Ghi chú (tùy chọn):</p>
                <Textarea 
                  placeholder="Lý do quyết định..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleAction('SNOOZE')}
                  disabled={isProcessing}
                  className="gap-1"
                >
                  <Clock className="h-4 w-4" />
                  Hoãn 24h
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleAction('REJECT')}
                  disabled={isProcessing}
                  className="gap-1"
                >
                  <XCircle className="h-4 w-4" />
                  Từ chối
                </Button>
                <Button
                  className={cn("gap-1", getActionColor(selectedCard.recommendedAction))}
                  onClick={() => handleAction('APPROVE')}
                  disabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4" />
                  {selectedCard.recommendedAction}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
