import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const statusConfig = {
  success: {
    icon: CheckCircle,
    colors: 'bg-success/10 text-success border-success/20',
    dot: 'bg-success',
  },
  warning: {
    icon: AlertTriangle,
    colors: 'bg-warning/10 text-warning border-warning/20',
    dot: 'bg-warning',
  },
  error: {
    icon: XCircle,
    colors: 'bg-destructive/10 text-destructive border-destructive/20',
    dot: 'bg-destructive',
  },
  info: {
    icon: Info,
    colors: 'bg-info/10 text-info border-info/20',
    dot: 'bg-info',
  },
  pending: {
    icon: AlertCircle,
    colors: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
};

const sizes = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function StatusIndicator({
  status,
  label,
  showIcon = true,
  size = 'md',
  animated = true,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.span
      initial={animated ? { opacity: 0, scale: 0.9 } : false}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        config.colors,
        sizes[size],
        className
      )}
    >
      {showIcon && (
        <Icon className={iconSizes[size]} />
      )}
      {label && <span>{label}</span>}
    </motion.span>
  );
}

// Simple dot indicator
interface StatusDotProps {
  status: StatusType;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const dotSizes = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function StatusDot({ 
  status, 
  animated = true,
  size = 'md',
  className 
}: StatusDotProps) {
  const config = statusConfig[status];

  return (
    <span className={cn('relative inline-flex', className)}>
      <span className={cn('rounded-full', config.dot, dotSizes[size])} />
      {animated && status !== 'pending' && (
        <span 
          className={cn(
            'absolute inset-0 rounded-full animate-ping',
            config.dot,
            'opacity-75'
          )} 
        />
      )}
    </span>
  );
}

// Progress with status
interface StatusProgressProps {
  value: number;
  max?: number;
  status?: StatusType;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const progressSizes = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function StatusProgress({
  value,
  max = 100,
  status = 'info',
  showLabel = false,
  size = 'md',
  className,
}: StatusProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const config = statusConfig[status];

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">{value} / {max}</span>
          <span className={cn('font-medium', config.colors.split(' ')[1])}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', progressSizes[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full rounded-full', config.dot)}
        />
      </div>
    </div>
  );
}
