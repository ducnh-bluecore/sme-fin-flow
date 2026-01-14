import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Search,
  Shield,
  Ban,
  DollarSign,
  Package,
  Users,
  Truck,
  BarChart3,
  ChevronRight,
  Timer,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DecisionCard as DecisionCardType,
  DecisionCardFact,
  DecisionCardAction,
  ActionType,
  DismissReason,
  useDecideCard,
  useDismissCard,
  useSnoozeCard,
} from '@/hooks/useDecisionCards';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DecisionCardProps {
  card: DecisionCardType;
  compact?: boolean;
  onViewDetail?: () => void;
  onDecided?: (cardId: string) => void;
  onDismissed?: (cardId: string) => void;
}

// Card type configuration
const CARD_TYPE_CONFIG: Record<string, {
  icon: typeof AlertTriangle;
  color: string;
  bgColor: string;
  label: string;
}> = {
  GROWTH_SCALE_CHANNEL: {
    icon: BarChart3,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    label: 'Channel',
  },
  GROWTH_SCALE_SKU: {
    icon: Package,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    label: 'SKU',
  },
  CASH_SURVIVAL: {
    icon: DollarSign,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'Cash',
  },
  INVENTORY_CASH_LOCK: {
    icon: Package,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    label: 'Inventory',
  },
  OPS_REVENUE_AT_RISK: {
    icon: Truck,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    label: 'Ops',
  },
  CUSTOMER_PROTECT_OR_AVOID: {
    icon: Users,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    label: 'Customer',
  },
};

// Priority configuration
const PRIORITY_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  P1: { label: 'Khẩn cấp', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  P2: { label: 'Quan trọng', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  P3: { label: 'Theo dõi', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
};

// Action type configuration
const ACTION_TYPE_CONFIG: Record<ActionType, {
  icon: typeof CheckCircle2;
  color: string;
  label: string;
}> = {
  STOP: { icon: XCircle, color: 'text-red-400', label: 'Dừng' },
  PAUSE: { icon: Pause, color: 'text-yellow-400', label: 'Tạm dừng' },
  SCALE: { icon: TrendingUp, color: 'text-green-400', label: 'Scale' },
  SCALE_WITH_CONDITION: { icon: Play, color: 'text-blue-400', label: 'Scale có điều kiện' },
  INVESTIGATE: { icon: Search, color: 'text-purple-400', label: 'Điều tra' },
  ACCEPT_LOSS: { icon: AlertTriangle, color: 'text-orange-400', label: 'Chấp nhận lỗ' },
  PROTECT: { icon: Shield, color: 'text-cyan-400', label: 'Bảo vệ' },
  AVOID: { icon: Ban, color: 'text-gray-400', label: 'Tránh' },
  COLLECT: { icon: DollarSign, color: 'text-green-400', label: 'Thu hồi' },
  DISCOUNT: { icon: TrendingDown, color: 'text-orange-400', label: 'Giảm giá' },
  RENEGOTIATE: { icon: Users, color: 'text-blue-400', label: 'Đàm phán lại' },
  SWITCH: { icon: Truck, color: 'text-purple-400', label: 'Chuyển đổi' },
};

// Recommendation badge configuration
type RecommendationType = 'PAUSE' | 'INVESTIGATE' | 'SCALE_WITH_CONDITION';

const RECOMMENDATION_CONFIG: Record<RecommendationType, {
  emoji: string;
  label: string;
  bgColor: string;
  textColor: string;
}> = {
  PAUSE: { 
    emoji: '🟥', 
    label: 'RECOMMEND: PAUSE', 
    bgColor: 'bg-red-500/20', 
    textColor: 'text-red-400' 
  },
  INVESTIGATE: { 
    emoji: '🟨', 
    label: 'RECOMMEND: INVESTIGATE', 
    bgColor: 'bg-yellow-500/20', 
    textColor: 'text-yellow-400' 
  },
  SCALE_WITH_CONDITION: { 
    emoji: '🟩', 
    label: 'RECOMMEND: SCALE WITH CONDITION', 
    bgColor: 'bg-green-500/20', 
    textColor: 'text-green-400' 
  },
};

// Get recommendation type from card data
function getRecommendationType(card: DecisionCardType): RecommendationType | null {
  const recommendedAction = card.actions?.find(a => a.is_recommended);
  if (!recommendedAction) {
    // Fallback: determine from priority and impact
    if (card.priority === 'P1' || card.impact_amount < -1000000) return 'PAUSE';
    if (card.priority === 'P2' || card.impact_amount < 0) return 'INVESTIGATE';
    if (card.impact_amount > 0) return 'SCALE_WITH_CONDITION';
    return null;
  }
  
  // Map action type to recommendation
  const actionType = recommendedAction.action_type;
  if (['STOP', 'PAUSE', 'AVOID'].includes(actionType)) return 'PAUSE';
  if (['INVESTIGATE', 'COLLECT', 'RENEGOTIATE'].includes(actionType)) return 'INVESTIGATE';
  if (['SCALE', 'SCALE_WITH_CONDITION', 'PROTECT'].includes(actionType)) return 'SCALE_WITH_CONDITION';
  
  return 'INVESTIGATE'; // Default
}

// Trend icon component
function TrendIcon({ trend }: { trend: string | null }) {
  if (trend === 'UP') return <TrendingUp className="h-3 w-3 text-green-400" />;
  if (trend === 'DOWN') return <TrendingDown className="h-3 w-3 text-red-400" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

// Format currency
function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(0)}K`;
  }
  return value.toFixed(0);
}

// Calculate cost of delay per hour
function getCostOfDelay(card: DecisionCardType): { hourly: number; label: string } | null {
  // Only show for negative impact (losses) 
  if (card.impact_amount >= 0) return null;
  
  const impactWindow = card.impact_window_days || 7;
  const hoursInWindow = impactWindow * 24;
  const hourlyLoss = Math.abs(card.impact_amount) / hoursInWindow;
  
  // Only show if meaningful (> 100k per hour)
  if (hourlyLoss < 100000) return null;
  
  return {
    hourly: hourlyLoss,
    label: `Mỗi giờ trì hoãn: ~–${formatCurrency(hourlyLoss)}đ`
  };
}

// Get per-unit loss for SKU cards
function getLossPerUnit(card: DecisionCardType): { value: number; label: string } | null {
  // Only for SKU-related cards with negative impact
  if (!card.card_type?.includes('SKU') && card.entity_type !== 'sku') return null;
  if (card.impact_amount >= 0) return null;
  
  // Try to find loss_per_unit from facts
  const lossPerUnitFact = card.facts?.find(f => 
    f.fact_key === 'loss_per_unit' || 
    f.fact_key === 'profit_per_unit'
  );
  
  if (lossPerUnitFact?.numeric_value && lossPerUnitFact.numeric_value < 0) {
    const loss = Math.abs(lossPerUnitFact.numeric_value);
    return {
      value: loss,
      label: `Mỗi SP bán ra: lỗ ${formatCurrency(loss)}đ`
    };
  }
  
  // Fallback: estimate from revenue and margin if we have them
  const marginFact = card.facts?.find(f => f.fact_key === 'margin');
  const revenueFact = card.facts?.find(f => f.fact_key === 'revenue');
  
  if (marginFact?.numeric_value && marginFact.numeric_value < 0 && revenueFact?.numeric_value) {
    // Estimate: if we have margin % and revenue, assume ~100 units sold
    const estimatedUnits = 100;
    const lossPerUnit = Math.abs(card.impact_amount) / estimatedUnits;
    if (lossPerUnit > 1000) { // Only show if > 1000đ per unit
      return {
        value: lossPerUnit,
        label: `Mỗi SP bán ra: lỗ ~${formatCurrency(lossPerUnit)}đ`
      };
    }
  }
  
  return null;
}

// Generate detailed intelligence trace for CEO trust
function getIntelligenceTrace(card: DecisionCardType): string {
  const parts: string[] = [];
  
  // Time window
  const days = card.impact_window_days || 7;
  parts.push(`${days} ngày dữ liệu`);
  
  // Data type description based on card type
  const cardType = card.card_type || '';
  const entityType = card.entity_type?.toLowerCase() || '';
  
  // Get fact count as data points
  const factCount = card.facts?.length || 0;
  
  if (entityType === 'sku' || cardType.includes('SKU')) {
    parts.push(`${factCount} chỉ số SKU`);
  } else if (entityType === 'channel' || cardType.includes('CHANNEL')) {
    parts.push(`${factCount} chỉ số kênh`);
  } else if (cardType.includes('CASH')) {
    parts.push(`${factCount} chỉ số tài chính`);
  } else if (cardType.includes('INVENTORY')) {
    parts.push(`${factCount} chỉ số tồn kho`);
  } else if (cardType.includes('OPS')) {
    parts.push(`${factCount} chỉ số vận hành`);
  } else if (cardType.includes('CUSTOMER')) {
    parts.push(`${factCount} chỉ số khách hàng`);
  } else if (factCount > 0) {
    parts.push(`${factCount} chỉ số`);
  }
  
  // Number of sources
  const sources = card.source_modules?.length || 1;
  if (sources > 1) {
    parts.push(`${sources} nguồn`);
  }
  
  // Specific modules
  if (card.source_modules?.length) {
    parts.push(card.source_modules.join(' + '));
  }
  
  return parts.join(' · ');
}

export function DecisionCardComponent({ card, compact = false, onViewDetail, onDecided, onDismissed }: DecisionCardProps) {
  const [showDecideDialog, setShowDecideDialog] = useState(false);
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [dismissReason, setDismissReason] = useState<DismissReason>('NOT_RELEVANT');
  const [comment, setComment] = useState('');

  const decideCard = useDecideCard();
  const dismissCard = useDismissCard();
  const snoozeCard = useSnoozeCard();

  const typeConfig = CARD_TYPE_CONFIG[card.card_type] || CARD_TYPE_CONFIG.GROWTH_SCALE_CHANNEL;
  const priorityConfig = PRIORITY_CONFIG[card.priority];
  const TypeIcon = typeConfig.icon;

  const isOverdue = isPast(new Date(card.deadline_at));
  const primaryFacts = card.facts?.filter(f => f.is_primary).slice(0, 6) || [];
  const recommendedAction = card.actions?.find(a => a.is_recommended);

  const handleDecide = async () => {
    if (!selectedAction) return;

    const actionLabel = ACTION_TYPE_CONFIG[selectedAction]?.label || selectedAction;

    await decideCard.mutateAsync({
      cardId: card.id,
      actionType: selectedAction,
      actionLabel,
      comment,
      cardSnapshot: card.id.startsWith('auto-') ? card : undefined,
    });

    setShowDecideDialog(false);
    setSelectedAction(null);
    setComment('');
    
    // Notify parent for auto-generated cards
    if (card.id.startsWith('auto-') && onDecided) {
      onDecided(card.id);
    }
  };

  const handleDismiss = async () => {
    await dismissCard.mutateAsync({
      cardId: card.id,
      reason: dismissReason,
      comment,
      cardSnapshot: card.id.startsWith('auto-') ? card : undefined,
    });

    setShowDismissDialog(false);
    setComment('');
    
    // Notify parent for auto-generated cards
    if (card.id.startsWith('auto-') && onDismissed) {
      onDismissed(card.id);
    }
  };

  const handleSnooze = async () => {
    await snoozeCard.mutateAsync({
      cardId: card.id,
      hours: 24,
      cardSnapshot: card.id.startsWith('auto-') ? card : undefined,
    });
  };

  // Get recommendation type for badge
  const recommendationType = getRecommendationType(card);
  const recommendationBadge = recommendationType ? RECOMMENDATION_CONFIG[recommendationType] : null;
  
  // Get cost of delay
  const costOfDelay = getCostOfDelay(card);
  
  // Get loss per unit for SKU cards
  const lossPerUnit = getLossPerUnit(card);

  // Calculate hours remaining to deadline
  const hoursRemaining = Math.max(0, Math.round((new Date(card.deadline_at).getTime() - Date.now()) / (1000 * 60 * 60)));
  
  // Compact view (for list) - CEO 5-10s: "Cái gì nguy hiểm nhất?"
  if (compact) {
    return (
      <Card 
        className={cn(
          "border-l-4 cursor-pointer hover:bg-muted/50 transition-colors",
          card.priority === 'P1' && "border-l-red-500 bg-red-500/5",
          card.priority === 'P2' && "border-l-yellow-500 bg-yellow-500/5",
          card.priority === 'P3' && "border-l-blue-500"
        )}
        onClick={onViewDetail}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <div className={cn("p-1 rounded", typeConfig.bgColor)}>
                  <TypeIcon className={cn("h-3.5 w-3.5", typeConfig.color)} />
                </div>
                <Badge variant="outline" className={cn("text-xs", priorityConfig.color)}>
                  {priorityConfig.label}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    Quá hạn
                  </Badge>
                )}
              </div>
              
              {/* CEO 5-10s: Title là CÂU HỎI QUYẾT ĐỊNH (động từ đứng đầu) */}
              <h4 className="font-semibold text-sm">
                {card.question || card.title}
              </h4>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {card.entity_label}
              </p>
              
              {/* CEO 10-20s: 3 dòng cố định cho P1/P2 - Ép hành động */}
              {(card.priority === 'P1' || card.priority === 'P2') && (
                <div className="mt-2 space-y-1 text-[11px]">
                  {/* System Recommendation */}
                  {recommendationBadge && (
                    <div className={cn("flex items-center gap-1.5 font-semibold", recommendationBadge.textColor)}>
                      {recommendationBadge.emoji} System recommends: {recommendationType}
                    </div>
                  )}
                  {/* Countdown */}
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    <span className={cn(isOverdue ? "text-red-400 font-medium" : "")}>
                      {isOverdue ? "⚠️ Đã quá hạn!" : `Còn ${hoursRemaining} giờ để quyết`}
                    </span>
                  </div>
                  {/* Owner call-out */}
                  <div className="flex items-center gap-1.5 text-primary font-medium">
                    <User className="h-3 w-3" />
                    Quyết định này đang chờ bạn
                  </div>
                </div>
              )}
              
              {/* Cost of Delay - urgency trigger */}
              {costOfDelay && (
                <div className="flex items-center gap-1 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[11px] font-medium text-red-400">
                    ⏱ {costOfDelay.label}
                  </span>
                </div>
              )}
              {/* Loss per unit for SKU cards */}
              {lossPerUnit && !costOfDelay && (
                <div className="flex items-center gap-1 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[11px] font-medium text-orange-400">
                    📦 {lossPerUnit.label}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className={cn(
                "text-sm font-bold",
                card.impact_amount > 0 ? "text-green-400" : "text-red-400"
              )}>
                {card.impact_amount > 0 ? '+' : ''}{formatCurrency(card.impact_amount)}đ
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(card.deadline_at), { addSuffix: true, locale: vi })}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          
          {/* CEO 20-30s: Intelligence trace - Tạo niềm tin */}
          {(card.priority === 'P1' || card.priority === 'P2') && (
            <div className="mt-3 pt-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Dựa trên {getIntelligenceTrace(card)}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full view
  return (
    <>
      <Card className={cn(
        "border-l-4",
        card.priority === 'P1' && "border-l-red-500 bg-red-500/5",
        card.priority === 'P2' && "border-l-yellow-500 bg-yellow-500/5",
        card.priority === 'P3' && "border-l-blue-500"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", typeConfig.bgColor)}>
                <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className={cn("text-xs", priorityConfig.bgColor, priorityConfig.color)}>
                    {card.priority} - {priorityConfig.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {typeConfig.label}
                  </Badge>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs animate-pulse">
                      ⚠️ Quá hạn
                    </Badge>
                  )}
                  {/* Recommendation Badge */}
                  {recommendationBadge && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs font-semibold",
                        recommendationBadge.bgColor,
                        recommendationBadge.textColor
                      )}
                    >
                      {recommendationBadge.emoji} {recommendationBadge.label}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-lg">{card.question}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {card.entity_label}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={cn(
                "text-xl font-bold",
                card.impact_amount > 0 ? "text-green-400" : "text-red-400"
              )}>
                {card.impact_amount > 0 ? '+' : ''}{formatCurrency(card.impact_amount)}đ
              </div>
              <p className="text-xs text-muted-foreground">
                Impact / {card.impact_window_days} ngày
              </p>
              {/* Cost of Delay - urgency trigger */}
              {costOfDelay && (
                <div className="flex items-center gap-1.5 mt-2 justify-end">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-semibold text-red-400">
                    ⏱ {costOfDelay.label}
                  </span>
                </div>
              )}
              {/* Loss per unit for SKU cards */}
              {lossPerUnit && !costOfDelay && (
                <div className="flex items-center gap-1.5 mt-2 justify-end">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-xs font-semibold text-orange-400">
                    📦 {lossPerUnit.label}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Facts Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {primaryFacts.map((fact) => (
              <div key={fact.id} className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{fact.label}</span>
                  <TrendIcon trend={fact.trend} />
                </div>
                <div className="font-semibold">
                  {fact.value}{fact.unit && <span className="text-muted-foreground ml-1">{fact.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* CEO 10-20s: 3 dòng cố định - Ép hành động rõ ràng */}
          {(card.priority === 'P1' || card.priority === 'P2') && (
            <div className={cn(
              "rounded-lg p-4 space-y-2",
              card.priority === 'P1' ? "bg-red-500/10 border border-red-500/30" : "bg-yellow-500/10 border border-yellow-500/30"
            )}>
              {/* System Recommendation */}
              {recommendationBadge && (
                <div className={cn("flex items-center gap-2 font-semibold text-sm", recommendationBadge.textColor)}>
                  {recommendationBadge.emoji} System recommends: {recommendationType}
                </div>
              )}
              {/* Countdown */}
              <div className="flex items-center gap-2 text-sm">
                <Timer className={cn("h-4 w-4", isOverdue ? "text-red-400" : "text-muted-foreground")} />
                <span className={cn(isOverdue ? "text-red-400 font-medium" : "")}>
                  {isOverdue ? "⚠️ Đã quá hạn - Cần xử lý ngay!" : `Còn ${hoursRemaining} giờ để quyết`}
                </span>
              </div>
              {/* Owner call-out */}
              <div className="flex items-center gap-2 text-sm text-primary font-semibold">
                <User className="h-4 w-4" />
                👤 Quyết định này đang chờ bạn
              </div>
            </div>
          )}

          {/* Deadline & Owner - Additional info */}
          <div className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Timer className={cn("h-4 w-4", isOverdue ? "text-red-400" : "text-muted-foreground")} />
                <span className={cn(isOverdue && "text-red-400 font-medium")}>
                  Deadline: {format(new Date(card.deadline_at), 'dd/MM HH:mm')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{card.owner_role}</span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {card.source_modules.join(' + ')}
            </Badge>
          </div>

          {/* Recommended Action */}
          {recommendedAction && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Đề xuất của hệ thống</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{recommendedAction.label}</p>
                  {recommendedAction.expected_outcome && (
                    <p className="text-sm text-muted-foreground mt-1">
                      → {recommendedAction.expected_outcome}
                    </p>
                  )}
                </div>
                <Button 
                  onClick={() => {
                    setSelectedAction(recommendedAction.action_type);
                    setShowDecideDialog(true);
                  }}
                >
                  Chấp nhận
                </Button>
              </div>
            </div>
          )}

          {/* CEO 20-30s: Intelligence trace - Tạo niềm tin dữ liệu (DETAIL VIEW) */}
          <div className="bg-muted/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-primary" />
              Cơ sở dữ liệu phân tích
            </div>
            
            {/* Data volume stats - CEO wants to see real numbers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-background/50 rounded-lg p-2">
                <div className="text-muted-foreground">Thời gian</div>
                <div className="font-medium">{card.impact_window_days || 7} ngày</div>
              </div>
              
              {/* Data rows - from analysis_metadata */}
              <div className="bg-background/50 rounded-lg p-2">
                <div className="text-muted-foreground">Dòng dữ liệu</div>
                <div className="font-medium">
                  {(card as any).analysis_metadata?.data_rows 
                    ? `${((card as any).analysis_metadata.data_rows as number).toLocaleString('vi-VN')} rows`
                    : `${card.facts?.length || 0} chỉ số`}
                </div>
              </div>
              
              {/* SKU/Product count or Transaction count based on card type */}
              {(card.card_type?.includes('SKU') || card.entity_type === 'sku') ? (
                <div className="bg-background/50 rounded-lg p-2">
                  <div className="text-muted-foreground">SKU phân tích</div>
                  <div className="font-medium">
                    {(card as any).analysis_metadata?.sku_count 
                      ? `${((card as any).analysis_metadata.sku_count as number).toLocaleString('vi-VN')} SKUs`
                      : '1 SKU'}
                  </div>
                </div>
              ) : card.card_type?.includes('CASH') ? (
                <div className="bg-background/50 rounded-lg p-2">
                  <div className="text-muted-foreground">Giao dịch</div>
                  <div className="font-medium">
                    {(card as any).analysis_metadata?.transaction_count 
                      ? `${((card as any).analysis_metadata.transaction_count as number).toLocaleString('vi-VN')} GD`
                      : 'N/A'}
                  </div>
                </div>
              ) : (
                <div className="bg-background/50 rounded-lg p-2">
                  <div className="text-muted-foreground">Đơn hàng</div>
                  <div className="font-medium">
                    {(card as any).analysis_metadata?.order_count 
                      ? `${((card as any).analysis_metadata.order_count as number).toLocaleString('vi-VN')} đơn`
                      : 'N/A'}
                  </div>
                </div>
              )}
              
              <div className="bg-background/50 rounded-lg p-2">
                <div className="text-muted-foreground">Độ tin cậy</div>
                <div className={cn(
                  "font-medium",
                  card.confidence === 'HIGH' && "text-green-400",
                  card.confidence === 'MEDIUM' && "text-yellow-400",
                  card.confidence === 'LOW' && "text-red-400"
                )}>
                  {card.confidence === 'HIGH' ? 'Cao' : card.confidence === 'MEDIUM' ? 'Trung bình' : 'Thấp'}
                </div>
              </div>
            </div>
            
            {/* Fact labels used */}
            {card.facts && card.facts.length > 0 && (
              <div className="text-xs">
                <span className="text-muted-foreground">Chỉ số phân tích: </span>
                <span className="text-foreground">
                  {card.facts.map(f => f.label).join(', ')}
                </span>
              </div>
            )}
            
            {/* Source modules */}
            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>Nguồn:</span>
              {card.source_modules?.map((mod, i) => (
                <span key={i} className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {mod}
                </span>
              ))}
              {(card as any).analysis_metadata?.analyzed_at && (
                <span className="ml-auto">
                  Cập nhật: {new Date((card as any).analysis_metadata.analyzed_at).toLocaleString('vi-VN')}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button 
              variant="default" 
              className="flex-1"
              onClick={() => setShowDecideDialog(true)}
            >
              Quyết định
            </Button>
            {card.priority !== 'P1' && card.snooze_count < 1 && (
              <Button 
                variant="outline"
                onClick={handleSnooze}
                disabled={snoozeCard.isPending}
              >
                <Clock className="h-4 w-4 mr-1" />
                Hoãn 24h
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowDismissDialog(true)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Decide Dialog */}
      <Dialog open={showDecideDialog} onOpenChange={setShowDecideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quyết định: {card.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Chọn hành động</label>
              <div className="grid grid-cols-2 gap-2">
                {card.actions?.map((action) => {
                  const config = ACTION_TYPE_CONFIG[action.action_type];
                  const ActionIcon = config?.icon || CheckCircle2;
                  
                  return (
                    <Button
                      key={action.id}
                      variant={selectedAction === action.action_type ? "default" : "outline"}
                      className={cn(
                        "justify-start h-auto py-3",
                        action.is_recommended && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedAction(action.action_type)}
                    >
                      <ActionIcon className={cn("h-4 w-4 mr-2", config?.color)} />
                      <div className="text-left">
                        <div className="font-medium">{action.label}</div>
                        {action.expected_outcome && (
                          <div className="text-xs text-muted-foreground">
                            {action.expected_outcome}
                          </div>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Ghi chú (tùy chọn)</label>
              <Textarea
                placeholder="Thêm ghi chú cho quyết định này..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDecideDialog(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleDecide}
              disabled={!selectedAction || decideCard.isPending}
            >
              Xác nhận quyết định
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss Dialog */}
      <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bỏ qua quyết định này?</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Lý do</label>
              <Select value={dismissReason} onValueChange={(v) => setDismissReason(v as DismissReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_RELEVANT">Không liên quan</SelectItem>
                  <SelectItem value="ALREADY_HANDLED">Đã xử lý ngoài hệ thống</SelectItem>
                  <SelectItem value="FALSE_POSITIVE">Cảnh báo sai</SelectItem>
                  <SelectItem value="AWAITING_DATA">Chờ thêm dữ liệu</SelectItem>
                  <SelectItem value="OTHER">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Ghi chú</label>
              <Textarea
                placeholder="Giải thích lý do bỏ qua..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDismissDialog(false)}>
              Hủy
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDismiss}
              disabled={dismissCard.isPending}
            >
              Bỏ qua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DecisionCardComponent;
