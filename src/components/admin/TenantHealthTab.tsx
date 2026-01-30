import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Activity, 
  Clock, 
  BarChart3, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { useTenantHealth, useCSAlerts, RISK_LEVELS, SEVERITY_COLORS, ALERT_TYPES } from '@/hooks/useTenantHealth';
import { TenantHealthScore } from './TenantHealthScore';
import { ModuleAdoptionChart } from './ModuleAdoptionChart';
import { CSAlertsList } from './CSAlertsList';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TenantHealthTabProps {
  tenantId: string;
}

export function TenantHealthTab({ tenantId }: TenantHealthTabProps) {
  const { data: health, isLoading: healthLoading } = useTenantHealth(tenantId);
  const { data: alerts, isLoading: alertsLoading } = useCSAlerts(tenantId, ['open', 'acknowledged']);

  if (healthLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64 col-span-full" />
      </div>
    );
  }

  const openAlerts = alerts?.filter(a => a.status === 'open' || a.status === 'acknowledged') || [];
  const criticalAlerts = openAlerts.filter(a => a.severity === 'critical' || a.severity === 'high');

  return (
    <div className="space-y-4">
      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Score Card */}
        <Card className="row-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4">
            {health ? (
              <TenantHealthScore
                score={health.health_score}
                riskLevel={health.risk_level}
                size="lg"
                showLabel={true}
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <p className="text-4xl font-bold text-muted">--</p>
                <p className="text-sm mt-2">Chưa có dữ liệu</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DAU */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              DAU (Hôm nay)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {health?.daily_active_users ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Người dùng hoạt động
            </p>
          </CardContent>
        </Card>

        {/* WAU */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              WAU (7 ngày)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {health?.weekly_active_users ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Người dùng tuần qua
            </p>
          </CardContent>
        </Card>

        {/* Page Views */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Lượt xem trang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {health?.total_page_views ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Trong 30 ngày
            </p>
          </CardContent>
        </Card>

        {/* Avg Session */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Thời gian TB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {health?.avg_session_duration_min ?? 0}
              <span className="text-base font-normal text-muted-foreground ml-1">phút</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Mỗi phiên sử dụng
            </p>
          </CardContent>
        </Card>

        {/* Decisions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
              Quyết định
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {health?.total_decisions ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Actions thực hiện
            </p>
          </CardContent>
        </Card>

        {/* Last Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-500" />
              Hoạt động cuối
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {health?.last_activity_at 
                ? formatDistanceToNow(new Date(health.last_activity_at), { addSuffix: true, locale: vi })
                : 'Chưa có'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {health?.last_activity_at 
                ? format(new Date(health.last_activity_at), 'dd/MM/yyyy HH:mm', { locale: vi })
                : 'N/A'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Module Adoption & Risk Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Module Adoption */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Module Adoption
            </CardTitle>
            <CardDescription>
              Mức độ sử dụng các module trong 30 ngày qua
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModuleAdoptionChart
              moduleUsage={health?.module_usage || {}}
              totalEvents={health?.total_page_views}
            />
          </CardContent>
        </Card>

        {/* Risk Indicators & Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Cảnh báo & Đề xuất
            </CardTitle>
            <CardDescription>
              {openAlerts.length > 0 
                ? `${openAlerts.length} cảnh báo cần xử lý`
                : 'Không có cảnh báo'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {openAlerts.length > 0 ? (
              <div className="space-y-3">
                {openAlerts.slice(0, 5).map((alert) => {
                  const alertTypeInfo = ALERT_TYPES[alert.alert_type];
                  return (
                    <div 
                      key={alert.id} 
                      className={cn(
                        'p-3 rounded-lg border',
                        SEVERITY_COLORS[alert.severity]
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{alertTypeInfo.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{alert.title}</span>
                            <Badge variant="outline" className="text-xs uppercase">
                              {alert.severity}
                            </Badge>
                          </div>
                          {alert.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {alert.description}
                            </p>
                          )}
                          {alert.recommended_action && (
                            <p className="text-xs text-primary mt-1 font-medium">
                              💡 {alert.recommended_action}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {openAlerts.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{openAlerts.length - 5} cảnh báo khác
                  </p>
                )}
              </div>
            ) : health ? (
              <div className="space-y-3">
                {/* Auto-generated recommendations based on health data */}
                {health.health_score < 40 && (
                  <div className="p-3 rounded-lg border bg-red-500/5 border-red-500/20">
                    <div className="flex items-start gap-2">
                      <span>🚨</span>
                      <div>
                        <p className="font-medium text-sm">Health score rất thấp</p>
                        <p className="text-xs text-muted-foreground">
                          Cần liên hệ khẩn cấp để tìm hiểu vấn đề
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {health.weekly_active_users === 0 && (
                  <div className="p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
                    <div className="flex items-start gap-2">
                      <span>💤</span>
                      <div>
                        <p className="font-medium text-sm">Không có hoạt động trong 7 ngày</p>
                        <p className="text-xs text-muted-foreground">
                          Gửi email nhắc nhở hoặc schedule call
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {Object.keys(health.module_usage || {}).length <= 1 && (
                  <div className="p-3 rounded-lg border bg-blue-500/5 border-blue-500/20">
                    <div className="flex items-start gap-2">
                      <span>📊</span>
                      <div>
                        <p className="font-medium text-sm">Chỉ sử dụng 1 module</p>
                        <p className="text-xs text-muted-foreground">
                          Giới thiệu thêm các module khác (MDP, CDP)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {health.health_score >= 80 && (
                  <div className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                    <div className="flex items-start gap-2">
                      <span>✨</span>
                      <div>
                        <p className="font-medium text-sm">Tenant hoạt động tốt!</p>
                        <p className="text-xs text-muted-foreground">
                          Không cần can thiệp, tiếp tục theo dõi
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Chưa có đủ dữ liệu để phân tích</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CS Alerts Full List */}
      <CSAlertsList tenantId={tenantId} />
    </div>
  );
}
