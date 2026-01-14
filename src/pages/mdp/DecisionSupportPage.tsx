import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMDPData, ProfitAttribution, CashImpact } from '@/hooks/useMDPData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  Info, 
  ThumbsUp, 
  ThumbsDown, 
  Scale, 
  TrendingUp, 
  TrendingDown, 
  Pause,
  ArrowRight,
  DollarSign,
  Wallet,
  BarChart3,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronRight,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChannelDecision {
  channel: string;
  recommendation: 'scale' | 'maintain' | 'reduce' | 'stop';
  reason: string;
  margin: number;
  marginPercent: number;
  adSpend: number;
  cashConversion: number;
  overallScore: number;
  campaigns: ProfitAttribution[];
  cashData: CashImpact | null;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
};

const DECISION_CONFIG = {
  scale: {
    label: 'SCALE',
    shortLabel: 'Scale',
    icon: TrendingUp,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    action: 'Tăng budget 30-50%',
  },
  maintain: {
    label: 'GIỮ NGUYÊN',
    shortLabel: 'Maintain',
    icon: Pause,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    action: 'Theo dõi thêm 1 tuần',
  },
  reduce: {
    label: 'GIẢM',
    shortLabel: 'Reduce',
    icon: TrendingDown,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    action: 'Giảm budget 30-50%',
  },
  stop: {
    label: 'DỪNG',
    shortLabel: 'Stop',
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    action: 'Pause ngay lập tức',
  },
};

export default function DecisionSupportPage() {
  const navigate = useNavigate();
  const { 
    profitAttribution,
    cashImpact,
    cmoModeSummary,
    thresholds,
    isLoading, 
    error,
  } = useMDPData();

  const [selectedChannel, setSelectedChannel] = useState<ChannelDecision | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'scale' | 'stop'>('all');

  // Calculate channel-level decisions
  const channelDecisions = useMemo<ChannelDecision[]>(() => {
    const channelMap = new Map<string, { 
      margin: number; 
      spend: number; 
      campaigns: ProfitAttribution[];
      cashData: CashImpact | null;
    }>();
    
    // Aggregate profit data by channel
    profitAttribution.forEach(p => {
      const existing = channelMap.get(p.channel) || { margin: 0, spend: 0, campaigns: [], cashData: null };
      existing.margin += p.contribution_margin;
      existing.spend += p.ad_spend;
      existing.campaigns.push(p);
      channelMap.set(p.channel, existing);
    });
    
    // Add cash impact data
    cashImpact.forEach(c => {
      const existing = channelMap.get(c.channel);
      if (existing) {
        existing.cashData = c;
      }
    });

    return Array.from(channelMap.entries()).map(([channel, data]) => {
      const marginPercent = data.spend > 0 ? (data.margin / data.spend) * 100 : 0;
      const cashConversion = data.cashData?.cash_conversion_rate || 0;
      
      // Score calculation (0-100 scale)
      const marginScore = Math.min(100, Math.max(0, (marginPercent + 20) * 2.5));
      const cashScore = cashConversion * 100;
      const overallScore = (marginScore * 0.6) + (cashScore * 0.4);
      
      // Decision logic based on FDP principles
      let recommendation: ChannelDecision['recommendation'];
      let reason: string;
      
      if (data.margin < 0) {
        recommendation = 'stop';
        reason = 'Margin âm - đang phá huỷ giá trị';
      } else if (marginPercent < thresholds.MIN_CM_PERCENT) {
        recommendation = 'reduce';
        reason = `Margin ${marginPercent.toFixed(0)}% < ngưỡng ${thresholds.MIN_CM_PERCENT}%`;
      } else if (cashConversion < 0.5) {
        recommendation = 'reduce';
        reason = 'Cash conversion thấp - tiền về chậm';
      } else if (marginPercent >= 20 && cashConversion >= 0.7) {
        recommendation = 'scale';
        reason = 'Margin tốt + Cash flow mạnh';
      } else {
        recommendation = 'maintain';
        reason = 'Đang ổn định - theo dõi thêm';
      }

      return {
        channel,
        recommendation,
        reason,
        margin: data.margin,
        marginPercent,
        adSpend: data.spend,
        cashConversion,
        overallScore,
        campaigns: data.campaigns,
        cashData: data.cashData,
      };
    }).sort((a, b) => b.overallScore - a.overallScore);
  }, [profitAttribution, cashImpact, thresholds]);

  const filteredDecisions = useMemo(() => {
    if (filterType === 'all') return channelDecisions;
    if (filterType === 'scale') return channelDecisions.filter(d => d.recommendation === 'scale');
    if (filterType === 'stop') return channelDecisions.filter(d => d.recommendation === 'stop' || d.recommendation === 'reduce');
    return channelDecisions;
  }, [channelDecisions, filterType]);

  const stats = useMemo(() => ({
    scaleCount: channelDecisions.filter(d => d.recommendation === 'scale').length,
    stopCount: channelDecisions.filter(d => d.recommendation === 'stop').length,
    reduceCount: channelDecisions.filter(d => d.recommendation === 'reduce').length,
    totalPotentialLoss: channelDecisions
      .filter(d => d.recommendation === 'stop')
      .reduce((sum, d) => sum + Math.abs(d.margin), 0),
    totalPotentialGain: channelDecisions
      .filter(d => d.recommendation === 'scale')
      .reduce((sum, d) => sum + d.margin * 0.5, 0),
  }), [channelDecisions]);

  const handleAction = (decision: ChannelDecision, action: string) => {
    toast.success(`Đã ghi nhận: ${action} kênh ${decision.channel}`);
    setShowDetailDialog(false);
  };

  const openDetail = (decision: ChannelDecision) => {
    setSelectedChannel(decision);
    setShowDetailDialog(true);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
          <AlertDescription>Không thể tải dữ liệu. Vui lòng thử lại sau.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const canScale = cmoModeSummary.total_contribution_margin >= 0 && cmoModeSummary.cash_conversion_rate >= 0.7;
  const hasMargin = cmoModeSummary.total_contribution_margin >= 0;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Decision Support"
        subtitle="Scale kênh nào? Cắt kênh nào? Dựa trên profit & cash thật"
      />

      {/* Hero Decision - The ONE Question */}
      <Card className={cn(
        "border-2 overflow-hidden",
        canScale 
          ? "border-green-500/50" 
          : hasMargin
          ? "border-yellow-500/50"
          : "border-red-500/50"
      )}>
        <div className={cn(
          "px-6 py-8",
          canScale 
            ? "bg-gradient-to-r from-green-500/10 to-green-500/5" 
            : hasMargin
            ? "bg-gradient-to-r from-yellow-500/10 to-yellow-500/5"
            : "bg-gradient-to-r from-red-500/10 to-red-500/5"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  canScale ? "bg-green-500/20" : hasMargin ? "bg-yellow-500/20" : "bg-red-500/20"
                )}>
                  <Scale className={cn(
                    "h-6 w-6",
                    canScale ? "text-green-400" : hasMargin ? "text-yellow-400" : "text-red-400"
                  )} />
                </div>
                <span className="text-sm text-muted-foreground font-medium">CÂU HỎI LỚN</span>
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Marketing có nên scale?</h2>
              
              <div className={cn(
                "text-3xl font-bold mb-4",
                canScale ? "text-green-400" : hasMargin ? "text-yellow-400" : "text-red-400"
              )}>
                {canScale 
                  ? "✓ CÓ" 
                  : hasMargin
                  ? "⚠ THẬN TRỌNG"
                  : "✗ KHÔNG"
                }
              </div>

              <p className="text-muted-foreground max-w-lg">
                {canScale
                  ? "Margin tốt + Cash flow dương. Có thể tăng ngân sách với các kênh được đề xuất Scale."
                  : hasMargin
                  ? "Có margin nhưng cash về chậm. Tối ưu collection trước khi scale."
                  : "Đang phá huỷ giá trị. Dừng các kênh lỗ và review chiến lược."
                }
              </p>
            </div>
            
            <div className="hidden md:flex flex-col items-center gap-2">
              {canScale ? (
                <ThumbsUp className="h-20 w-20 text-green-400" />
              ) : (
                <ThumbsDown className={cn(
                  "h-20 w-20",
                  hasMargin ? "text-yellow-400" : "text-red-400"
                )} />
              )}
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Contribution Margin</p>
              <p className={cn(
                "text-lg font-bold",
                cmoModeSummary.total_contribution_margin >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {cmoModeSummary.total_contribution_margin >= 0 ? '+' : ''}{formatCurrency(cmoModeSummary.total_contribution_margin)}đ
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">CM %</p>
              <p className={cn(
                "text-lg font-bold",
                cmoModeSummary.contribution_margin_percent >= thresholds.MIN_CM_PERCENT ? "text-green-400" : "text-yellow-400"
              )}>
                {cmoModeSummary.contribution_margin_percent.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Cash Conversion</p>
              <p className={cn(
                "text-lg font-bold",
                cmoModeSummary.cash_conversion_rate >= 0.7 ? "text-green-400" : "text-yellow-400"
              )}>
                {(cmoModeSummary.cash_conversion_rate * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Risk Alerts</p>
              <p className={cn(
                "text-lg font-bold",
                cmoModeSummary.critical_alerts_count > 0 ? "text-red-400" : 
                cmoModeSummary.risk_alerts_count > 0 ? "text-yellow-400" : "text-green-400"
              )}>
                {cmoModeSummary.risk_alerts_count}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            filterType === 'scale' && "ring-2 ring-green-500"
          )}
          onClick={() => setFilterType(filterType === 'scale' ? 'all' : 'scale')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Nên Scale</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.scaleCount}</p>
            {stats.scaleCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                +{formatCurrency(stats.totalPotentialGain)}đ tiềm năng
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Pause className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Giữ nguyên</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">
              {channelDecisions.filter(d => d.recommendation === 'maintain').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-muted-foreground">Nên Giảm</span>
            </div>
            <p className="text-2xl font-bold text-yellow-400">{stats.reduceCount}</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            filterType === 'stop' && "ring-2 ring-red-500"
          )}
          onClick={() => setFilterType(filterType === 'stop' ? 'all' : 'stop')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-xs text-muted-foreground">Nên Dừng</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.stopCount}</p>
            {stats.stopCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                -{formatCurrency(stats.totalPotentialLoss)}đ thiệt hại
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Channel Decision List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              <CardTitle className="text-lg">Quyết định theo kênh</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {filterType !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setFilterType('all')}>
                  Xóa filter
                </Button>
              )}
              <Badge variant="outline">
                {filteredDecisions.length} kênh
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredDecisions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Không có kênh nào phù hợp với filter</p>
              <Button variant="link" onClick={() => setFilterType('all')}>
                Xem tất cả
              </Button>
            </div>
          ) : (
            filteredDecisions.map((decision) => {
              const config = DECISION_CONFIG[decision.recommendation];
              const Icon = config.icon;
              
              return (
                <div 
                  key={decision.channel}
                  onClick={() => openDetail(decision)}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md group",
                    config.bgColor,
                    config.borderColor
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Score Indicator */}
                    <div className="hidden sm:flex flex-col items-center gap-1 w-16">
                      <div className={cn(
                        "text-2xl font-bold",
                        decision.overallScore >= 60 ? "text-green-400" :
                        decision.overallScore >= 30 ? "text-yellow-400" : "text-red-400"
                      )}>
                        {decision.overallScore.toFixed(0)}
                      </div>
                      <span className="text-[10px] text-muted-foreground">SCORE</span>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-semibold">
                          {decision.channel}
                        </Badge>
                        <Badge className={cn("gap-1", config.bgColor, config.color, "border", config.borderColor)}>
                          <Icon className="h-3 w-3" />
                          {config.shortLabel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{decision.reason}</p>
                      
                      {/* Metrics Row */}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Margin:</span>
                          <span className={cn("font-medium", decision.margin >= 0 ? "text-green-400" : "text-red-400")}>
                            {decision.margin >= 0 ? '+' : ''}{formatCurrency(decision.margin)}đ
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">CM%:</span>
                          <span className={cn("font-medium", decision.marginPercent >= thresholds.MIN_CM_PERCENT ? "text-green-400" : "text-yellow-400")}>
                            {decision.marginPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Wallet className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Cash:</span>
                          <span className={cn("font-medium", decision.cashConversion >= 0.7 ? "text-green-400" : "text-yellow-400")}>
                            {(decision.cashConversion * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Hint */}
                    <div className="hidden md:flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{config.action}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          {selectedChannel && (() => {
            const config = DECISION_CONFIG[selectedChannel.recommendation];
            const Icon = config.icon;
            
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", config.bgColor)}>
                      <Icon className={cn("h-6 w-6", config.color)} />
                    </div>
                    <div>
                      <DialogTitle>{selectedChannel.channel}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2 mt-1">
                        <Badge className={cn(config.bgColor, config.color, "border", config.borderColor)}>
                          {config.label}
                        </Badge>
                        <span className="text-xs">Score: {selectedChannel.overallScore.toFixed(0)}</span>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Reason */}
                  <div className={cn("p-4 rounded-lg", config.bgColor, "border", config.borderColor)}>
                    <p className={cn("font-medium", config.color)}>{selectedChannel.reason}</p>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Contribution Margin</p>
                      <p className={cn("text-lg font-bold", selectedChannel.margin >= 0 ? "text-green-400" : "text-red-400")}>
                        {selectedChannel.margin >= 0 ? '+' : ''}{formatCurrency(selectedChannel.margin)}đ
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Ad Spend</p>
                      <p className="text-lg font-bold">{formatCurrency(selectedChannel.adSpend)}đ</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">CM %</p>
                      <p className={cn("text-lg font-bold", selectedChannel.marginPercent >= thresholds.MIN_CM_PERCENT ? "text-green-400" : "text-yellow-400")}>
                        {selectedChannel.marginPercent.toFixed(1)}%
                      </p>
                      <Progress 
                        value={Math.min(100, Math.max(0, selectedChannel.marginPercent * 2))} 
                        className="h-1 mt-2"
                      />
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Cash Conversion</p>
                      <p className={cn("text-lg font-bold", selectedChannel.cashConversion >= 0.7 ? "text-green-400" : "text-yellow-400")}>
                        {(selectedChannel.cashConversion * 100).toFixed(0)}%
                      </p>
                      <Progress 
                        value={selectedChannel.cashConversion * 100} 
                        className="h-1 mt-2"
                      />
                    </div>
                  </div>

                  {/* Campaigns in this channel */}
                  <div>
                    <p className="text-sm font-medium mb-2">Campaigns trong kênh này ({selectedChannel.campaigns.length})</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {selectedChannel.campaigns.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-muted/20">
                          <span className="truncate flex-1">{c.campaign_name}</span>
                          <span className={cn("font-medium", c.contribution_margin >= 0 ? "text-green-400" : "text-red-400")}>
                            {c.contribution_margin >= 0 ? '+' : ''}{formatCurrency(c.contribution_margin)}đ
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                    Đóng
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowDetailDialog(false);
                      navigate(`/mdp/campaigns?channel=${encodeURIComponent(selectedChannel.channel)}`);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Xem Campaigns
                  </Button>
                  <Button 
                    className={cn(
                      selectedChannel.recommendation === 'scale' && "bg-green-600 hover:bg-green-700",
                      selectedChannel.recommendation === 'stop' && "bg-red-600 hover:bg-red-700",
                      selectedChannel.recommendation === 'reduce' && "bg-yellow-600 hover:bg-yellow-700",
                      selectedChannel.recommendation === 'maintain' && "bg-blue-600 hover:bg-blue-700",
                    )}
                    onClick={() => handleAction(selectedChannel, config.action)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {config.action}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
