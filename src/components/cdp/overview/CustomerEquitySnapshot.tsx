import { TrendingDown, TrendingUp, AlertTriangle, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCDPEquitySnapshot } from '@/hooks/useCDPEquity';
import { Skeleton } from '@/components/ui/skeleton';

export function CustomerEquitySnapshot() {
  const navigate = useNavigate();
  const { data: equityData, isLoading, error } = useCDPEquitySnapshot();

  const formatCurrency = (value: number | null | undefined) => {
    // Handle null/undefined/NaN values
    if (value == null || isNaN(value)) {
      return '0';
    }
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

  // NO FALLBACK VALUES - Show empty state when data is missing
  if (!equityData || error) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Giá trị Khách hàng</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Database className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Chưa có dữ liệu Customer Equity
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Import dữ liệu khách hàng và đơn hàng để tính toán giá trị LTV
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/connectors')}
            >
              Kết nối dữ liệu
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use ONLY real data from DB - with null-safe defaults for display
  const totalEquity12M = equityData.total_equity_12m ?? 0;
  const totalEquity24M = equityData.total_equity_24m ?? 0;
  const atRiskValue = equityData.at_risk_value ?? 0;
  const atRiskPercent = equityData.at_risk_percent ?? 0;
  const equityChange = equityData.equity_change ?? 0;
  const changeDirection = equityData.change_direction ?? 'stable';
  const topDrivers = equityData.top_drivers || [];

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
              <span>{changeDirection === 'up' ? '+' : ''}{(equityChange ?? 0).toFixed(1)}% vs kỳ trước</span>
            </div>
          </div>

          {/* Total Equity 24M - Marked as forecast */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tổng Equity (24 tháng) <span className="text-warning">(Dự báo)</span></p>
            <p className="text-xl font-bold text-muted-foreground">₫{formatCurrency(totalEquity24M)}</p>
            <p className="text-xs text-muted-foreground mt-1">Dự báo mở rộng</p>
          </div>

          {/* At-Risk Value */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Giá trị Rủi ro</p>
            <p className="text-xl font-bold text-destructive">₫{formatCurrency(atRiskValue)}</p>
            <div className="flex items-center gap-1 text-xs text-destructive mt-1">
              <AlertTriangle className="w-3 h-3" />
              <span>{(atRiskPercent ?? 0).toFixed(1)}% tổng equity</span>
            </div>
          </div>

          {/* Top Drivers */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Động lực chính</p>
            {topDrivers.length > 0 ? (
              <div className="space-y-1">
                {topDrivers.slice(0, 3).map((driver, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">{driver.factor}</span>
                    <span className={driver.direction === 'positive' ? 'text-success' : 'text-destructive'}>
                      {driver.direction === 'positive' ? '+' : ''}{driver.impact?.toFixed(1) || 0}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
