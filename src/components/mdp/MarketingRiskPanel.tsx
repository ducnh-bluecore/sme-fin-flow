import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertTriangle, 
  Flame,
  TrendingDown,
  Target,
  Info,
  ArrowRight,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { MarketingRiskAlert } from '@/hooks/useMarketingProfitability';
import { cn } from '@/lib/utils';

interface MarketingRiskPanelProps {
  alerts: MarketingRiskAlert[];
  onAction?: (alert: MarketingRiskAlert) => void;
}

export function MarketingRiskPanel({ alerts, onAction }: MarketingRiskPanelProps) {
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    }
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  const getAlertIcon = (type: MarketingRiskAlert['type']) => {
    switch (type) {
      case 'burning_cash':
        return <Flame className="h-4 w-4" />;
      case 'negative_margin':
        return <XCircle className="h-4 w-4" />;
      case 'low_roas':
        return <TrendingDown className="h-4 w-4" />;
      case 'high_cac':
        return <Target className="h-4 w-4" />;
      case 'fake_growth':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertConfig = (type: MarketingRiskAlert['type'], severity: MarketingRiskAlert['severity']) => {
    const baseConfig = {
      burning_cash: { label: 'Đốt tiền', color: 'orange' },
      negative_margin: { label: 'Margin âm', color: 'red' },
      low_roas: { label: 'ROAS thấp', color: 'yellow' },
      high_cac: { label: 'CAC cao', color: 'orange' },
      fake_growth: { label: 'Tăng trưởng giả', color: 'red' },
    };

    const config = baseConfig[type] || { label: 'Cảnh báo', color: 'yellow' };
    
    if (severity === 'critical') {
      return {
        ...config,
        bgClass: 'bg-red-500/10 border-red-500/30',
        textClass: 'text-red-400',
        badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
      };
    }
    
    return {
      ...config,
      bgClass: 'bg-yellow-500/10 border-yellow-500/30',
      textClass: 'text-yellow-400',
      badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
  };

  let totalImpact = 0;
  let criticalCount = 0;
  for (const a of alerts) { totalImpact += a.impact_amount; if (a.severity === 'critical') criticalCount++; }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">Marketing Risk Alerts</CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">Control Tower Feed</p>
                <p className="text-xs text-muted-foreground">
                  MDP ưu tiên phát hiện: marketing đốt tiền, tăng trưởng giả,
                  doanh thu làm chết cashflow. Mỗi alert phải có: mất bao nhiêu tiền?
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {alerts.length > 0 && (
            <div className="flex gap-2">
              {criticalCount > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {criticalCount} nguy hiểm
                </Badge>
              )}
              <Badge variant="outline">
                {alerts.length} cảnh báo
              </Badge>
            </div>
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
              Nếu không xử lý, có thể mất thêm tiền từ các campaign có vấn đề
            </p>
          </div>
        )}

        {/* Alert List */}
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <Target className="h-6 w-6 text-green-400" />
              </div>
              <p className="text-sm font-medium text-green-400">Không có cảnh báo</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tất cả campaigns đang hoạt động bình thường
              </p>
            </div>
          ) : (
            alerts.slice(0, 7).map((alert, index) => {
              const config = getAlertConfig(alert.type, alert.severity);
              return (
                <div 
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border transition-colors hover:bg-muted/10",
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
                        </div>
                        <p className="text-sm font-medium truncate">
                          {alert.campaign_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("text-sm font-bold", config.textClass)}>
                        -{formatCurrency(alert.impact_amount)}đ
                      </p>
                      {onAction && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 mt-1 text-xs"
                          onClick={() => onAction(alert)}
                        >
                          Xử lý <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {alerts.length > 7 && (
          <p className="text-xs text-center text-muted-foreground">
            Và {alerts.length - 7} cảnh báo khác...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
