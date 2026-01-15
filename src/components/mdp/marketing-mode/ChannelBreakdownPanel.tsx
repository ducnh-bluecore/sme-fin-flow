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
import { MarketingPerformance } from '@/hooks/useMDPData';
import { useChannelBudgets, ChannelBudget } from '@/hooks/useChannelBudgets';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BudgetPacingData {
  channel: string;
  plannedBudget: number;
  actualSpend: number;
  daysElapsed: number;
  totalDays: number;
}

interface ChannelBreakdownPanelProps {
  campaigns: MarketingPerformance[];
  budgetPacingData?: BudgetPacingData[];
  onViewChannelDetails?: (channel: string) => void;
}

interface ChannelData {
  channel: string;
  campaigns: number;
  activeCampaigns: number;
  spend: number;
  revenue: number;
  orders: number;
  clicks: number;
  impressions: number;
  roas: number;
  cpa: number;
  ctr: number;
  cvr: number;
  spendShare: number;
  revenueShare: number;
}

export function ChannelBreakdownPanel({ campaigns, budgetPacingData = [], onViewChannelDetails }: ChannelBreakdownPanelProps) {
  // Get channel budget configurations
  const { budgets, budgetsMap, isLoading: budgetsLoading } = useChannelBudgets();

  // Normalize channel name for consistent grouping
  const normalizeChannel = (channel: string): string => {
    const lower = channel?.toLowerCase() || 'unknown';
    if (lower.includes('facebook') || lower.includes('fb') || lower.includes('meta')) return 'facebook';
    if (lower.includes('google') || lower.includes('gg')) return 'google';
    if (lower.includes('shopee')) return 'shopee';
    if (lower.includes('lazada')) return 'lazada';
    if (lower.includes('tiktok') || lower.includes('tik')) return 'tiktok';
    if (lower.includes('sendo')) return 'sendo';
    if (lower.includes('website') || lower.includes('direct')) return 'website';
    if (lower.includes('offline') || lower.includes('retail')) return 'offline';
    if (lower === 'all' || lower.includes('multi')) return 'multi-channel';
    return lower;
  };

  // Display name mapping for channels
  const getChannelDisplayName = (channel: string): string => {
    const names: Record<string, string> = {
      'facebook': 'Facebook',
      'google': 'Google',
      'shopee': 'Shopee',
      'lazada': 'Lazada',
      'tiktok': 'TikTok',
      'sendo': 'Sendo',
      'website': 'Website',
      'offline': 'Offline/Retail',
      'multi-channel': 'Đa kênh',
    };
    return names[channel] || channel.charAt(0).toUpperCase() + channel.slice(1);
  };

  // Aggregate by channel
  const channelMap = new Map<string, ChannelData>();
  
  let totalSpend = 0;
  let totalRevenue = 0;

  campaigns.forEach(c => {
    totalSpend += c.spend;
    totalRevenue += c.revenue;
  });

  campaigns.forEach(campaign => {
    const normalizedChannel = normalizeChannel(campaign.channel);
    const existing = channelMap.get(normalizedChannel);
    if (existing) {
      existing.campaigns += 1;
      existing.activeCampaigns += campaign.status === 'active' ? 1 : 0;
      existing.spend += campaign.spend;
      existing.revenue += campaign.revenue;
      existing.orders += campaign.orders;
      existing.clicks += campaign.clicks;
      existing.impressions += campaign.impressions;
    } else {
      channelMap.set(normalizedChannel, {
        channel: normalizedChannel,
        campaigns: 1,
        activeCampaigns: campaign.status === 'active' ? 1 : 0,
        spend: campaign.spend,
        revenue: campaign.revenue,
        orders: campaign.orders,
        clicks: campaign.clicks,
        impressions: campaign.impressions,
        roas: 0,
        cpa: 0,
        ctr: 0,
        cvr: 0,
        spendShare: 0,
        revenueShare: 0,
      });
    }
  });

  // Create pacing lookup map
  const pacingMap = new Map<string, { pacing: number; isOverspend: boolean }>();
  const today = new Date();
  const dayOfMonth = today.getDate();
  const expectedPacingPercent = (dayOfMonth / 30) * 100;
  
  budgetPacingData.forEach(p => {
    const normalizedChannel = normalizeChannel(p.channel);
    const configured = budgetsMap.get(normalizedChannel);
    const planned = configured?.is_active ? (configured.budget_amount || 0) : p.plannedBudget;
    const pacing = planned > 0 ? (p.actualSpend / planned) * 100 : 0;
    const isOverspend = pacing > expectedPacingPercent + 10; // 10% tolerance
    pacingMap.set(normalizedChannel, { pacing, isOverspend });
  });

  // Calculate derived metrics and add target comparison
  const channelData = Array.from(channelMap.values()).map(ch => {
    const pacingInfo = pacingMap.get(ch.channel);
    const budget = budgetsMap.get(ch.channel);
    const isActiveBudget = !!budget?.is_active;
    
    const actualROAS = ch.spend > 0 ? ch.revenue / ch.spend : 0;
    const actualCPA = ch.orders > 0 ? ch.spend / ch.orders : 0;
    const actualCTR = ch.impressions > 0 ? (ch.clicks / ch.impressions) * 100 : 0;
    const actualCVR = ch.clicks > 0 ? (ch.orders / ch.clicks) * 100 : 0;
    
    // Calculate contribution margin (Revenue - COGS 40% - Fees 15% - Ad Spend)
    const estimatedCOGS = ch.revenue * 0.40;
    const estimatedFees = ch.revenue * 0.15;
    const contributionMargin = ch.revenue - estimatedCOGS - estimatedFees - ch.spend;
    const cmPercent = ch.revenue > 0 ? (contributionMargin / ch.revenue) * 100 : 0;

    const budgetAmount = isActiveBudget ? (budget?.budget_amount || 0) : 0;
    const revenueTarget = isActiveBudget ? (budget?.revenue_target || 0) : 0;
    const targetROAS = isActiveBudget ? (budget?.target_roas || 3) : 3;
    const maxCPA = isActiveBudget ? (budget?.max_cpa || 100000) : 100000;
    const targetCTR = isActiveBudget ? (budget?.target_ctr || 1.5) : 1.5;
    const targetCVR = isActiveBudget ? (budget?.target_cvr || 2) : 2;
    const targetCM = isActiveBudget ? (budget?.min_contribution_margin || 15) : 15;
    
    return {
      ...ch,
      roas: actualROAS,
      cpa: actualCPA,
      ctr: actualCTR,
      cvr: actualCVR,
      spendShare: totalSpend > 0 ? (ch.spend / totalSpend) * 100 : 0,
      revenueShare: totalRevenue > 0 ? (ch.revenue / totalRevenue) * 100 : 0,
      pacing: pacingInfo?.pacing || 0,
      isOverspend: pacingInfo?.isOverspend || false,
      // Budget config targets (ONLY when active)
      budget,
      targetROAS,
      maxCPA,
      targetCTR,
      targetCVR,
      targetCM,
      budgetAmount,
      revenueTarget,
      // KPI achievement
      roasAchieved: actualROAS >= targetROAS,
      cpaAchieved: actualCPA <= maxCPA,
      ctrAchieved: actualCTR >= targetCTR,
      cvrAchieved: actualCVR >= targetCVR,
      cmAchieved: cmPercent >= targetCM,
      revenueAchieved: revenueTarget > 0 ? ch.revenue >= revenueTarget : true,
      budgetUtilization: budgetAmount > 0 ? (ch.spend / budgetAmount) * 100 : 0,
      contributionMargin,
      cmPercent,
      isConfigured: isActiveBudget,
    };
  }).sort((a, b) => b.revenue - a.revenue);

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

  if (channelData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chưa có dữ liệu kênh marketing
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Hiệu suất theo Kênh vs Target KPIs
            <Badge variant="secondary" className="ml-2">{channelData.length} kênh</Badge>
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {budgets.filter(b => b.is_active).length} kênh đã cấu hình KPI
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {channelData.map((channel) => {
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
                      <h4 className="font-semibold">{getChannelDisplayName(channel.channel)}</h4>
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
                      {channel.activeCampaigns}/{channel.campaigns} campaigns đang chạy
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
                  <div className="font-bold">{formatCurrency(channel.spend)}đ</div>
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
                    channel.revenueAchieved ? "text-green-500" : "text-yellow-500"
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
                    CM%
                  </div>
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
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    CTR / CVR
                  </div>
                  <div className="font-bold">
                    <span className={channel.ctrAchieved ? "text-green-500" : ""}>{channel.ctr.toFixed(2)}%</span>
                    {" / "}
                    <span className={channel.cvrAchieved ? "text-green-500" : ""}>{channel.cvr.toFixed(2)}%</span>
                  </div>
                  {channel.isConfigured && (channel.targetCTR > 0 || channel.targetCVR > 0) && (
                    <div className="text-xs text-muted-foreground">
                      Target: {channel.targetCTR}% / {channel.targetCVR}%
                    </div>
                  )}
                </div>
              </div>

              {/* Budget Progress Bar */}
              {channel.isConfigured && channel.budgetAmount > 0 && (
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Budget Utilization</span>
                    <span className={cn(
                      "font-medium",
                      channel.budgetUtilization > 100 ? "text-red-500" :
                      channel.budgetUtilization > 80 ? "text-yellow-500" :
                      "text-green-500"
                    )}>
                      {formatCurrency(channel.spend)}đ / {formatCurrency(channel.budgetAmount)}đ ({channel.budgetUtilization.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(channel.budgetUtilization, 100)} 
                    className={cn(
                      "h-2",
                      channel.budgetUtilization > 100 ? "[&>div]:bg-red-500" :
                      channel.budgetUtilization > 80 ? "[&>div]:bg-yellow-500" :
                      "[&>div]:bg-green-500"
                    )}
                  />
                </div>
              )}

              {/* Revenue Progress Bar */}
              {channel.isConfigured && channel.revenueTarget > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Revenue Achievement</span>
                    <span className={cn(
                      "font-medium",
                      channel.revenueAchieved ? "text-green-500" : "text-orange-500"
                    )}>
                      {formatCurrency(channel.revenue)}đ / {formatCurrency(channel.revenueTarget)}đ ({((channel.revenue / channel.revenueTarget) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((channel.revenue / channel.revenueTarget) * 100, 100)} 
                    className={cn(
                      "h-2",
                      channel.revenueAchieved ? "[&>div]:bg-green-500" : "[&>div]:bg-orange-500"
                    )}
                  />
                </div>
              )}

              {/* Action */}
              {onViewChannelDetails && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-3 text-xs"
                  onClick={() => onViewChannelDetails(channel.channel)}
                >
                  Xem chi tiết kênh
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
