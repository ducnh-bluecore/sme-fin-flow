import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMDPDataSSOT, ProfitAttribution, CashImpact } from '@/hooks/useMDPDataSSOT';
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

// Unified Decision Config - CFO/Boardroom language
const DECISION_CONFIG = {
  scale: {
    label: 'Scale',
    shortLabel: 'Scale',
    icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-500',
    bgColor: 'bg-emerald-500/5',
    borderColor: 'border-emerald-500/20',
    action: 'Increase budget 30-50%',
  },
  maintain: {
    label: 'Maintain',
    shortLabel: 'Maintain',
    icon: Pause,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-border',
    action: 'Continue monitoring',
  },
  reduce: {
    label: 'Reduce',
    shortLabel: 'Reduce',
    icon: TrendingDown,
    color: 'text-amber-600 dark:text-amber-500',
    bgColor: 'bg-amber-500/5',
    borderColor: 'border-amber-500/20',
    action: 'Reduce budget 30-50%',
  },
  stop: {
    label: 'Stop',
    shortLabel: 'Stop',
    icon: XCircle,
    color: 'text-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-border',
    action: 'Pause campaign',
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
  } = useMDPDataSSOT();

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

      {/* Marketing Scaling Decision - Calm, Authoritative */}
      <Card className="border overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Marketing Scaling Decision
              </p>
              
              <h2 className="text-xl font-semibold mb-2">
                Scale: {canScale ? "Recommended" : hasMargin ? "Not Recommended" : "Not Recommended"}
              </h2>
              
              <p className="text-sm text-muted-foreground max-w-lg">
                {canScale
                  ? "Positive contribution margin and healthy cash conversion. Scale-eligible channels identified."
                  : hasMargin
                  ? "Positive margin but low cash conversion. Optimize collection before scaling."
                  : "Negative contribution detected. Review loss-making channels before proceeding."
                }
              </p>
            </div>
            
            {/* Decision Badge */}
            <div className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              canScale 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                : "bg-muted text-muted-foreground border border-border"
            )}>
              {canScale ? "Scale Ready" : hasMargin ? "Review Required" : "Action Required"}
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Contribution Margin</p>
              <p className={cn(
                "text-lg font-semibold tabular-nums",
                cmoModeSummary.total_contribution_margin >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-foreground"
              )}>
                {cmoModeSummary.total_contribution_margin >= 0 ? '+' : ''}{formatCurrency(cmoModeSummary.total_contribution_margin)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">CM %</p>
              <p className={cn(
                "text-lg font-semibold tabular-nums",
                cmoModeSummary.contribution_margin_percent >= thresholds.MIN_CM_PERCENT ? "text-emerald-600 dark:text-emerald-500" : "text-muted-foreground"
              )}>
                {cmoModeSummary.contribution_margin_percent.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Cash Conversion</p>
              <p className={cn(
                "text-lg font-semibold tabular-nums",
                cmoModeSummary.cash_conversion_rate >= 0.7 ? "text-emerald-600 dark:text-emerald-500" : "text-amber-600 dark:text-amber-500"
              )}>
                {(cmoModeSummary.cash_conversion_rate * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Pending Actions</p>
              <p className={cn(
                "text-lg font-semibold tabular-nums",
                cmoModeSummary.risk_alerts_count > 0 ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
              )}>
                {cmoModeSummary.risk_alerts_count}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decision Summary Cards - Calm, Professional */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-sm",
            filterType === 'scale' && "ring-1 ring-emerald-500/50"
          )}
          onClick={() => setFilterType(filterType === 'scale' ? 'all' : 'scale')}
        >
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Scale</p>
            <p className="text-2xl font-semibold tabular-nums">{stats.scaleCount}</p>
            {stats.scaleCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                +{formatCurrency(stats.totalPotentialGain)} potential
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Maintain</p>
            <p className="text-2xl font-semibold tabular-nums text-muted-foreground">
              {channelDecisions.filter(d => d.recommendation === 'maintain').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Reduce</p>
            <p className="text-2xl font-semibold tabular-nums text-amber-600 dark:text-amber-500">{stats.reduceCount}</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-sm",
            filterType === 'stop' && "ring-1 ring-border"
          )}
          onClick={() => setFilterType(filterType === 'stop' ? 'all' : 'stop')}
        >
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Stop</p>
            <p className="text-2xl font-semibold tabular-nums">{stats.stopCount}</p>
            {stats.stopCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                -{formatCurrency(stats.totalPotentialLoss)} impact
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Channel Decision List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Channel Decisions</CardTitle>
            <div className="flex items-center gap-2">
              {filterType !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setFilterType('all')}>
                  Clear filter
                </Button>
              )}
              <Badge variant="secondary" className="text-xs font-normal">
                {filteredDecisions.length} channels
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredDecisions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No channels match current filter</p>
              <Button variant="link" size="sm" onClick={() => setFilterType('all')}>
                View all
              </Button>
            </div>
          ) : (
            filteredDecisions.map((decision) => {
              const config = DECISION_CONFIG[decision.recommendation];
              
              return (
                <button 
                  key={decision.channel}
                  onClick={() => openDetail(decision)}
                  className="w-full flex items-center justify-between gap-4 p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{decision.channel}</span>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {config.shortLabel}
                      </Badge>
                    </div>
                    
                    {/* Financial Facts Only */}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>
                        CM: <span className={cn(
                          "font-medium",
                          decision.margin >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-foreground"
                        )}>
                          {formatCurrency(decision.margin)}
                        </span>
                      </span>
                      <span>
                        CM%: <span className="font-medium">
                          {decision.marginPercent.toFixed(1)}%
                        </span>
                      </span>
                      <span>
                        Cash: <span className={cn(
                          "font-medium",
                          decision.cashConversion >= 0.7 ? "text-emerald-600 dark:text-emerald-500" : "text-amber-600 dark:text-amber-500"
                        )}>
                          {(decision.cashConversion * 100).toFixed(0)}%
                        </span>
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
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
