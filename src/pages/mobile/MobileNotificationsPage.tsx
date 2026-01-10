import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Check,
  CheckCheck,
  Clock,
  Loader2,
  Filter,
  AlertTriangle,
  Info,
  CheckCircle,
  Package,
  DollarSign,
  Users,
  Store
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotificationCenter, AlertInstance, categoryLabels } from '@/hooks/useNotificationCenter';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { cn } from '@/lib/utils';

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  critical: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const categoryIcons: Record<string, React.ElementType> = {
  inventory: Package,
  finance: DollarSign,
  hr: Users,
  store: Store,
  operations: Store,
};

interface NotificationItemProps {
  notification: AlertInstance;
  onMarkRead: (id: string) => void;
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const config = typeConfig[notification.severity] || typeConfig.info;
  const Icon = categoryIcons[notification.category] || config.icon;
  const isRead = notification.status === 'resolved' || notification.status === 'acknowledged';

  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: vi });
    } catch {
      return '';
    }
  }, [notification.created_at]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => !isRead && onMarkRead(notification.id)}
      className={cn(
        'relative p-4 rounded-xl border transition-all',
        isRead
          ? 'bg-slate-900/30 border-slate-800/50'
          : `${config.bg} border-slate-700/50`
      )}
    >
      {!isRead && (
        <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-amber-400" />
      )}
      
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-xl', config.bg)}>
          <Icon className={cn('h-5 w-5', config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'text-sm font-medium',
            isRead ? 'text-slate-400' : 'text-slate-100'
          )}>
            {notification.title}
          </h3>
          {notification.message && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {notification.message}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </span>
            <Badge className="text-[10px] bg-slate-700/50 text-slate-400 border-slate-600/30">
              {categoryLabels[notification.category as keyof typeof categoryLabels] || notification.category}
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function MobileNotificationsPage() {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  
  const { 
    instances, 
    stats, 
    isLoading,
    acknowledgeAlert,
    bulkUpdateAlerts,
    refetchInstances 
  } = useNotificationCenter();

  const handleMarkRead = async (id: string) => {
    await acknowledgeAlert.mutateAsync(id);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = instances.filter(i => i.status === 'active').map(i => i.id);
    if (unreadIds.length > 0) {
      await bulkUpdateAlerts.mutateAsync({
        ids: unreadIds,
        updates: {
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        }
      });
    }
  };

  const handleRefresh = async () => {
    await refetchInstances();
  };

  const filteredNotifications = useMemo(() => {
    if (showUnreadOnly) {
      return instances.filter(i => i.status === 'active');
    }
    return instances;
  }, [instances, showUnreadOnly]);

  const unreadCount = stats.active || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Thông báo | Mobile App</title>
      </Helmet>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 space-y-4">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {unreadCount} chưa đọc
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors',
                  showUnreadOnly
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50'
                )}
              >
                <Filter className="h-3 w-3" />
                Chưa đọc
              </motion.button>
              {unreadCount > 0 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleMarkAllRead}
                  disabled={bulkUpdateAlerts.isPending}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-400 border border-slate-700/50 text-xs font-medium flex items-center gap-1.5"
                >
                  <CheckCheck className="h-3 w-3" />
                  Đọc tất cả
                </motion.button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            <AnimatePresence>
              {filteredNotifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  {showUnreadOnly ? (
                    <>
                      <Check className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">Tất cả đã được đọc</p>
                    </>
                  ) : (
                    <>
                      <Bell className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">Không có thông báo</p>
                    </>
                  )}
                </motion.div>
              ) : (
                filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </PullToRefresh>
    </>
  );
}
