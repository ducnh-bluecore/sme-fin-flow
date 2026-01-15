import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  Pause,
  DollarSign,
  Package,
  Users,
  Truck,
  BarChart3,
  ChevronRight,
  Timer,
  Zap,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DecisionCard as DecisionCardType,
} from '@/hooks/useDecisionCards';
import { formatDistanceToNow, isPast } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DecisionCardExpandedProps {
  card: DecisionCardType;
  onViewDetail?: () => void;
  onQuickAction?: (action: 'decide' | 'dismiss' | 'snooze') => void;
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
  borderColor: string;
}> = {
  P1: { label: 'Khẩn cấp', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500' },
  P2: { label: 'Quan trọng', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500' },
  P3: { label: 'Theo dõi', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500' },
};

// Recommendation configuration  
type RecommendationType = 'PAUSE' | 'INVESTIGATE' | 'SCALE_WITH_CONDITION';

const RECOMMENDATION_CONFIG: Record<RecommendationType, {
  emoji: string;
  label: string;
  shortLabel: string;
  bgColor: string;
  textColor: string;
  actionIcon: typeof Pause;
}> = {
  PAUSE: { 
    emoji: '🟥', 
    label: 'DỪNG NGAY', 
    shortLabel: 'PAUSE',
    bgColor: 'bg-red-500/20', 
    textColor: 'text-red-400',
    actionIcon: Pause,
  },
  INVESTIGATE: { 
    emoji: '🟨', 
    label: 'CẦN ĐIỀU TRA', 
    shortLabel: 'INVESTIGATE',
    bgColor: 'bg-yellow-500/20', 
    textColor: 'text-yellow-400',
    actionIcon: Eye,
  },
  SCALE_WITH_CONDITION: { 
    emoji: '🟩', 
    label: 'CÓ THỂ SCALE', 
    shortLabel: 'SCALE',
    bgColor: 'bg-green-500/20', 
    textColor: 'text-green-400',
    actionIcon: TrendingUp,
  },
};

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

// Get recommendation type from card data
function getRecommendationType(card: DecisionCardType): RecommendationType | null {
  const recommendedAction = card.actions?.find(a => a.is_recommended);
  if (!recommendedAction) {
    if (card.priority === 'P1' || card.impact_amount < -1000000) return 'PAUSE';
    if (card.priority === 'P2' || card.impact_amount < 0) return 'INVESTIGATE';
    if (card.impact_amount > 0) return 'SCALE_WITH_CONDITION';
    return null;
  }
  
  const actionType = recommendedAction.action_type;
  if (['STOP', 'PAUSE', 'AVOID'].includes(actionType)) return 'PAUSE';
  if (['INVESTIGATE', 'COLLECT', 'RENEGOTIATE'].includes(actionType)) return 'INVESTIGATE';
  if (['SCALE', 'SCALE_WITH_CONDITION', 'PROTECT'].includes(actionType)) return 'SCALE_WITH_CONDITION';
  
  return 'INVESTIGATE';
}

// Trend icon component
function TrendIcon({ trend, size = 'sm' }: { trend: string | null; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'h-4 w-4' : 'h-3 w-3';
  if (trend === 'UP') return <TrendingUp className={cn(sizeClass, "text-green-400")} />;
  if (trend === 'DOWN') return <TrendingDown className={cn(sizeClass, "text-red-400")} />;
  return <Minus className={cn(sizeClass, "text-muted-foreground")} />;
}

export function DecisionCardExpanded({ card, onViewDetail, onQuickAction }: DecisionCardExpandedProps) {
  const typeConfig = CARD_TYPE_CONFIG[card.card_type] || CARD_TYPE_CONFIG.GROWTH_SCALE_CHANNEL;
  const priorityConfig = PRIORITY_CONFIG[card.priority];
  const TypeIcon = typeConfig.icon;
  
  const isOverdue = isPast(new Date(card.deadline_at));
  const hoursRemaining = Math.max(0, Math.round((new Date(card.deadline_at).getTime() - Date.now()) / (1000 * 60 * 60)));
  
  // Get primary facts for display
  const primaryFacts = card.facts?.filter(f => f.is_primary).slice(0, 4) || [];
  
  // Get recommendation
  const recommendationType = getRecommendationType(card);
  const recommendationBadge = recommendationType ? RECOMMENDATION_CONFIG[recommendationType] : null;
  const RecommendIcon = recommendationBadge?.actionIcon || Zap;
  
  // Calculate cost of delay per hour
  const getCostOfDelayPerHour = () => {
    if (card.impact_amount >= 0) return null;
    const impactWindow = card.impact_window_days || 7;
    const hoursInWindow = impactWindow * 24;
    const hourlyLoss = Math.abs(card.impact_amount) / hoursInWindow;
    if (hourlyLoss < 100000) return null;
    return hourlyLoss;
  };
  
  const hourlyLoss = getCostOfDelayPerHour();

  return (
    <Card className={cn(
      "overflow-hidden border-l-4 hover:shadow-lg transition-shadow cursor-pointer group",
      priorityConfig.borderColor,
      card.priority === 'P1' && "bg-gradient-to-r from-red-500/5 via-transparent to-transparent",
      card.priority === 'P2' && "bg-gradient-to-r from-yellow-500/5 via-transparent to-transparent",
      card.priority === 'P3' && "bg-gradient-to-r from-blue-500/5 via-transparent to-transparent",
    )}
    onClick={onViewDetail}
    >
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Type Icon */}
          <div className={cn("p-2.5 rounded-xl shrink-0", typeConfig.bgColor)}>
            <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
          </div>
          
          {/* Title & Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={cn("text-xs font-semibold", priorityConfig.bgColor, priorityConfig.color)}>
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
            </div>
            <h3 className="font-semibold text-base leading-tight line-clamp-2">
              {card.question || card.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {card.entity_label}
            </p>
          </div>
          
          {/* Impact Amount - Large */}
          <div className="text-right shrink-0">
            <div className={cn(
              "text-xl font-bold",
              card.impact_amount > 0 ? "text-green-400" : "text-red-400"
            )}>
              {card.impact_amount > 0 ? '+' : ''}{formatCurrency(card.impact_amount)}đ
            </div>
            <p className="text-xs text-muted-foreground">
              {card.impact_description || 'Impact dự kiến'}
            </p>
          </div>
        </div>

        {/* Key Facts Row */}
        {primaryFacts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 p-2 bg-muted/30 rounded-lg">
            {primaryFacts.map((fact, idx) => (
              <div key={idx} className="text-center p-1.5">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <span className="text-sm font-semibold">
                    {fact.value}
                  </span>
                  <TrendIcon trend={fact.trend} size="sm" />
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {fact.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Row: Recommendation + Deadline + Action */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
          {/* Recommendation Badge */}
          {recommendationBadge && (
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
              recommendationBadge.bgColor
            )}>
              <RecommendIcon className={cn("h-3.5 w-3.5", recommendationBadge.textColor)} />
              <span className={cn("text-xs font-semibold", recommendationBadge.textColor)}>
                {recommendationBadge.label}
              </span>
            </div>
          )}
          
          {/* Cost of delay */}
          {hourlyLoss && (
            <div className="flex items-center gap-1 text-xs text-red-400">
              <Timer className="h-3 w-3" />
              <span>~–{formatCurrency(hourlyLoss)}đ/giờ</span>
            </div>
          )}
          
          <div className="flex-1" />
          
          {/* Deadline */}
          <div className={cn(
            "flex items-center gap-1.5 text-xs",
            isOverdue ? "text-red-400" : "text-muted-foreground"
          )}>
            <Clock className="h-3.5 w-3.5" />
            <span>
              {isOverdue ? 'Quá hạn' : `Còn ${hoursRemaining}h`}
            </span>
          </div>
          
          {/* View Detail Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 group-hover:bg-primary/10 group-hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail?.();
            }}
          >
            <span className="text-xs mr-1">Chi tiết</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
