import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Megaphone, TrendingUp, Target, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface EngineMetric {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  status: 'good' | 'warning' | 'danger';
  noData?: boolean;
  noDataReason?: string;
}

export function MoneyEngineCards() {
  const { data: snapshot, isLoading } = useFinanceTruthSnapshot();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (!snapshot) return null;

  const dq = snapshot.dataQuality;
  const hasMarginData = dq.hasExpenseData || snapshot.grossMarginPercent > 0;
  const hasMarketingData = snapshot.totalMarketingSpend > 0;

  const adsRatio = snapshot.netRevenue > 0 
    ? (snapshot.totalMarketingSpend / snapshot.netRevenue) * 100 
    : 0;

  const metrics: EngineMetric[] = [
    {
      label: 'Blended Margin',
      value: hasMarginData ? `${snapshot.grossMarginPercent.toFixed(1)}%` : 'N/A',
      subtext: 'Gross Margin tổng hợp',
      icon: <DollarSign className="h-4 w-4" />,
      status: !hasMarginData ? 'warning' : snapshot.grossMarginPercent > 30 ? 'good' : snapshot.grossMarginPercent > 15 ? 'warning' : 'danger',
      noData: !hasMarginData,
      noDataReason: 'Chưa có dữ liệu COGS/Chi phí',
    },
    {
      label: 'Ads / Revenue',
      value: hasMarketingData ? `${adsRatio.toFixed(1)}%` : 'N/A',
      subtext: 'Chi phí marketing / Doanh thu',
      icon: <Megaphone className="h-4 w-4" />,
      status: !hasMarketingData ? 'warning' : adsRatio < 15 ? 'good' : adsRatio < 30 ? 'warning' : 'danger',
      noData: !hasMarketingData,
      noDataReason: 'Chưa có dữ liệu chi phí marketing',
    },
    {
      label: 'CM after Ads',
      value: hasMarginData ? `${snapshot.contributionMarginPercent.toFixed(1)}%` : 'N/A',
      subtext: 'Contribution Margin sau ads',
      icon: <TrendingUp className="h-4 w-4" />,
      status: !hasMarginData ? 'warning' : snapshot.contributionMarginPercent > 15 ? 'good' : snapshot.contributionMarginPercent > 5 ? 'warning' : 'danger',
      noData: !hasMarginData,
      noDataReason: 'Chưa có dữ liệu COGS/Chi phí',
    },
    {
      label: 'ROAS',
      value: hasMarketingData && snapshot.marketingRoas > 0 ? `${snapshot.marketingRoas.toFixed(1)}x` : 'N/A',
      subtext: '1đ ads → Xđ revenue',
      icon: <Target className="h-4 w-4" />,
      status: !hasMarketingData ? 'warning' : snapshot.marketingRoas >= 4 ? 'good' : snapshot.marketingRoas >= 2 ? 'warning' : 'danger',
      noData: !hasMarketingData || snapshot.marketingRoas === 0,
      noDataReason: 'Chưa có dữ liệu marketing/ads',
    },
  ];

  const statusStyles = {
    good: 'border-success/20 bg-success/5',
    warning: 'border-warning/20 bg-warning/5',
    danger: 'border-destructive/20 bg-destructive/5',
  };

  const valueStyles = {
    good: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Money Engine — Quality of Revenue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className={`rounded-lg border p-3 ${statusStyles[m.status]}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-muted-foreground">{m.icon}</span>
                <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                {m.noData && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <p className="text-xs">{m.noDataReason}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className={`text-2xl font-bold tabular-nums ${m.noData ? 'text-muted-foreground' : valueStyles[m.status]}`}>
                {m.value}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{m.subtext}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
