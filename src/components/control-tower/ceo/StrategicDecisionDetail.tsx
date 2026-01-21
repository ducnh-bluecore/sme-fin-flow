import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertCircle,
  Target,
  Calendar,
  RefreshCw,
  Pause,
  ArrowUpRight
} from 'lucide-react';
import { StrategicDecision, ExecutionHealth, TrendDirection } from './StrategicDecisionCard';

/**
 * STRATEGIC DECISION DETAIL - CEO Control Tower
 * 
 * CEO Actions (LIMITED):
 * - Adjust target
 * - Extend / pause decision
 * - Escalate execution owner
 * - Request review
 * 
 * NO task details, NO checklists, NO user names
 */

interface StrategicDecisionDetailProps {
  decision: StrategicDecision;
  onAdjustTarget?: () => void;
  onExtend?: () => void;
  onPause?: () => void;
  onEscalate?: () => void;
  onRequestReview?: () => void;
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
        description: 'Execution is progressing across multiple streams.',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/30',
      };
    case 'friction':
      return {
        label: 'Execution friction detected',
        description: 'Some execution streams are experiencing delays.',
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-500/30',
      };
    case 'off_track':
      return {
        label: 'Off track – intervention required',
        description: 'This decision requires leadership intervention to meet its objective.',
        bgColor: 'bg-red-500/10',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/30',
      };
  }
};

const TrendIcon = ({ trend, className }: { trend: TrendDirection; className?: string }) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className={cn('h-5 w-5 text-emerald-400', className)} />;
    case 'down':
      return <TrendingDown className={cn('h-5 w-5 text-red-400', className)} />;
    case 'flat':
      return <Minus className={cn('h-5 w-5 text-slate-400', className)} />;
  }
};

export function StrategicDecisionDetail({ 
  decision, 
  onAdjustTarget,
  onExtend,
  onPause,
  onEscalate,
  onRequestReview,
}: StrategicDecisionDetailProps) {
  const healthConfig = getHealthConfig(decision.executionHealth);
  const variance = decision.actualValue - decision.targetValue;
  const variancePercent = decision.targetValue !== 0 
    ? ((variance / decision.targetValue) * 100).toFixed(1) 
    : '0';
  const isPositive = variance >= 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">
          {decision.title}
        </h1>
        <p className="text-slate-400 leading-relaxed">
          {decision.objective}
        </p>
      </div>

      {/* Section 1: Decision Intent */}
      <section className="p-6 rounded-lg bg-slate-900/50 border border-slate-800/50">
        <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-4">
          Decision Intent
        </h2>
        <p className="text-slate-200 leading-relaxed">
          This decision was initiated to {decision.objective.toLowerCase()}.
        </p>
      </section>

      {/* Section 2: Outcome Tracking */}
      <section className="p-6 rounded-lg bg-slate-900/50 border border-slate-800/50">
        <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-4">
          Outcome Tracking
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Target */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Key success indicator</p>
            <p className="text-2xl font-bold text-slate-300">
              {formatValue(decision.targetValue, decision.unit)}
            </p>
          </div>

          {/* Actual */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Current</p>
            <p className="text-2xl font-bold text-slate-100">
              {formatValue(decision.actualValue, decision.unit)}
            </p>
          </div>

          {/* Variance + Trend */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Variance</p>
            <div className="flex items-center gap-3">
              <span className={cn(
                'text-2xl font-bold',
                isPositive ? 'text-emerald-400' : 'text-red-400'
              )}>
                {isPositive ? '+' : ''}{variancePercent}%
              </span>
              <TrendIcon trend={decision.trend} />
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          {decision.trend === 'up' ? 'Direction is improving.' : 
           decision.trend === 'down' ? 'Direction is declining, but pace may be below expectation.' : 
           'Direction is stable.'}
        </p>
      </section>

      {/* Section 3: Execution Health Summary */}
      <section className={cn(
        'p-6 rounded-lg border',
        healthConfig.bgColor,
        healthConfig.borderColor
      )}>
        <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-4">
          Execution Health Summary
        </h2>
        
        <div className="flex items-start gap-4">
          <div className={cn(
            'p-3 rounded-lg',
            healthConfig.bgColor,
            'border',
            healthConfig.borderColor
          )}>
            {decision.executionHealth === 'on_track' ? (
              <Target className={cn('h-6 w-6', healthConfig.textColor)} />
            ) : (
              <AlertCircle className={cn('h-6 w-6', healthConfig.textColor)} />
            )}
          </div>
          <div>
            <h3 className={cn('text-lg font-semibold mb-1', healthConfig.textColor)}>
              {healthConfig.label}
            </h3>
            <p className="text-slate-400">
              {healthConfig.description}
            </p>
            {decision.blockedStreams && decision.blockedStreams > 0 && (
              <p className="text-sm text-slate-500 mt-2">
                {decision.blockedStreams} execution stream{decision.blockedStreams > 1 ? 's are' : ' is'} currently blocked.
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-4 italic">
          This reflects delivery progress, not the validity of the decision itself.
        </p>
      </section>

      {/* CEO Actions */}
      <section className="pt-6 border-t border-slate-800/50">
        <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-4">
          Executive Actions
        </h2>
        
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={onAdjustTarget}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Target className="h-4 w-4 mr-2" />
            Adjust target
          </Button>
          
          <Button
            variant="outline"
            onClick={onPause}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause decision
          </Button>
          
          {decision.executionHealth === 'off_track' && (
            <Button
              onClick={onEscalate}
              className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Escalate execution
            </Button>
          )}
          
          <Button
            variant="ghost"
            onClick={onRequestReview}
            className="text-slate-400 hover:text-slate-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Request outcome review
          </Button>
        </div>
      </section>
    </div>
  );
}
