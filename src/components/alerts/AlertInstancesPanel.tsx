import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, AlertTriangle, CheckCircle, Clock, Filter,
  Search, Eye, Check, X, Clock, Loader2, MoreHorizontal,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  useAlertInstances, useAlertInstanceStats, useAcknowledgeAlert,
  useResolveAlert, useSnoozeAlert, useRealtimeAlerts,
  AlertInstanceStatus, AlertSeverity
} from '@/hooks/useAlertInstances';
import { alertCategoryLabels, alertSeverityConfig, alertStatusLabels } from '@/types/alerts';
import { formatDistanceToNow, format, addHours, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';

const severityIcons = {
  critical: <AlertTriangle className="w-4 h-4" />,
  warning: <Bell className="w-4 h-4" />,
  info: <MessageSquare className="w-4 h-4" />,
};

export function AlertInstancesPanel() {
  const [statusTab, setStatusTab] = useState<AlertInstanceStatus | 'all'>('active');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [snoozeId, setSnoozeId] = useState<string | null>(null);

  const { data: alerts, isLoading } = useAlertInstances({
    status: statusTab !== 'all' ? statusTab : undefined,
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  });
  const { data: stats } = useAlertInstanceStats();
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();
  const snoozeAlert = useSnoozeAlert();

  // Enable realtime updates
  useRealtimeAlerts();

  const handleResolve = async () => {
    if (!resolveId) return;
    await resolveAlert.mutateAsync({ id: resolveId, notes: resolveNotes });
    setResolveDialogOpen(false);
    setResolveId(null);
    setResolveNotes('');
  };

  const handleSnooze = async (hours: number) => {
    if (!snoozeId) return;
    const until = hours === 24 * 7 ? addDays(new Date(), 7) : addHours(new Date(), hours);
    await snoozeAlert.mutateAsync({ id: snoozeId, until });
    setSnoozeDialogOpen(false);
    setSnoozeId(null);
  };

  const openResolveDialog = (id: string) => {
    setResolveId(id);
    setResolveDialogOpen(true);
  };

  const openSnoozeDialog = (id: string) => {
    setSnoozeId(id);
    setSnoozeDialogOpen(true);
  };

  const filteredAlerts = alerts?.filter(alert => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        alert.title.toLowerCase().includes(searchLower) ||
        alert.message?.toLowerCase().includes(searchLower) ||
        alert.object_name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Cảnh báo
              </CardTitle>
              <CardDescription>
                Danh sách các cảnh báo được phát hiện từ hệ thống
              </CardDescription>
            </div>
            {stats && (
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                  <span className="text-sm font-medium">{stats.bySeverity.critical} nguy cấp</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm">{stats.bySeverity.warning} cảnh báo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">{stats.byStatus.resolved} đã xử lý</span>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status tabs */}
          <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as AlertInstanceStatus | 'all')}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">
                  Tất cả ({stats?.total || 0})
                </TabsTrigger>
                <TabsTrigger value="active">
                  Đang hoạt động ({stats?.byStatus.active || 0})
                </TabsTrigger>
                <TabsTrigger value="acknowledged">
                  Đã xác nhận ({stats?.byStatus.acknowledged || 0})
                </TabsTrigger>
                <TabsTrigger value="resolved">
                  Đã xử lý ({stats?.byStatus.resolved || 0})
                </TabsTrigger>
                <TabsTrigger value="snoozed">
                  Tạm ẩn ({stats?.byStatus.snoozed || 0})
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as AlertSeverity | 'all')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Mức độ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="critical">Nguy cấp</SelectItem>
                    <SelectItem value="warning">Cảnh báo</SelectItem>
                    <SelectItem value="info">Thông tin</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {Object.entries(alertCategoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-[200px]"
                  />
                </div>
              </div>
            </div>

            <TabsContent value={statusTab} className="mt-0">
              <ScrollArea className="h-[500px]">
                {filteredAlerts?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Không có cảnh báo nào</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAlerts?.map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 rounded-lg border ${
                          alert.severity === 'critical' ? 'border-destructive/30 bg-destructive/5' :
                          alert.severity === 'warning' ? 'border-warning/30 bg-warning/5' :
                          'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            alertSeverityConfig[alert.severity].bgColor
                          } ${alertSeverityConfig[alert.severity].color}`}>
                            {severityIcons[alert.severity]}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{alert.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {alertCategoryLabels[alert.category as keyof typeof alertCategoryLabels] || alert.category}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {alertStatusLabels[alert.status]}
                              </Badge>
                            </div>
                            
                            {alert.message && (
                              <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {alert.object_name && (
                                <span>Đối tượng: {alert.object_name}</span>
                              )}
                              {alert.current_value !== null && alert.threshold_value !== null && (
                                <span>
                                  Giá trị: {alert.current_value} 
                                  {alert.threshold_operator === 'less_than' ? ' < ' : ' > '}
                                  {alert.threshold_value}
                                </span>
                              )}
                              <span>
                                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: vi })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {alert.status === 'active' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => acknowledgeAlert.mutate(alert.id)}
                                  disabled={acknowledgeAlert.isPending}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Xác nhận
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => openResolveDialog(alert.id)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Xử lý
                                </Button>
                              </>
                            )}
                            {alert.status === 'acknowledged' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openResolveDialog(alert.id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Xử lý
                              </Button>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openSnoozeDialog(alert.id)}>
                                  <Snooze className="w-4 h-4 mr-2" />
                                  Tạm ẩn
                                </DropdownMenuItem>
                                {alert.action_url && (
                                  <DropdownMenuItem asChild>
                                    <a href={alert.action_url} target="_blank" rel="noopener noreferrer">
                                      <Eye className="w-4 h-4 mr-2" />
                                      Xem chi tiết
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <X className="w-4 h-4 mr-2" />
                                  Bỏ qua
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý cảnh báo</DialogTitle>
            <DialogDescription>
              Đánh dấu cảnh báo này đã được xử lý xong
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Ghi chú xử lý (tùy chọn)</Label>
            <Textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="Mô tả cách bạn đã xử lý vấn đề..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleResolve} disabled={resolveAlert.isPending}>
              {resolveAlert.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Xác nhận xử lý
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snooze Dialog */}
      <Dialog open={snoozeDialogOpen} onOpenChange={setSnoozeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạm ẩn cảnh báo</DialogTitle>
            <DialogDescription>
              Ẩn cảnh báo này trong một khoảng thời gian
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Button variant="outline" onClick={() => handleSnooze(1)}>1 giờ</Button>
            <Button variant="outline" onClick={() => handleSnooze(4)}>4 giờ</Button>
            <Button variant="outline" onClick={() => handleSnooze(24)}>1 ngày</Button>
            <Button variant="outline" onClick={() => handleSnooze(24 * 7)}>1 tuần</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnoozeDialogOpen(false)}>
              Hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
