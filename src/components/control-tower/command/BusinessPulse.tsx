import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle2, TrendingDown, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { differenceInHours, differenceInMinutes } from 'date-fns';

/**
 * Business Pulse - The "Heartbeat" of Control Tower
 * 
 * Features:
 * - Animated pulse effect based on system state
 * - Dramatic countdown timer
 * - Impact amount with glow effect
 */

export type SystemState = 'CRITICAL' | 'WARNING' | 'STABLE';

interface BusinessPulseProps {
  systemState: SystemState;
  totalAlerts: number;
  totalExposure: number;
  nearestDeadline: string | null;
  lastUpdated: Date;
}

const stateConfig = {
  CRITICAL: {
    bg: 'bg-gradient-to-r from-destructive/20 via-destructive/10 to-destructive/20',
    border: 'border-destructive/50 ring-2 ring-destructive/30',
    text: 'text-destructive',
    label: 'CRITICAL',
    sublabel: 'Hành động ngay',
    icon: AlertTriangle,
    pulseColor: 'bg-destructive',
    glowClass: 'shadow-[0_0_30px_rgba(239,68,68,0.4)]',
  },
  WARNING: {
    bg: 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20',
    border: 'border-amber-500/50 ring-2 ring-amber-500/20',
    text: 'text-amber-500',
    label: 'WARNING',
    sublabel: 'Cần chú ý',
    icon: TrendingDown,
    pulseColor: 'bg-amber-500',
    glowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
  },
  STABLE: {
    bg: 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-emerald-500/15',
    border: 'border-emerald-500/40 ring-1 ring-emerald-500/20',
    text: 'text-emerald-500',
    label: 'STABLE',
    sublabel: 'Hệ thống ổn định',
    icon: CheckCircle2,
    pulseColor: 'bg-emerald-500',
    glowClass: '',
  },
};

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M`;
  return amount.toLocaleString('vi-VN');
};

export function BusinessPulse({
  systemState,
  totalAlerts,
  totalExposure,
  nearestDeadline,
  lastUpdated,
}: BusinessPulseProps) {
  const config = stateConfig[systemState];
  const Icon = config.icon;

  // Calculate time remaining
  const timeRemaining = useMemo(() => {
    if (!nearestDeadline) return null;
    const deadline = new Date(nearestDeadline);
    const now = new Date();
    const hours = differenceInHours(deadline, now);
    const minutes = differenceInMinutes(deadline, now) % 60;
    const isUrgent = hours < 6;
    const isCritical = hours < 2;
    
    return {
      hours,
      minutes,
      display: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
      isUrgent,
      isCritical,
    };
  }, [nearestDeadline]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn(
        'relative overflow-hidden transition-all duration-500',
        config.border,
        config.bg,
        config.glowClass
      )}>
        {/* Animated background pulse */}
        {systemState !== 'STABLE' && (
          <motion.div
            className={cn(
              'absolute inset-0 opacity-20',
              config.pulseColor
            )}
            animate={{
              opacity: [0.05, 0.15, 0.05],
            }}
            transition={{
              duration: systemState === 'CRITICAL' ? 1 : 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        <CardContent className="relative py-5">
          <div className="flex items-center justify-between">
            {/* Left: Status + Pulse */}
            <div className="flex items-center gap-4">
              {/* Animated Pulse Circle */}
              <div className="relative">
                <motion.div
                  className={cn(
                    'absolute inset-0 rounded-full',
                    config.pulseColor,
                    'opacity-30'
                  )}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0, 0.3],
                  }}
                  transition={{
                    duration: systemState === 'CRITICAL' ? 1 : 2,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
                <motion.div
                  className={cn(
                    'relative z-10 w-12 h-12 rounded-full flex items-center justify-center',
                    config.pulseColor
                  )}
                  animate={{
                    scale: systemState === 'CRITICAL' ? [1, 1.05, 1] : 1,
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: systemState === 'CRITICAL' ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                >
                  <Icon className="h-6 w-6 text-white" />
                </motion.div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <motion.h1
                    className={cn('text-xl font-bold tracking-tight', config.text)}
                    animate={{
                      opacity: systemState === 'CRITICAL' ? [1, 0.7, 1] : 1,
                    }}
                    transition={{
                      duration: 1,
                      repeat: systemState === 'CRITICAL' ? Infinity : 0,
                    }}
                  >
                    {config.label}
                  </motion.h1>
                  <Badge 
                    variant="outline" 
                    className={cn('text-xs', config.text, 'border-current')}
                  >
                    {totalAlerts} alerts
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {config.sublabel} • {lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Center: Total Exposure (if exists) */}
            <AnimatePresence>
              {totalExposure > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-center"
                >
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Total Exposure
                  </p>
                  <motion.p
                    className={cn(
                      'text-3xl font-black tracking-tight',
                      systemState === 'CRITICAL' ? 'text-destructive' : 'text-amber-500'
                    )}
                    animate={{
                      textShadow: systemState === 'CRITICAL' 
                        ? ['0 0 0px transparent', '0 0 20px rgba(239,68,68,0.5)', '0 0 0px transparent']
                        : 'none',
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: systemState === 'CRITICAL' ? Infinity : 0,
                    }}
                  >
                    ₫{formatCurrency(totalExposure)}
                  </motion.p>
                  <p className="text-xs text-muted-foreground">at risk</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right: Countdown Timer */}
            {timeRemaining && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'text-right px-4 py-2 rounded-lg',
                  timeRemaining.isCritical && 'bg-destructive/20',
                  timeRemaining.isUrgent && !timeRemaining.isCritical && 'bg-amber-500/20'
                )}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Deadline gần nhất
                </p>
                <div className="flex items-center justify-end gap-2">
                  <Zap className={cn(
                    'h-4 w-4',
                    timeRemaining.isCritical ? 'text-destructive' : 
                    timeRemaining.isUrgent ? 'text-amber-500' : 'text-muted-foreground'
                  )} />
                  <motion.span
                    className={cn(
                      'text-2xl font-bold tabular-nums',
                      timeRemaining.isCritical ? 'text-destructive' : 
                      timeRemaining.isUrgent ? 'text-amber-500' : 'text-foreground'
                    )}
                    animate={{
                      scale: timeRemaining.isCritical ? [1, 1.05, 1] : 1,
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: timeRemaining.isCritical ? Infinity : 0,
                    }}
                  >
                    {timeRemaining.display}
                  </motion.span>
                </div>
                {timeRemaining.isCritical && (
                  <motion.p
                    className="text-xs text-destructive font-medium"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    Cần xử lý ngay!
                  </motion.p>
                )}
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
