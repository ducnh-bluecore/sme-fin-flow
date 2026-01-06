import { motion } from 'framer-motion';
import { AlertTriangle, DollarSign, TrendingDown, Clock, Database, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAlerts, Alert } from '@/hooks/useDashboardData';
import { formatDate } from '@/lib/formatters';

const iconMap: Record<string, typeof DollarSign> = {
  cash_critical: DollarSign,
  ar_overdue: TrendingDown,
  data_quality: Database,
  reconciliation: Clock,
  risk: AlertTriangle,
};

const severityConfig: Record<string, { badge: string; bgClass: string; iconClass: string }> = {
  high: {
    badge: 'Cao',
    bgClass: 'bg-destructive/10 border-destructive/20',
    iconClass: 'text-destructive',
  },
  medium: {
    badge: 'Trung bình',
    bgClass: 'bg-warning/10 border-warning/20',
    iconClass: 'text-warning',
  },
  low: {
    badge: 'Thấp',
    bgClass: 'bg-info/10 border-info/20',
    iconClass: 'text-info',
  },
};

interface AlertItemProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

function AlertItem({ alert, onAcknowledge, onDismiss }: AlertItemProps) {
  const Icon = iconMap[alert.alert_type] || AlertTriangle;
  const config = severityConfig[alert.severity || 'low'];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'p-4 rounded-xl border transition-all',
        config.bgClass,
        alert.is_read && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', config.bgClass)}>
          <Icon className={cn('w-5 h-5', config.iconClass)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant={alert.severity === 'high' ? 'destructive' : 'secondary'}
              className="text-[10px] px-1.5"
            >
              {config.badge}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(alert.created_at)}
            </span>
          </div>
          
          <h4 className="font-semibold text-foreground text-sm mb-1">{alert.title}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2">{alert.message}</p>
        </div>
        
        <div className="flex items-center gap-1">
          {!alert.is_read && onAcknowledge && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-success hover:bg-success/10"
              onClick={() => onAcknowledge(alert.id)}
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDismiss(alert.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function AlertsPanel() {
  const { data: alerts, isLoading } = useAlerts();

  if (isLoading) {
    return (
      <div className="data-card">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const unacknowledged = alerts?.filter((a) => !a.is_read) || [];
  const acknowledged = alerts?.filter((a) => a.is_read) || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="data-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            Cảnh báo
            {unacknowledged.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                {unacknowledged.length}
              </span>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">Alerts & Notifications</p>
        </div>
        <Button variant="outline" size="sm">
          Xem tất cả
        </Button>
      </div>

      <ScrollArea className="h-80">
        <div className="space-y-3">
          {unacknowledged.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
          
          {acknowledged.length > 0 && (
            <>
              <div className="flex items-center gap-2 py-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">Đã xác nhận</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {acknowledged.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
