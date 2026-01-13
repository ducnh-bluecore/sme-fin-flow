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

export function DecisionCardComponent({ card, compact = false, onViewDetail }: DecisionCardProps) {
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
    });

    setShowDecideDialog(false);
    setSelectedAction(null);
    setComment('');
  };

  const handleDismiss = async () => {
    await dismissCard.mutateAsync({
      cardId: card.id,
      reason: dismissReason,
      comment,
    });

    setShowDismissDialog(false);
    setComment('');
  };

  const handleSnooze = async () => {
    await snoozeCard.mutateAsync({
      cardId: card.id,
      hours: 24,
    });
  };

  // Compact view (for list)
  if (compact) {
    return (
      <Card 
        className={cn(
          "border-l-4 cursor-pointer hover:bg-muted/50 transition-colors",
          card.priority === 'P1' && "border-l-red-500",
          card.priority === 'P2' && "border-l-yellow-500",
          card.priority === 'P3' && "border-l-blue-500"
        )}
        onClick={onViewDetail}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
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
              <h4 className="font-medium text-sm truncate">{card.title}</h4>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {card.entity_label}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className={cn(
                "text-sm font-bold",
                card.impact_amount > 0 ? "text-green-400" : "text-red-400"
              )}>
                {card.impact_amount > 0 ? '+' : ''}{formatCurrency(card.impact_amount)}đ
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(card.deadline_at), { addSuffix: true, locale: vi })}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
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
                <div className="flex items-center gap-2 mb-1">
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

          {/* Deadline & Owner */}
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
