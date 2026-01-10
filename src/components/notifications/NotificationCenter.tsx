import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, ExternalLink, AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useClearAllNotifications,
  useRealtimeNotifications,
  Notification,
} from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const typeConfig = {
  info: {
    icon: Info,
    className: 'text-blue-500 bg-blue-500/10',
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-amber-500 bg-amber-500/10',
  },
  error: {
    icon: AlertCircle,
    className: 'text-red-500 bg-red-500/10',
  },
  success: {
    icon: CheckCircle,
    className: 'text-green-500 bg-green-500/10',
  },
};

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkRead, onDelete }: NotificationItemProps) {
  const config = typeConfig[notification.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        'p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <div className="flex gap-3">
        <div className={cn('p-2 rounded-full shrink-0', config.className)}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn('text-sm font-medium truncate', !notification.is_read && 'font-semibold')}>
              {notification.title}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onMarkRead(notification.id)}
                  title="Đánh dấu đã đọc"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(notification.id)}
                title="Xóa"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {notification.message && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {notification.message}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: vi })}
            </span>
            
            {notification.action_url && (
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                <a href={notification.action_url}>
                  Xem chi tiết <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const clearAll = useClearAllNotifications();

  // Enable realtime updates
  useRealtimeNotifications();

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteNotification.mutate(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Thông báo</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Đọc tất cả
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-muted-foreground hover:text-destructive"
                onClick={() => clearAll.mutate()}
                disabled={clearAll.isPending}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Xóa tất cả
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Đang tải...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Không có thông báo</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
