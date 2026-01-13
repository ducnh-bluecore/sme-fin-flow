import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Users,
  Eye,
  MousePointer,
  ShoppingCart,
  Wallet,
  Repeat,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface AdvancedMarketingMetrics {
  // Traffic Metrics
  total_impressions: number;
  total_reach: number;
  frequency: number;
  
  // Engagement Metrics
  total_clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  
  // Conversion Metrics
  add_to_carts: number;
  atc_rate: number;
  checkouts: number;
  checkout_rate: number;
  orders: number;
  cvr: number;
  
  // Revenue Metrics
  revenue: number;
  aov: number;
  roas: number;
  acos: number;
  cpa: number;
  
  // Efficiency Metrics
  total_spend: number;
  profit_margin: number;
  ltv_cac_ratio: number;
  
  // Trends (vs previous period)
  impressions_trend: number;
  clicks_trend: number;
  orders_trend: number;
  revenue_trend: number;
  cpa_trend: number;
  roas_trend: number;
}

interface AdvancedMetricsGridProps {
  metrics: AdvancedMarketingMetrics;
  period: string;
}

const formatNumber = (value: number, decimals: number = 0) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(decimals);
};

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
};

const TrendIndicator = ({ value, inverse = false }: { value: number; inverse?: boolean }) => {
  if (value === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
  
  const isPositive = inverse ? value < 0 : value > 0;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  
  return (
    <div className={cn(
      "flex items-center gap-0.5 text-xs",
      isPositive ? "text-green-400" : "text-red-400"
    )}>
      <Icon className="h-3 w-3" />
      <span>{Math.abs(value).toFixed(1)}%</span>
    </div>
  );
};

// Benchmark definitions
const BENCHMARKS = {
  ctr: { value: 1.5, label: '1.5%' },
  cvr: { value: 2.0, label: '2.0%' },
  atc_rate: { value: 8.0, label: '8.0%' },
  checkout_rate: { value: 50, label: '50%' },
  roas: { value: 3.0, label: '3.0x' },
  acos: { value: 15, label: '15%' },
  frequency: { value: 3.0, label: '3.0' },
  ltv_cac_ratio: { value: 3.0, label: '3.0x' },
};

export function AdvancedMetricsGrid({ metrics, period }: AdvancedMetricsGridProps) {
  const getStatusColor = (value: number, benchmark: number, higherIsBetter: boolean = true) => {
    const ratio = value / benchmark;
    if (higherIsBetter) {
      if (ratio >= 1.2) return 'text-green-400';
      if (ratio >= 1.0) return 'text-emerald-400';
      if (ratio >= 0.7) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      if (ratio <= 0.8) return 'text-green-400';
      if (ratio <= 1.0) return 'text-emerald-400';
      if (ratio <= 1.3) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  const metricGroups = [
    {
      title: 'Traffic',
      icon: <Eye className="h-4 w-4" />,
      color: 'text-blue-400',
      metrics: [
        {
          label: 'Impressions',
          value: formatNumber(metrics.total_impressions),
          trend: metrics.impressions_trend,
        },
        {
          label: 'Reach',
          value: formatNumber(metrics.total_reach),
          subtext: `${((metrics.total_reach / metrics.total_impressions) * 100).toFixed(0)}% unique`,
        },
        {
          label: 'Frequency',
          value: metrics.frequency.toFixed(1),
          benchmark: BENCHMARKS.frequency,
          status: getStatusColor(metrics.frequency, BENCHMARKS.frequency.value, false),
        },
        {
          label: 'CPM',
          value: `${formatCurrency(metrics.cpm)}đ`,
          tooltip: 'Cost per 1,000 impressions',
        },
      ],
    },
    {
      title: 'Engagement',
      icon: <MousePointer className="h-4 w-4" />,
      color: 'text-cyan-400',
      metrics: [
        {
          label: 'Clicks',
          value: formatNumber(metrics.total_clicks),
          trend: metrics.clicks_trend,
        },
        {
          label: 'CTR',
          value: `${metrics.ctr.toFixed(2)}%`,
          benchmark: BENCHMARKS.ctr,
          status: getStatusColor(metrics.ctr, BENCHMARKS.ctr.value),
        },
        {
          label: 'CPC',
          value: `${formatCurrency(metrics.cpc)}đ`,
          tooltip: 'Cost per click',
        },
      ],
    },
    {
      title: 'Conversion Funnel',
      icon: <ShoppingCart className="h-4 w-4" />,
      color: 'text-green-400',
      metrics: [
        {
          label: 'Add to Cart',
          value: formatNumber(metrics.add_to_carts),
          subtext: `${metrics.atc_rate.toFixed(1)}% ATC rate`,
          benchmark: BENCHMARKS.atc_rate,
          status: getStatusColor(metrics.atc_rate, BENCHMARKS.atc_rate.value),
        },
        {
          label: 'Checkouts',
          value: formatNumber(metrics.checkouts),
          subtext: `${metrics.checkout_rate.toFixed(0)}% of ATC`,
          benchmark: BENCHMARKS.checkout_rate,
          status: getStatusColor(metrics.checkout_rate, BENCHMARKS.checkout_rate.value),
        },
        {
          label: 'Orders',
          value: formatNumber(metrics.orders),
          trend: metrics.orders_trend,
        },
        {
          label: 'CVR',
          value: `${metrics.cvr.toFixed(2)}%`,
          benchmark: BENCHMARKS.cvr,
          status: getStatusColor(metrics.cvr, BENCHMARKS.cvr.value),
          tooltip: 'Conversion Rate: Click → Order',
        },
      ],
    },
    {
      title: 'Revenue & Profit',
      icon: <Wallet className="h-4 w-4" />,
      color: 'text-emerald-400',
      metrics: [
        {
          label: 'Revenue',
          value: `${formatCurrency(metrics.revenue)}đ`,
          trend: metrics.revenue_trend,
        },
        {
          label: 'AOV',
          value: `${formatCurrency(metrics.aov)}đ`,
          tooltip: 'Average Order Value',
        },
        {
          label: 'Profit Margin',
          value: `${metrics.profit_margin.toFixed(1)}%`,
          status: metrics.profit_margin >= 15 ? 'text-green-400' : 
                  metrics.profit_margin >= 10 ? 'text-yellow-400' : 'text-red-400',
        },
      ],
    },
    {
      title: 'Efficiency',
      icon: <Target className="h-4 w-4" />,
      color: 'text-purple-400',
      metrics: [
        {
          label: 'ROAS',
          value: `${metrics.roas.toFixed(2)}x`,
          benchmark: BENCHMARKS.roas,
          status: getStatusColor(metrics.roas, BENCHMARKS.roas.value),
          trend: metrics.roas_trend,
        },
        {
          label: 'ACOS',
          value: `${metrics.acos.toFixed(1)}%`,
          benchmark: BENCHMARKS.acos,
          status: getStatusColor(metrics.acos, BENCHMARKS.acos.value, false),
          tooltip: 'Advertising Cost of Sales',
        },
        {
          label: 'CPA',
          value: `${formatCurrency(metrics.cpa)}đ`,
          trend: metrics.cpa_trend,
          inverseTrend: true,
        },
        {
          label: 'LTV/CAC',
          value: `${metrics.ltv_cac_ratio.toFixed(1)}x`,
          benchmark: BENCHMARKS.ltv_cac_ratio,
          status: getStatusColor(metrics.ltv_cac_ratio, BENCHMARKS.ltv_cac_ratio.value),
          tooltip: 'Lifetime Value / Customer Acquisition Cost',
        },
      ],
    },
  ];

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-lg">Advanced Metrics</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {period}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Chỉ số chuyên sâu với benchmark ngành • Click để xem chi tiết
        </p>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid md:grid-cols-5 gap-4">
            {metricGroups.map((group) => (
              <div key={group.title} className="space-y-3">
                {/* Group Header */}
                <div className={cn("flex items-center gap-2 pb-2 border-b border-border/50", group.color)}>
                  {group.icon}
                  <span className="text-sm font-medium">{group.title}</span>
                </div>

                {/* Metrics */}
                <div className="space-y-3">
                  {group.metrics.map((metric) => (
                    <Tooltip key={metric.label}>
                      <TooltipTrigger asChild>
                        <div className="cursor-help hover:bg-muted/30 rounded p-1.5 -mx-1.5 transition-colors">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-muted-foreground">{metric.label}</span>
                            {metric.trend !== undefined && (
                              <TrendIndicator value={metric.trend} inverse={metric.inverseTrend} />
                            )}
                          </div>
                          <p className={cn(
                            "text-lg font-bold",
                            metric.status || 'text-foreground'
                          )}>
                            {metric.value}
                          </p>
                          {metric.subtext && (
                            <p className="text-xs text-muted-foreground">{metric.subtext}</p>
                          )}
                          {metric.benchmark && (
                            <p className="text-xs text-muted-foreground">
                              vs {metric.benchmark.label} benchmark
                            </p>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-medium">{metric.label}</p>
                          {metric.tooltip && <p className="text-xs">{metric.tooltip}</p>}
                          {metric.benchmark && (
                            <p className="text-xs">
                              Industry benchmark: {metric.benchmark.label}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>

        {/* Spend Summary */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total Spend:</span>
              <span className="font-bold">{formatCurrency(metrics.total_spend)}đ</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Cost/Order</p>
                <p className="font-medium">{formatCurrency(metrics.cpa)}đ</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Revenue/Spend</p>
                <p className={cn(
                  "font-medium",
                  metrics.roas >= 3 ? "text-green-400" : 
                  metrics.roas >= 2 ? "text-yellow-400" : "text-red-400"
                )}>
                  {metrics.roas.toFixed(2)}x
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
