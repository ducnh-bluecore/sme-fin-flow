import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { RISK_LEVELS } from '@/hooks/useTenantHealth';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TenantHealthScoreProps {
  score: number;
  riskLevel: 'healthy' | 'monitor' | 'at_risk' | 'critical';
  trend?: 'increasing' | 'stable' | 'declining';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function TenantHealthScore({
  score,
  riskLevel,
  trend,
  size = 'md',
  showLabel = true,
}: TenantHealthScoreProps) {
  const riskInfo = RISK_LEVELS[riskLevel];
  
  const sizeClasses = {
    sm: 'w-16 h-16 text-lg',
    md: 'w-24 h-24 text-2xl',
    lg: 'w-32 h-32 text-4xl',
  };

  const strokeWidth = size === 'sm' ? 4 : size === 'md' ? 6 : 8;
  const radius = size === 'sm' ? 24 : size === 'md' ? 40 : 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 80) return 'stroke-emerald-500';
    if (score >= 60) return 'stroke-amber-500';
    if (score >= 40) return 'stroke-orange-500';
    return 'stroke-red-500';
  };

  const TrendIcon = trend === 'increasing' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
  const trendColor = trend === 'increasing' ? 'text-emerald-500' : trend === 'declining' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Circular Progress */}
      <div className={cn('relative', sizeClasses[size])}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${(radius + strokeWidth) * 2} ${(radius + strokeWidth) * 2}`}>
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
          />
          {/* Progress circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn('transition-all duration-500', getScoreColor())}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', riskInfo.color)}>{score}</span>
        </div>
      </div>

      {/* Label and trend */}
      {showLabel && (
        <div className="flex flex-col items-center gap-1">
          <Badge variant={riskInfo.badgeVariant} className="text-xs">
            {riskInfo.label}
          </Badge>
          {trend && (
            <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
              <TrendIcon className="w-3 h-3" />
              <span>
                {trend === 'increasing' ? 'Đang cải thiện' : trend === 'declining' ? 'Đang giảm' : 'Ổn định'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
