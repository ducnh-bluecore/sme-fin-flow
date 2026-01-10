import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Smartphone, Bell, BellOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useCapacitorPushNotifications } from '@/hooks/useCapacitorPushNotifications';

export function NativePushSettings() {
  const {
    isNative,
    isRegistered,
    token,
    permissionStatus,
    requestPermission,
    unregister,
  } = useCapacitorPushNotifications();

  // Only show on native platforms
  if (!isNative) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Thông báo đẩy di động
          </CardTitle>
          <CardDescription>
            Nhận thông báo trực tiếp trên điện thoại
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Tính năng này chỉ khả dụng khi sử dụng ứng dụng di động
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await requestPermission();
    } else {
      await unregister();
    }
  };

  const getStatusBadge = () => {
    switch (permissionStatus) {
      case 'granted':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Đã bật
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Bị từ chối
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Chưa cấu hình
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Thông báo đẩy di động
            </CardTitle>
            <CardDescription>
              Nhận thông báo trực tiếp trên điện thoại
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRegistered ? (
              <Bell className="h-4 w-4 text-primary" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="native-push-toggle">
              {isRegistered ? 'Thông báo đang bật' : 'Bật thông báo đẩy'}
            </Label>
          </div>
          <Switch
            id="native-push-toggle"
            checked={isRegistered && permissionStatus === 'granted'}
            onCheckedChange={handleToggle}
            disabled={permissionStatus === 'denied'}
          />
        </div>

        {permissionStatus === 'denied' && (
          <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
            <p>Quyền thông báo đã bị từ chối. Vui lòng vào Cài đặt hệ thống để bật lại.</p>
          </div>
        )}

        {isRegistered && token && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Device Token:</p>
            <code className="text-xs break-all">{token.substring(0, 50)}...</code>
          </div>
        )}

        {!isRegistered && permissionStatus !== 'denied' && (
          <Button onClick={requestPermission} className="w-full">
            <Bell className="h-4 w-4 mr-2" />
            Bật thông báo đẩy
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
