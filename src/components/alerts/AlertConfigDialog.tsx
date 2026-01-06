import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAlertSettings,
  useSaveAlertSettings,
  defaultAlertConfigs,
  defaultSettings,
  AlertConfigs,
  AlertSettingsInput,
} from '@/hooks/useAlertSettings';
import {
  DollarSign,
  TrendingDown,
  Database,
  Clock,
  AlertTriangle,
  Mail,
  MessageSquare,
  Bell,
  Loader2,
} from 'lucide-react';

interface AlertConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const alertTypes = [
  { key: 'cash_critical', label: 'Tiền mặt nguy cấp', icon: DollarSign, description: 'Cảnh báo khi số dư tiền mặt thấp hơn ngưỡng' },
  { key: 'ar_overdue', label: 'AR quá hạn', icon: TrendingDown, description: 'Cảnh báo khi có hóa đơn quá hạn thanh toán' },
  { key: 'data_quality', label: 'Chất lượng dữ liệu', icon: Database, description: 'Cảnh báo khi phát hiện dữ liệu bất thường' },
  { key: 'reconciliation', label: 'Đối soát', icon: Clock, description: 'Cảnh báo khi có giao dịch chưa đối soát' },
  { key: 'risk', label: 'Rủi ro', icon: AlertTriangle, description: 'Cảnh báo rủi ro tài chính' },
] as const;

type AlertTypeKey = keyof AlertConfigs;

export function AlertConfigDialog({ open, onOpenChange }: AlertConfigDialogProps) {
  const { data: savedSettings, isLoading } = useAlertSettings();
  const saveSettings = useSaveAlertSettings();

  const [alertConfig, setAlertConfig] = useState<AlertConfigs>(defaultAlertConfigs);
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationSlack, setNotificationSlack] = useState(false);
  const [notificationPush, setNotificationPush] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [slackWebhook, setSlackWebhook] = useState('');
  const [notifyImmediately, setNotifyImmediately] = useState(true);
  const [notifyDailySummary, setNotifyDailySummary] = useState(false);
  const [notifyWeeklySummary, setNotifyWeeklySummary] = useState(false);

  // Load saved settings when dialog opens
  useEffect(() => {
    if (savedSettings) {
      setAlertConfig(savedSettings.alert_configs);
      setNotificationEmail(savedSettings.notification_email);
      setNotificationSlack(savedSettings.notification_slack);
      setNotificationPush(savedSettings.notification_push);
      setEmailAddress(savedSettings.email_address || '');
      setSlackWebhook(savedSettings.slack_webhook || '');
      setNotifyImmediately(savedSettings.notify_immediately);
      setNotifyDailySummary(savedSettings.notify_daily_summary);
      setNotifyWeeklySummary(savedSettings.notify_weekly_summary);
    } else if (!isLoading) {
      // Reset to defaults if no saved settings
      setAlertConfig(defaultAlertConfigs);
      setNotificationEmail(defaultSettings.notification_email);
      setNotificationSlack(defaultSettings.notification_slack);
      setNotificationPush(defaultSettings.notification_push);
      setEmailAddress('');
      setSlackWebhook('');
      setNotifyImmediately(defaultSettings.notify_immediately);
      setNotifyDailySummary(defaultSettings.notify_daily_summary);
      setNotifyWeeklySummary(defaultSettings.notify_weekly_summary);
    }
  }, [savedSettings, isLoading, open]);

  const handleAlertToggle = (key: AlertTypeKey, enabled: boolean) => {
    setAlertConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled }
    }));
  };

  const handleThresholdChange = (key: AlertTypeKey, threshold: number) => {
    setAlertConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], threshold }
    }));
  };

  const handleSeverityChange = (key: AlertTypeKey, severity: 'high' | 'medium' | 'low') => {
    setAlertConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], severity }
    }));
  };

  const handleSave = async () => {
    const settingsToSave: AlertSettingsInput = {
      alert_configs: alertConfig,
      notification_email: notificationEmail,
      notification_slack: notificationSlack,
      notification_push: notificationPush,
      email_address: emailAddress || undefined,
      slack_webhook: slackWebhook || undefined,
      notify_immediately: notifyImmediately,
      notify_daily_summary: notifyDailySummary,
      notify_weekly_summary: notifyWeeklySummary,
    };

    await saveSettings.mutateAsync(settingsToSave);
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cấu hình cảnh báo</DialogTitle>
          <DialogDescription>
            Thiết lập ngưỡng cảnh báo và kênh thông báo cho hệ thống
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="alerts" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="alerts">Loại cảnh báo</TabsTrigger>
              <TabsTrigger value="notifications">Kênh thông báo</TabsTrigger>
            </TabsList>

            <TabsContent value="alerts" className="space-y-4 mt-4">
              {alertTypes.map((type) => {
                const Icon = type.icon;
                const config = alertConfig[type.key];
                
                return (
                  <div
                    key={type.key}
                    className="p-4 rounded-xl border border-border bg-card"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{type.label}</h4>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) => handleAlertToggle(type.key, checked)}
                      />
                    </div>

                    {config.enabled && (
                      <div className="pl-13 space-y-4 pt-3 border-t border-border/50">
                        {/* Threshold setting for specific alert types */}
                        {type.key === 'cash_critical' && (
                          <div className="space-y-2">
                            <Label className="text-sm">Ngưỡng số dư tối thiểu</Label>
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[config.threshold || 100000000]}
                                onValueChange={([value]) => handleThresholdChange(type.key, value)}
                                max={1000000000}
                                min={10000000}
                                step={10000000}
                                className="flex-1"
                              />
                              <span className="text-sm font-medium w-32 text-right">
                                {formatCurrency(config.threshold || 100000000)}
                              </span>
                            </div>
                          </div>
                        )}

                        {type.key === 'ar_overdue' && (
                          <div className="space-y-2">
                            <Label className="text-sm">Số ngày quá hạn</Label>
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[config.threshold || 30]}
                                onValueChange={([value]) => handleThresholdChange(type.key, value)}
                                max={90}
                                min={1}
                                step={1}
                                className="flex-1"
                              />
                              <span className="text-sm font-medium w-20 text-right">
                                {config.threshold || 30} ngày
                              </span>
                            </div>
                          </div>
                        )}

                        {type.key === 'reconciliation' && (
                          <div className="space-y-2">
                            <Label className="text-sm">Thời gian chờ đối soát (ngày)</Label>
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[config.threshold || 7]}
                                onValueChange={([value]) => handleThresholdChange(type.key, value)}
                                max={30}
                                min={1}
                                step={1}
                                className="flex-1"
                              />
                              <span className="text-sm font-medium w-20 text-right">
                                {config.threshold || 7} ngày
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Severity setting */}
                        <div className="space-y-2">
                          <Label className="text-sm">Mức độ nghiêm trọng</Label>
                          <div className="flex gap-2">
                            {(['high', 'medium', 'low'] as const).map((severity) => (
                              <button
                                key={severity}
                                onClick={() => handleSeverityChange(type.key, severity)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  config.severity === severity
                                    ? severity === 'high'
                                      ? 'bg-destructive text-destructive-foreground'
                                      : severity === 'medium'
                                      ? 'bg-warning text-warning-foreground'
                                      : 'bg-info text-info-foreground'
                                    : 'bg-muted hover:bg-muted/80'
                                }`}
                              >
                                {severity === 'high' ? 'Cao' : severity === 'medium' ? 'Trung bình' : 'Thấp'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4 mt-4">
              {/* Email Notifications */}
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Email</h4>
                      <p className="text-sm text-muted-foreground">Nhận thông báo qua email</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationEmail}
                    onCheckedChange={setNotificationEmail}
                  />
                </div>
                {notificationEmail && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Địa chỉ email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@company.com"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Slack Notifications */}
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Slack</h4>
                      <p className="text-sm text-muted-foreground">Nhận thông báo qua Slack</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSlack}
                    onCheckedChange={setNotificationSlack}
                  />
                </div>
                {notificationSlack && (
                  <div className="space-y-2">
                    <Label htmlFor="slack">Slack Webhook URL</Label>
                    <Input
                      id="slack"
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={slackWebhook}
                      onChange={(e) => setSlackWebhook(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Push Notifications */}
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Push Notification</h4>
                      <p className="text-sm text-muted-foreground">Nhận thông báo trên trình duyệt</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPush}
                    onCheckedChange={setNotificationPush}
                  />
                </div>
              </div>

              {/* Schedule Settings */}
              <div className="p-4 rounded-xl border border-border bg-card">
                <h4 className="font-medium mb-3">Lịch gửi thông báo</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Gửi ngay khi có cảnh báo</span>
                    <Switch 
                      checked={notifyImmediately}
                      onCheckedChange={setNotifyImmediately}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tóm tắt hàng ngày (8:00 AM)</span>
                    <Switch 
                      checked={notifyDailySummary}
                      onCheckedChange={setNotifyDailySummary}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tóm tắt hàng tuần (Thứ 2, 8:00 AM)</span>
                    <Switch 
                      checked={notifyWeeklySummary}
                      onCheckedChange={setNotifyWeeklySummary}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saveSettings.isPending || isLoading}>
            {saveSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Lưu cấu hình
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
