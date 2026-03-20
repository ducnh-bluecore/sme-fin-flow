import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Users, Megaphone, Target } from 'lucide-react';
import type { ForecastMonth } from '@/hooks/useRevenueForecast';

function fmt(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString('vi-VN');
}

interface Props {
  data: ForecastMonth[];
  isBacktest?: boolean;
}

export function ForecastSummaryCards({ data, isBacktest }: Props) {
  const totalBase = data.reduce((s, m) => s + m.total_base, 0);
  const totalReturning = data.reduce((s, m) => s + m.returning_revenue, 0);
  const totalNew = data.reduce((s, m) => s + m.new_revenue, 0);
  const totalAds = data.reduce((s, m) => s + m.ads_revenue, 0);
  const hasAdditionalAds = totalAds > 0;

  const baseWithoutAds = totalBase - totalAds;
  const pctReturning = baseWithoutAds > 0 ? (totalReturning / baseWithoutAds) * 100 : 0;
  const pctNew = baseWithoutAds > 0 ? (totalNew / baseWithoutAds) * 100 : 0;

  // Accuracy calculation for backtest
  const hasActuals = isBacktest && data.some((m) => m.actual_revenue !== undefined);
  let totalActual = 0;
  let mapeSum = 0;
  let mapeCount = 0;

  if (hasActuals) {
    data.forEach((m) => {
      if (m.actual_revenue !== undefined && m.actual_revenue > 0) {
        totalActual += m.actual_revenue;
        mapeSum += Math.abs(m.total_base - m.actual_revenue) / m.actual_revenue;
        mapeCount++;
      }
    });
  }

  const mape = mapeCount > 0 ? (mapeSum / mapeCount) * 100 : null;
  const accuracy = mape !== null ? 100 - mape : null;

  const cards = [
    {
      label: 'Tổng dự báo (Base)',
      value: fmt(totalBase),
      sub: `${data.length} tháng` + (hasAdditionalAds ? ' · gồm ads bổ sung' : ''),
      icon: TrendingUp,
      color: 'text-primary',
    },
    {
      label: 'Từ khách cũ',
      value: fmt(totalReturning),
      sub: `${pctReturning.toFixed(0)}% baseline`,
      icon: Users,
      color: 'text-emerald-600',
    },
    {
      label: 'Từ khách mới',
      value: fmt(totalNew),
      sub: `${pctNew.toFixed(0)}% baseline`,
      icon: Users,
      color: 'text-blue-600',
    },
  ];

  // Replace 4th card: Accuracy in backtest mode, Ads otherwise
  if (hasActuals && accuracy !== null) {
    cards.push({
      label: 'Độ chính xác (Accuracy)',
      value: `${accuracy.toFixed(1)}%`,
      sub: `Thực tế: ${fmt(totalActual)} · MAPE: ${mape!.toFixed(1)}%`,
      icon: Target,
      color: accuracy >= 85 ? 'text-emerald-600' : accuracy >= 70 ? 'text-amber-600' : 'text-destructive',
    });
  } else {
    cards.push({
      label: 'Ads bổ sung',
      value: hasAdditionalAds ? fmt(totalAds) : '—',
      sub: hasAdditionalAds
        ? `+${fmt(data[0]?.ads_spend || 0)}₫/tháng × ${data[0]?.roas || 0}x ROAS`
        : 'Đã bao gồm trong baseline',
      icon: Megaphone,
      color: hasAdditionalAds ? 'text-amber-600' : 'text-muted-foreground',
    });
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label + c.value}>
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
