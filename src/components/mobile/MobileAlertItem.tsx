import { motion } from 'framer-motion';
import { AlertTriangle, Bell, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// Chuẩn hóa severity: critical, warning, info
interface MobileAlertItemProps {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  createdAt: string;
  isRead?: boolean;
  onClick?: () => void;
}

export function MobileAlertItem({
  title,
  message,
  severity,
  createdAt,
  isRead = false,
  onClick,
}: MobileAlertItemProps) {
  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
      dot: 'bg-destructive',
    },
    warning: {
      icon: AlertCircle,
      color: 'text-warning',
      bg: 'bg-warning/10',
      borderColor: 'border-warning/30',
      dot: 'bg-warning',
    },
    info: {
      icon: Bell,
      color: 'text-info',
      bg: 'bg-info/10',
      borderColor: 'border-info/30',
      dot: 'bg-info',
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  const timeAgo = formatDistanceToNow(new Date(createdAt), { 
    addSuffix: true,
    locale: vi 
  });

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'bg-card rounded-xl border p-4 cursor-pointer',
        'flex items-start gap-3 transition-all',
        config.borderColor,
        !isRead && config.bg
      )}
    >
      {/* Icon */}
      <div className={cn(
        'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
        config.bg
      )}>
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn(
            'text-sm text-foreground leading-tight',
            !isRead ? 'font-semibold' : 'font-medium'
          )}>
            {title}
          </h4>
          {!isRead && (
            <span className={cn('h-2 w-2 rounded-full flex-shrink-0 mt-1.5', config.dot)} />
          )}
        </div>
        {message && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{message}</p>
        )}
        <div className="flex items-center gap-1 mt-2 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="text-[11px]">{timeAgo}</span>
        </div>
      </div>
    </motion.div>
  );
}
