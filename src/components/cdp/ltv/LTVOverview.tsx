import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Users, AlertTriangle, DollarSign, Target, PieChart, CheckCircle2, Clock } from 'lucide-react';
import { useLTVSummary, useActiveLTVModel, useRealizedRevenue } from '@/hooks/useCDPLTVEngine';
import { cn } from '@/lib/utils';

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '0';
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(0)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString('vi-VN');
}

function safeNumber(value: number | null | undefined): number {
  return value ?? 0;
}

export function LTVOverview() {
  const { data: summary, isLoading: summaryLoading } = useLTVSummary();
  const { data: activeModel, isLoading: modelLoading } = useActiveLTVModel();
  const { data: realizedData, isLoading: realizedLoading } = useRealizedRevenue();

  const isLoading = summaryLoading || modelLoading || realizedLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!summary) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Chưa có dữ liệu LTV</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Cần có dữ liệu khách hàng và đơn hàng để tính toán LTV. 
            Hãy đảm bảo đã import dữ liệu từ các nguồn.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalEquity12m = safeNumber(summary.total_equity_12m);
  const atRiskEquity = safeNumber(summary.at_risk_equity);
  const atRiskPercent = totalEquity12m > 0 
    ? (atRiskEquity / totalEquity12m) * 100 
    : 0;

  const tierData = [
    { tier: 'Platinum', count: safeNumber(summary.platinum_count), color: 'bg-violet-500' },
    { tier: 'Gold', count: safeNumber(summary.gold_count), color: 'bg-amber-500' },
    { tier: 'Silver', count: safeNumber(summary.silver_count), color: 'bg-slate-400' },
    { tier: 'Bronze', count: safeNumber(summary.bronze_count), color: 'bg-orange-600' },
  ];

  const totalTierCount = tierData.reduce((sum, t) => sum + t.count, 0);
  const totalCustomers = safeNumber(summary.total_customers);
  const atRiskCount = safeNumber(summary.at_risk_count);

  // REALIZED = Actual revenue already collected from orders (last 12 months)
  // PROJECTED = LTV forecast for next 12 months (totalEquity12m)
  // These are DIFFERENT time periods:
  // - Realized: Past 12 months (actual)
  // - Projected: Next 12 months (forecast)
  const realizedRevenue = safeNumber(realizedData?.realized_revenue_12m);
  const projectedRevenue = totalEquity12m; // This is FUTURE projection, not overlap
  
  // Total customer value = Past (collected) + Future (projected)
  const totalCustomerValue = realizedRevenue + projectedRevenue;
  const realizedPercent = totalCustomerValue > 0 
    ? (realizedRevenue / totalCustomerValue) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Hero Card - Customer Value Overview */}
      <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Tổng quan Giá trị Khách hàng</CardTitle>
            </div>
            <Badge variant="outline" className="bg-background">
              {totalCustomers.toLocaleString()} khách hàng
            </Badge>
          </div>
          <CardDescription>
            Doanh thu đã thu (12 tháng qua) + Dự báo (12 tháng tới)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Value */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tổng giá trị KH</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalCustomerValue)}</p>
              <p className="text-xs text-muted-foreground">Quá khứ + Tương lai</p>
            </div>
            
            {/* Average LTV */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">LTV Trung bình / KH</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.avg_ltv_12m)}</p>
              <p className="text-xs text-muted-foreground">Median: {formatCurrency(summary.median_ltv_12m)}</p>
            </div>
            
            {/* Realized - PAST 12 months */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <p className="text-xs text-muted-foreground">Đã thu (12 tháng qua)</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(realizedRevenue)}</p>
              <p className="text-xs text-muted-foreground">Dữ liệu thật</p>
            </div>
            
            {/* Projected - NEXT 12 months */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                <p className="text-xs text-muted-foreground">Dự báo (12 tháng tới)</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(projectedRevenue)}</p>
              <p className="text-xs text-muted-foreground">Customer Equity</p>
            </div>
          </div>

          {/* Progress Bar - Past vs Future */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Phân bổ giá trị khách hàng</span>
              <span className="font-medium">{realizedPercent.toFixed(1)}% đã thu</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-green-500 transition-all"
                style={{ width: `${realizedPercent}%` }}
              />
              <div 
                className="h-full bg-blue-400 transition-all"
                style={{ width: `${100 - realizedPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                12 tháng qua: {formatCurrency(realizedRevenue)}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                12 tháng tới: {formatCurrency(projectedRevenue)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Model Banner */}
      {activeModel && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm">
                Đang sử dụng: <span className="font-medium">{activeModel.model_name}</span>
              </span>
              <Badge variant="outline" className="text-xs">
                Retention Y1: {(activeModel.retention_year_1 * 100).toFixed(0)}%
              </Badge>
              <Badge variant="outline" className="text-xs">
                Discount: {(activeModel.discount_rate * 100).toFixed(0)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Tổng Equity 12 tháng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_equity_12m)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCustomers.toLocaleString()} khách hàng
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tổng Equity 24 tháng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_equity_24m)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Dự báo với mô hình hiện tại
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              LTV Trung bình
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.avg_ltv_12m)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Median: {formatCurrency(summary.median_ltv_12m)}
            </p>
          </CardContent>
        </Card>

        <Card className={atRiskPercent > 20 ? 'border-destructive/50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${atRiskPercent > 20 ? 'text-destructive' : ''}`} />
              Giá trị Rủi ro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.at_risk_equity)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {atRiskPercent.toFixed(1)}% tổng equity ({atRiskCount} KH)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phân bổ theo Tier</CardTitle>
          <CardDescription>
            Dựa trên LTV 24 tháng của khách hàng
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tierData.map((tier) => {
            const percent = totalTierCount > 0 ? (tier.count / totalTierCount) * 100 : 0;
            return (
              <div key={tier.tier} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                    <span>{tier.tier}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {tier.count.toLocaleString()} ({percent.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={percent} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Formula Explanation */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Công thức LTV</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-xs bg-background px-2 py-1 rounded">
            LTV = Σ (BaseValue × Retention<sub>t</sub> × AOV_Growth<sub>t</sub>) / (1 + DiscountRate)<sup>t</sup>
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            BaseValue được tính từ gross profit thực tế, nhân với retention curve và growth rate, 
            sau đó chiết khấu về giá trị hiện tại (NPV).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
