import { TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCDPEquitySnapshot } from '@/hooks/useCDPEquity';
import { Skeleton } from '@/components/ui/skeleton';

export function CustomerEquitySnapshot() {
  const navigate = useNavigate();
  const { data: equityData, isLoading } = useCDPEquitySnapshot();

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(0)}M`;
    }
    return `${(value / 1_000).toFixed(0)}K`;
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i}>
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use data from hook or fallback
  const totalEquity12M = equityData?.total_equity_12m || 45000000000;
  const totalEquity24M = equityData?.total_equity_24m || 72000000000;
  const atRiskValue = equityData?.at_risk_value || 8100000000;
  const atRiskPercent = equityData?.at_risk_percent || 18;
  const equityChange = equityData?.equity_change || 12.5;
  const changeDirection = equityData?.change_direction || 'up';
  const topDrivers = equityData?.top_drivers || [
    { label: 'Churn Rate tăng', impact: -2500000000, direction: 'negative' as const },
    { label: 'Upsell thành công', impact: 1800000000, direction: 'positive' as const },
    { label: 'Dormant customers', impact: -1200000000, direction: 'negative' as const },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Giá trị Khách hàng</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground"
            onClick={() => navigate('/cdp/equity')}
          >
            Chi tiết →
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Total Equity 12M */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tổng Equity (12 tháng)</p>
            <p className="text-xl font-bold">₫{formatCurrency(totalEquity12M)}</p>
            <div className={`flex items-center gap-1 text-xs mt-1 ${
              changeDirection === 'up' ? 'text-success' : 
              changeDirection === 'down' ? 'text-destructive' : 
              'text-muted-foreground'
            }`}>
              {changeDirection === 'up' && <TrendingUp className="w-3 h-3" />}
              {changeDirection === 'down' && <TrendingDown className="w-3 h-3" />}
              <span>{changeDirection === 'up' ? '+' : ''}{equityChange.toFixed(1)}% vs kỳ trước</span>
            </div>
          </div>

          {/* Total Equity 24M */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tổng Equity (24 tháng)</p>
            <p className="text-xl font-bold text-muted-foreground">₫{formatCurrency(totalEquity24M)}</p>
            <p className="text-xs text-muted-foreground mt-1">Dự báo mở rộng</p>
          </div>

          {/* At-Risk Value */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Giá trị Rủi ro</p>
            <p className="text-xl font-bold text-destructive">₫{formatCurrency(atRiskValue)}</p>
            <div className="flex items-center gap-1 text-xs text-destructive mt-1">
              <AlertTriangle className="w-3 h-3" />
              <span>{atRiskPercent.toFixed(1)}% tổng equity</span>
            </div>
          </div>

          {/* Top Drivers */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Động lực chính</p>
            <div className="space-y-1">
              {topDrivers.slice(0, 3).map((driver, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{driver.label}</span>
                  <span className={driver.direction === 'positive' ? 'text-success' : 'text-destructive'}>
                    {driver.direction === 'positive' ? '+' : ''}₫{formatCurrency(Math.abs(driver.impact))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
