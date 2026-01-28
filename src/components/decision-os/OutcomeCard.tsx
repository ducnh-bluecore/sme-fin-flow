import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, HelpCircle, ArrowRight } from 'lucide-react';

export type OutcomeStatus = 'positive' | 'neutral' | 'negative' | 'too_early';

interface OutcomeCardProps {
  id: string;
  decisionTitle: string;
  decidedAt: string;
  outcomeStatus: OutcomeStatus;
  expectedImpact?: number;
  actualImpact?: number;
  impactVariancePercent?: number;
  outcomeSummary?: string;
  measuredAt?: string;
  onClick?: () => void;
}

function formatVND(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '−' : '+';
  if (absValue >= 1e9) return `${sign}${(absValue / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `${sign}${(absValue / 1e6).toFixed(0)}M`;
  if (absValue >= 1e3) return `${sign}${(absValue / 1e3).toFixed(0)}K`;
  return `${sign}${absValue.toFixed(0)}`;
}

const statusConfig = {
  positive: {
    label: 'Positive Impact',
    icon: TrendingUp,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconClass: 'text-emerald-600',
  },
  neutral: {
    label: 'No Material Change',
    icon: Minus,
    className: 'bg-slate-50 text-slate-700 border-slate-200',
    iconClass: 'text-slate-500',
  },
  negative: {
    label: 'Negative Impact',
    icon: TrendingDown,
    className: 'bg-red-50 text-red-700 border-red-200',
    iconClass: 'text-red-600',
  },
  too_early: {
    label: 'Inconclusive',
    icon: HelpCircle,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    iconClass: 'text-amber-600',
  },
};

export function OutcomeCard({
  id,
  decisionTitle,
  decidedAt,
  outcomeStatus,
  expectedImpact,
  actualImpact,
  impactVariancePercent,
  outcomeSummary,
  measuredAt,
  onClick,
}: OutcomeCardProps) {
  const config = statusConfig[outcomeStatus];
  const Icon = config.icon;

  const showComparison = expectedImpact !== undefined && actualImpact !== undefined;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <Badge 
            variant="outline" 
            className={cn("text-xs font-medium", config.className)}
          >
            <Icon className={cn("h-3 w-3 mr-1", config.iconClass)} />
            {config.label}
          </Badge>
          {impactVariancePercent !== undefined && (
            <span className={cn(
              "text-sm font-semibold",
              impactVariancePercent > 0 ? "text-emerald-600" : 
              impactVariancePercent < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {impactVariancePercent > 0 ? '+' : ''}{impactVariancePercent.toFixed(0)}%
            </span>
          )}
        </div>

        {/* Decision Title */}
        <h4 className="text-sm font-medium text-foreground mb-2 line-clamp-2">
          {decisionTitle}
        </h4>

        {/* Before vs After Comparison */}
        {showComparison && (
          <div className="flex items-center gap-3 mb-3 py-2 px-3 bg-muted/50 rounded-lg">
            <div className="flex-1 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Expected</p>
              <p className="text-sm font-semibold text-muted-foreground">
                {formatVND(expectedImpact)}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Actual</p>
              <p className={cn(
                "text-sm font-semibold",
                outcomeStatus === 'positive' ? "text-emerald-600" :
                outcomeStatus === 'negative' ? "text-destructive" : "text-foreground"
              )}>
                {formatVND(actualImpact)}
              </p>
            </div>
          </div>
        )}

        {/* Outcome Summary */}
        {outcomeSummary && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {outcomeSummary}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border">
          <span>Decided: {new Date(decidedAt).toLocaleDateString('vi-VN')}</span>
          {measuredAt && (
            <span>Measured: {new Date(measuredAt).toLocaleDateString('vi-VN')}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
