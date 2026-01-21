import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

/**
 * STRATEGIC DECISION CARD - CEO Control Tower
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
        label: 'On track',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/20',
      };
    case 'friction':
      return {
        label: 'Execution friction detected',
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-500/20',
      };
    case 'off_track':
      return {
        label: 'Off track – intervention required',
        bgColor: 'bg-red-500/10',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/20',
      };
  }
};

const TrendIcon = ({ trend, className }: { trend: TrendDirection; className?: string }) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className={cn('h-4 w-4 text-emerald-400', className)} />;
    case 'down':
      return <TrendingDown className={cn('h-4 w-4 text-red-400', className)} />;
    case 'flat':
      return <Minus className={cn('h-4 w-4 text-slate-400', className)} />;
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
        'w-full text-left p-6 rounded-lg border transition-all duration-200',
        'bg-slate-900/50 hover:bg-slate-900/80',
        isSelected 
          ? 'border-slate-600 ring-1 ring-slate-600' 
          : 'border-slate-800/50 hover:border-slate-700/50'
      )}
    >
      {/* Header: Title + Health Badge */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100 leading-tight pr-4">
          {decision.title}
        </h3>
        <div className={cn(
          'flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium',
          healthConfig.bgColor,
          healthConfig.textColor,
          'border',
          healthConfig.borderColor
        )}>
          {healthConfig.label}
        </div>
      </div>

      {/* Objective */}
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        Objective: {decision.objective}
      </p>

      {/* KPI: Target vs Actual */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            Target vs Actual
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-slate-100">
              {formatValue(decision.actualValue, decision.unit)}
            </span>
            <span className="text-sm text-slate-500">
              / {formatValue(decision.targetValue, decision.unit)}
            </span>
          </div>
        </div>

        {/* Trend + Variance */}
        <div className="flex items-center gap-2">
          <TrendIcon trend={decision.trend} />
          <span className={cn(
            'text-sm font-medium',
            isPositive ? 'text-emerald-400' : 'text-red-400'
          )}>
            {isPositive ? '+' : ''}{variancePercent}%
          </span>
        </div>
      </div>

      {/* Execution streams notice (only if friction or off_track) */}
      {decision.blockedStreams && decision.blockedStreams > 0 && decision.executionHealth !== 'on_track' && (
        <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <span className="text-slate-400">
            {decision.blockedStreams} execution stream{decision.blockedStreams > 1 ? 's are' : ' is'} currently blocked
          </span>
        </div>
      )}
    </button>
  );
}
