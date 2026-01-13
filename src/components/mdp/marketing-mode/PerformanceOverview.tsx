import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Users, 
  ShoppingCart, 
  TrendingUp,
  Target,
  MousePointer,
} from 'lucide-react';
import { MarketingModeSummary } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';

interface PerformanceOverviewProps {
  summary: MarketingModeSummary;
}

export function PerformanceOverview({ summary }: PerformanceOverviewProps) {
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

  const kpis = [
    {
      label: 'Chi tiêu Ads',
      value: `${formatCurrency(summary.total_spend)}đ`,
      icon: DollarSign,
      color: 'blue',
      subtext: `${summary.active_campaigns} campaigns active`,
    },
    {
      label: 'Leads',
      value: formatNumber(summary.total_leads),
      icon: Users,
      color: 'cyan',
      subtext: `CTR: ${summary.overall_ctr.toFixed(2)}%`,
    },
    {
      label: 'Orders',
      value: formatNumber(summary.total_orders),
      icon: ShoppingCart,
      color: 'green',
      subtext: `Conv: ${summary.overall_conversion.toFixed(2)}%`,
    },
    {
      label: 'Revenue',
      value: `${formatCurrency(summary.total_revenue)}đ`,
      icon: TrendingUp,
      color: 'emerald',
      subtext: 'Từ paid marketing',
    },
    {
      label: 'CPA',
      value: `${formatCurrency(summary.overall_cpa)}đ`,
      icon: Target,
      color: summary.overall_cpa < 100000 ? 'green' : summary.overall_cpa < 200000 ? 'yellow' : 'red',
      subtext: 'Cost per Acquisition',
    },
    {
      label: 'ROAS',
      value: `${summary.overall_roas.toFixed(2)}x`,
      icon: MousePointer,
      color: summary.overall_roas >= 2 ? 'green' : summary.overall_roas >= 1 ? 'yellow' : 'red',
      subtext: 'Revenue / Ad Spend',
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
    };
    return colors[color] || colors.blue;
  };

  return (
    <Card className="border-blue-500/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-lg">Performance Monitoring</CardTitle>
          </div>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
            Marketing Mode
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((kpi) => {
            const colors = getColorClasses(kpi.color);
            const Icon = kpi.icon;
            
            return (
              <div
                key={kpi.label}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  colors.bg,
                  colors.border
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("p-1.5 rounded-md", colors.bg)}>
                    <Icon className={cn("h-3.5 w-3.5", colors.text)} />
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{kpi.label}</span>
                </div>
                <p className={cn("text-xl font-bold", colors.text)}>
                  {kpi.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {kpi.subtext}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
