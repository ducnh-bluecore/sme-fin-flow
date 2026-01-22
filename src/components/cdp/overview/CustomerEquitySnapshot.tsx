import { TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface CustomerEquitySnapshotProps {
  totalEquity12M: number;
  totalEquity24M: number;
  atRiskValue: number;
  atRiskPercent: number;
  equityChange: number;
  changeDirection: 'up' | 'down' | 'stable';
  topDrivers: Array<{
    label: string;
    impact: number;
    direction: 'positive' | 'negative';
  }>;
}

export function CustomerEquitySnapshot({
  totalEquity12M,
  totalEquity24M,
  atRiskValue,
  atRiskPercent,
  equityChange,
  changeDirection,
  topDrivers
}: CustomerEquitySnapshotProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(0)}M`;
    }
    return `${(value / 1_000).toFixed(0)}K`;
  };

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
