import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

/**
 * STRATEGIC DECISION CARD - CEO Control Tower
 * Light Professional Theme
 * 
 * Design Principles:
 * - Minimal visual noise
 * - Clear execution health signal
 * - Single KPI focus per decision
 * - No operational details
 */

export type ExecutionHealth = 'on_track' | 'friction' | 'off_track';
export type TrendDirection = 'up' | 'down' | 'flat';

export interface StrategicDecision {
  id: string;
  title: string;
  objective: string;
  targetValue: number;
  actualValue: number;
  unit: string;
  trend: TrendDirection;
  executionHealth: ExecutionHealth;
  blockedStreams?: number;
  createdAt: string;
}

interface StrategicDecisionCardProps {
  decision: StrategicDecision;
  onClick?: () => void;
  isSelected?: boolean;
}

const formatValue = (value: number, unit: string): string => {
  if (unit === 'VND' || unit === '₫') {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)} tỷ`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)} triệu`;
    return value.toLocaleString('vi-VN');
  }
  if (unit === '%') return `${value.toFixed(1)}%`;
  return value.toLocaleString('vi-VN');
};

const getHealthConfig = (health: ExecutionHealth) => {
  switch (health) {
    case 'on_track':
      return {
        label: 'On Track',
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
      };
    case 'friction':
      return {
        label: 'Friction',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
      };
    case 'off_track':
      return {
        label: 'Off Track',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
      };
  }
};

const TrendIcon = ({ trend, className }: { trend: TrendDirection; className?: string }) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className={cn('h-4 w-4 text-emerald-600', className)} />;
    case 'down':
      return <TrendingDown className={cn('h-4 w-4 text-destructive', className)} />;
    case 'flat':
      return <Minus className={cn('h-4 w-4 text-muted-foreground', className)} />;
  }
};

export function StrategicDecisionCard({ decision, onClick, isSelected }: StrategicDecisionCardProps) {
  const healthConfig = getHealthConfig(decision.executionHealth);
  const variance = decision.actualValue - decision.targetValue;
  const variancePercent = decision.targetValue !== 0 
    ? ((variance / decision.targetValue) * 100).toFixed(1) 
    : '0';
  const isPositive = variance >= 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-5 rounded-lg border transition-all duration-200',
        'bg-card hover:bg-muted/30',
        isSelected 
          ? 'border-primary ring-1 ring-primary/20' 
          : 'border-border hover:border-primary/30'
      )}
    >
      {/* Header: Title + Health Badge */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-semibold text-foreground leading-tight pr-4">
          {decision.title}
        </h3>
        <div className={cn(
          'flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium',
          healthConfig.bgColor,
          healthConfig.textColor,
          'border',
          healthConfig.borderColor
        )}>
          {healthConfig.label}
        </div>
      </div>

      {/* Objective */}
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {decision.objective}
      </p>

      {/* KPI: Target vs Actual */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Mục tiêu vs Thực tế
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-foreground tabular-nums">
              {formatValue(decision.actualValue, decision.unit)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {formatValue(decision.targetValue, decision.unit)}
            </span>
          </div>
        </div>

        {/* Trend + Variance */}
        <div className="flex items-center gap-2">
          <TrendIcon trend={decision.trend} />
          <span className={cn(
            'text-sm font-medium tabular-nums',
            isPositive ? 'text-emerald-600' : 'text-destructive'
          )}>
            {isPositive ? '+' : ''}{variancePercent}%
          </span>
        </div>
      </div>

      {/* Blocked Streams Warning (only if off_track or friction) */}
      {decision.blockedStreams && decision.blockedStreams > 0 && decision.executionHealth !== 'on_track' && (
        <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span className="text-muted-foreground">
            {decision.blockedStreams} execution stream{decision.blockedStreams > 1 ? 's' : ''} blocked
          </span>
        </div>
      )}
    </button>
  );
}
