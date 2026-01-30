import { motion } from 'framer-motion';
import { Clock, AlertTriangle, TrendingDown, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { differenceInHours } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Critical Alert Card - Dramatic presentation
 * 
 * Features:
 * - Severity-based styling with glow
 * - Impact amount prominently displayed
 * - Countdown timer
 * - Quick resolve action
 */

interface AlertData {
  id: string;
  title: string;
  message?: string;
  category?: string;
  severity: 'critical' | 'warning' | 'info';
  impact_amount?: number;
  deadline_at?: string;
  status?: string;
}

interface CriticalAlertCardProps {
  alert: AlertData;
  index: number;
  onResolve: (alert: AlertData) => void;
}

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000_000) return `₫${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `₫${(amount / 1_000_000).toFixed(0)}M`;
  return `₫${amount.toLocaleString('vi-VN')}`;
};

const severityConfig = {
  critical: {
    border: 'border-l-4 border-l-destructive',
    bg: 'bg-gradient-to-r from-destructive/10 via-transparent to-transparent',
    glow: 'shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]',
    badge: 'bg-destructive text-destructive-foreground',
    icon: AlertTriangle,
    iconColor: 'text-destructive',
  },
  warning: {
    border: 'border-l-4 border-l-amber-500',
    bg: 'bg-gradient-to-r from-amber-500/10 via-transparent to-transparent',
    glow: '',
    badge: 'bg-amber-500 text-white',
    icon: TrendingDown,
    iconColor: 'text-amber-500',
  },
  info: {
    border: 'border-l-2 border-l-muted-foreground',
    bg: '',
    glow: '',
    badge: 'bg-muted text-muted-foreground',
    icon: Clock,
    iconColor: 'text-muted-foreground',
  },
};

export function CriticalAlertCard({ alert, index, onResolve }: CriticalAlertCardProps) {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  const isUrgent = alert.deadline_at && differenceInHours(new Date(alert.deadline_at), new Date()) < 6;
  const isCriticalTime = alert.deadline_at && differenceInHours(new Date(alert.deadline_at), new Date()) < 2;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className={cn(
        'relative overflow-hidden transition-all duration-200',
        'hover:shadow-lg cursor-pointer',
        config.border,
        config.bg,
        config.glow,
        alert.severity === 'critical' && 'ring-1 ring-destructive/20'
      )}>
        {/* Animated urgency indicator for critical */}
        {alert.severity === 'critical' && (
          <motion.div
            className="absolute top-0 right-0 w-2 h-2 m-3"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <div className="w-full h-full rounded-full bg-destructive" />
          </motion.div>
        )}

        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Index + Content */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Index Badge */}
              <div className={cn(
                'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
                'text-xs font-bold',
                alert.severity === 'critical' ? 'bg-destructive/20 text-destructive' :
                alert.severity === 'warning' ? 'bg-amber-500/20 text-amber-600' :
                'bg-muted text-muted-foreground'
              )}>
                {index + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {alert.category?.toUpperCase() || 'SYSTEM'}
                  </Badge>
                  {alert.severity === 'critical' && (
                    <Badge className={config.badge}>
                      <Icon className="h-3 w-3 mr-1" />
                      CRITICAL
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-sm truncate">{alert.title}</h3>
                {alert.message && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {alert.message}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Impact + Deadline + Action */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Impact */}
              {alert.impact_amount && alert.impact_amount > 0 && (
                <motion.div
                  className="text-right"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Impact
                  </p>
                  <motion.p
                    className={cn(
                      'text-base font-bold',
                      alert.severity === 'critical' ? 'text-destructive' : 'text-amber-600'
                    )}
                    animate={alert.severity === 'critical' ? {
                      textShadow: ['0 0 0px transparent', '0 0 8px rgba(239,68,68,0.4)', '0 0 0px transparent'],
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {formatCurrency(alert.impact_amount)}
                  </motion.p>
                </motion.div>
              )}

              {/* Deadline */}
              {alert.deadline_at && (
                <div className={cn(
                  'text-right px-2 py-1 rounded',
                  isCriticalTime && 'bg-destructive/10',
                  isUrgent && !isCriticalTime && 'bg-amber-500/10'
                )}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Deadline
                  </p>
                  <div className="flex items-center gap-1">
                    {isCriticalTime && (
                      <motion.div
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        <Zap className="h-3 w-3 text-destructive" />
                      </motion.div>
                    )}
                    <p className={cn(
                      'text-sm font-semibold',
                      isCriticalTime ? 'text-destructive' :
                      isUrgent ? 'text-amber-600' : 'text-foreground'
                    )}>
                      {formatDistanceToNow(new Date(alert.deadline_at), { locale: vi, addSuffix: false })}
                    </p>
                  </div>
                </div>
              )}

              {/* Action */}
              <Button
                size="sm"
                variant={alert.severity === 'critical' ? 'default' : 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve(alert);
                }}
                className={cn(
                  alert.severity === 'critical' && 'bg-destructive hover:bg-destructive/90'
                )}
              >
                Resolve
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
