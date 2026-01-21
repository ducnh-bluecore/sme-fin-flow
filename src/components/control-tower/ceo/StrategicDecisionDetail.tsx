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
        label: 'Đang đạt mục tiêu',
        description: 'Tiến độ thực hiện đúng kế hoạch',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/30',
      };
    case 'friction':
      return {
        label: 'Có trở ngại',
        description: 'Một số hoạt động đang bị chậm tiến độ',
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-500/30',
      };
    case 'off_track':
      return {
        label: 'Chệch hướng',
        description: 'Cần can thiệp để đạt mục tiêu',
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
          Mục đích quyết định
        </h2>
        <p className="text-slate-200 leading-relaxed">
          {decision.objective}
        </p>
      </section>

      {/* Section 2: Outcome Tracking */}
      <section className="p-6 rounded-lg bg-slate-900/50 border border-slate-800/50">
        <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-4">
          Theo dõi kết quả
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Target */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Mục tiêu</p>
            <p className="text-2xl font-bold text-slate-300">
              {formatValue(decision.targetValue, decision.unit)}
            </p>
          </div>

          {/* Actual */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Thực tế</p>
            <p className="text-2xl font-bold text-slate-100">
              {formatValue(decision.actualValue, decision.unit)}
            </p>
          </div>

          {/* Variance + Trend */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Chênh lệch</p>
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
      </section>

      {/* Section 3: Execution Health Summary */}
      <section className={cn(
        'p-6 rounded-lg border',
        healthConfig.bgColor,
        healthConfig.borderColor
      )}>
        <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-4">
          Tình trạng thực thi
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
                {decision.blockedStreams} luồng thực thi đang bị chặn
              </p>
            )}
          </div>
        </div>
      </section>

      {/* CEO Actions */}
      <section className="pt-6 border-t border-slate-800/50">
        <h2 className="text-xs text-slate-500 uppercase tracking-wide mb-4">
          Hành động
        </h2>
        
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={onAdjustTarget}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Target className="h-4 w-4 mr-2" />
            Điều chỉnh mục tiêu
          </Button>
          
          <Button
            variant="outline"
            onClick={onExtend}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Gia hạn
          </Button>
          
          <Button
            variant="outline"
            onClick={onPause}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Pause className="h-4 w-4 mr-2" />
            Tạm dừng
          </Button>
          
          {decision.executionHealth === 'off_track' && (
            <Button
              onClick={onEscalate}
              className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Escalate
            </Button>
          )}
          
          <Button
            variant="ghost"
            onClick={onRequestReview}
            className="text-slate-400 hover:text-slate-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Yêu cầu review
          </Button>
        </div>
      </section>
    </div>
  );
}
