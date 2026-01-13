import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  MousePointer,
} from 'lucide-react';
import { ExecutionAlert } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';

interface ExecutionAlertsPanelProps {
  alerts: ExecutionAlert[];
}

export function ExecutionAlertsPanel({ alerts }: ExecutionAlertsPanelProps) {
  const getAlertIcon = (type: ExecutionAlert['type']) => {
    switch (type) {
      case 'cpa_spike':
        return <TrendingUp className="h-4 w-4" />;
      case 'funnel_drop':
        return <TrendingDown className="h-4 w-4" />;
      case 'spend_spike':
        return <AlertTriangle className="h-4 w-4" />;
      case 'ctr_low':
        return <MousePointer className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertConfig = (type: ExecutionAlert['type'], severity: ExecutionAlert['severity']) => {
    const labels: Record<ExecutionAlert['type'], string> = {
      cpa_spike: 'CPA tăng',
      funnel_drop: 'Funnel drop',
      spend_spike: 'Spend tăng',
      ctr_low: 'CTR thấp',
    };

    if (severity === 'warning') {
      return {
        label: labels[type],
        bgClass: 'bg-yellow-500/10 border-yellow-500/30',
        textClass: 'text-yellow-400',
        badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      };
    }
    
    return {
      label: labels[type],
      bgClass: 'bg-blue-500/10 border-blue-500/30',
      textClass: 'text-blue-400',
      badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
  };

  return (
    <Card className="border-blue-500/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-lg">Execution Alerts</CardTitle>
          </div>
          {alerts.length > 0 ? (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
              {alerts.length} alerts
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
              All clear
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Chỉ ảnh hưởng performance, không chạm cash/margin (CMO Mode xử lý)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            </div>
            <p className="text-sm font-medium text-green-400">Không có cảnh báo</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tất cả metrics đang ổn định
            </p>
          </div>
        ) : (
          alerts.slice(0, 5).map((alert, index) => {
            const config = getAlertConfig(alert.type, alert.severity);
            return (
              <div 
                key={index}
                className={cn(
                  "p-3 rounded-lg border transition-colors hover:bg-muted/10",
                  config.bgClass
                )}
              >
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
                  {alert.change_percent !== 0 && (
                    <div className="text-right shrink-0">
                      <p className={cn("text-sm font-bold", config.textClass)}>
                        {alert.change_percent > 0 ? '+' : ''}{alert.change_percent.toFixed(0)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {alerts.length > 5 && (
          <p className="text-xs text-center text-muted-foreground">
            Và {alerts.length - 5} alerts khác...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
