import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TimeProgressBarProps {
  progress: number; // 0-100
  isOverdue?: boolean;
  isCritical?: boolean;
  showLabels?: boolean;
  className?: string;
}

export function TimeProgressBar({
  progress,
  isOverdue = false,
  isCritical = false,
  showLabels = true,
  className,
}: TimeProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  const getBarColor = () => {
    if (isOverdue) return 'bg-destructive';
    if (isCritical || progress > 80) return 'bg-warning';
    if (progress > 60) return 'bg-yellow-500';
    return 'bg-primary';
  };

  const getTrackColor = () => {
    if (isOverdue) return 'bg-destructive/20';
    if (isCritical) return 'bg-warning/20';
    return 'bg-muted';
  };

  return (
    <div className={cn('space-y-1', className)}>
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Bắt đầu</span>
          <span>{Math.round(clampedProgress)}% thời gian đã dùng</span>
          <span>Deadline</span>
        </div>
      )}
      
      <div className={cn(
        'relative h-3 rounded-full overflow-hidden',
        getTrackColor()
      )}>
        {/* Progress fill */}
        <motion.div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            getBarColor()
          )}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* Pulse effect for critical/overdue */}
        {(isCritical || isOverdue) && (
          <motion.div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full',
              isOverdue ? 'bg-destructive' : 'bg-warning'
            )}
            style={{ width: `${clampedProgress}%` }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Milestone markers */}
        <div className="absolute inset-0 flex items-center">
          {[25, 50, 75].map((milestone) => (
            <div
              key={milestone}
              className={cn(
                'absolute w-0.5 h-full',
                clampedProgress >= milestone ? 'bg-background/30' : 'bg-muted-foreground/20'
              )}
              style={{ left: `${milestone}%` }}
            />
          ))}
        </div>

        {/* Current position indicator */}
        <motion.div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-background',
            getBarColor()
          )}
          style={{ left: `calc(${clampedProgress}% - 8px)` }}
          animate={isCritical || isOverdue ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      </div>

      {/* Zone labels */}
      {showLabels && (
        <div className="flex text-[10px] text-muted-foreground">
          <div className="flex-1 text-center text-emerald-500">Safe Zone</div>
          <div className="flex-1 text-center text-yellow-500">Monitor</div>
          <div className="flex-1 text-center text-orange-500">Warning</div>
          <div className="flex-1 text-center text-destructive">Critical</div>
        </div>
      )}
    </div>
  );
}
