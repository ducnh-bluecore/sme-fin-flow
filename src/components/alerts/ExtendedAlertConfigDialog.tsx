import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useExtendedAlertConfigs, useBulkUpdateAlertConfigs, useInitializeDefaultAlerts, defaultExtendedAlerts, categoryLabels, severityLabels, recipientRoleLabels, AlertCategory, AlertSeverity, ExtendedAlertConfigInput } from '@/hooks/useExtendedAlertConfigs';
import { Package, TrendingUp, Store, Wallet, Target, Users, Truck, Settings, Loader2, Mail, MessageSquare, Bell, Phone, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ExtendedAlertConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryIcons: Record<AlertCategory, typeof Package> = {
  product: Package,
  business: TrendingUp,
  store: Store,
  cashflow: Wallet,
  kpi: Target,
  customer: Users,
  fulfillment: Truck,
  operations: Settings,
};

const severityIcons: Record<AlertSeverity, typeof AlertTriangle> = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

export function ExtendedAlertConfigDialog({ open, onOpenChange }: ExtendedAlertConfigDialogProps) {
  const { data: savedConfigs, isLoading } = useExtendedAlertConfigs();
  const bulkUpdate = useBulkUpdateAlertConfigs();
  const initDefaults = useInitializeDefaultAlerts();
  
  const [configs, setConfigs] = useState<ExtendedAlertConfigInput[]>([]);
  const [activeCategory, setActiveCategory] = useState<AlertCategory>('product');

  useEffect(() => {
    if (savedConfigs && savedConfigs.length > 0) {
      setConfigs(savedConfigs.map(c => ({
        category: c.category as AlertCategory,
        alert_type: c.alert_type,
        severity: c.severity as AlertSeverity,
        enabled: c.enabled,
        threshold_value: c.threshold_value,
        threshold_unit: c.threshold_unit,
        threshold_operator: c.threshold_operator,
        title: c.title,
        description: c.description,
        recipient_role: c.recipient_role,
        notify_email: c.notify_email,
        notify_slack: c.notify_slack,
        notify_push: c.notify_push,
        notify_sms: c.notify_sms,
        notify_immediately: c.notify_immediately,
        notify_in_daily_digest: c.notify_in_daily_digest,
      })));
    } else if (!isLoading && (!savedConfigs || savedConfigs.length === 0)) {
      setConfigs(defaultExtendedAlerts);
    }
  }, [savedConfigs, isLoading]);

  const handleConfigChange = (category: AlertCategory, alertType: string, field: string, value: any) => {
    setConfigs(prev => prev.map(c => 
      c.category === category && c.alert_type === alertType ? { ...c, [field]: value } : c
    ));
  };

  const handleSave = async () => {
    await bulkUpdate.mutateAsync(configs);
    onOpenChange(false);
  };

  const handleInitDefaults = async () => {
    await initDefaults.mutateAsync();
  };

  const categorizedConfigs = configs.reduce((acc, config) => {
    if (!acc[config.category]) acc[config.category] = [];
    acc[config.category].push(config);
    return acc;
  }, {} as Record<AlertCategory, ExtendedAlertConfigInput[]>);

  const formatThreshold = (config: ExtendedAlertConfigInput) => {
    if (!config.threshold_value) return '';
    if (config.threshold_unit === 'amount') {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(config.threshold_value);
    }
    if (config.threshold_unit === 'percentage') return `${config.threshold_value}%`;
    if (config.threshold_unit === 'days') return `${config.threshold_value} ngày`;
    if (config.threshold_unit === 'hours') return `${config.threshold_value} giờ`;
    if (config.threshold_unit === 'count') return `${config.threshold_value}`;
    return String(config.threshold_value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Cấu hình cảnh báo mở rộng</DialogTitle>
          <DialogDescription>
            Thiết lập các loại cảnh báo theo danh mục và người nhận
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : configs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Chưa có cấu hình cảnh báo</p>
            <Button onClick={handleInitDefaults} disabled={initDefaults.isPending}>
              {initDefaults.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Khởi tạo cấu hình mặc định
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as AlertCategory)} className="h-full flex flex-col">
              <TabsList className="grid grid-cols-4 lg:grid-cols-8 mb-4">
                {(Object.keys(categoryLabels) as AlertCategory[]).map((cat) => {
                  const Icon = categoryIcons[cat];
                  return (
                    <TabsTrigger key={cat} value={cat} className="text-xs gap-1">
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{categoryLabels[cat]}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <ScrollArea className="flex-1 pr-4">
                {(Object.keys(categoryLabels) as AlertCategory[]).map((cat) => (
                  <TabsContent key={cat} value={cat} className="mt-0 space-y-3">
                    {(categorizedConfigs[cat] || []).map((config) => {
                      const SeverityIcon = severityIcons[config.severity];
                      const sevConfig = severityLabels[config.severity];
                      
                      return (
                        <div key={config.alert_type} className="p-4 rounded-xl border border-border bg-card">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`w-8 h-8 rounded-lg ${sevConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                                <SeverityIcon className={`w-4 h-4 ${sevConfig.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium">{config.title}</h4>
                                  <Badge variant="outline" className={sevConfig.color}>{sevConfig.label}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{config.description}</p>
                              </div>
                            </div>
                            <Switch
                              checked={config.enabled}
                              onCheckedChange={(v) => handleConfigChange(cat, config.alert_type, 'enabled', v)}
                            />
                          </div>

                          {config.enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/50">
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label className="text-xs">Mức độ</Label>
                                  <Select value={config.severity} onValueChange={(v) => handleConfigChange(cat, config.alert_type, 'severity', v)}>
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="critical">🔴 Nguy cấp</SelectItem>
                                      <SelectItem value="warning">🟡 Cảnh báo</SelectItem>
                                      <SelectItem value="info">🔵 Thông thường</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs">Người nhận</Label>
                                  <Select value={config.recipient_role} onValueChange={(v) => handleConfigChange(cat, config.alert_type, 'recipient_role', v)}>
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(recipientRoleLabels).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {config.threshold_value !== null && (
                                  <div className="space-y-2">
                                    <Label className="text-xs">Ngưỡng: {formatThreshold(config)}</Label>
                                    <Slider
                                      value={[config.threshold_value || 0]}
                                      onValueChange={([v]) => handleConfigChange(cat, config.alert_type, 'threshold_value', v)}
                                      max={config.threshold_unit === 'amount' ? 500000000 : config.threshold_unit === 'percentage' ? 100 : 90}
                                      min={config.threshold_unit === 'amount' ? 1000000 : 1}
                                      step={config.threshold_unit === 'amount' ? 10000000 : 1}
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3">
                                <Label className="text-xs">Kênh thông báo</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex items-center gap-2">
                                    <Switch checked={config.notify_email} onCheckedChange={(v) => handleConfigChange(cat, config.alert_type, 'notify_email', v)} className="scale-75" />
                                    <Mail className="w-3 h-3" /><span className="text-xs">Email</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch checked={config.notify_slack} onCheckedChange={(v) => handleConfigChange(cat, config.alert_type, 'notify_slack', v)} className="scale-75" />
                                    <MessageSquare className="w-3 h-3" /><span className="text-xs">Slack</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch checked={config.notify_push} onCheckedChange={(v) => handleConfigChange(cat, config.alert_type, 'notify_push', v)} className="scale-75" />
                                    <Bell className="w-3 h-3" /><span className="text-xs">Push</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch checked={config.notify_sms} onCheckedChange={(v) => handleConfigChange(cat, config.alert_type, 'notify_sms', v)} className="scale-75" />
                                    <Phone className="w-3 h-3" /><span className="text-xs">SMS</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 pt-2">
                                  <div className="flex items-center gap-2">
                                    <Switch checked={config.notify_immediately} onCheckedChange={(v) => handleConfigChange(cat, config.alert_type, 'notify_immediately', v)} className="scale-75" />
                                    <span className="text-xs">Gửi ngay</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch checked={config.notify_in_daily_digest} onCheckedChange={(v) => handleConfigChange(cat, config.alert_type, 'notify_in_daily_digest', v)} className="scale-75" />
                                    <span className="text-xs">Tổng hợp hàng ngày</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </TabsContent>
                ))}
              </ScrollArea>
            </Tabs>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSave} disabled={bulkUpdate.isPending || isLoading}>
            {bulkUpdate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Lưu cấu hình
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
