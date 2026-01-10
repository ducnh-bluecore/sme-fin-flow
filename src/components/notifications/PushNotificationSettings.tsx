import { Bell, BellOff, Smartphone, Monitor, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePushNotificationSupport,
  usePushSubscriptions,
  useSubscribePush,
  useUnsubscribePush,
  type PushSubscription as DbPushSubscription,
} from '@/hooks/usePushNotifications';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export function PushNotificationSettings() {
  const { isSupported, permission } = usePushNotificationSupport();
  const { data: subscriptions = [], isLoading } = usePushSubscriptions();
  const subscribePush = useSubscribePush();
  const unsubscribePush = useUnsubscribePush();

  const hasActiveSubscription = (subscriptions as DbPushSubscription[]).length > 0;

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribePush.mutateAsync();
    } else {
      await unsubscribePush.mutateAsync(undefined);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Thông báo đẩy
          </CardTitle>
          <CardDescription>
            Trình duyệt của bạn không hỗ trợ thông báo đẩy
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (permission === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-destructive" />
            Thông báo đẩy bị chặn
          </CardTitle>
          <CardDescription>
            Bạn đã chặn thông báo đẩy. Vui lòng bật lại trong cài đặt trình duyệt.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Thông báo đẩy
            </CardTitle>
            <CardDescription>
              Nhận thông báo ngay cả khi không mở ứng dụng
            </CardDescription>
          </div>
          <Switch
            checked={hasActiveSubscription}
            onCheckedChange={handleToggle}
            disabled={subscribePush.isPending || unsubscribePush.isPending}
          />
        </div>
      </CardHeader>

      {hasActiveSubscription && (
        <CardContent>
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Thiết bị đã đăng ký</h4>
            
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {subscriptions.map((sub) => {
                  const deviceInfo = sub.device_info as Record<string, string> | null;
                  const isMobile = deviceInfo?.platform?.toLowerCase().includes('mobile') ||
                    deviceInfo?.userAgent?.toLowerCase().includes('mobile');

                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        {isMobile ? (
                          <Smartphone className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Monitor className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {isMobile ? 'Điện thoại' : 'Máy tính'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Đăng ký {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true, locale: vi })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={sub.is_active ? 'default' : 'secondary'}>
                          {sub.is_active ? 'Hoạt động' : 'Tắt'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => unsubscribePush.mutate(sub.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
