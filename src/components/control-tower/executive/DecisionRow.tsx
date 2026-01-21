import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';

/**
 * DECISION ROW - Strategic Decision Display
 * 
 * BLUECORE DNA: 
 * - Dark surface with subtle elevation
 * - Typography-driven hierarchy, not boxes
 * - Feels like financial control room
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
    if (value >= 1_000_000_000) return `₫${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `₫${(value / 1_000_000).toFixed(0)}M`;
    return `₫${value.toLocaleString('vi-VN')}`;
  }
  if (unit === '%') return `${value.toFixed(1)}%`;
  return value.toLocaleString('vi-VN');
};

const TrendIcon = ({ trend }: { trend: TrendDirection }) => {
  const iconClass = 'h-4 w-4';
  switch (trend) {
    case 'up':
      return <TrendingUp className={cn(iconClass, 'text-[hsl(158,55%,45%)]')} />;
    case 'down':
      return <TrendingDown className={cn(iconClass, 'text-[hsl(0,55%,50%)]')} />;
    case 'flat':
      return <Minus className={cn(iconClass, 'text-muted-foreground')} />;
  }
};

const ConfidenceBars = ({ level }: { level: ConfidenceLevel }) => {
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  const colors = {
    high: 'bg-[hsl(158,55%,45%)]',
    medium: 'bg-[hsl(38,60%,50%)]',
    low: 'bg-[hsl(0,55%,50%)]',
  };
  
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-sm transition-colors',
            i === 1 ? 'h-2' : i === 2 ? 'h-3' : 'h-4',
            i <= filled ? colors[level] : 'bg-muted/40'
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
        'w-full text-left py-5 px-5 transition-all duration-200',
        'border-b border-border/30',
        'hover:bg-[hsl(var(--surface-raised))]',
        isSelected && 'bg-[hsl(var(--surface-raised))] border-l-2 border-l-primary'
      )}
    >
      <div className="flex items-center gap-6">
        {/* Left: Title + Objective */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground mb-1 truncate">
            {decision.title}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {decision.objective}
          </p>
        </div>
        
        {/* Center: Target vs Actual */}
        <div className="text-right min-w-[140px]">
          <div className="flex items-baseline justify-end gap-2">
            <span className="text-lg font-bold text-foreground">
              {formatValue(decision.actualValue, decision.unit)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {formatValue(decision.targetValue, decision.unit)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2 mt-1">
            <TrendIcon trend={decision.trend} />
            <span className={cn(
              'text-sm font-medium',
              variance >= 0 ? 'text-[hsl(158,55%,45%)]' : 'text-[hsl(0,55%,50%)]'
            )}>
              {variance >= 0 ? '+' : ''}{variance.toFixed(0)}%
            </span>
          </div>
        </div>
        
        {/* Right: Confidence + Arrow */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Confidence</p>
            <ConfidenceBars level={decision.confidence} />
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </button>
  );
}
