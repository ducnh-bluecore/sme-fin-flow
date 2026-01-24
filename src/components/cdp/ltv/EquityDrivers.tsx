import { TrendingDown, TrendingUp, Info, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCDPEquityDrivers, EquityDriver } from '@/hooks/useCDPEquity';

export function EquityDrivers() {
  const { data: driversData, isLoading, error } = useCDPEquityDrivers();

  const formatPercent = (value: number | null) => {
    if (value === null) return '—';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getDirectionIcon = (direction: string) => {
    if (direction === 'positive') {
      return <TrendingUp className="h-5 w-5 text-success" />;
    }
    if (direction === 'negative') {
      return <TrendingDown className="h-5 w-5 text-destructive" />;
    }
    return <Info className="h-5 w-5 text-muted-foreground" />;
  };

  const getImpactBadge = (impact: number | null) => {
    if (impact === null) return null;
    const absImpact = Math.abs(impact);
    if (absImpact >= 50) {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Rất cao</Badge>;
    }
    if (absImpact >= 25) {
      return <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/20">Cao</Badge>;
    }
    if (absImpact >= 10) {
      return <Badge variant="outline" className="bg-info/10 text-info border-info/20">Trung bình</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Thấp</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yếu tố Ảnh hưởng</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Không thể tải dữ liệu drivers</p>
        </CardContent>
      </Card>
    );
  }

  const drivers = driversData || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yếu tố Ảnh hưởng đến Customer Equity</CardTitle>
          <CardDescription>
            So sánh equity giữa các nhóm khách hàng theo hành vi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {drivers.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Chưa đủ dữ liệu để phân tích drivers. Cần ít nhất 50 khách hàng có equity.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {drivers.map((driver, index) => (
                <div
                  key={`${driver.factor}-${index}`}
                  className={`p-4 rounded-lg border ${
                    driver.direction === 'positive' 
                      ? 'border-success/30 bg-success/5' 
                      : driver.direction === 'negative'
                      ? 'border-destructive/30 bg-destructive/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getDirectionIcon(driver.direction)}
                      <span className="font-medium">{driver.factor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getImpactBadge(driver.impact_percent)}
                      <span className={`text-lg font-bold ${
                        driver.impact_percent && driver.impact_percent >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {formatPercent(driver.impact_percent)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {driver.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Phương pháp:</strong> So sánh equity trung bình giữa nhóm hành vi tốt vs. kém để xác định mức ảnh hưởng.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
