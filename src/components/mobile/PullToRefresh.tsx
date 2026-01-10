import { useState, useRef, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullDistance = useMotionValue(0);
  
  const spinnerOpacity = useTransform(pullDistance, [0, PULL_THRESHOLD / 2], [0, 1]);
  const spinnerY = useTransform(pullDistance, [0, MAX_PULL], [-40, 20]);
  const spinnerRotation = useTransform(pullDistance, [0, PULL_THRESHOLD], [0, 180]);
  const spinnerScale = useTransform(pullDistance, [0, PULL_THRESHOLD], [0.5, 1]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === 0 || isRefreshing) return;
    if (containerRef.current && containerRef.current.scrollTop > 0) {
      startY.current = 0;
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = Math.max(0, currentY - startY.current);
    const dampedDiff = Math.min(MAX_PULL, diff * 0.5);
    pullDistance.set(dampedDiff);
  };

  const handleTouchEnd = async () => {
    if (startY.current === 0) return;
    startY.current = 0;

    const currentPull = pullDistance.get();
    
    if (currentPull >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      animate(pullDistance, 60, { duration: 0.2 });
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(pullDistance, 0, { duration: 0.3 });
      }
    } else {
      animate(pullDistance, 0, { duration: 0.3 });
    }
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Pull indicator */}
      <motion.div
        style={{ y: spinnerY, opacity: spinnerOpacity, scale: spinnerScale }}
        className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
      >
        <motion.div
          style={{ rotate: isRefreshing ? undefined : spinnerRotation }}
          animate={isRefreshing ? { rotate: 360 } : undefined}
          transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : undefined}
          className={cn(
            'h-10 w-10 rounded-full bg-card border border-border shadow-lg',
            'flex items-center justify-center'
          )}
        >
          <RefreshCw className={cn('h-5 w-5 text-primary', isRefreshing && 'animate-spin')} />
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        ref={containerRef}
        style={{ y: pullDistance }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="h-full overflow-auto"
      >
        {children}
      </motion.div>
    </div>
  );
}
