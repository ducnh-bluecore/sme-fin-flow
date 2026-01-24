import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Users, AlertTriangle, DollarSign, Target } from 'lucide-react';
import { useLTVSummary, useActiveLTVModel } from '@/hooks/useCDPLTVEngine';

function formatCurrency(value: number): string {
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

export function LTVOverview() {
  const { data: summary, isLoading: summaryLoading } = useLTVSummary();
  const { data: activeModel, isLoading: modelLoading } = useActiveLTVModel();

  const isLoading = summaryLoading || modelLoading;

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

  const atRiskPercent = summary.total_equity_12m > 0 
    ? (summary.at_risk_equity / summary.total_equity_12m) * 100 
    : 0;

  const tierData = [
    { tier: 'Platinum', count: summary.platinum_count, color: 'bg-violet-500' },
    { tier: 'Gold', count: summary.gold_count, color: 'bg-amber-500' },
    { tier: 'Silver', count: summary.silver_count, color: 'bg-slate-400' },
    { tier: 'Bronze', count: summary.bronze_count, color: 'bg-orange-600' },
  ];

  const totalTierCount = tierData.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="space-y-6">
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
              {summary.total_customers.toLocaleString()} khách hàng
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
              {atRiskPercent.toFixed(1)}% tổng equity ({summary.at_risk_count} KH)
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
