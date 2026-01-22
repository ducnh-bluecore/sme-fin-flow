import { 
  Settings,
  Info,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightLayout } from '@/components/cdp/insights/InsightLayout';
import { InsightRegistryTable } from '@/components/cdp/insights/InsightRegistryTable';
import { useCDPInsightRegistry, useCDPInsightToggle } from '@/hooks/useCDPInsightRegistry';
import { Skeleton } from '@/components/ui/skeleton';

export default function InsightRegistryPage() {
  const { insights, stats, isLoading, error } = useCDPInsightRegistry();
  const toggleMutation = useCDPInsightToggle();

  const handleToggle = (code: string, enabled: boolean) => {
    toggleMutation.mutate({ code, enabled });
  };

  if (error) {
    return (
      <InsightLayout title="Danh mục Insight" description="Quản trị hệ thống insight">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-6 text-center">
            <p className="text-destructive">Lỗi tải dữ liệu: {error.message}</p>
          </CardContent>
        </Card>
      </InsightLayout>
    );
  }

  return (
    <InsightLayout title="Danh mục Insight" description="Quản trị hệ thống insight (chỉ dành cho Admin/Data)">
      <div className="space-y-6">
        {/* Admin Warning */}
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-warning-foreground" />
              <div>
                <p className="text-sm font-medium text-warning-foreground">
                  Màn hình quản trị – Chỉ dành cho Admin/Product/Data
                </p>
                <p className="text-xs text-muted-foreground">
                  Thay đổi ở đây ảnh hưởng đến toàn bộ hệ thống phát hiện insight
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              {isLoading ? (
                <Skeleton className="h-9 w-12 mx-auto" />
              ) : (
                <p className="text-3xl font-bold">{stats.totalInsights}</p>
              )}
              <p className="text-xs text-muted-foreground">Tổng insight</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              {isLoading ? (
                <Skeleton className="h-9 w-12 mx-auto" />
              ) : (
                <p className="text-3xl font-bold text-primary">{stats.enabledCount}</p>
              )}
              <p className="text-xs text-muted-foreground">Đang theo dõi</p>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5">
            <CardContent className="pt-4 pb-3 text-center">
              {isLoading ? (
                <Skeleton className="h-9 w-12 mx-auto" />
              ) : (
                <p className="text-3xl font-bold text-destructive">{stats.triggeredCount}</p>
              )}
              <p className="text-xs text-muted-foreground">Đang phát hiện tín hiệu</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              {isLoading ? (
                <Skeleton className="h-9 w-12 mx-auto" />
              ) : (
                <p className="text-3xl font-bold">{stats.topicCount}</p>
              )}
              <p className="text-xs text-muted-foreground">Chủ đề</p>
            </CardContent>
          </Card>
        </div>

        {/* Registry Table */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Đang tải danh mục insight...</span>
            </CardContent>
          </Card>
        ) : (
          <InsightRegistryTable 
            insights={insights}
            onToggle={handleToggle}
          />
        )}

        {/* Footer Note */}
        <div className="text-center text-xs text-muted-foreground py-4 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <Info className="w-3 h-3" />
            Đây là màn hình quản trị logic phát hiện, không phải màn hình kỹ thuật SQL
          </p>
          <p>Mọi thay đổi cần được phê duyệt bởi Product Owner</p>
        </div>
      </div>
    </InsightLayout>
  );
}
