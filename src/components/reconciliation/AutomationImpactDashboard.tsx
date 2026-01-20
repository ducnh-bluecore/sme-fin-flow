import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Clock,
  DollarSign,
  Zap,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Loader2
} from "lucide-react";
import { useReconciliationKPIs, formatCurrency, formatPercent, formatDuration } from "@/hooks/useReconciliationKPIs";

type Period = '7d' | '30d' | '90d';

export function AutomationImpactDashboard() {
  const [period, setPeriod] = useState<Period>('30d');
  const { data: kpis, isLoading, error } = useReconciliationKPIs(period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Không thể tải dữ liệu KPI. Vui lòng thử lại sau.
          </div>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = kpis.trendDirection === 'up' 
    ? TrendingUp 
    : kpis.trendDirection === 'down' 
      ? TrendingDown 
      : Minus;

  const trendColor = kpis.trendDirection === 'up' 
    ? 'text-emerald-500' 
    : kpis.trendDirection === 'down' 
      ? 'text-red-500' 
      : 'text-muted-foreground';

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Automation Impact</h2>
          <p className="text-muted-foreground">
            Đo lường hiệu quả tự động hóa đối soát
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="7d">7 ngày</TabsTrigger>
            <TabsTrigger value="30d">30 ngày</TabsTrigger>
            <TabsTrigger value="90d">90 ngày</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Automation Effectiveness */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Auto-Reconciliation Rate"
          value={formatPercent(kpis.autoReconciliationRate)}
          description="Tỷ lệ đối soát tự động"
          icon={<Zap className="h-4 w-4" />}
          trend={kpis.trendDelta}
          trendLabel={`${kpis.trendDelta >= 0 ? '+' : ''}${kpis.trendDelta.toFixed(1)}% vs kỳ trước`}
          tooltip="Số lượng đối soát tự động / Tổng số đối soát"
        />
        <MetricCard
          title="Confidence Trung bình"
          value={formatPercent(kpis.avgConfidence)}
          description={`${kpis.totalSuggestions} gợi ý`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tooltip="Điểm tin cậy trung bình của các gợi ý đã xác nhận"
        />
        <MetricCard
          title="False Automation Rate"
          value={formatPercent(kpis.falseAutomationRate)}
          description={`${kpis.falseAutoCount} trường hợp sai`}
          icon={<XCircle className="h-4 w-4" />}
          variant={kpis.falseAutomationRate > 5 ? 'destructive' : 'default'}
          tooltip="Số lượng tự động xác nhận sau đó bị VOID"
        />
        <MetricCard
          title="Safe Automation Rate"
          value={formatPercent(kpis.safeAutomationRate)}
          description="Gợi ý được tự động xử lý"
          icon={<Shield className="h-4 w-4" />}
          tooltip="Tỷ lệ gợi ý được tự động xác nhận an toàn"
        />
      </div>

      {/* Ops Savings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tiết kiệm Vận hành
          </CardTitle>
          <CardDescription>
            Thời gian và chi phí tiết kiệm được từ tự động hóa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Thời gian tiết kiệm</div>
              <div className="text-3xl font-bold">{formatDuration(kpis.estimatedMinutesSaved)}</div>
              <div className="text-sm text-muted-foreground">
                {kpis.autoConfirmedCount} đối soát × 7 phút/đối soát
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Chi phí tiết kiệm</div>
              <div className="text-3xl font-bold text-emerald-600">
                {formatCurrency(kpis.estimatedCostSaved)}
              </div>
              <div className="text-sm text-muted-foreground">
                {kpis.estimatedHoursSaved.toFixed(1)} giờ × 150,000 VND/giờ
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Exceptions giải quyết tự động</div>
              <div className="text-3xl font-bold">{kpis.exceptionsResolvedByAuto}</div>
              <div className="text-sm text-muted-foreground">
                Trường hợp ngoại lệ được xử lý tự động
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cash Impact
          </CardTitle>
          <CardDescription>
            Tác động lên dòng tiền từ việc đối soát nhanh hơn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Cash Acceleration</div>
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(kpis.cashAccelerationAmount)}
              </div>
              <div className="text-sm text-muted-foreground">
                Tổng giá trị đối soát được xử lý nhanh hơn
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Ngày tiết kiệm</div>
              <div className="text-3xl font-bold">{kpis.cashAccelerationDays} ngày</div>
              <div className="text-sm text-muted-foreground">
                Thời gian rút ngắn trong quy trình đối soát
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Trust & Safety
          </CardTitle>
          <CardDescription>
            Các biện pháp bảo vệ và can thiệp thủ công
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-muted-foreground">Guardrail Blocks</span>
              </div>
              <div className="text-3xl font-bold">{kpis.guardrailBlocks}</div>
              <div className="text-sm text-muted-foreground">
                Số lần hệ thống chặn tự động hóa rủi ro
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-muted-foreground">Manual Overrides</span>
              </div>
              <div className="text-3xl font-bold">{kpis.manualOverrides}</div>
              <div className="text-sm text-muted-foreground">
                Số lần user cho phép bỏ qua guardrail
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-muted-foreground">Manual Confirmations</span>
              </div>
              <div className="text-3xl font-bold">{kpis.manualConfirmedCount}</div>
              <div className="text-sm text-muted-foreground">
                Số đối soát được xác nhận thủ công
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Tổng kết kỳ {kpis.periodStart} → {kpis.periodEnd}</div>
              <div className="text-2xl font-bold">
                {kpis.autoConfirmedCount + kpis.manualConfirmedCount} đối soát hoàn thành
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendIcon className={`h-5 w-5 ${trendColor}`} />
              <span className={`text-lg font-semibold ${trendColor}`}>
                {kpis.trendDelta >= 0 ? '+' : ''}{kpis.trendDelta.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">vs kỳ trước</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  tooltip?: string;
  variant?: 'default' | 'destructive';
}

function MetricCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  trendLabel, 
  tooltip,
  variant = 'default'
}: MetricCardProps) {
  const TrendIcon = trend && trend > 0 
    ? TrendingUp 
    : trend && trend < 0 
      ? TrendingDown 
      : null;

  const trendColor = trend && trend > 0 
    ? 'text-emerald-500' 
    : trend && trend < 0 
      ? 'text-red-500' 
      : '';

  return (
    <Card className={variant === 'destructive' ? 'border-destructive/50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {title}
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
        <div className={variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground'}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variant === 'destructive' ? 'text-destructive' : ''}`}>
          {value}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">{description}</p>
          {TrendIcon && trendLabel && (
            <Badge variant="secondary" className={`text-xs ${trendColor}`}>
              <TrendIcon className="h-3 w-3 mr-1" />
              {trendLabel}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
