import { motion, Variants } from 'framer-motion';
import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
  onClick?: () => void;
}

const cardVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.98,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
  },
  hover: {
    y: -4,
    boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.15)',
  },
  tap: {
    scale: 0.98,
  },
};

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(({
  children,
  className,
  delay = 0,
  hover = true,
  onClick,
}, ref) => {
  return (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      whileHover={hover ? 'hover' : undefined}
      whileTap={onClick ? 'tap' : undefined}
      variants={cardVariants}
      transition={{ 
        delay,
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      onClick={onClick}
      className={cn(
        'data-card transition-shadow duration-300',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </motion.div>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

// Animated List Item
interface AnimatedListItemProps {
  children: ReactNode;
  index: number;
  className?: string;
}

export function AnimatedListItem({ children, index, className }: AnimatedListItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        delay: index * 0.05,
        duration: 0.3,
        ease: 'easeOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated Counter for numbers
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  formatOptions?: Intl.NumberFormatOptions;
}

export function AnimatedCounter({ 
  value, 
  duration = 1,
  className,
  prefix = '',
  suffix = '',
  formatOptions = {},
}: AnimatedCounterProps) {
  return (
    <motion.span 
      className={cn('tabular-nums', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {prefix}
        {new Intl.NumberFormat('vi-VN', formatOptions).format(value)}
        {suffix}
      </motion.span>
    </motion.span>
  );
}

// Pulse effect for important elements
interface PulseEffectProps {
  children: ReactNode;
  active?: boolean;
  color?: string;
  className?: string;
}

export function PulseEffect({ 
  children, 
  active = true, 
  color = 'primary',
  className 
}: PulseEffectProps) {
  if (!active) return <>{children}</>;

  return (
    <div className={cn('relative inline-flex', className)}>
      {children}
      <span 
        className={cn(
          'absolute -top-1 -right-1 w-3 h-3 rounded-full',
          color === 'primary' && 'bg-primary',
          color === 'destructive' && 'bg-destructive',
          color === 'success' && 'bg-success',
          color === 'warning' && 'bg-warning',
        )}
      >
        <span 
          className={cn(
            'absolute inset-0 rounded-full animate-ping',
            color === 'primary' && 'bg-primary',
            color === 'destructive' && 'bg-destructive',
            color === 'success' && 'bg-success',
            color === 'warning' && 'bg-warning',
          )}
        />
      </span>
    </div>
  );
}

// Skeleton shimmer for inline text
export function TextShimmer({ width = 'w-24', className }: { width?: string; className?: string }) {
  return (
    <span 
      className={cn(
        'inline-block h-4 rounded bg-muted animate-pulse',
        width,
        className
      )}
    />
  );
}
