import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Copy,
  RefreshCw,
  Target,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Eye,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Action recommendation from system
export interface MarketingAction {
  id: string;
  type: 'scale_up' | 'scale_down' | 'pause' | 'resume' | 'duplicate' | 'review_creative' | 'optimize_bid' | 'expand_audience';
  priority: 'high' | 'medium' | 'low';
  campaign_name: string;
  campaign_id: string;
  channel: string;
  reason: string;
  expected_impact: string;
  impact_value?: number;
  confidence: number; // 0-100%
  is_urgent: boolean;
}

interface MarketingActionsPanelProps {
  actions: MarketingAction[];
  onExecuteAction?: (action: MarketingAction) => Promise<void>;
  onDismissAction?: (actionId: string) => void;
}

const getActionConfig = (type: MarketingAction['type']) => {
  const configs: Record<MarketingAction['type'], { 
    icon: React.ReactNode; 
    label: string; 
    color: string;
    buttonVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  }> = {
    scale_up: {
      icon: <TrendingUp className="h-4 w-4" />,
      label: 'Tăng Budget',
      color: 'text-green-400 bg-green-500/10 border-green-500/30',
      buttonVariant: 'default',
    },
    scale_down: {
      icon: <TrendingDown className="h-4 w-4" />,
      label: 'Giảm Budget',
      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      buttonVariant: 'secondary',
    },
    pause: {
      icon: <Pause className="h-4 w-4" />,
      label: 'Dừng Campaign',
      color: 'text-red-400 bg-red-500/10 border-red-500/30',
      buttonVariant: 'destructive',
    },
    resume: {
      icon: <Play className="h-4 w-4" />,
      label: 'Tiếp tục chạy',
      color: 'text-green-400 bg-green-500/10 border-green-500/30',
      buttonVariant: 'default',
    },
    duplicate: {
      icon: <Copy className="h-4 w-4" />,
      label: 'Nhân bản',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      buttonVariant: 'outline',
    },
    review_creative: {
      icon: <Palette className="h-4 w-4" />,
      label: 'Review Creative',
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      buttonVariant: 'secondary',
    },
    optimize_bid: {
      icon: <Target className="h-4 w-4" />,
      label: 'Tối ưu Bid',
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      buttonVariant: 'secondary',
    },
    expand_audience: {
      icon: <RefreshCw className="h-4 w-4" />,
      label: 'Mở rộng Audience',
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      buttonVariant: 'outline',
    },
  };
  return configs[type];
};

const getPriorityConfig = (priority: MarketingAction['priority']) => {
  switch (priority) {
    case 'high':
      return { label: 'Ưu tiên cao', className: 'bg-red-500/20 text-red-400 border-red-500/30' };
    case 'medium':
      return { label: 'Trung bình', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    case 'low':
      return { label: 'Thấp', className: 'bg-muted text-muted-foreground border-border' };
  }
};

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
};

export function MarketingActionsPanel({ 
  actions, 
  onExecuteAction, 
  onDismissAction 
}: MarketingActionsPanelProps) {
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<MarketingAction | null>(null);

  const handleExecute = async (action: MarketingAction) => {
    if (!onExecuteAction) return;
    
    setExecutingId(action.id);
    try {
      await onExecuteAction(action);
    } finally {
      setExecutingId(null);
      setConfirmAction(null);
    }
  };

  const urgentActions = actions.filter(a => a.is_urgent);
  const otherActions = actions.filter(a => !a.is_urgent);

  return (
    <>
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              <CardTitle className="text-lg">Recommended Actions</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {urgentActions.length > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                  {urgentActions.length} cần xử lý ngay
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {actions.length} actions
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Đề xuất hành động dựa trên phân tích performance realtime
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <TooltipProvider>
            {/* Urgent Actions First */}
            {urgentActions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Cần hành động ngay
                </p>
                {urgentActions.map((action) => {
                  const config = getActionConfig(action.type);
                  const priorityConfig = getPriorityConfig(action.priority);
                  const isExecuting = executingId === action.id;

                  return (
                    <div
                      key={action.id}
                      className={cn(
                        "p-3 rounded-lg border-2 border-red-500/50 bg-red-500/5",
                        "transition-all hover:shadow-md"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={cn("p-2 rounded-lg shrink-0", config.color.split(' ').slice(1).join(' '))}>
                            {config.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium text-sm truncate">
                                {config.label}: {action.campaign_name}
                              </span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {action.channel}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {action.reason}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-green-400 flex items-center gap-1">
                                <ArrowRight className="h-3 w-3" />
                                {action.expected_impact}
                                {action.impact_value && (
                                  <span className="font-medium">
                                    (+{formatCurrency(action.impact_value)}đ)
                                  </span>
                                )}
                              </span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-xs">
                                    {action.confidence}% tin cậy
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Độ tin cậy của đề xuất dựa trên dữ liệu lịch sử</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant={config.buttonVariant}
                            className="text-xs"
                            disabled={isExecuting}
                            onClick={() => setConfirmAction(action)}
                          >
                            {isExecuting ? (
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              config.icon
                            )}
                            Thực hiện
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => onDismissAction?.(action.id)}
                          >
                            Bỏ qua
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Other Actions */}
            {otherActions.length > 0 && (
              <div className="space-y-2">
                {urgentActions.length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground mt-4">
                    Đề xuất khác
                  </p>
                )}
                {otherActions.slice(0, 5).map((action) => {
                  const config = getActionConfig(action.type);
                  const priorityConfig = getPriorityConfig(action.priority);
                  const isExecuting = executingId === action.id;

                  return (
                    <div
                      key={action.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all hover:shadow-md",
                        config.color.split(' ').slice(1).join(' ')
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={cn("p-1.5 rounded-md shrink-0", config.color.split(' ').slice(1, 2).join(' '))}>
                            {config.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="font-medium text-sm truncate">
                                {config.label}
                              </span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {action.channel}
                              </Badge>
                              <Badge className={cn("text-xs shrink-0", priorityConfig.className)}>
                                {priorityConfig.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {action.campaign_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setConfirmAction(action)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Xem
                          </Button>
                          <Button
                            size="sm"
                            variant={config.buttonVariant}
                            className="h-7 text-xs"
                            disabled={isExecuting}
                            onClick={() => setConfirmAction(action)}
                          >
                            {isExecuting && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                            Go
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {otherActions.length > 5 && (
                  <Button variant="ghost" className="w-full text-xs">
                    Xem thêm {otherActions.length - 5} đề xuất khác
                  </Button>
                )}
              </div>
            )}

            {actions.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                <p className="text-sm font-medium text-green-400">Campaigns đang chạy tốt</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Không có đề xuất hành động ngay lúc này
                </p>
              </div>
            )}
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmAction && getActionConfig(confirmAction.type).icon}
              Xác nhận hành động
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.reason}
            </DialogDescription>
          </DialogHeader>
          
          {confirmAction && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Campaign</p>
                    <p className="font-medium">{confirmAction.campaign_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Channel</p>
                    <p className="font-medium">{confirmAction.channel}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Hành động</p>
                    <p className="font-medium">{getActionConfig(confirmAction.type).label}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Độ tin cậy</p>
                    <p className="font-medium">{confirmAction.confidence}%</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-xs text-muted-foreground mb-1">Kết quả dự kiến</p>
                <p className="text-sm font-medium text-green-400">
                  {confirmAction.expected_impact}
                  {confirmAction.impact_value && (
                    <span className="ml-1">
                      (+{formatCurrency(confirmAction.impact_value)}đ potential)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Hủy
            </Button>
            <Button 
              onClick={() => confirmAction && handleExecute(confirmAction)}
              disabled={executingId === confirmAction?.id}
            >
              {executingId === confirmAction?.id ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Xác nhận thực hiện
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
