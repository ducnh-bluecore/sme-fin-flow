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

const variantStyles = {
  default: '',
  success: 'text-green-500',
  warning: 'text-amber-500',
  danger: 'text-destructive border-destructive/50',
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={cn(variant === 'danger' && 'border-destructive/50', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', variantStyles[variant])}>
            {value}
          </div>
          {showChange && (
            <div
              className={cn(
                'flex items-center text-xs mt-1',
                isPositiveChange ? 'text-green-500' : 'text-destructive'
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
