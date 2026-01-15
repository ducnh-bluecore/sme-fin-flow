import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowRight,
  DollarSign,
  MousePointerClick,
  ShoppingCart,
  Eye,
  AlertTriangle,
  Target,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnifiedChannelMetrics } from '@/hooks/useUnifiedChannelMetrics';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChannelBreakdownPanelProps {
  onViewChannelDetails?: (channel: string) => void;
}

export function ChannelBreakdownPanel({ onViewChannelDetails }: ChannelBreakdownPanelProps) {
  // SINGLE SOURCE OF TRUTH: useUnifiedChannelMetrics
  const { channelMetrics, hasConfiguredBudgets, isLoading } = useUnifiedChannelMetrics();

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const getROASStatus = (roas: number, target: number) => {
    if (roas >= target) return { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Đạt target' };
    if (roas >= target * 0.8) return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Gần đạt' };
    if (roas >= 1) return { color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Dưới target' };
    return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Lỗ' };
  };

  const getChannelIcon = (channel: string) => {
    const lower = channel.toLowerCase();
    if (lower.includes('shopee')) return '🛒';
    if (lower.includes('lazada')) return '🔶';
    if (lower.includes('tiktok')) return '🎵';
    if (lower.includes('meta') || lower.includes('facebook')) return '📘';
    if (lower.includes('google')) return '🔍';
    if (lower.includes('sendo')) return '🔴';
    if (lower.includes('website')) return '🌐';
    if (lower.includes('offline')) return '🏪';
    if (lower.includes('multi') || lower === 'all') return '🌐';
    return '📊';
  };

  const KPIIndicator = ({ achieved, label, actual, target, unit = '', inverse = false }: { 
    achieved: boolean; 
    label: string; 
    actual: number | string; 
    target: number | string;
    unit?: string;
    inverse?: boolean;
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-xs",
            achieved ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          )}>
            {achieved ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            <span>{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div>Actual: {actual}{unit}</div>
            <div>Target: {inverse ? '≤' : '≥'} {target}{unit}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Đang tải dữ liệu...
        </CardContent>
      </Card>
    );
  }

  if (channelMetrics.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chưa có dữ liệu kênh marketing
        </CardContent>
      </Card>
    );
  }

  // Sort by revenue for display
  const sortedChannels = [...channelMetrics].sort((a, b) => b.revenue - a.revenue);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Hiệu suất theo Kênh vs Target KPIs
            <Badge variant="secondary" className="ml-2">{sortedChannels.length} kênh</Badge>
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {channelMetrics.filter(ch => ch.isConfigured).length} kênh đã cấu hình KPI
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedChannels.map((channel) => {
          const roasStatus = getROASStatus(channel.roas, channel.targetROAS);
          const isEfficient = channel.revenueShare > channel.spendShare;
          const kpisAchieved = [
            channel.roasAchieved,
            channel.cpaAchieved,
            channel.cmAchieved,
          ].filter(Boolean).length;
          const totalKPIs = 3;

          return (
            <div 
              key={channel.channel}
              className={cn(
                "p-4 rounded-lg border bg-card hover:bg-accent/30 transition-all",
                !channel.isConfigured && "border-dashed opacity-75"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getChannelIcon(channel.channel)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{channel.displayName}</h4>
                      {channel.isConfigured ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">
                          KPI Configured
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Chưa setup KPI
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pacing: {channel.pacing !== null ? `${channel.pacing.toFixed(0)}%` : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {channel.isConfigured && (
                    <Badge className={cn(
                      "text-xs",
                      kpisAchieved === totalKPIs ? "bg-green-500/20 text-green-500" :
                      kpisAchieved >= 2 ? "bg-yellow-500/20 text-yellow-600" :
                      "bg-red-500/20 text-red-500"
                    )}>
                      {kpisAchieved}/{totalKPIs} KPIs đạt
                    </Badge>
                  )}
                  <Badge className={cn("text-xs", roasStatus.bg, roasStatus.color)}>
                    ROAS {channel.roas.toFixed(2)}x
                    {channel.isConfigured && <span className="opacity-70 ml-1">/ {channel.targetROAS}x</span>}
                  </Badge>
                </div>
              </div>

              {/* KPI Achievement Indicators */}
              {channel.isConfigured && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <KPIIndicator 
                    achieved={channel.roasAchieved} 
                    label="ROAS" 
                    actual={channel.roas.toFixed(2)} 
                    target={channel.targetROAS}
                    unit="x"
                  />
                  <KPIIndicator 
                    achieved={channel.cpaAchieved} 
                    label="CPA" 
                    actual={formatCurrency(channel.cpa)} 
                    target={formatCurrency(channel.maxCPA)}
                    unit="đ"
                    inverse
                  />
                  <KPIIndicator 
                    achieved={channel.cmAchieved} 
                    label="CM%" 
                    actual={channel.cmPercent.toFixed(1)} 
                    target={channel.targetCM}
                    unit="%"
                  />
                  {channel.targetCTR > 0 && (
                    <KPIIndicator 
                      achieved={channel.ctrAchieved} 
                      label="CTR" 
                      actual={channel.ctr.toFixed(2)} 
                      target={channel.targetCTR}
                      unit="%"
                    />
                  )}
                  {channel.targetCVR > 0 && (
                    <KPIIndicator 
                      achieved={channel.cvrAchieved} 
                      label="CVR" 
                      actual={channel.cvr.toFixed(2)} 
                      target={channel.targetCVR}
                      unit="%"
                    />
                  )}
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Chi tiêu
                  </div>
                  <div className="font-bold">{formatCurrency(channel.actualSpend)}đ</div>
                  {channel.isConfigured && channel.budgetAmount > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {channel.budgetUtilization.toFixed(0)}% of {formatCurrency(channel.budgetAmount)}đ
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    Doanh thu
                  </div>
                  <div className={cn(
                    "font-bold",
                    channel.revenueTarget > 0 && channel.revenue >= channel.revenueTarget ? "text-green-500" : "text-yellow-500"
                  )}>
                    {formatCurrency(channel.revenue)}đ
                  </div>
                  {channel.isConfigured && channel.revenueTarget > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Target: {formatCurrency(channel.revenueTarget)}đ
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MousePointerClick className="h-3 w-3" />
                    CPA
                  </div>
                  <div className={cn(
                    "font-bold",
                    channel.cpaAchieved ? "text-green-500" : "text-red-500"
                  )}>
                    {formatCurrency(channel.cpa)}đ
                  </div>
                  {channel.isConfigured && (
                    <div className="text-xs text-muted-foreground">
                      Max: {formatCurrency(channel.maxCPA)}đ
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    CTR / CVR
                  </div>
                  <div className="font-medium text-sm">
                    {channel.ctr.toFixed(2)}% / {channel.cvr.toFixed(2)}%
                  </div>
                  {channel.isConfigured && (
                    <div className="text-xs text-muted-foreground">
                      {channel.targetCTR}% / {channel.targetCVR}%
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">CM%</div>
                  <div className={cn(
                    "font-bold",
                    channel.cmAchieved ? "text-green-500" : "text-red-500"
                  )}>
                    {channel.cmPercent.toFixed(1)}%
                  </div>
                  {channel.isConfigured && (
                    <div className="text-xs text-muted-foreground">
                      Min: {channel.targetCM}%
                    </div>
                  )}
                </div>
              </div>

              {/* Budget Pacing Progress */}
              {channel.hasBudget && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Budget Utilization</span>
                    <span className={cn(
                      channel.pacing !== null && channel.pacing > 100 ? "text-red-500" : 
                      channel.pacing !== null && channel.pacing > 80 ? "text-yellow-500" : 
                      "text-muted-foreground"
                    )}>
                      {channel.pacing !== null ? `${channel.pacing.toFixed(0)}%` : '—'}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(channel.pacing || 0, 100)} 
                    className={cn(
                      "h-1.5",
                      channel.pacing !== null && channel.pacing > 100 && "[&>div]:bg-red-500",
                      channel.pacing !== null && channel.pacing > 80 && channel.pacing <= 100 && "[&>div]:bg-yellow-500"
                    )}
                  />
                </div>
              )}

              {/* Efficiency Indicator */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Share chi tiêu:</span>
                    <span className="ml-1 font-medium">{channel.spendShare.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Share doanh thu:</span>
                    <span className="ml-1 font-medium">{channel.revenueShare.toFixed(1)}%</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1",
                    isEfficient ? "text-green-500" : "text-red-500"
                  )}>
                    {isEfficient ? (
                      <>
                        <TrendingUp className="h-3 w-3" />
                        <span>Hiệu quả</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3" />
                        <span>Cần cải thiện</span>
                      </>
                    )}
                  </div>
                </div>
                {onViewChannelDetails && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onViewChannelDetails(channel.channel)}
                    className="text-xs"
                  >
                    Chi tiết <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
