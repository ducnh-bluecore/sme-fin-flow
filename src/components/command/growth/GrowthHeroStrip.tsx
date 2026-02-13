import { TrendingUp, DollarSign, Star, Shield, AlertTriangle } from 'lucide-react';
import type { SimSummary } from './types';
import { formatVNDCompact } from '@/lib/formatters';

interface Props {
  sim: SimSummary;
}

export default function GrowthHeroStrip({ sim }: Props) {
  const cards = [
    {
      icon: TrendingUp,
      label: 'Tổng SL Cần SX',
      value: sim.totalProductionUnits.toLocaleString(),
      sub: 'đơn vị',
      color: 'text-primary',
    },
    {
      icon: DollarSign,
      label: 'Vốn Cần',
      value: formatVNDCompact(sim.totalCashRequired),
      sub: 'cash required',
      color: 'text-red-600',
    },
    {
      icon: Star,
      label: 'Hero SKUs',
      value: `${sim.heroCount} FC`,
      sub: `${sim.heroRevenueSharePct.toFixed(0)}% doanh thu`,
      color: 'text-amber-600',
    },
    {
      icon: Shield,
      label: 'Recoverability',
      value: `${sim.heroGap.recoverabilityPct.toFixed(0)}%`,
      sub: sim.heroGap.recoverabilityPct >= 80 ? 'Đủ depth' : `Cần +${sim.heroGap.heroCountGap} hero`,
      color: sim.heroGap.recoverabilityPct >= 80 ? 'text-emerald-600' : 'text-amber-600',
    },
    {
      icon: AlertTriangle,
      label: 'Risk Score',
      value: `${sim.riskScore}/100`,
      sub: sim.riskScore < 30 ? 'Thấp' : sim.riskScore < 60 ? 'Trung bình' : 'Cao',
      color: sim.riskScore < 30 ? 'text-emerald-600' : sim.riskScore < 60 ? 'text-amber-600' : 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c, i) => (
        <div key={i} className="rounded-lg border p-3 bg-background">
          <div className="flex items-center gap-1.5 mb-1">
            <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
          <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          <p className="text-xs text-muted-foreground">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
