import { Loader2, LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'page' | 'card' | 'table' | 'chart';
  rows?: number;
  columns?: number;
  className?: string;
  message?: string;
  icon?: LucideIcon;
}

// Shimmer skeleton with animation
const ShimmerSkeleton = ({ className }: { className?: string }) => (
  <div 
    className={cn(
      'relative overflow-hidden rounded-lg bg-muted',
      'before:absolute before:inset-0',
      'before:bg-gradient-to-r before:from-transparent before:via-muted-foreground/10 before:to-transparent',
      'before:animate-shimmer',
      className
    )}
  />
);

export function LoadingState({ 
  variant = 'spinner', 
  rows = 3,
  columns = 4,
  className,
  message,
  icon: Icon = Loader2
}: LoadingStateProps) {
  if (variant === 'spinner') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn('flex flex-col items-center justify-center h-64 gap-3', className)}
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <Icon className="w-10 h-10 animate-spin text-primary relative z-10" />
        </div>
        {message && (
          <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
        )}
      </motion.div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn('space-y-3', className)}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <ShimmerSkeleton key={i} className="h-12 w-full" />
        ))}
      </motion.div>
    );
  }

  if (variant === 'card') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn('grid gap-4', className)}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="data-card space-y-3">
            <div className="flex justify-between items-start">
              <ShimmerSkeleton className="h-4 w-24" />
              <ShimmerSkeleton className="h-8 w-8 rounded-lg" />
            </div>
            <ShimmerSkeleton className="h-8 w-32" />
            <ShimmerSkeleton className="h-3 w-20" />
          </div>
        ))}
      </motion.div>
    );
  }

  if (variant === 'table') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn('space-y-2', className)}
      >
        {/* Table header */}
        <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
          {Array.from({ length: columns }).map((_, i) => (
            <ShimmerSkeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div 
            key={i} 
            className="flex gap-4 p-4 border-b border-border"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {Array.from({ length: columns }).map((_, j) => (
              <ShimmerSkeleton key={j} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </motion.div>
    );
  }

  if (variant === 'chart') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn('data-card', className)}
      >
        <div className="flex justify-between items-center mb-4">
          <ShimmerSkeleton className="h-6 w-40" />
          <ShimmerSkeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="relative h-64 flex items-end gap-2 px-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${30 + Math.random() * 60}%` }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex-1 bg-muted rounded-t-md"
            />
          ))}
        </div>
        <div className="flex justify-between mt-4 px-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <ShimmerSkeleton key={i} className="h-3 w-8" />
          ))}
        </div>
      </motion.div>
    );
  }

  // Page loading skeleton (default)
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('space-y-6', className)}
    >
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <ShimmerSkeleton className="h-8 w-64" />
          <ShimmerSkeleton className="h-4 w-48" />
        </div>
        <ShimmerSkeleton className="h-10 w-32 rounded-lg" />
      </div>
      
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="data-card space-y-3"
          >
            <div className="flex justify-between">
              <ShimmerSkeleton className="h-4 w-24" />
              <ShimmerSkeleton className="h-8 w-8 rounded-lg" />
            </div>
            <ShimmerSkeleton className="h-8 w-32" />
            <ShimmerSkeleton className="h-3 w-20" />
          </motion.div>
        ))}
      </div>
      
      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="data-card h-80"
        >
          <ShimmerSkeleton className="h-6 w-40 mb-4" />
          <ShimmerSkeleton className="h-full w-full rounded-lg" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="data-card h-80"
        >
          <ShimmerSkeleton className="h-6 w-40 mb-4" />
          <ShimmerSkeleton className="h-full w-full rounded-lg" />
        </motion.div>
      </div>
    </motion.div>
  );
}

// Export shimmer skeleton for reuse
export { ShimmerSkeleton };
