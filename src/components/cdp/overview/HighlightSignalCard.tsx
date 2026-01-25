import { TrendingDown, TrendingUp, Minus, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface HighlightSignal {
  id: string;
  headline: string;
  population: string;
  populationCount: number;
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  revenueImpact: number;
  severity: 'critical' | 'high' | 'medium';
  category: 'value' | 'velocity' | 'mix' | 'risk' | 'quality';
}

interface HighlightSignalCardProps {
  signal: HighlightSignal;
  onClick?: () => void;
}

function DirectionIndicator({ direction, magnitude }: { direction: 'up' | 'down' | 'stable'; magnitude: number }) {
  if (direction === 'up') {
    return (
      <span className="inline-flex items-center text-success font-medium">
        <TrendingUp className="w-4 h-4 mr-1" />
        +{magnitude.toFixed(1)}%
      </span>
    );
  }
  if (direction === 'down') {
    return (
      <span className="inline-flex items-center text-destructive font-medium">
        <TrendingDown className="w-4 h-4 mr-1" />
        -{magnitude.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-muted-foreground">
      <Minus className="w-4 h-4 mr-1" />
      Ổn định
    </span>
  );
}

function SeverityBadge({ severity }: { severity: 'critical' | 'high' | 'medium' }) {
  const styles = {
    critical: 'bg-destructive/10 text-destructive border-destructive/20',
    high: 'bg-warning/10 text-warning-foreground border-warning/20',
    medium: 'bg-muted text-muted-foreground border-border'
  };

  const labels = {
    critical: 'Ưu tiên cao',
    high: 'Nên xem xét',
    medium: 'Tham khảo'
  };

  return (
    <Badge variant="outline" className={`text-xs ${styles[severity]}`}>
      {labels[severity]}
    </Badge>
  );
}

export function HighlightSignalCard({ signal, onClick }: HighlightSignalCardProps) {
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (Math.abs(value) >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(0)}M`;
    }
    return `${(value / 1_000).toFixed(0)}K`;
  };

  return (
    <Card 
      className="hover:shadow-sm transition-all cursor-pointer border-l-2"
      style={{
        borderLeftColor: signal.severity === 'critical' 
          ? 'hsl(var(--destructive))' 
          : signal.severity === 'high' 
            ? 'hsl(var(--warning))' 
            : 'hsl(var(--border))'
      }}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h4 className="font-medium text-sm leading-snug line-clamp-2">{signal.headline}</h4>
          <SeverityBadge severity={signal.severity} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{signal.population}</span>
            <span className="font-medium">{signal.populationCount.toLocaleString('vi-VN')} KH</span>
          </div>

          <div className="flex items-center justify-between">
            <DirectionIndicator direction={signal.direction} magnitude={signal.changePercent} />
            <span className={`text-sm font-medium ${signal.revenueImpact < 0 ? 'text-destructive' : 'text-success'}`}>
              {signal.revenueImpact < 0 ? '' : '+'}₫{formatCurrency(signal.revenueImpact)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
