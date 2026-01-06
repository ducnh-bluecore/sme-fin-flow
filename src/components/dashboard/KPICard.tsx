import { ReactNode, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const KPICard = forwardRef<HTMLDivElement, KPICardProps>(({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  variant = 'default',
  className,
}, ref) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-3 h-3" />;
    if (trend.value < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-success';
    if (trend.value < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('kpi-card', variant, className)}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl md:text-3xl font-bold text-foreground vnd-value"
        >
          {value}
        </motion.p>
        
        <div className="flex items-center gap-2">
          {trend && (
            <span className={cn('flex items-center gap-1 text-xs font-medium', getTrendColor())}>
              {getTrendIcon()}
              {trend.value > 0 ? '+' : ''}{trend.value}%
              {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
            </span>
          )}
          {subtitle && !trend && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

KPICard.displayName = 'KPICard';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  children?: ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'text-primary',
  children,
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('data-card', className)}
    >
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', 'bg-primary/10')}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      
      {typeof value !== 'undefined' && (
        <p className="text-3xl font-bold text-foreground mb-4">{value}</p>
      )}
      
      {children}
    </motion.div>
  );
}
