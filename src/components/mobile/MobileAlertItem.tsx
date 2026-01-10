import { motion } from 'framer-motion';
import { AlertTriangle, Bell, TrendingDown, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface MobileAlertItemProps {
  id: string;
  title: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
  createdAt: string;
  isRead?: boolean;
  onClick?: () => void;
}

export function MobileAlertItem({
  title,
  message,
  severity,
  category,
  createdAt,
  isRead = false,
  onClick,
}: MobileAlertItemProps) {
  const severityConfig = {
    high: {
      icon: AlertTriangle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      badge: 'bg-destructive text-destructive-foreground',
      label: 'Cao',
    },
    medium: {
      icon: TrendingDown,
      color: 'text-warning',
      bg: 'bg-warning/10',
      badge: 'bg-warning text-warning-foreground',
      label: 'Trung bình',
    },
    low: {
      icon: Bell,
      color: 'text-info',
      bg: 'bg-info/10',
      badge: 'bg-info text-info-foreground',
      label: 'Thấp',
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
        'bg-card rounded-xl border border-border p-4 cursor-pointer',
        'flex items-start gap-3 transition-colors',
        !isRead && 'border-l-4 border-l-primary'
      )}
    >
      {/* Icon */}
      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0', config.bg)}>
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge className={cn('text-[10px] px-1.5 py-0', config.badge)}>
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{category}</span>
        </div>
        <h4 className={cn('text-sm font-medium truncate', !isRead && 'font-semibold')}>
          {title}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{message}</p>
        <div className="flex items-center gap-1 mt-2 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="text-xs">{timeAgo}</span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
    </motion.div>
  );
}
