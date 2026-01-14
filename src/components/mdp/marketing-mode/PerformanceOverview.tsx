import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Users, 
  ShoppingCart, 
  TrendingUp,
  TrendingDown,
  Target,
  MousePointer,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import { MarketingModeSummary } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';
import { MetricExplainer } from '@/components/mdp/MDPMetricExplainer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PerformanceOverviewProps {
  summary: MarketingModeSummary;
}

export function PerformanceOverview({ summary }: PerformanceOverviewProps) {
  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (absValue >= 1000000000) return `${sign}${(absValue / 1000000000).toFixed(1)}B`;
    if (absValue >= 1000000) return `${sign}${(absValue / 1000000).toFixed(1)}M`;
    if (absValue >= 1000) return `${sign}${(absValue / 1000).toFixed(0)}K`;
    return `${sign}${absValue.toLocaleString()}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  // Calculate estimated contribution margin
  // CM = Revenue - COGS(40%) - Channel Fees(15%) - Ad Spend
  const estimatedCOGS = summary.total_revenue * 0.40;
  const estimatedChannelFees = summary.total_revenue * 0.15;
  const contributionMargin = summary.total_revenue - estimatedCOGS - estimatedChannelFees - summary.total_spend;
  const cmPercent = summary.total_revenue > 0 ? (contributionMargin / summary.total_revenue) * 100 : 0;
  const profitROAS = summary.total_spend > 0 ? contributionMargin / summary.total_spend : 0;

  const kpis = [
    {
      label: 'Chi tiêu Ads',
      value: `${formatCurrency(summary.total_spend)}đ`,
      icon: DollarSign,
      color: 'blue',
      subtext: `${summary.active_campaigns} campaigns active`,
      metricKey: 'ad_spend',
      trend: null,
    },
    {
      label: 'Revenue',
      value: `${formatCurrency(summary.total_revenue)}đ`,
      icon: TrendingUp,
      color: 'emerald',
      subtext: 'Từ paid marketing',
      metricKey: 'gross_revenue',
      trend: null,
    },
    {
      label: 'Contribution Margin',
      value: `${formatCurrency(contributionMargin)}đ`,
      icon: Wallet,
      color: contributionMargin >= 0 ? 'green' : 'red',
      subtext: `CM%: ${cmPercent.toFixed(1)}%`,
      metricKey: 'contribution_margin',
      isHighlight: true,
      trend: contributionMargin >= 0 ? 'up' : 'down',
    },
    {
      label: 'Profit ROAS',
      value: `${profitROAS.toFixed(2)}x`,
      icon: Target,
      color: profitROAS >= 1 ? 'green' : profitROAS >= 0 ? 'yellow' : 'red',
      subtext: 'CM / Ad Spend',
      metricKey: 'profit_roas',
      isHighlight: true,
      trend: profitROAS >= 1 ? 'up' : 'down',
    },
    {
      label: 'CPA',
      value: `${formatCurrency(summary.overall_cpa)}đ`,
      icon: Target,
      color: summary.overall_cpa < 100000 ? 'green' : summary.overall_cpa < 200000 ? 'yellow' : 'red',
      subtext: 'Cost per Acquisition',
      metricKey: 'cpa',
      trend: summary.overall_cpa < 150000 ? 'up' : 'down',
    },
    {
      label: 'ROAS (Vanity)',
      value: `${summary.overall_roas.toFixed(2)}x`,
      icon: MousePointer,
      color: 'muted',
      subtext: 'Revenue / Ad Spend',
      metricKey: 'roas',
      isVanity: true,
      trend: null,
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
      cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
      green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
      emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
      yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
      red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
      muted: { bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-border' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-lg">Performance Monitoring</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {contributionMargin < 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Marketing đang lỗ
              </Badge>
            )}
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              Marketing Mode
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((kpi) => {
            const colors = getColorClasses(kpi.color);
            const Icon = kpi.icon;
            
            return (
              <TooltipProvider key={kpi.label}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "p-3 rounded-lg border transition-colors relative",
                        colors.bg,
                        colors.border,
                        kpi.isHighlight && "ring-1 ring-primary/30",
                        kpi.isVanity && "opacity-60"
                      )}
                    >
                      {kpi.isHighlight && (
                        <div className="absolute -top-2 -right-2">
                          <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">
                            KEY
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn("p-1.5 rounded-md", colors.bg)}>
                          <Icon className={cn("h-3.5 w-3.5", colors.text)} />
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{kpi.label}</span>
                        {kpi.metricKey && (
                          <MetricExplainer metricKey={kpi.metricKey} variant="tooltip" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={cn("text-xl font-bold", colors.text)}>
                          {kpi.value}
                        </p>
                        {kpi.trend && (
                          kpi.trend === 'up' 
                            ? <TrendingUp className="h-4 w-4 text-green-400" />
                            : <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {kpi.subtext}
                      </p>
                    </div>
                  </TooltipTrigger>
                  {kpi.isVanity && (
                    <TooltipContent>
                      <p className="text-xs">ROAS vanity không phản ánh lợi nhuận thật.<br/>Sử dụng Profit ROAS để đánh giá chính xác.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Financial Truth Summary */}
        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-medium">Financial Truth:</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                Revenue: <span className="text-foreground font-medium">{formatCurrency(summary.total_revenue)}đ</span>
              </span>
              <span className="text-muted-foreground">-</span>
              <span className="text-muted-foreground">
                Costs: <span className="text-foreground font-medium">{formatCurrency(estimatedCOGS + estimatedChannelFees + summary.total_spend)}đ</span>
              </span>
              <span className="text-muted-foreground">=</span>
              <span className={cn(
                "font-bold",
                contributionMargin >= 0 ? "text-green-400" : "text-red-400"
              )}>
                CM: {formatCurrency(contributionMargin)}đ
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
