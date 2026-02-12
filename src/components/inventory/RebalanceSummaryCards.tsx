import { Package, ArrowRightLeft, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';

interface Props {
  suggestions: RebalanceSuggestion[];
}

export function RebalanceSummaryCards({ suggestions }: Props) {
  const pending = suggestions.filter(s => s.status === 'pending');
  const pushPending = pending.filter(s => s.transfer_type === 'push');
  const lateralPending = pending.filter(s => s.transfer_type === 'lateral');
  const pushUnits = pushPending.reduce((s, r) => s + r.qty, 0);
  const lateralUnits = lateralPending.reduce((s, r) => s + r.qty, 0);
  
  // Net benefit = revenue - logistics cost (only pending)
  const totalNetBenefit = pending.reduce((s, r) => s + ((r.potential_revenue_gain || 0) - (r.logistics_cost_estimate || 0)), 0);
  
  // Unique stores with P1 pending
  const p1Pending = pending.filter(s => s.priority === 'P1');
  const p1UniqueStores = new Set(p1Pending.map(s => s.to_location)).size;

  const cards = [
    {
      label: 'Push từ kho tổng',
      value: `${pushUnits.toLocaleString()} units`,
      sub: `${pushPending.length} pending / ${suggestions.filter(s => s.transfer_type === 'push').length} total`,
      icon: Package,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Lateral giữa kho',
      value: `${lateralUnits.toLocaleString()} units`,
      sub: `${lateralPending.length} pending / ${suggestions.filter(s => s.transfer_type === 'lateral').length} total`,
      icon: ArrowRightLeft,
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: 'Net Benefit (pending)',
      value: `${totalNetBenefit >= 0 ? '+' : ''}${(totalNetBenefit / 1_000_000).toFixed(1)}M`,
      sub: 'Revenue − Logistics',
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Store có rủi ro hết hàng',
      value: `${p1UniqueStores}`,
      sub: `${p1Pending.length} đề xuất P1 pending`,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
