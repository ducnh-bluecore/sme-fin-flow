import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Settings, Bell, Plus, Search, Filter, Trash2, Edit2,
  Mail, MessageSquare, Phone, AlertTriangle, AlertCircle, Info,
  Package, TrendingUp, Store, Wallet, Target, Users, Truck,
  ToggleLeft, ToggleRight, Save, Loader2, User, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { 
  useExtendedAlertConfigs, 
  useBulkUpdateAlertConfigs, 
  useInitializeDefaultAlerts,
  defaultExtendedAlerts,
  categoryLabels, 
  severityLabels, 
  recipientRoleLabels,
  AlertCategory,
  AlertSeverity,
  ExtendedAlertConfigInput
} from '@/hooks/useExtendedAlertConfigs';
import { 
  useNotificationRecipients, 
  useSaveNotificationRecipient, 
  useDeleteNotificationRecipient,
  NotificationRecipientInput
} from '@/hooks/useNotificationRecipients';
import { recipientRoles } from '@/types/alerts';

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

export default function KPINotificationRulesPage() {
  const [activeTab, setActiveTab] = useState('rules');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingRecipient, setEditingRecipient] = useState<NotificationRecipientInput & { id?: string } | null>(null);
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['kpi', 'cashflow']);

  // Data hooks
  const { data: alertConfigs, isLoading: configsLoading } = useExtendedAlertConfigs();
  const bulkUpdate = useBulkUpdateAlertConfigs();
  const initDefaults = useInitializeDefaultAlerts();
  
  const { data: recipients, isLoading: recipientsLoading } = useNotificationRecipients();
  const saveRecipient = useSaveNotificationRecipient();
  const deleteRecipient = useDeleteNotificationRecipient();

  const [localConfigs, setLocalConfigs] = useState<ExtendedAlertConfigInput[]>([]);

  // Initialize local configs from server data
  useState(() => {
    if (alertConfigs && alertConfigs.length > 0) {
      setLocalConfigs(alertConfigs.map(c => ({
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
    }
  });

  // Use server data directly if no local changes
  const configs = localConfigs.length > 0 ? localConfigs : (alertConfigs?.map(c => ({
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
  })) || defaultExtendedAlerts);

  // Filter configs
  const filteredConfigs = configs.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === 'all' || c.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  // Group by category
  const groupedConfigs = filteredConfigs.reduce((acc, config) => {
    if (!acc[config.category]) acc[config.category] = [];
    acc[config.category].push(config);
    return acc;
  }, {} as Record<AlertCategory, ExtendedAlertConfigInput[]>);

  const handleConfigChange = (category: AlertCategory, alertType: string, field: string, value: any) => {
    setLocalConfigs(prev => {
      const existing = prev.length > 0 ? prev : configs;
      return existing.map(c => 
        c.category === category && c.alert_type === alertType ? { ...c, [field]: value } : c
      );
    });
  };

  const handleSaveConfigs = async () => {
    try {
      await bulkUpdate.mutateAsync(localConfigs.length > 0 ? localConfigs : configs);
      toast.success('Đã lưu cấu hình thành công');
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleInitDefaults = async () => {
    try {
      await initDefaults.mutateAsync();
      toast.success('Đã khởi tạo cấu hình mặc định');
    } catch (error) {
      // Error handled in hook
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const formatThreshold = (config: ExtendedAlertConfigInput) => {
    if (!config.threshold_value) return '-';
    if (config.threshold_unit === 'amount') {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(config.threshold_value);
    }
    if (config.threshold_unit === 'percentage') return `${config.threshold_value}%`;
    if (config.threshold_unit === 'days') return `${config.threshold_value} ngày`;
    if (config.threshold_unit === 'hours') return `${config.threshold_value} giờ`;
    if (config.threshold_unit === 'count') return `${config.threshold_value}`;
    return String(config.threshold_value);
  };

  const handleSaveRecipient = async () => {
    if (!editingRecipient?.name || !editingRecipient?.role) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    try {
      await saveRecipient.mutateAsync(editingRecipient);
      setRecipientDialogOpen(false);
      setEditingRecipient(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa người nhận này?')) {
      await deleteRecipient.mutateAsync(id);
    }
  };

  const openNewRecipient = () => {
    setEditingRecipient({ name: '', email: '', phone: '', slack_user_id: '', role: 'general', is_active: true });
    setRecipientDialogOpen(true);
  };

  const enabledCount = configs.filter(c => c.enabled).length;
  const criticalCount = configs.filter(c => c.enabled && c.severity === 'critical').length;
  const warningCount = configs.filter(c => c.enabled && c.severity === 'warning').length;

  return (
    <>
      <Helmet>
        <title>Quản lý Rules KPI & Thông báo | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              Quản lý Rules KPI & Thông báo
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Cấu hình tập trung các quy tắc để tính toán và gửi thông báo
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/30 text-primary">
              {enabledCount} rules đang bật
            </Badge>
            <Button onClick={handleSaveConfigs} disabled={bulkUpdate.isPending}>
              {bulkUpdate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Lưu thay đổi
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{configs.length}</p>
                  <p className="text-xs text-muted-foreground">Tổng số rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <ToggleRight className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{enabledCount}</p>
                  <p className="text-xs text-muted-foreground">Đang hoạt động</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{criticalCount}</p>
                  <p className="text-xs text-muted-foreground">Rules nguy cấp</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{warningCount}</p>
                  <p className="text-xs text-muted-foreground">Rules cảnh báo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="rules" className="gap-2">
              <Target className="h-4 w-4" />
              Rules KPI ({configs.length})
            </TabsTrigger>
            <TabsTrigger value="recipients" className="gap-2">
              <Users className="h-4 w-4" />
              Người nhận ({recipients?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="mt-4 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm rule..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Lọc theo danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả danh mục</SelectItem>
                      {(Object.keys(categoryLabels) as AlertCategory[]).map(cat => (
                        <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {configs.length === 0 && (
                    <Button onClick={handleInitDefaults} disabled={initDefaults.isPending}>
                      {initDefaults.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <Plus className="h-4 w-4 mr-2" />
                      Khởi tạo mặc định
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rules List */}
            {configsLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Đang tải...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {(Object.keys(groupedConfigs) as AlertCategory[]).map(category => {
                  const Icon = categoryIcons[category];
                  const categoryConfigs = groupedConfigs[category];
                  const isExpanded = expandedCategories.includes(category);
                  const enabledInCategory = categoryConfigs.filter(c => c.enabled).length;

                  return (
                    <Card key={category}>
                      <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <CardTitle className="text-base">{categoryLabels[category]}</CardTitle>
                                  <CardDescription>
                                    {enabledInCategory}/{categoryConfigs.length} rules đang bật
                                  </CardDescription>
                                </div>
                              </div>
                              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              {categoryConfigs.map(config => {
                                const SeverityIcon = severityIcons[config.severity];
                                const sevConfig = severityLabels[config.severity];
                                
                                return (
                                  <motion.div
                                    key={config.alert_type}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-4 rounded-lg border transition-all ${
                                      config.enabled ? 'bg-card border-border' : 'bg-muted/30 border-muted'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex items-start gap-3 flex-1">
                                        <div className={`w-8 h-8 rounded-lg ${sevConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                                          <SeverityIcon className={`w-4 h-4 ${sevConfig.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className={`font-medium ${!config.enabled && 'text-muted-foreground'}`}>
                                              {config.title}
                                            </h4>
                                            <Badge variant="outline" className={`text-xs ${sevConfig.color}`}>
                                              {sevConfig.label}
                                            </Badge>
                                            {config.threshold_value && (
                                              <Badge variant="secondary" className="text-xs">
                                                {formatThreshold(config)}
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                                          
                                          {config.enabled && (
                                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                              <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {recipientRoleLabels[config.recipient_role]}
                                              </span>
                                              {config.notify_email && (
                                                <span className="flex items-center gap-1">
                                                  <Mail className="w-3 h-3" /> Email
                                                </span>
                                              )}
                                              {config.notify_slack && (
                                                <span className="flex items-center gap-1">
                                                  <MessageSquare className="w-3 h-3" /> Slack
                                                </span>
                                              )}
                                              {config.notify_push && (
                                                <span className="flex items-center gap-1">
                                                  <Bell className="w-3 h-3" /> Push
                                                </span>
                                              )}
                                              {config.notify_sms && (
                                                <span className="flex items-center gap-1">
                                                  <Phone className="w-3 h-3" /> SMS
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <Switch
                                        checked={config.enabled}
                                        onCheckedChange={(v) => handleConfigChange(category, config.alert_type, 'enabled', v)}
                                      />
                                    </div>

                                    {config.enabled && (
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
                                        <div className="space-y-2">
                                          <Label className="text-xs">Mức độ</Label>
                                          <Select 
                                            value={config.severity} 
                                            onValueChange={(v) => handleConfigChange(category, config.alert_type, 'severity', v)}
                                          >
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
                                          <Select 
                                            value={config.recipient_role} 
                                            onValueChange={(v) => handleConfigChange(category, config.alert_type, 'recipient_role', v)}
                                          >
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
                                              onValueChange={([v]) => handleConfigChange(category, config.alert_type, 'threshold_value', v)}
                                              max={config.threshold_unit === 'amount' ? 500000000 : config.threshold_unit === 'percentage' ? 100 : 90}
                                              min={config.threshold_unit === 'amount' ? 1000000 : 1}
                                              step={config.threshold_unit === 'amount' ? 10000000 : 1}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Recipients Tab */}
          <TabsContent value="recipients" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Danh sách người nhận thông báo</CardTitle>
                    <CardDescription>Quản lý người nhận thông báo theo vai trò</CardDescription>
                  </div>
                  <Button onClick={openNewRecipient}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm người nhận
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recipientsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : recipients && recipients.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Điện thoại</TableHead>
                        <TableHead>Vai trò</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.map((recipient) => (
                        <TableRow key={recipient.id}>
                          <TableCell className="font-medium">{recipient.name}</TableCell>
                          <TableCell>{recipient.email || '-'}</TableCell>
                          <TableCell>{recipient.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {recipientRoles.find(r => r.value === recipient.role)?.label || recipient.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {recipient.is_active ? (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Hoạt động</Badge>
                            ) : (
                              <Badge variant="secondary">Tạm dừng</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingRecipient({
                                    id: recipient.id,
                                    name: recipient.name,
                                    email: recipient.email,
                                    phone: recipient.phone,
                                    slack_user_id: recipient.slack_user_id,
                                    role: recipient.role,
                                    is_active: recipient.is_active
                                  });
                                  setRecipientDialogOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteRecipient(recipient.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Chưa có người nhận nào</p>
                    <Button onClick={openNewRecipient}>
                      <Plus className="h-4 w-4 mr-2" />
                      Thêm người nhận đầu tiên
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Recipient Dialog */}
      <Dialog open={recipientDialogOpen} onOpenChange={setRecipientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecipient?.id ? 'Sửa người nhận' : 'Thêm người nhận mới'}</DialogTitle>
            <DialogDescription>Cấu hình thông tin người nhận thông báo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên *</Label>
              <Input
                value={editingRecipient?.name || ''}
                onChange={(e) => setEditingRecipient(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editingRecipient?.email || ''}
                onChange={(e) => setEditingRecipient(prev => prev ? { ...prev, email: e.target.value } : null)}
                placeholder="email@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Số điện thoại</Label>
              <Input
                value={editingRecipient?.phone || ''}
                onChange={(e) => setEditingRecipient(prev => prev ? { ...prev, phone: e.target.value } : null)}
                placeholder="0901234567"
              />
            </div>
            <div className="space-y-2">
              <Label>Slack User ID</Label>
              <Input
                value={editingRecipient?.slack_user_id || ''}
                onChange={(e) => setEditingRecipient(prev => prev ? { ...prev, slack_user_id: e.target.value } : null)}
                placeholder="U1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Vai trò *</Label>
              <Select 
                value={editingRecipient?.role || 'general'} 
                onValueChange={(v) => setEditingRecipient(prev => prev ? { ...prev, role: v } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recipientRoles.map(role => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Trạng thái hoạt động</Label>
              <Switch
                checked={editingRecipient?.is_active ?? true}
                onCheckedChange={(v) => setEditingRecipient(prev => prev ? { ...prev, is_active: v } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecipientDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveRecipient} disabled={saveRecipient.isPending}>
              {saveRecipient.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
