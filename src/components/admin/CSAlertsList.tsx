import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Bell, CheckCircle, XCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { useCSAlerts, useUpdateCSAlert, ALERT_TYPES, SEVERITY_COLORS, CSAlert } from '@/hooks/useTenantHealth';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CSAlertsListProps {
  tenantId: string;
}

type FilterStatus = 'all' | 'open' | 'resolved';

export function CSAlertsList({ tenantId }: CSAlertsListProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('open');
  const [selectedAlert, setSelectedAlert] = useState<CSAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);

  const statusFilter = filterStatus === 'all' 
    ? undefined 
    : filterStatus === 'open' 
      ? ['open', 'acknowledged', 'in_progress']
      : ['resolved', 'ignored'];

  const { data: alerts, isLoading } = useCSAlerts(tenantId, statusFilter);
  const updateAlert = useUpdateCSAlert();

  const handleAcknowledge = async (alert: CSAlert) => {
    try {
      await updateAlert.mutateAsync({
        alertId: alert.id,
        updates: { status: 'acknowledged' },
      });
      toast.success('Đã acknowledge cảnh báo');
    } catch (error) {
      toast.error('Không thể cập nhật cảnh báo');
    }
  };

  const handleResolve = async () => {
    if (!selectedAlert) return;

    try {
      await updateAlert.mutateAsync({
        alertId: selectedAlert.id,
        updates: { 
          status: 'resolved',
          resolution_notes: resolutionNotes,
        },
      });
      toast.success('Đã giải quyết cảnh báo');
      setIsResolveDialogOpen(false);
      setSelectedAlert(null);
      setResolutionNotes('');
    } catch (error) {
      toast.error('Không thể cập nhật cảnh báo');
    }
  };

  const handleIgnore = async (alert: CSAlert) => {
    try {
      await updateAlert.mutateAsync({
        alertId: alert.id,
        updates: { status: 'ignored' },
      });
      toast.success('Đã bỏ qua cảnh báo');
    } catch (error) {
      toast.error('Không thể cập nhật cảnh báo');
    }
  };

  const openResolveDialog = (alert: CSAlert) => {
    setSelectedAlert(alert);
    setResolutionNotes('');
    setIsResolveDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Bell className="w-4 h-4 text-red-500" />;
      case 'acknowledged':
        return <Eye className="w-4 h-4 text-amber-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'ignored':
        return <EyeOff className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Mới';
      case 'acknowledged': return 'Đã xem';
      case 'in_progress': return 'Đang xử lý';
      case 'resolved': return 'Đã giải quyết';
      case 'ignored': return 'Bỏ qua';
      default: return status;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Cảnh báo Customer Success
              </CardTitle>
              <CardDescription>
                Danh sách cảnh báo cần theo dõi và xử lý
              </CardDescription>
            </div>
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <TabsList className="h-8">
                <TabsTrigger value="open" className="text-xs px-3">Đang mở</TabsTrigger>
                <TabsTrigger value="resolved" className="text-xs px-3">Đã xử lý</TabsTrigger>
                <TabsTrigger value="all" className="text-xs px-3">Tất cả</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : alerts?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filterStatus === 'open' 
                ? 'Không có cảnh báo nào đang mở'
                : filterStatus === 'resolved'
                  ? 'Chưa có cảnh báo nào được xử lý'
                  : 'Chưa có cảnh báo nào'
              }
            </div>
          ) : (
            <div className="space-y-3">
              {alerts?.map((alert) => {
                const alertTypeInfo = ALERT_TYPES[alert.alert_type];
                const isOpen = alert.status === 'open' || alert.status === 'acknowledged';

                return (
                  <div 
                    key={alert.id} 
                    className={cn(
                      'p-4 rounded-lg border transition-colors',
                      isOpen ? 'bg-muted/30' : 'bg-muted/10 opacity-75'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <span className="text-2xl">{alertTypeInfo.icon}</span>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{alert.title}</h4>
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs uppercase', SEVERITY_COLORS[alert.severity])}
                          >
                            {alert.severity}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {getStatusIcon(alert.status)}
                            <span>{getStatusLabel(alert.status)}</span>
                          </div>
                        </div>
                        
                        {alert.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {alert.description}
                          </p>
                        )}

                        {alert.recommended_action && (
                          <p className="text-sm text-primary mt-2 font-medium">
                            💡 Đề xuất: {alert.recommended_action}
                          </p>
                        )}

                        {alert.resolution_notes && (
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                            ✅ {alert.resolution_notes}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span>
                            Tạo: {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: vi })}
                          </span>
                          {alert.resolved_at && (
                            <span>
                              Xử lý: {format(new Date(alert.resolved_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {isOpen && (
                        <div className="flex items-center gap-2">
                          {alert.status === 'open' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcknowledge(alert)}
                              disabled={updateAlert.isPending}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Xem
                            </Button>
                          )}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openResolveDialog(alert)}
                            disabled={updateAlert.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Giải quyết
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleIgnore(alert)}
                            disabled={updateAlert.isPending}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Giải quyết cảnh báo</DialogTitle>
            <DialogDescription>
              Ghi chú lại cách bạn đã xử lý cảnh báo này
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="py-4">
              <div className="p-3 rounded-lg bg-muted/50 mb-4">
                <p className="font-medium">{selectedAlert.title}</p>
                <p className="text-sm text-muted-foreground">{selectedAlert.description}</p>
              </div>

              <Textarea
                placeholder="Mô tả cách bạn đã xử lý vấn đề này..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleResolve} disabled={updateAlert.isPending}>
              {updateAlert.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Xác nhận giải quyết
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
