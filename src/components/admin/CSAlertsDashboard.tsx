import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Bell, 
  RefreshCw, 
  ChevronRight,
  Zap,
  UserX,
  TrendingDown,
  Clock,
  Database,
  BarChart3
} from 'lucide-react';
import { useCSAlertsSummary, useRunAllAlertChecks } from '@/hooks/useCSAlertsSummary';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const SEVERITY_STYLES = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-500 text-white',
  low: 'bg-blue-500 text-white',
};

const ALERT_TYPE_ICONS: Record<string, React.ReactNode> = {
  churn_risk: <Zap className="w-4 h-4" />,
  inactive: <UserX className="w-4 h-4" />,
  engagement_drop: <TrendingDown className="w-4 h-4" />,
  stuck_onboarding: <Clock className="w-4 h-4" />,
  data_stale: <Database className="w-4 h-4" />,
  low_adoption: <BarChart3 className="w-4 h-4" />,
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  churn_risk: 'Nguy cơ rời bỏ',
  inactive: 'Không hoạt động',
  engagement_drop: 'Giảm engagement',
  stuck_onboarding: 'Kẹt onboarding',
  data_stale: 'Dữ liệu cũ',
  low_adoption: 'Adoption thấp',
};

export function CSAlertsDashboard() {
  const navigate = useNavigate();
  const { data: summary, isLoading, refetch } = useCSAlertsSummary();
  const runChecks = useRunAllAlertChecks();

  const handleRunChecks = async () => {
    try {
      await runChecks.mutateAsync();
      toast.success('Đã kiểm tra và tạo alerts mới');
      refetch();
    } catch (error) {
      toast.error('Lỗi khi chạy kiểm tra alerts');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  const totalActive = (summary?.total_open || 0) + (summary?.total_acknowledged || 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            CS Alerts
            {totalActive > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalActive}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Cảnh báo cần xử lý từ hệ thống theo dõi tenant
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunChecks}
          disabled={runChecks.isPending}
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', runChecks.isPending && 'animate-spin')} />
          Kiểm tra
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Severity Summary */}
        <div className="grid grid-cols-4 gap-2">
          <div className={cn('p-2 rounded-lg text-center', summary?.critical_count ? 'bg-destructive/10' : 'bg-muted')}>
            <div className={cn('text-2xl font-bold', summary?.critical_count ? 'text-destructive' : 'text-muted-foreground')}>
              {summary?.critical_count || 0}
            </div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </div>
          <div className={cn('p-2 rounded-lg text-center', summary?.high_count ? 'bg-orange-500/10' : 'bg-muted')}>
            <div className={cn('text-2xl font-bold', summary?.high_count ? 'text-orange-500' : 'text-muted-foreground')}>
              {summary?.high_count || 0}
            </div>
            <div className="text-xs text-muted-foreground">High</div>
          </div>
          <div className={cn('p-2 rounded-lg text-center', summary?.medium_count ? 'bg-amber-500/10' : 'bg-muted')}>
            <div className={cn('text-2xl font-bold', summary?.medium_count ? 'text-amber-500' : 'text-muted-foreground')}>
              {summary?.medium_count || 0}
            </div>
            <div className="text-xs text-muted-foreground">Medium</div>
          </div>
          <div className={cn('p-2 rounded-lg text-center', summary?.low_count ? 'bg-blue-500/10' : 'bg-muted')}>
            <div className={cn('text-2xl font-bold', summary?.low_count ? 'text-blue-500' : 'text-muted-foreground')}>
              {summary?.low_count || 0}
            </div>
            <div className="text-xs text-muted-foreground">Low</div>
          </div>
        </div>

        {/* Recent Alerts */}
        {summary?.recent_alerts && summary.recent_alerts.length > 0 ? (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {summary.recent_alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/tenants/${alert.tenant_id}`)}
                >
                  <div className={cn('p-1.5 rounded', SEVERITY_STYLES[alert.severity as keyof typeof SEVERITY_STYLES])}>
                    {ALERT_TYPE_ICONS[alert.alert_type] || <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{alert.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{alert.tenant_name}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: vi })}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Không có cảnh báo nào</p>
            <p className="text-xs">Tất cả tenant đang hoạt động bình thường</p>
          </div>
        )}

        {/* Alert Type Breakdown */}
        {summary?.by_type && Object.values(summary.by_type).some(v => v > 0) && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">Phân loại</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.by_type).map(([type, count]) => {
                if (count === 0) return null;
                return (
                  <Badge key={type} variant="outline" className="text-xs">
                    {ALERT_TYPE_LABELS[type] || type}: {count}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
