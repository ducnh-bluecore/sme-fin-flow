import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type PulseStatus = 'stable' | 'warning' | 'critical';

interface PulseRingProps {
  status: PulseStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const statusConfig = {
  stable: {
    color: 'hsl(var(--success))',
    bgColor: 'bg-success/10',
    ringColor: 'ring-success/30',
    label: 'Ổn định',
    pulseSpeed: 2,
    scale: [1, 1.1, 1],
  },
  warning: {
    color: 'hsl(var(--warning))',
    bgColor: 'bg-warning/10',
    ringColor: 'ring-warning/30',
    label: 'Cảnh báo',
    pulseSpeed: 1,
    scale: [1, 1.15, 1],
  },
  critical: {
    color: 'hsl(var(--destructive))',
    bgColor: 'bg-destructive/10',
    ringColor: 'ring-destructive/30',
    label: 'Nguy cấp',
    pulseSpeed: 0.5,
    scale: [1, 1.2, 0.95, 1.2, 1],
  },
};

const sizeConfig = {
  sm: { outer: 60, inner: 40, stroke: 3 },
  md: { outer: 100, inner: 70, stroke: 4 },
  lg: { outer: 160, inner: 120, stroke: 6 },
};

export function PulseRing({ 
  status, 
  size = 'md', 
  showLabel = true,
  className 
}: PulseRingProps) {
  const config = statusConfig[status];
  const dims = sizeConfig[size];
  const radius = (dims.inner - dims.stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: dims.outer, height: dims.outer }}>
        {/* Outer glow ring */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-full',
            config.bgColor,
            'ring-2',
            config.ringColor
          )}
          animate={{ 
            scale: config.scale,
            opacity: status === 'critical' ? [0.5, 1, 0.5] : [0.7, 1, 0.7]
          }}
          transition={{ 
            duration: config.pulseSpeed, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        
        {/* SVG Ring */}
        <svg
          className="absolute inset-0"
          width={dims.outer}
          height={dims.outer}
          viewBox={`0 0 ${dims.outer} ${dims.outer}`}
        >
          {/* Background circle */}
          <circle
            cx={dims.outer / 2}
            cy={dims.outer / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={dims.stroke}
            opacity={0.3}
          />
          
          {/* Animated progress circle */}
          <motion.circle
            cx={dims.outer / 2}
            cy={dims.outer / 2}
            r={radius}
            fill="none"
            stroke={config.color}
            strokeWidth={dims.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ 
              strokeDashoffset: [circumference, 0, circumference],
              rotate: [0, 360]
            }}
            transition={{ 
              strokeDashoffset: { duration: config.pulseSpeed * 2, repeat: Infinity },
              rotate: { duration: config.pulseSpeed * 4, repeat: Infinity, ease: 'linear' }
            }}
            style={{ 
              transformOrigin: 'center',
            }}
          />
        </svg>

        {/* Center dot */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ 
            width: dims.inner * 0.3, 
            height: dims.inner * 0.3,
            backgroundColor: config.color
          }}
          animate={{ 
            scale: status === 'critical' ? [1, 1.3, 0.8, 1.3, 1] : [1, 1.2, 1],
            boxShadow: [
              `0 0 0 0 ${config.color}`,
              `0 0 20px 10px ${config.color}40`,
              `0 0 0 0 ${config.color}`
            ]
          }}
          transition={{ 
            duration: config.pulseSpeed, 
            repeat: Infinity 
          }}
        />
      </div>

      {showLabel && (
        <motion.span
          className={cn(
            'text-sm font-medium',
            status === 'stable' && 'text-success',
            status === 'warning' && 'text-warning',
            status === 'critical' && 'text-destructive'
          )}
          animate={status === 'critical' ? { opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          {config.label}
        </motion.span>
      )}
    </div>
  );
}
