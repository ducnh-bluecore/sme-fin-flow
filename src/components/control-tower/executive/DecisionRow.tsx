import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * DECISION ROW - Minimal Strategic Decision Display
 * 
 * NO cards, NO borders, NO background blocks
 * Pure typography hierarchy
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type TrendDirection = 'up' | 'down' | 'flat';

export interface StrategicDecisionData {
  id: string;
  title: string;
  objective: string;
  targetValue: number;
  actualValue: number;
  unit: string;
  trend: TrendDirection;
  confidence: ConfidenceLevel;
}

interface DecisionRowProps {
  decision: StrategicDecisionData;
  isSelected?: boolean;
  onClick?: () => void;
}

const formatValue = (value: number, unit: string): string => {
  if (unit === 'VND' || unit === '₫') {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
    return value.toLocaleString('vi-VN');
  }
  if (unit === '%') return `${value.toFixed(1)}%`;
  return value.toLocaleString('vi-VN');
};

const TrendIcon = ({ trend }: { trend: TrendDirection }) => {
  const iconClass = 'h-4 w-4';
  switch (trend) {
    case 'up':
      return <TrendingUp className={cn(iconClass, 'text-[hsl(160,40%,45%)]')} />;
    case 'down':
      return <TrendingDown className={cn(iconClass, 'text-[hsl(0,60%,55%)]')} />;
    case 'flat':
      return <Minus className={cn(iconClass, 'text-muted-foreground')} />;
  }
};

const ConfidenceDots = ({ level }: { level: ConfidenceLevel }) => {
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-1.5 rounded-full transition-colors',
            i <= filled 
              ? level === 'high' 
                ? 'bg-[hsl(160,40%,45%)]' 
                : level === 'medium' 
                  ? 'bg-[hsl(40,60%,55%)]' 
                  : 'bg-[hsl(0,60%,55%)]'
              : 'bg-muted'
          )}
        />
      ))}
    </div>
  );
};

export function DecisionRow({ decision, isSelected, onClick }: DecisionRowProps) {
  const variance = decision.targetValue !== 0 
    ? ((decision.actualValue - decision.targetValue) / decision.targetValue * 100) 
    : 0;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left py-5 px-4 transition-all duration-200',
        'hover:bg-secondary/50',
        isSelected && 'bg-secondary/30 border-l-2 border-primary'
      )}
    >
      <div className="flex items-start justify-between gap-6">
        {/* Left: Title + Objective */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-foreground mb-1 truncate">
            {decision.title}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {decision.objective}
          </p>
        </div>
        
        {/* Right: Metrics */}
        <div className="flex items-center gap-6 flex-shrink-0">
          {/* Target vs Actual */}
          <div className="text-right">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-foreground">
                {formatValue(decision.actualValue, decision.unit)}
              </span>
              <span className="text-sm text-muted-foreground">
                / {formatValue(decision.targetValue, decision.unit)}
              </span>
            </div>
          </div>
          
          {/* Trend */}
          <div className="flex items-center gap-1">
            <TrendIcon trend={decision.trend} />
            <span className={cn(
              'text-sm font-medium',
              variance >= 0 ? 'text-[hsl(160,40%,45%)]' : 'text-[hsl(0,60%,55%)]'
            )}>
              {variance >= 0 ? '+' : ''}{variance.toFixed(0)}%
            </span>
          </div>
          
          {/* Confidence */}
          <ConfidenceDots level={decision.confidence} />
        </div>
      </div>
    </button>
  );
}
