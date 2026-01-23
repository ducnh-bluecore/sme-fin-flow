import { TrendingUp, TrendingDown, AlertTriangle, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCDPEquityOverview } from '@/hooks/useCDPEquity';
import { Skeleton } from '@/components/ui/skeleton';

interface EquityKPICardsProps {
  timeframe?: '12' | '24';
}

export function EquityKPICards({ timeframe = '12' }: EquityKPICardsProps) {
  const { data: equityData, isLoading } = useCDPEquityOverview();

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(0)} triệu`;
    }
    return value.toLocaleString('vi-VN') + ' đ';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalEquity = timeframe === '12' 
    ? (equityData?.total_equity_12m || 45000000000)
    : (equityData?.total_equity_24m || 72000000000);
  const equityChange = equityData?.equity_change || 12.5;
  const atRiskValue = equityData?.at_risk_value || 8100000000;
  const atRiskPercent = equityData?.at_risk_percent || 18;
  const isPositiveChange = equityChange >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Total Equity */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Tổng Giá trị Kỳ vọng ({timeframe} tháng)
              </p>
              <p className="text-3xl font-bold text-primary">
                ₫{formatCurrency(totalEquity)}
              </p>
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                isPositiveChange ? 'text-success' : 'text-destructive'
              }`}>
                {isPositiveChange ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>
                  {isPositiveChange ? '+' : ''}{equityChange.toFixed(1)}% so với kỳ trước
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Doanh thu dự kiến thu được từ tập khách hàng hiện tại trong {timeframe} tháng tới
          </p>
        </CardContent>
      </Card>

      {/* At-Risk Value */}
      <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Giá trị Đang có Rủi ro
              </p>
              <p className="text-3xl font-bold text-warning-foreground">
                ₫{formatCurrency(atRiskValue)}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm text-warning-foreground">
                <AlertTriangle className="w-4 h-4" />
                <span>{atRiskPercent.toFixed(1)}% tổng giá trị</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-warning-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Giá trị có nguy cơ suy giảm nếu hành vi hiện tại tiếp diễn
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
