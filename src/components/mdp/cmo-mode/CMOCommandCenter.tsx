import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Zap, 
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Info,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  DollarSign,
  Timer,
  Target,
  Send,
  ListTodo,
} from 'lucide-react';
import { ProfitAttribution, CashImpact, CMOModeSummary, MarketingRiskAlert } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDecisionFlow, DecisionPayload } from '@/hooks/useDecisionFlow';

interface CMOCommandCenterProps {
  profitData: ProfitAttribution[];
  cashImpact: CashImpact[];
  riskAlerts: MarketingRiskAlert[];
  summary: CMOModeSummary;
}

interface DecisionItem extends Omit<DecisionPayload, 'metrics'> {
  metrics?: { label: string; value: string; status: 'good' | 'warning' | 'bad' }[];
}

export function CMOCommandCenter({ profitData, cashImpact, riskAlerts, summary }: CMOCommandCenterProps) {
  const [selectedDecision, setSelectedDecision] = useState<DecisionItem | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  
  const { processDecision, isProcessing, IMPACT_THRESHOLD_FOR_APPROVAL } = useDecisionFlow();

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  // Generate decision items from data
  const decisions: DecisionItem[] = [];

  // From risk alerts - critical decisions
  riskAlerts.forEach((alert, idx) => {
    decisions.push({
      id: `risk-${idx}`,
      type: alert.severity === 'critical' ? 'pause' : 'reduce',
      entity_type: 'campaign',
      entity_name: alert.campaign_name,
      entity_id: alert.campaign_name,
      priority: alert.severity === 'critical' ? 'critical' : 'high',
      headline: alert.type === 'negative_margin' ? 'ĐANG LỖ - Cần dừng ngay' : 
                alert.type === 'burning_cash' ? 'ĐỐT TIỀN - Tác động cash flow' :
                alert.type === 'cac_exceeds_ltv' ? 'CAC > LTV - Không bền vững' : 'Cần review',
      reason: alert.message,
      impact_amount: alert.impact_amount,
      deadline_hours: alert.severity === 'critical' ? 4 : 24,
      metrics: [
        { label: 'Impact', value: `-${formatCurrency(alert.impact_amount)}đ`, status: 'bad' },
        { label: 'Channel', value: alert.channel, status: 'warning' },
      ],
      recommended_action: alert.recommended_action,
    });
  });

  // From profit attribution - identify scale opportunities
  const profitableChannels = new Map<string, { margin: number; spend: number; campaigns: number }>();
  profitData.filter(p => p.status === 'profitable').forEach(p => {
    const existing = profitableChannels.get(p.channel) || { margin: 0, spend: 0, campaigns: 0 };
    existing.margin += p.contribution_margin;
    existing.spend += p.ad_spend;
    existing.campaigns += 1;
    profitableChannels.set(p.channel, existing);
  });

  Array.from(profitableChannels.entries())
    .filter(([_, data]) => data.margin > 0 && (data.margin / data.spend) > 0.15)
    .slice(0, 3)
    .forEach(([channel, data]) => {
      const cashData = cashImpact.find(c => c.channel === channel);
      if (cashData?.is_cash_positive) {
        decisions.push({
          id: `scale-${channel}`,
          type: 'scale',
          entity_type: 'channel',
          entity_name: channel,
          entity_id: channel,
          priority: 'high',
          headline: 'SCALE OPPORTUNITY - Margin + Cash tốt',
          reason: `${data.campaigns} campaigns đang có margin ${((data.margin / data.spend) * 100).toFixed(0)}% và cash flow dương`,
          impact_amount: data.margin * 0.5, // Potential upside
          deadline_hours: 48,
          metrics: [
            { label: 'CM', value: `+${formatCurrency(data.margin)}đ`, status: 'good' },
            { label: 'CM%', value: `${((data.margin / data.spend) * 100).toFixed(0)}%`, status: 'good' },
            { label: 'Cash+', value: cashData ? 'Có' : 'Không', status: cashData?.is_cash_positive ? 'good' : 'warning' },
          ],
          recommended_action: `Tăng budget ${channel} 30-50% trong 2 tuần tới`,
        });
      }
    });

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2 };
  decisions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const criticalCount = decisions.filter(d => d.priority === 'critical').length;
  const highCount = decisions.filter(d => d.priority === 'high').length;

  const handleDecision = (decision: DecisionItem) => {
    setSelectedDecision(decision);
    setComment('');
    setActionDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedDecision) return;

    await processDecision.mutateAsync({
      decision: selectedDecision,
      action: 'approved',
      comment: comment || `Approved: ${selectedDecision.recommended_action}`,
    });
    setActionDialogOpen(false);
  };

  const handleReject = async () => {
    if (!selectedDecision) return;

    await processDecision.mutateAsync({
      decision: selectedDecision,
      action: 'rejected',
      comment: comment || 'Không thực hiện theo khuyến nghị',
    });
    setActionDialogOpen(false);
  };

  const handleSnooze = async () => {
    if (!selectedDecision) return;

    await processDecision.mutateAsync({
      decision: selectedDecision,
      action: 'snoozed',
      comment: comment || 'Tạm hoãn 24h',
    });
    setActionDialogOpen(false);
  };

  // Check if decision requires approval
  const requiresApproval = selectedDecision 
    ? selectedDecision.impact_amount >= IMPACT_THRESHOLD_FOR_APPROVAL 
    : false;

  const getTypeConfig = (type: DecisionItem['type']) => {
    const configs = {
      scale: { icon: TrendingUp, label: 'SCALE', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      pause: { icon: Pause, label: 'PAUSE', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      reduce: { icon: TrendingDown, label: 'REDUCE', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      investigate: { icon: Target, label: 'INVESTIGATE', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    };
    return configs[type];
  };

  const getPriorityConfig = (priority: DecisionItem['priority']) => {
    const configs = {
      critical: { icon: AlertTriangle, label: 'CRITICAL', className: 'bg-red-500 text-white animate-pulse' },
      high: { icon: Zap, label: 'HIGH', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      medium: { icon: Clock, label: 'MEDIUM', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    };
    return configs[priority];
  };

  return (
    <>
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">CMO Command Center</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Quyết định ngay - Không trì hoãn - Feed to Control Tower
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {criticalCount > 0 && (
                <Badge className="bg-red-500 text-white animate-pulse">
                  {criticalCount} CRITICAL
                </Badge>
              )}
              {highCount > 0 && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  {highCount} HIGH
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className={cn(
              "p-3 rounded-lg border text-center",
              summary.total_contribution_margin >= 0 
                ? "bg-green-500/10 border-green-500/30" 
                : "bg-red-500/10 border-red-500/30"
            )}>
              <p className="text-xs text-muted-foreground">Marketing P&L</p>
              <p className={cn(
                "text-lg font-bold",
                summary.total_contribution_margin >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {summary.total_contribution_margin >= 0 ? '+' : ''}{formatCurrency(summary.total_contribution_margin)}đ
              </p>
            </div>
            <div className={cn(
              "p-3 rounded-lg border text-center",
              summary.cash_conversion_rate >= 0.7 
                ? "bg-green-500/10 border-green-500/30" 
                : summary.cash_conversion_rate >= 0.5
                ? "bg-yellow-500/10 border-yellow-500/30"
                : "bg-red-500/10 border-red-500/30"
            )}>
              <p className="text-xs text-muted-foreground">Cash Convert</p>
              <p className={cn(
                "text-lg font-bold",
                summary.cash_conversion_rate >= 0.7 ? "text-green-400" : 
                summary.cash_conversion_rate >= 0.5 ? "text-yellow-400" : "text-red-400"
              )}>
                {(summary.cash_conversion_rate * 100).toFixed(0)}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
              <p className="text-xs text-muted-foreground">Pending Decisions</p>
              <p className="text-lg font-bold text-primary">
                {decisions.length}
              </p>
            </div>
          </div>

          {/* Decision Queue */}
          {decisions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <p className="text-lg font-medium text-green-400">Không có quyết định khẩn cấp</p>
              <p className="text-sm text-muted-foreground mt-1">
                Marketing đang vận hành tốt. Tiếp tục theo dõi.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Hàng đợi quyết định</h4>
                <Badge variant="outline" className="text-xs">
                  Sắp xếp theo độ ưu tiên
                </Badge>
              </div>

              {decisions.slice(0, 5).map((decision) => {
                const typeConfig = getTypeConfig(decision.type);
                const priorityConfig = getPriorityConfig(decision.priority);
                const TypeIcon = typeConfig.icon;
                const PriorityIcon = priorityConfig.icon;

                return (
                  <div 
                    key={decision.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer",
                      decision.priority === 'critical' 
                        ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/15" 
                        : decision.priority === 'high'
                        ? "bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10"
                        : "bg-muted/30 border-border/50 hover:bg-muted/50"
                    )}
                    onClick={() => handleDecision(decision)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={cn("gap-1 text-xs", priorityConfig.className)}>
                            <PriorityIcon className="h-3 w-3" />
                            {priorityConfig.label}
                          </Badge>
                          <Badge className={cn("gap-1 text-xs", typeConfig.className)}>
                            <TypeIcon className="h-3 w-3" />
                            {typeConfig.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {decision.entity_type === 'channel' ? 'Kênh' : 'Campaign'}
                          </Badge>
                        </div>

                        {/* Entity & Headline */}
                        <p className="font-bold text-base mb-1">{decision.entity_name}</p>
                        <p className={cn(
                          "text-sm font-medium mb-2",
                          decision.type === 'scale' ? "text-green-400" : 
                          decision.type === 'pause' ? "text-red-400" : "text-yellow-400"
                        )}>
                          {decision.headline}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {decision.reason}
                        </p>

                        {/* Metrics */}
                        <div className="flex gap-3 mt-3">
                          {decision.metrics.map((metric, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">{metric.label}:</span>
                              <span className={cn(
                                "text-xs font-medium",
                                metric.status === 'good' ? "text-green-400" :
                                metric.status === 'warning' ? "text-yellow-400" : "text-red-400"
                              )}>
                                {metric.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right side - Impact & Deadline */}
                      <div className="text-right shrink-0">
                        <p className={cn(
                          "text-xl font-bold",
                          decision.type === 'scale' ? "text-green-400" : "text-red-400"
                        )}>
                          {decision.type === 'scale' ? '+' : '-'}{formatCurrency(decision.impact_amount)}đ
                        </p>
                        <div className="flex items-center gap-1 justify-end mt-1 text-xs text-muted-foreground">
                          <Timer className="h-3 w-3" />
                          <span>{decision.deadline_hours}h deadline</span>
                        </div>
                        <Button 
                          size="sm" 
                          className="mt-3 gap-1"
                          variant={decision.priority === 'critical' ? 'destructive' : 'default'}
                        >
                          Quyết định
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {decisions.length > 5 && (
                <Button variant="ghost" className="w-full">
                  Xem thêm {decisions.length - 5} quyết định
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDecision && (
                <>
                  {selectedDecision.type === 'scale' ? (
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  ) : selectedDecision.type === 'pause' ? (
                    <Pause className="h-5 w-5 text-red-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-yellow-400" />
                  )}
                  {selectedDecision.entity_name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedDecision?.headline}
            </DialogDescription>
          </DialogHeader>

          {selectedDecision && (
            <div className="space-y-4">
              {/* Impact Summary */}
              <div className={cn(
                "p-4 rounded-lg border",
                selectedDecision.type === 'scale' 
                  ? "bg-green-500/10 border-green-500/30" 
                  : "bg-red-500/10 border-red-500/30"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Impact Amount</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      selectedDecision.type === 'scale' ? "text-green-400" : "text-red-400"
                    )}>
                      {selectedDecision.type === 'scale' ? '+' : '-'}{formatCurrency(selectedDecision.impact_amount)}đ
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Deadline</p>
                    <p className="text-lg font-bold flex items-center gap-1">
                      <Timer className="h-4 w-4" />
                      {selectedDecision.deadline_hours}h
                    </p>
                  </div>
                </div>
              </div>

              {/* Approval Notice */}
              {requiresApproval && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Send className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Impact ≥ 50M → Sẽ gửi lên CEO/CFO phê duyệt
                    </span>
                  </div>
                </div>
              )}

              {!requiresApproval && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center gap-2 text-blue-400">
                    <ListTodo className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Impact &lt; 50M → Tạo task cho Marketing Team
                    </span>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-sm font-medium mb-1">Lý do:</p>
                <p className="text-sm text-muted-foreground">{selectedDecision.reason}</p>
              </div>

              {/* Recommended Action */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm font-medium mb-1 text-primary">Khuyến nghị:</p>
                <p className="text-sm">{selectedDecision.recommended_action}</p>
              </div>

              {/* Comment */}
              <div>
                <label className="text-sm font-medium mb-2 block">Ghi chú (tuỳ chọn):</label>
                <Textarea 
                  placeholder="Thêm ghi chú cho quyết định này..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button 
              variant="outline" 
              onClick={handleSnooze}
              disabled={isProcessing}
              className="gap-1"
            >
              <Clock className="h-4 w-4" />
              Tạm hoãn 24h
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleReject}
              disabled={isProcessing}
              className="gap-1 text-muted-foreground"
            >
              <XCircle className="h-4 w-4" />
              Bỏ qua
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={isProcessing}
              className={cn(
                "gap-1",
                selectedDecision?.type === 'scale' 
                  ? "bg-green-600 hover:bg-green-700" 
                  : selectedDecision?.type === 'pause'
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              )}
            >
              {requiresApproval ? (
                <>
                  <Send className="h-4 w-4" />
                  Gửi phê duyệt
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {selectedDecision?.type === 'scale' ? 'Phê duyệt & Tạo Task' : 
                   selectedDecision?.type === 'pause' ? 'Xác nhận & Tạo Task' : 'Phê duyệt'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
