import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileKPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

export function MobileKPICard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend = 'neutral',
  variant = 'default',
  onClick,
}: MobileKPICardProps) {
  const variantStyles = {
    default: 'border-l-primary',
    success: 'border-l-success',
    warning: 'border-l-warning',
    danger: 'border-l-destructive',
  };

  const trendColors = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'bg-card rounded-xl border border-border p-4 cursor-pointer',
        'border-l-4 shadow-sm active:shadow-none transition-shadow',
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
          <p className="text-xl font-bold text-foreground mt-1 truncate">{value}</p>
          {(change !== undefined || changeLabel) && (
            <div className="flex items-center gap-1 mt-1">
              <TrendIcon className={cn('h-3 w-3', trendColors[trend])} />
              {change !== undefined && (
                <span className={cn('text-xs font-medium', trendColors[trend])}>
                  {change > 0 ? '+' : ''}
                  {change}%
                </span>
              )}
              {changeLabel && (
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
              variant === 'default' && 'bg-primary/10 text-primary',
              variant === 'success' && 'bg-success/10 text-success',
              variant === 'warning' && 'bg-warning/10 text-warning',
              variant === 'danger' && 'bg-destructive/10 text-destructive'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
