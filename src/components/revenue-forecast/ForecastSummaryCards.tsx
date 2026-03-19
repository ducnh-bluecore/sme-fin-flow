import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Users, Megaphone } from 'lucide-react';
import type { ForecastMonth } from '@/hooks/useRevenueForecast';

function fmt(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString('vi-VN');
}

interface Props {
  data: ForecastMonth[];
}

export function ForecastSummaryCards({ data }: Props) {
  const totalBase = data.reduce((s, m) => s + m.total_base, 0);
  const totalReturning = data.reduce((s, m) => s + m.returning_revenue, 0);
  const totalNew = data.reduce((s, m) => s + m.new_revenue, 0);
  const totalAds = data.reduce((s, m) => s + m.ads_revenue, 0);
  const pctReturning = totalBase > 0 ? (totalReturning / totalBase) * 100 : 0;
  const pctNew = totalBase > 0 ? (totalNew / totalBase) * 100 : 0;
  const pctAds = totalBase > 0 ? (totalAds / totalBase) * 100 : 0;

  const cards = [
    {
      label: 'Tổng dự báo (Base)',
      value: fmt(totalBase),
      sub: `${data.length} tháng`,
      icon: TrendingUp,
      color: 'text-primary',
    },
    {
      label: 'Từ khách cũ',
      value: fmt(totalReturning),
      sub: `${pctReturning.toFixed(0)}% tổng`,
      icon: Users,
      color: 'text-emerald-600',
    },
    {
      label: 'Từ khách mới',
      value: fmt(totalNew),
      sub: `${pctNew.toFixed(0)}% tổng`,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      label: 'Từ Ads',
      value: fmt(totalAds),
      sub: `${pctAds.toFixed(0)}% tổng`,
      icon: Megaphone,
      color: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <div className="text-xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
