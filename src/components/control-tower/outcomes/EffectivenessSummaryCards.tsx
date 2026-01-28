import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, CheckCircle2, Target, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EffectivenessSummary } from '@/hooks/control-tower';

interface EffectivenessSummaryCardsProps {
  data: EffectivenessSummary;
  isLoading?: boolean;
}

const formatCurrency = (amount: number): string => {
  if (Math.abs(amount) >= 1_000_000_000) return `₫${(amount / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(amount) >= 1_000_000) return `₫${(amount / 1_000_000).toFixed(0)}M`;
  return `₫${amount.toLocaleString('vi-VN')}`;
};

export function EffectivenessSummaryCards({ data, isLoading }: EffectivenessSummaryCardsProps) {
  const cards = [
    {
      title: 'Resolved',
      value: data.totalDecisions,
      subtitle: 'decisions',
      icon: CheckCircle2,
      color: 'text-foreground',
      bgColor: '',
    },
    {
      title: 'Success Rate',
      value: `${data.overallSuccessRate.toFixed(0)}%`,
      subtitle: `${data.successfulCount} successful`,
      icon: Target,
      color: data.overallSuccessRate >= 80 
        ? 'text-emerald-600' 
        : data.overallSuccessRate >= 60 
          ? 'text-amber-600' 
          : 'text-destructive',
      bgColor: data.overallSuccessRate >= 80 
        ? 'border-emerald-500/50 bg-emerald-500/5' 
        : data.overallSuccessRate >= 60 
          ? 'border-amber-500/50 bg-amber-500/5' 
          : 'border-destructive/50 bg-destructive/5',
    },
    {
      title: 'Accuracy',
      value: `${data.overallAccuracy.toFixed(0)}%`,
      subtitle: 'pred vs actual',
      icon: TrendingUp,
      color: data.overallAccuracy >= 85 
        ? 'text-emerald-600' 
        : data.overallAccuracy >= 70 
          ? 'text-amber-600' 
          : 'text-destructive',
      bgColor: data.overallAccuracy >= 85 
        ? 'border-emerald-500/50 bg-emerald-500/5' 
        : data.overallAccuracy >= 70 
          ? 'border-amber-500/50 bg-amber-500/5' 
          : '',
    },
    {
      title: 'Total ROI',
      value: formatCurrency(data.totalROI),
      subtitle: 'saved',
      icon: Coins,
      color: data.totalROI > 0 ? 'text-emerald-600' : 'text-muted-foreground',
      bgColor: data.totalROI > 0 ? 'border-emerald-500/50 bg-emerald-500/5' : '',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="py-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-16 mb-1" />
              <div className="h-3 bg-muted rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={cn('transition-all', card.bgColor)}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className={cn('text-3xl font-bold', card.color)}>
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              </div>
              <card.icon className={cn('h-5 w-5', card.color, 'opacity-50')} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
