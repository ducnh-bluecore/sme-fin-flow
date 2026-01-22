import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  delay?: number;
  className?: string;
}

/**
 * STAT CARD - Light Professional Theme
 * 
 * Clean metric display with semantic severity colors
 * Follows severity discipline: green = confirmed, amber = warning, red = critical
 */
const variantStyles = {
  default: {
    value: 'text-foreground',
    border: '',
    iconBg: 'bg-muted',
  },
  success: {
    value: 'text-emerald-600',
    border: 'border-l-4 border-l-emerald-500',
    iconBg: 'bg-emerald-50',
  },
  warning: {
    value: 'text-amber-600',
    border: 'border-l-4 border-l-amber-500',
    iconBg: 'bg-amber-50',
  },
  danger: {
    value: 'text-destructive',
    border: 'border-l-4 border-l-destructive',
    iconBg: 'bg-destructive/10',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon: Icon,
  variant = 'default',
  delay = 0,
  className,
}: StatCardProps) {
  const isPositiveChange = change !== undefined && change >= 0;
  const showChange = change !== undefined && change !== 0;
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={cn('bg-card', styles.border, className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {Icon && (
            <div className={cn('p-2 rounded-lg', styles.iconBg)}>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-semibold tabular-nums', styles.value)}>
            {value}
          </div>
          {showChange && (
            <div
              className={cn(
                'flex items-center text-xs mt-1 font-medium',
                isPositiveChange ? 'text-emerald-600' : 'text-destructive'
              )}
            >
              {isPositiveChange ? (
                <ArrowUpRight className="w-3 h-3 mr-1" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-1" />
              )}
              {Math.abs(change).toFixed(1)}%{changeLabel && ` ${changeLabel}`}
            </div>
          )}
          {subtitle && !showChange && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
