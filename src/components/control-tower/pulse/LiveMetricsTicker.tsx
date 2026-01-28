import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TickerMetric {
  id: string;
  label: string;
  value: string;
  change?: number;
  isAlert?: boolean;
  updatedAt: Date;
}

interface LiveMetricsTickerProps {
  metrics: TickerMetric[];
  speed?: 'slow' | 'normal' | 'fast';
  className?: string;
}

const speedConfig = {
  slow: 40,
  normal: 25,
  fast: 15,
};

function MetricItem({ metric }: { metric: TickerMetric }) {
  const TrendIcon = metric.change 
    ? metric.change > 0 ? TrendingUp : TrendingDown 
    : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center gap-3 px-4 py-2 rounded-lg mx-2',
        'bg-card border',
        metric.isAlert && 'border-destructive/50 bg-destructive/5'
      )}
    >
      {metric.isAlert && (
        <AlertCircle className="h-4 w-4 text-destructive animate-pulse" />
      )}
      
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {metric.label}
      </span>
      
      <span className={cn(
        'font-bold whitespace-nowrap',
        metric.isAlert && 'text-destructive'
      )}>
        {metric.value}
      </span>
      
      {metric.change !== undefined && (
        <div className={cn(
          'flex items-center gap-1 text-xs',
          metric.change > 0 ? 'text-success' : metric.change < 0 ? 'text-destructive' : 'text-muted-foreground'
        )}>
          <TrendIcon className="h-3 w-3" />
          <span>{metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%</span>
        </div>
      )}
    </motion.div>
  );
}

export function LiveMetricsTicker({ 
  metrics, 
  speed = 'normal',
  className 
}: LiveMetricsTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [duplicatedMetrics, setDuplicatedMetrics] = useState<TickerMetric[]>([]);

  // Duplicate metrics for seamless loop
  useEffect(() => {
    if (metrics.length > 0) {
      setDuplicatedMetrics([...metrics, ...metrics, ...metrics]);
    }
  }, [metrics]);

  if (metrics.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-4 text-muted-foreground', className)}>
        Không có metrics để hiển thị
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative overflow-hidden py-2',
        'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-16 before:bg-gradient-to-r before:from-background before:to-transparent before:z-10',
        'after:absolute after:right-0 after:top-0 after:bottom-0 after:w-16 after:bg-gradient-to-l after:from-background after:to-transparent after:z-10',
        className
      )}
    >
      <motion.div
        className="flex items-center"
        animate={{ x: ['0%', '-33.33%'] }}
        transition={{
          x: {
            duration: speedConfig[speed],
            repeat: Infinity,
            ease: 'linear',
          },
        }}
      >
        <AnimatePresence mode="popLayout">
          {duplicatedMetrics.map((metric, index) => (
            <MetricItem key={`${metric.id}-${index}`} metric={metric} />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
