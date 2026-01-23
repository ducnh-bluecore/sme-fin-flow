import { TrendingDown, TrendingUp, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useCDPEquityDrivers } from '@/hooks/useCDPEquity';

interface EquityDriverUI {
  id: string;
  factor: string;
  description: string;
  impact: number;
  direction: 'up' | 'down';
  severity: 'high' | 'medium' | 'low';
  trend: string;
  relatedInsightId?: string;
}

export function EquityDriversList() {
  const navigate = useNavigate();
  const { data: driversData, isLoading } = useCDPEquityDrivers();

  // Transform database data to UI format
  const drivers: EquityDriverUI[] = (driversData || []).map(d => ({
    id: d.driver_id,
    factor: d.factor,
    description: d.description,
    impact: d.impact,
    direction: d.direction,
    severity: d.severity,
    trend: d.trend,
    relatedInsightId: d.related_insight_id || undefined,
  }));

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1_000_000_000) {
      return `${(absValue / 1_000_000_000).toFixed(1)} tỷ`;
    }
    if (absValue >= 1_000_000) {
      return `${(absValue / 1_000_000).toFixed(0)}M`;
    }
    return absValue.toLocaleString('vi-VN');
  };

  const getSeverityStyles = (severity: EquityDriverUI['severity'], direction: 'up' | 'down') => {
    if (direction === 'up') {
      return 'border-success/30 bg-success/5';
    }
    switch (severity) {
      case 'high':
        return 'border-destructive/30 bg-destructive/5';
      case 'medium':
        return 'border-warning/30 bg-warning/5';
      default:
        return 'border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const negativeDrivers = drivers.filter(d => d.direction === 'down');
  const positiveDrivers = drivers.filter(d => d.direction === 'up');

  return (
    <div className="space-y-6">
      {/* Explainer */}
      <Card className="border-border bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">
                Động lực Ảnh hưởng Giá trị Khách hàng
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Các yếu tố dưới đây đang góp phần làm tăng hoặc giảm tổng giá trị kỳ vọng từ 
                tập khách hàng. Mức ảnh hưởng được ước tính dựa trên mô hình LTV hiện tại.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {drivers.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Chưa có dữ liệu về các yếu tố ảnh hưởng</p>
          </CardContent>
        </Card>
      )}

      {/* Negative Drivers */}
      {negativeDrivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-destructive" />
              Yếu tố có Tác động Tiêu cực
            </CardTitle>
            <CardDescription>
              Các yếu tố đang góp phần làm giảm giá trị kỳ vọng từ tập khách hàng
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {negativeDrivers.map((driver) => (
              <div 
                key={driver.id} 
                className={`p-4 rounded-lg border ${getSeverityStyles(driver.severity, driver.direction)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{driver.factor}</h4>
                      <Badge 
                        variant="outline" 
                        className={
                          driver.severity === 'high' 
                            ? 'bg-destructive/10 text-destructive border-destructive/20' 
                            : driver.severity === 'medium'
                            ? 'bg-warning/10 text-warning-foreground border-warning/20'
                            : ''
                        }
                      >
                        {driver.severity === 'high' ? 'Cao' : driver.severity === 'medium' ? 'TB' : 'Thấp'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{driver.description}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Xu hướng:</span> {driver.trend}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-destructive">
                      -₫{formatCurrency(Math.abs(driver.impact))}
                    </p>
                    <p className="text-xs text-muted-foreground">ảnh hưởng</p>
                    {driver.relatedInsightId && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 text-xs"
                        onClick={() => navigate(`/cdp/insights/${driver.relatedInsightId}`)}
                      >
                        Xem Insight
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Positive Drivers */}
      {positiveDrivers.length > 0 && (
        <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            Yếu tố có Tác động Tích cực
          </CardTitle>
          <CardDescription>
            Các yếu tố đang góp phần duy trì hoặc gia tăng giá trị kỳ vọng
          </CardDescription>
        </CardHeader>
          <CardContent className="space-y-3">
            {positiveDrivers.map((driver) => (
              <div 
                key={driver.id} 
                className={`p-4 rounded-lg border ${getSeverityStyles(driver.severity, driver.direction)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{driver.factor}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{driver.description}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Xu hướng:</span> {driver.trend}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-success">
                      +₫{formatCurrency(driver.impact)}
                    </p>
                    <p className="text-xs text-muted-foreground">ảnh hưởng</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {drivers.length > 0 && (
        <Card className="border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Tổng hợp Ảnh hưởng ròng</p>
                <p className="text-xs text-muted-foreground">
                  Tổng tác động của các yếu tố trên đến Customer Equity
                </p>
              </div>
              <div className="text-right">
                {(() => {
                  const netImpact = drivers.reduce((sum, d) => sum + d.impact, 0);
                  const isNegative = netImpact < 0;
                  return (
                    <>
                      <p className={`text-xl font-bold ${isNegative ? 'text-destructive' : 'text-success'}`}>
                        {isNegative ? '-' : '+'}₫{formatCurrency(Math.abs(netImpact))}
                      </p>
                      <p className="text-xs text-muted-foreground">ảnh hưởng ròng</p>
                    </>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}