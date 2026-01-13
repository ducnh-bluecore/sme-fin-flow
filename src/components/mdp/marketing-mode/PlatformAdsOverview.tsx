import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Store,
  Video,
  Search,
  Facebook,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Pause,
  Play,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Platform Ads Performance Data
export interface PlatformAdsData {
  platform: string;
  platform_icon: 'shopee' | 'lazada' | 'tiktok' | 'google' | 'meta' | 'sendo';
  is_active: boolean;
  // Spend
  spend_today: number;
  spend_month: number;
  budget_month: number;
  budget_utilization: number;
  // Core Metrics
  impressions: number;
  clicks: number;
  orders: number;
  revenue: number;
  // Calculated
  cpm: number; // Cost per 1000 impressions
  cpc: number; // Cost per click
  ctr: number; // Click-through rate
  cvr: number; // Conversion rate (order/click)
  cpa: number; // Cost per acquisition
  roas: number;
  acos: number; // Advertising Cost of Sales
  // Platform-specific
  add_to_cart: number;
  atc_rate: number;
  quality_score?: number;
  relevance_score?: number;
  // Trends
  spend_trend: number;
  cpa_trend: number;
  roas_trend: number;
}

interface PlatformAdsOverviewProps {
  platformData: PlatformAdsData[];
  onViewDetails?: (platform: string) => void;
  onPausePlatform?: (platform: string) => void;
  onResumePlatform?: (platform: string) => void;
  onAdjustBudget?: (platform: string, direction: 'up' | 'down') => void;
}

const getPlatformIcon = (platform: PlatformAdsData['platform_icon']) => {
  const icons: Record<string, React.ReactNode> = {
    shopee: <ShoppingBag className="h-4 w-4 text-orange-400" />,
    lazada: <Store className="h-4 w-4 text-purple-400" />,
    tiktok: <Video className="h-4 w-4 text-pink-400" />,
    google: <Search className="h-4 w-4 text-blue-400" />,
    meta: <Facebook className="h-4 w-4 text-blue-500" />,
    sendo: <Store className="h-4 w-4 text-red-400" />,
  };
  return icons[platform] || <BarChart3 className="h-4 w-4" />;
};

const getPlatformColor = (platform: PlatformAdsData['platform_icon']) => {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    shopee: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
    lazada: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
    tiktok: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
    google: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    meta: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400' },
    sendo: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  };
  return colors[platform] || colors.google;
};

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
};

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

export function PlatformAdsOverview({ 
  platformData, 
  onViewDetails, 
  onPausePlatform, 
  onResumePlatform,
  onAdjustBudget 
}: PlatformAdsOverviewProps) {
  // Benchmarks for comparison
  const benchmarks = {
    ctr: 1.5, // 1.5% CTR is good
    cvr: 2.0, // 2% conversion
    roas: 3.0, // 3x ROAS
    acos: 15, // 15% ACOS
    atc_rate: 8, // 8% add to cart
  };

  const getMetricStatus = (value: number, benchmark: number, higher_is_better: boolean = true) => {
    if (higher_is_better) {
      if (value >= benchmark * 1.2) return 'excellent';
      if (value >= benchmark) return 'good';
      if (value >= benchmark * 0.7) return 'warning';
      return 'poor';
    } else {
      if (value <= benchmark * 0.8) return 'excellent';
      if (value <= benchmark) return 'good';
      if (value <= benchmark * 1.3) return 'warning';
      return 'poor';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-emerald-400';
      case 'warning': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-lg">Platform Ads Performance</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {platformData.filter(p => p.is_active).length}/{platformData.length} platforms active
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Theo dõi hiệu quả ads từ các sàn TMĐT và nền tảng quảng cáo
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <TooltipProvider>
          {platformData.map((platform) => {
            const colors = getPlatformColor(platform.platform_icon);
            const ctrStatus = getMetricStatus(platform.ctr, benchmarks.ctr);
            const cvrStatus = getMetricStatus(platform.cvr, benchmarks.cvr);
            const roasStatus = getMetricStatus(platform.roas, benchmarks.roas);
            const acosStatus = getMetricStatus(platform.acos, benchmarks.acos, false);
            const atcStatus = getMetricStatus(platform.atc_rate, benchmarks.atc_rate);

            return (
              <div
                key={platform.platform}
                className={cn(
                  "p-4 rounded-lg border transition-all hover:shadow-md",
                  colors.bg,
                  colors.border,
                  !platform.is_active && "opacity-60"
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", colors.bg)}>
                      {getPlatformIcon(platform.platform_icon)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{platform.platform}</span>
                        {platform.is_active ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground text-xs">
                            Paused
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Today: {formatCurrency(platform.spend_today)}đ | Month: {formatCurrency(platform.spend_month)}đ
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => onAdjustBudget?.(platform.platform, 'up')}
                        >
                          <ArrowUp className="h-3.5 w-3.5 text-green-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Tăng budget 20%</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => onAdjustBudget?.(platform.platform, 'down')}
                        >
                          <ArrowDown className="h-3.5 w-3.5 text-yellow-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Giảm budget 20%</TooltipContent>
                    </Tooltip>
                    {platform.is_active ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0"
                            onClick={() => onPausePlatform?.(platform.platform)}
                          >
                            <Pause className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Tạm dừng platform</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0"
                            onClick={() => onResumePlatform?.(platform.platform)}
                          >
                            <Play className="h-3.5 w-3.5 text-green-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Tiếp tục chạy</TooltipContent>
                      </Tooltip>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={() => onViewDetails?.(platform.platform)}
                    >
                      Chi tiết
                    </Button>
                  </div>
                </div>

                {/* Budget Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Budget utilization</span>
                    <span className={cn(
                      platform.budget_utilization > 90 ? "text-red-400" :
                      platform.budget_utilization > 70 ? "text-yellow-400" : "text-green-400"
                    )}>
                      {platform.budget_utilization.toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={platform.budget_utilization} 
                    className="h-1.5"
                  />
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-6 gap-3">
                  {/* CPM */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">CPM</p>
                    <p className="text-sm font-semibold">{formatCurrency(platform.cpm)}đ</p>
                  </div>
                  
                  {/* CTR */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center cursor-help">
                        <p className="text-xs text-muted-foreground mb-0.5">CTR</p>
                        <p className={cn("text-sm font-semibold", getStatusColor(ctrStatus))}>
                          {platform.ctr.toFixed(2)}%
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Benchmark: {benchmarks.ctr}%</p>
                      <p className={getStatusColor(ctrStatus)}>
                        {ctrStatus === 'excellent' ? '🚀 Xuất sắc' : 
                         ctrStatus === 'good' ? '✅ Tốt' :
                         ctrStatus === 'warning' ? '⚠️ Cần cải thiện' : '❌ Thấp'}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  {/* CVR */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center cursor-help">
                        <p className="text-xs text-muted-foreground mb-0.5">CVR</p>
                        <p className={cn("text-sm font-semibold", getStatusColor(cvrStatus))}>
                          {platform.cvr.toFixed(2)}%
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Conversion Rate: Clicks → Orders</p>
                      <p>Benchmark: {benchmarks.cvr}%</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* ATC Rate */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center cursor-help">
                        <p className="text-xs text-muted-foreground mb-0.5">ATC</p>
                        <p className={cn("text-sm font-semibold", getStatusColor(atcStatus))}>
                          {platform.atc_rate.toFixed(1)}%
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add to Cart Rate</p>
                      <p>Benchmark: {benchmarks.atc_rate}%</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* ROAS */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center cursor-help">
                        <p className="text-xs text-muted-foreground mb-0.5">ROAS</p>
                        <div className="flex items-center justify-center gap-1">
                          <p className={cn("text-sm font-semibold", getStatusColor(roasStatus))}>
                            {platform.roas.toFixed(1)}x
                          </p>
                          {platform.roas_trend !== 0 && (
                            platform.roas_trend > 0 ? 
                              <TrendingUp className="h-3 w-3 text-green-400" /> :
                              <TrendingDown className="h-3 w-3 text-red-400" />
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Benchmark: {benchmarks.roas}x</p>
                      <p>Trend: {platform.roas_trend > 0 ? '+' : ''}{platform.roas_trend.toFixed(1)}%</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* ACOS */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center cursor-help">
                        <p className="text-xs text-muted-foreground mb-0.5">ACOS</p>
                        <p className={cn("text-sm font-semibold", getStatusColor(acosStatus))}>
                          {platform.acos.toFixed(1)}%
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Advertising Cost of Sales</p>
                      <p>Benchmark: &lt;{benchmarks.acos}%</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Quality Score (if available) */}
                {(platform.quality_score || platform.relevance_score) && (
                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4">
                    {platform.quality_score && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Quality Score:</span>
                        <Badge className={cn(
                          "text-xs",
                          platform.quality_score >= 8 ? "bg-green-500/20 text-green-400" :
                          platform.quality_score >= 6 ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        )}>
                          {platform.quality_score}/10
                        </Badge>
                      </div>
                    )}
                    {platform.relevance_score && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Relevance:</span>
                        <Badge className={cn(
                          "text-xs",
                          platform.relevance_score >= 8 ? "bg-green-500/20 text-green-400" :
                          platform.relevance_score >= 6 ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        )}>
                          {platform.relevance_score}/10
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </TooltipProvider>

        {platformData.length === 0 && (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu Platform Ads</p>
            <p className="text-xs text-muted-foreground mt-1">
              Kết nối Shopee, Lazada, TikTok Shop để theo dõi
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
