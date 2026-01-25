import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  TrendingDown, 
  ArrowRight, 
  Loader2,
  CheckCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DecayAlert {
  decay_type: string;
  population_name: string;
  current_value: number;
  previous_value: number;
  decline_percent: number;
  revenue_at_risk: number;
  severity: 'critical' | 'warning' | 'info';
  recommendation: string;
}

interface LTVDecayAlertProps {
  alerts: DecayAlert[];
  isLoading: boolean;
  onCreateDecisionCard?: (alert: DecayAlert) => void;
}

export function LTVDecayAlert({ alerts, isLoading, onCreateDecisionCard }: LTVDecayAlertProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <p className="text-sm font-medium">Không phát hiện suy giảm LTV</p>
          <p className="text-xs text-muted-foreground mt-1">
            Các cohort và segment đang ổn định
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number | null | undefined) => {
    const safeValue = value ?? 0;
    if (safeValue >= 1e9) return `${(safeValue / 1e9).toFixed(1)}B`;
    if (safeValue >= 1e6) return `${(safeValue / 1e6).toFixed(1)}M`;
    if (safeValue >= 1e3) return `${(safeValue / 1e3).toFixed(0)}K`;
    return safeValue.toFixed(0);
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          variant: 'destructive' as const,
          icon: AlertTriangle,
          bgClass: 'bg-destructive/10 border-destructive/30',
          textClass: 'text-destructive',
        };
      case 'warning':
        return {
          variant: 'default' as const,
          icon: AlertTriangle,
          bgClass: 'bg-amber-500/10 border-amber-500/30',
          textClass: 'text-amber-600',
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: Info,
          bgClass: 'bg-blue-500/10 border-blue-500/30',
          textClass: 'text-blue-600',
        };
    }
  };

  const getDecayTypeLabel = (type: string) => {
    switch (type) {
      case 'COHORT_DECAY':
        return 'Suy giảm Cohort';
      case 'TIER_IMBALANCE':
        return 'Mất cân bằng Tier';
      case 'SEGMENT_DECAY':
        return 'Suy giảm Segment';
      default:
        return type;
    }
  };

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Cảnh báo LTV Decay
          </CardTitle>
          <div className="flex gap-2">
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive">{criticalAlerts.length} Critical</Badge>
            )}
            {warningAlerts.length > 0 && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                {warningAlerts.length} Warning
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, index) => {
          const config = getSeverityConfig(alert.severity);
          const Icon = config.icon;
          
          return (
            <Alert key={index} className={cn('relative', config.bgClass)}>
              <Icon className={cn('h-4 w-4', config.textClass)} />
              <AlertTitle className="flex items-center gap-2 text-sm">
                {alert.population_name}
                <Badge variant="outline" className="text-[10px] font-normal">
                  {getDecayTypeLabel(alert.decay_type)}
                </Badge>
              </AlertTitle>
              <AlertDescription className="mt-2">
                <div className="grid grid-cols-3 gap-4 text-xs mb-3">
                  <div>
                    <span className="text-muted-foreground">Giảm</span>
                    <p className={cn('font-medium', config.textClass)}>
                      {(alert.decline_percent ?? 0).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Giá trị hiện tại</span>
                    <p className="font-medium">{formatCurrency(alert.current_value)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rủi ro doanh thu</span>
                    <p className="font-medium text-destructive">
                      {formatCurrency(alert.revenue_at_risk)}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs">
                    <Info className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="font-medium">Đề xuất: </span>
                      <span className="text-muted-foreground">{alert.recommendation}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    * Dữ liệu dựa trên phân tích cohort/segment từ {new Date().toLocaleDateString('vi-VN')}. Quyết định cuối cùng thuộc về doanh nghiệp.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-muted-foreground"
                    >
                      Bỏ qua
                    </Button>
                    {onCreateDecisionCard && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => onCreateDecisionCard(alert)}
                      >
                        Tạo Thẻ Quyết định
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          );
        })}
      </CardContent>
    </Card>
  );
}
