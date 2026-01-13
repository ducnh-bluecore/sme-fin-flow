import { PageHeader } from '@/components/shared/PageHeader';
import { DateRangeIndicator } from '@/components/shared/DateRangeIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Target, 
  TrendingUp, 
  Wallet,
  AlertTriangle,
  Info,
  ArrowRight,
} from 'lucide-react';
import { useMarketingProfitability } from '@/hooks/useMarketingProfitability';
import { MarketingProfitPanel, CashImpactPanel, MarketingRiskPanel } from '@/components/mdp';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function MDPDashboardPage() {
  const { 
    campaigns, 
    cashImpact, 
    riskAlerts, 
    summary, 
    isLoading, 
    error,
    thresholds 
  } = useMarketingProfitability();

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    }
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Marketing Data Platform" 
          subtitle="Profit before Performance. Cash before Clicks."
        />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
          <AlertDescription>
            Không thể tải dữ liệu marketing. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="Marketing Data Platform" 
          subtitle="Profit before Performance. Cash before Clicks."
        />
        <DateRangeIndicator />
      </div>

      {/* MDP Manifesto Banner */}
      <Alert className="bg-primary/5 border-primary/20">
        <Target className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">MDP Manifesto</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          MDP đo lường GIÁ TRỊ TÀI CHÍNH thật của marketing - không phải clicks. 
          Phục vụ CEO/CFO trước, marketer sau. Nếu CFO không tin, CEO không dám hành động → insight thất bại.
        </AlertDescription>
      </Alert>

      {/* KPI Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Marketing Spend */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Wallet className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-xs text-muted-foreground">Chi Marketing</span>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.total_marketing_spend)}đ
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {campaigns.length} campaigns
              </p>
            </CardContent>
          </Card>

          {/* Contribution Margin */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  summary.total_contribution_margin >= 0 ? "bg-green-500/10" : "bg-red-500/10"
                )}>
                  <TrendingUp className={cn(
                    "h-4 w-4",
                    summary.total_contribution_margin >= 0 ? "text-green-400" : "text-red-400"
                  )} />
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  Contribution Margin
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Revenue - COGS - Fees - Ad Spend
                    </TooltipContent>
                  </Tooltip>
                </span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                summary.total_contribution_margin >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {summary.total_contribution_margin >= 0 ? '+' : ''}{formatCurrency(summary.total_contribution_margin)}đ
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Profit ROAS: {summary.overall_profit_roas.toFixed(2)}x
              </p>
            </CardContent>
          </Card>

          {/* ROAS */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  summary.overall_roas >= thresholds.MIN_ROAS ? "bg-green-500/10" : "bg-yellow-500/10"
                )}>
                  <Target className={cn(
                    "h-4 w-4",
                    summary.overall_roas >= thresholds.MIN_ROAS ? "text-green-400" : "text-yellow-400"
                  )} />
                </div>
                <span className="text-xs text-muted-foreground">ROAS tổng</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                summary.overall_roas >= thresholds.MIN_ROAS ? "text-green-400" : 
                summary.overall_roas >= 1 ? "text-yellow-400" : "text-red-400"
              )}>
                {summary.overall_roas.toFixed(2)}x
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Ngưỡng: {thresholds.MIN_ROAS}x
              </p>
            </CardContent>
          </Card>

          {/* Risk Alerts */}
          <Card className={cn(
            "border-border/50 bg-card/50 backdrop-blur",
            riskAlerts.length > 0 && "border-destructive/50"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  riskAlerts.length > 0 ? "bg-red-500/10" : "bg-green-500/10"
                )}>
                  <AlertTriangle className={cn(
                    "h-4 w-4",
                    riskAlerts.length > 0 ? "text-red-400" : "text-green-400"
                  )} />
                </div>
                <span className="text-xs text-muted-foreground">Cảnh báo rủi ro</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                riskAlerts.length > 0 ? "text-red-400" : "text-green-400"
              )}>
                {riskAlerts.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {riskAlerts.filter(a => a.severity === 'critical').length} critical
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <MarketingProfitPanel campaigns={campaigns} summary={summary} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <MarketingRiskPanel 
              alerts={riskAlerts} 
              onAction={(alert) => {
                console.log('Handle alert:', alert);
                // TODO: Navigate to campaign or create task
              }}
            />
            <CashImpactPanel cashImpact={cashImpact} summary={summary} />
          </div>
        </div>
      )}

      {/* FDP Feed Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Feed to FDP & Control Tower</p>
              <p className="text-xs text-muted-foreground">
                Dữ liệu MDP tự động cập nhật vào FDP (Unit Economics) và Control Tower (Alerts). 
                Mọi campaign lỗ sẽ tạo alert trong Control Tower.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
