import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell, 
  RefreshCw, 
  Search,
  ChevronRight,
  AlertTriangle,
  Zap,
  UserX,
  TrendingDown,
  Clock,
  Database,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { useAllOpenCSAlerts, useRunAllAlertChecks, useCSAlertsSummary } from '@/hooks/useCSAlertsSummary';
import { useUpdateCSAlert } from '@/hooks/useTenantHealth';
import { useTracker } from '@/components/providers/ActivityTrackerProvider';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const SEVERITY_STYLES = {
  critical: { bg: 'bg-destructive/10', text: 'text-destructive', badge: 'destructive' as const },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-500', badge: 'default' as const },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-500', badge: 'secondary' as const },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-500', badge: 'outline' as const },
};

const ALERT_TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  churn_risk: { icon: <Zap className="w-4 h-4" />, label: 'Nguy cơ rời bỏ' },
  inactive: { icon: <UserX className="w-4 h-4" />, label: 'Không hoạt động' },
  engagement_drop: { icon: <TrendingDown className="w-4 h-4" />, label: 'Giảm engagement' },
  stuck_onboarding: { icon: <Clock className="w-4 h-4" />, label: 'Kẹt onboarding' },
  data_stale: { icon: <Database className="w-4 h-4" />, label: 'Dữ liệu cũ' },
  low_adoption: { icon: <BarChart3 className="w-4 h-4" />, label: 'Adoption thấp' },
};

export default function AdminCSAlertsPage() {
  const navigate = useNavigate();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: summary } = useCSAlertsSummary();
  const { data: alerts, isLoading, refetch } = useAllOpenCSAlerts(
    100,
    0,
    severityFilter === 'all' ? undefined : severityFilter,
    typeFilter === 'all' ? undefined : typeFilter
  );
  const runChecks = useRunAllAlertChecks();
  const updateAlert = useUpdateCSAlert();
  const { trackDecision, trackFeatureUse } = useTracker();

  const handleRunChecks = async () => {
    try {
      trackFeatureUse('admin.cs_alerts.run_checks');
      await runChecks.mutateAsync();
      toast.success('Đã kiểm tra và tạo alerts mới');
      refetch();
    } catch (error) {
      toast.error('Lỗi khi chạy kiểm tra alerts');
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      trackDecision('admin.cs_alert.acknowledge', { alertId });
      await updateAlert.mutateAsync({
        alertId,
        updates: { status: 'acknowledged' },
      });
      toast.success('Đã acknowledge alert');
      refetch();
    } catch (error) {
      toast.error('Lỗi khi cập nhật alert');
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      trackDecision('admin.cs_alert.resolve', { alertId });
      await updateAlert.mutateAsync({
        alertId,
        updates: { status: 'resolved' },
      });
      toast.success('Đã resolve alert');
      refetch();
    } catch (error) {
      toast.error('Lỗi khi cập nhật alert');
    }
  };

  const filteredAlerts = alerts?.filter(alert => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      alert.tenant_name?.toLowerCase().includes(search) ||
      alert.title?.toLowerCase().includes(search) ||
      alert.description?.toLowerCase().includes(search)
    );
  });

  const totalActive = (summary?.total_open || 0) + (summary?.total_acknowledged || 0);

  return (
    <>
      <Helmet>
        <title>CS Alerts | Bluecore Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              CS Alerts
              {totalActive > 0 && (
                <Badge variant="destructive">{totalActive}</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              Quản lý cảnh báo Customer Success cho tất cả tenant
            </p>
          </div>
          <Button onClick={handleRunChecks} disabled={runChecks.isPending}>
            <RefreshCw className={cn('w-4 h-4 mr-2', runChecks.isPending && 'animate-spin')} />
            Chạy kiểm tra
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={cn(summary?.critical_count ? 'border-destructive' : '')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn('text-3xl font-bold', summary?.critical_count ? 'text-destructive' : 'text-muted-foreground')}>
                    {summary?.critical_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </div>
                <AlertTriangle className={cn('w-8 h-8', summary?.critical_count ? 'text-destructive' : 'text-muted-foreground/30')} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn('text-3xl font-bold', summary?.high_count ? 'text-orange-500' : 'text-muted-foreground')}>
                    {summary?.high_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">High</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn('text-3xl font-bold', summary?.medium_count ? 'text-amber-500' : 'text-muted-foreground')}>
                    {summary?.medium_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Medium</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn('text-3xl font-bold', summary?.low_count ? 'text-blue-500' : 'text-muted-foreground')}>
                    {summary?.low_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Low</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bộ lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm theo tenant, tiêu đề..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Loại alert" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="churn_risk">Nguy cơ rời bỏ</SelectItem>
                  <SelectItem value="inactive">Không hoạt động</SelectItem>
                  <SelectItem value="engagement_drop">Giảm engagement</SelectItem>
                  <SelectItem value="stuck_onboarding">Kẹt onboarding</SelectItem>
                  <SelectItem value="data_stale">Dữ liệu cũ</SelectItem>
                  <SelectItem value="low_adoption">Adoption thấp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Alerts</CardTitle>
            <CardDescription>
              {filteredAlerts?.length || 0} alerts đang cần xử lý
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : filteredAlerts && filteredAlerts.length > 0 ? (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => {
                  const severityStyle = SEVERITY_STYLES[alert.severity as keyof typeof SEVERITY_STYLES] || SEVERITY_STYLES.low;
                  const typeConfig = ALERT_TYPE_CONFIG[alert.alert_type] || { icon: <AlertTriangle className="w-4 h-4" />, label: alert.alert_type };

                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        'p-4 rounded-lg border',
                        severityStyle.bg
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn('p-2 rounded-lg', severityStyle.bg, severityStyle.text)}>
                          {typeConfig.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{alert.title}</span>
                            <Badge variant={severityStyle.badge} className="uppercase text-xs">
                              {alert.severity}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {typeConfig.label}
                            </Badge>
                            {alert.status === 'acknowledged' && (
                              <Badge variant="secondary" className="text-xs">
                                Acknowledged
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {alert.description}
                          </div>
                          {alert.recommended_action && (
                            <div className="text-sm text-primary mb-2">
                              💡 {alert.recommended_action}
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span 
                              className="flex items-center gap-1 cursor-pointer hover:text-primary"
                              onClick={() => navigate(`/admin/tenants/${alert.tenant_id}`)}
                            >
                              <ExternalLink className="w-3 h-3" />
                              {alert.tenant_name}
                            </span>
                            <span>•</span>
                            <span>{format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                            <span>({formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: vi })})</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {alert.status === 'open' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcknowledge(alert.id)}
                              disabled={updateAlert.isPending}
                            >
                              Acknowledge
                            </Button>
                          )}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleResolve(alert.id)}
                            disabled={updateAlert.isPending}
                          >
                            Resolve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/tenants/${alert.tenant_id}`)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Không có alerts</p>
                <p className="text-sm">Tất cả tenant đang hoạt động bình thường</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
