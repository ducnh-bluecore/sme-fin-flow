import { useMDPData } from '@/hooks/useMDPData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Info, CheckCircle2, XCircle, Flame, TrendingDown, Zap, Target } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { RiskAlertsPanel } from '@/components/mdp/cmo-mode/RiskAlertsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { MarketingRiskAlert } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';

export default function RiskAlertsPage() {
  const { 
    riskAlerts,
    cmoModeSummary,
    isLoading, 
    error,
  } = useMDPData();

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const handleRiskAction = (alert: MarketingRiskAlert) => {
    toast.success(`Đã ghi nhận quyết định cho ${alert.campaign_name}`);
    console.log('Risk action:', alert);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
          <AlertDescription>
            Không thể tải dữ liệu risk alerts. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const totalImpact = riskAlerts.reduce((sum, a) => sum + a.impact_amount, 0);
  const criticalCount = riskAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = riskAlerts.filter(a => a.severity === 'warning').length;

  // Group alerts by type
  const alertsByType = riskAlerts.reduce((acc, alert) => {
    if (!acc[alert.type]) acc[alert.type] = [];
    acc[alert.type].push(alert);
    return acc;
  }, {} as Record<string, MarketingRiskAlert[]>);

  const typeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    negative_margin: { label: 'Margin âm', icon: XCircle, color: 'text-red-400' },
    burning_cash: { label: 'Đốt tiền', icon: Flame, color: 'text-orange-400' },
    cac_exceeds_ltv: { label: 'CAC > LTV', icon: TrendingDown, color: 'text-yellow-400' },
    cash_runway_impact: { label: 'Ảnh hưởng cash', icon: Zap, color: 'text-blue-400' },
    fake_growth: { label: 'Tăng trưởng giả', icon: Target, color: 'text-purple-400' },
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Marketing Risk Alerts"
        subtitle="CMO Mode: Phát hiện và xử lý rủi ro marketing - Feed trực tiếp Control Tower"
      />

      {/* Risk Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cn(
          "border",
          riskAlerts.length === 0 
            ? "border-green-500/30 bg-green-500/5" 
            : criticalCount > 0 
            ? "border-red-500/30 bg-red-500/5"
            : "border-yellow-500/30 bg-yellow-500/5"
        )}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Trạng thái</p>
            <p className={cn(
              "text-lg font-bold",
              riskAlerts.length === 0 ? "text-green-400" : 
              criticalCount > 0 ? "text-red-400" : "text-yellow-400"
            )}>
              {riskAlerts.length === 0 ? 'An toàn' : 
               criticalCount > 0 ? 'Nguy hiểm' : 'Cần chú ý'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Tổng thiệt hại tiềm năng</p>
            <p className="text-lg font-bold text-red-400">
              -{formatCurrency(totalImpact)}đ
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Critical Alerts</p>
            <p className="text-lg font-bold text-red-400">
              {criticalCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Warning Alerts</p>
            <p className="text-lg font-bold text-yellow-400">
              {warningCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Types Breakdown */}
      {riskAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Phân loại rủi ro</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    MDP ưu tiên rủi ro chí mạng: Margin âm → Đốt cash → CAC cao → Cash impact.
                    Mỗi alert phải có owner và deadline.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(typeLabels).map(([type, config]) => {
                const count = alertsByType[type]?.length || 0;
                const Icon = config.icon;
                return (
                  <div 
                    key={type}
                    className={cn(
                      "p-3 rounded-lg border text-center",
                      count > 0 ? "bg-muted/30" : "bg-muted/10 opacity-50"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 mx-auto mb-1", count > 0 ? config.color : "text-muted-foreground")} />
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                    <p className={cn("text-lg font-bold", count > 0 ? config.color : "text-muted-foreground")}>
                      {count}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Risk Alerts Panel */}
      <RiskAlertsPanel 
        alerts={riskAlerts}
        onAction={handleRiskAction}
      />

      {/* Control Tower Integration Notice */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Feed to Control Tower</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tất cả alerts này được tự động gửi đến Control Tower. CEO/CFO có thể xem và yêu cầu hành động.
                CMO chịu trách nhiệm xử lý trong deadline quy định.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
