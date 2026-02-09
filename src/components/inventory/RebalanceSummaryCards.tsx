import { Package, ArrowRightLeft, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';

interface Props {
  suggestions: RebalanceSuggestion[];
}

export function RebalanceSummaryCards({ suggestions }: Props) {
  const pushSuggestions = suggestions.filter(s => s.transfer_type === 'push');
  const lateralSuggestions = suggestions.filter(s => s.transfer_type === 'lateral');
  const pushUnits = pushSuggestions.reduce((s, r) => s + r.qty, 0);
  const lateralUnits = lateralSuggestions.reduce((s, r) => s + r.qty, 0);
  const totalRevenue = suggestions.reduce((s, r) => s + (r.potential_revenue_gain || 0), 0);
  const p1Count = suggestions.filter(s => s.priority === 'P1').length;

  const cards = [
    {
      label: 'Push từ kho tổng',
      value: `${pushUnits.toLocaleString()} units`,
      sub: `${pushSuggestions.length} đề xuất`,
      icon: Package,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Lateral giữa kho',
      value: `${lateralUnits.toLocaleString()} units`,
      sub: `${lateralSuggestions.length} đề xuất`,
      icon: ArrowRightLeft,
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: 'Revenue tiếp cận',
      value: `+${(totalRevenue / 1_000_000).toFixed(1)}M`,
      sub: 'Projected gain',
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Stockout risk (P1)',
      value: `${p1Count}`,
      sub: 'store cần xử lý gấp',
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
