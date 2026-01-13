import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertTriangle, 
  XCircle,
  Flame,
  TrendingDown,
  Zap,
  Target,
  Info,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { MarketingRiskAlert } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';

interface RiskAlertsPanelProps {
  alerts: MarketingRiskAlert[];
  onAction?: (alert: MarketingRiskAlert) => void;
}

export function RiskAlertsPanel({ alerts, onAction }: RiskAlertsPanelProps) {
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const getAlertIcon = (type: MarketingRiskAlert['type']) => {
    switch (type) {
      case 'negative_margin':
        return <XCircle className="h-4 w-4" />;
      case 'burning_cash':
        return <Flame className="h-4 w-4" />;
      case 'cac_exceeds_ltv':
        return <TrendingDown className="h-4 w-4" />;
      case 'cash_runway_impact':
        return <Zap className="h-4 w-4" />;
      case 'fake_growth':
        return <Target className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertConfig = (type: MarketingRiskAlert['type'], severity: MarketingRiskAlert['severity']) => {
    const labels: Record<MarketingRiskAlert['type'], string> = {
      negative_margin: 'Margin âm',
      burning_cash: 'Đốt tiền',
      cac_exceeds_ltv: 'CAC > LTV',
      cash_runway_impact: 'Ảnh hưởng cash',
      fake_growth: 'Tăng trưởng giả',
    };

    if (severity === 'critical') {
      return {
        label: labels[type],
        bgClass: 'bg-red-500/10 border-red-500/30',
        textClass: 'text-red-400',
        badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
      };
    }
    
    return {
      label: labels[type],
      bgClass: 'bg-yellow-500/10 border-yellow-500/30',
      textClass: 'text-yellow-400',
      badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
  };

  const totalImpact = alerts.reduce((sum, a) => sum + a.impact_amount, 0);
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-purple-400" />
            <CardTitle className="text-lg">Marketing Risk Alerts</CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">Feed to Control Tower</p>
                <p className="text-xs text-muted-foreground">
                  Alerts này đi thẳng vào Control Tower. CFO & CEO nhìn thấy. CMO chịu trách nhiệm.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {alerts.length > 0 ? (
            <div className="flex gap-2">
              {criticalCount > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {criticalCount} critical
                </Badge>
              )}
              <Badge variant="outline">
                {alerts.length} risks
              </Badge>
            </div>
          ) : (
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
              No risks
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Impact Summary */}
        {alerts.length > 0 && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng thiệt hại tiềm năng</p>
                <p className="text-2xl font-bold text-destructive">
                  -{formatCurrency(totalImpact)}đ
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Cần quyết định từ CMO: Stop / Reduce / Continue với điều kiện
            </p>
          </div>
        )}

        {/* Alert List */}
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
              <p className="text-sm font-medium text-green-400">Không có rủi ro marketing</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tất cả campaigns đang có margin & cash flow tốt
              </p>
            </div>
          ) : (
            alerts.map((alert, index) => {
              const config = getAlertConfig(alert.type, alert.severity);
              return (
                <div 
                  key={index}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    config.bgClass
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5", config.textClass)}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn("text-xs", config.badgeClass)}>
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {alert.channel}
                          </Badge>
                          {alert.severity === 'critical' && (
                            <Badge className="bg-red-500 text-white text-xs">
                              CRITICAL
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">
                          {alert.campaign_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.message}
                        </p>
                        <p className="text-xs text-primary mt-2 font-medium">
                          → {alert.recommended_action}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("text-lg font-bold", config.textClass)}>
                        -{formatCurrency(alert.impact_amount)}đ
                      </p>
                      {onAction && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 mt-2 text-xs"
                          onClick={() => onAction(alert)}
                        >
                          Quyết định <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Control Tower Feed Notice */}
        {alerts.length > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">Auto-feed to Control Tower:</span> {alerts.length} marketing risks đã được gửi. CEO/CFO có thể xem trong Control Tower.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
