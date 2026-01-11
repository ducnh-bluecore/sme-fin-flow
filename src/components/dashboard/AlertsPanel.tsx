import { motion } from 'framer-motion';
import { AlertTriangle, DollarSign, TrendingDown, Clock, Database, X, Check, Package, Store, Users, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationCenter, AlertInstance, severityConfig as notificationSeverityConfig, categoryLabels } from '@/hooks/useNotificationCenter';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const categoryIcons: Record<string, typeof DollarSign> = {
  cash_critical: DollarSign,
  ar_overdue: TrendingDown,
  data_quality: Database,
  reconciliation: Clock,
  risk: AlertTriangle,
  product: Package,
  business: DollarSign,
  store: Store,
  cashflow: DollarSign,
  kpi: TrendingDown,
  customer: Users,
  fulfillment: Package,
  operations: Store,
  inventory: Package,
  sales: TrendingDown,
  finance: DollarSign,
  hr: Users,
};

const severityConfig: Record<string, { badge: string; bgClass: string; iconClass: string }> = {
  critical: {
    badge: 'Nguy cấp',
    bgClass: 'bg-destructive/10 border-destructive/20',
    iconClass: 'text-destructive',
  },
  warning: {
    badge: 'Cảnh báo',
    bgClass: 'bg-warning/10 border-warning/20',
    iconClass: 'text-warning',
  },
  info: {
    badge: 'Thông tin',
    bgClass: 'bg-info/10 border-info/20',
    iconClass: 'text-info',
  },
  // Legacy mapping
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
  alert: AlertInstance;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

function AlertItem({ alert, onAcknowledge, onResolve }: AlertItemProps) {
  const Icon = categoryIcons[alert.category] || categoryIcons[alert.alert_type] || AlertTriangle;
  const config = severityConfig[alert.severity] || severityConfig.info;
  
  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: vi });
    } catch {
      return alert.created_at;
    }
  })();

  const isActive = alert.status === 'active';
  const isAcknowledged = alert.status === 'acknowledged';
  const isResolved = alert.status === 'resolved';
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'p-4 rounded-xl border transition-all',
        config.bgClass,
        isResolved && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', config.bgClass)}>
          <Icon className={cn('w-5 h-5', config.iconClass)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge
              variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
              className="text-[10px] px-1.5"
            >
              {config.badge}
            </Badge>
            {alert.category && (
              <Badge variant="outline" className="text-[10px] px-1.5">
                {categoryLabels[alert.category as keyof typeof categoryLabels] || alert.category}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {timeAgo}
            </span>
          </div>
          
          <h4 className="font-semibold text-foreground text-sm mb-1">{alert.title}</h4>
          {alert.message && (
            <p className="text-sm text-muted-foreground line-clamp-2">{alert.message}</p>
          )}
          
          {/* Object info */}
          {alert.object_name && (
            <p className="text-xs text-muted-foreground mt-1">
              Đối tượng: {alert.object_name}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {isActive && onAcknowledge && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-warning hover:bg-warning/10"
              onClick={() => onAcknowledge(alert.id)}
              title="Xác nhận"
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          {(isActive || isAcknowledged) && onResolve && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-success hover:bg-success/10"
              onClick={() => onResolve(alert.id)}
              title="Đánh dấu đã xử lý"
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
  const navigate = useNavigate();
  const { 
    instances, 
    stats, 
    isLoading, 
    acknowledgeAlert,
    resolveAlert 
  } = useNotificationCenter();

  const handleAcknowledge = (id: string) => {
    acknowledgeAlert.mutate(id);
  };

  const handleResolve = (id: string) => {
    resolveAlert.mutate({ id });
  };

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

  const activeAlerts = instances.filter((a) => a.status === 'active');
  const acknowledgedAlerts = instances.filter((a) => a.status === 'acknowledged');
  const resolvedAlerts = instances.filter((a) => a.status === 'resolved');

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
            {stats.active > 0 && (
              <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                {stats.active}
              </span>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            {stats.unresolvedCritical > 0 && (
              <span className="text-destructive">{stats.unresolvedCritical} nghiêm trọng • </span>
            )}
            {stats.total} tổng cộng
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/control-tower/alerts')}>
          Xem tất cả
        </Button>
      </div>

      <ScrollArea className="h-80">
        <div className="space-y-3">
          {/* Active alerts */}
          {activeAlerts.map((alert) => (
            <AlertItem 
              key={alert.id} 
              alert={alert} 
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
            />
          ))}
          
          {/* Acknowledged alerts */}
          {acknowledgedAlerts.length > 0 && (
            <>
              <div className="flex items-center gap-2 py-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">Đã xác nhận ({acknowledgedAlerts.length})</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {acknowledgedAlerts.slice(0, 3).map((alert) => (
                <AlertItem 
                  key={alert.id} 
                  alert={alert}
                  onResolve={handleResolve}
                />
              ))}
            </>
          )}

          {/* Empty state */}
          {instances.length === 0 && (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Không có cảnh báo nào</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
