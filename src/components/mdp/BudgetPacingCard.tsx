import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnifiedChannelMetrics } from '@/hooks/useUnifiedChannelMetrics';

interface BudgetPacingCardProps {
  periodLabel?: string;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
};

export function BudgetPacingCard({ periodLabel = 'Tháng này' }: BudgetPacingCardProps) {
  // SINGLE SOURCE OF TRUTH: useUnifiedChannelMetrics
  const { channelMetrics, summary, isLoading } = useUnifiedChannelMetrics();

  const statusConfig = {
    'on-track': {
      label: 'Đúng tiến độ',
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
    'underspend': {
      label: 'Chưa đạt',
      icon: TrendingDown,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    'overspend': {
      label: 'Vượt kế hoạch',
      icon: TrendingUp,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    },
    'critical': {
      label: 'Cảnh báo!',
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    },
  };

  const config = statusConfig[summary.status];
  const StatusIcon = config.icon;

  if (isLoading) {
    return (
      <Card className="border">
        <CardContent className="py-8 text-center text-muted-foreground">
          Đang tải...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border", config.borderColor, config.bgColor)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Budget Pacing</CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  So sánh chi tiêu thực tế vs kế hoạch theo thời gian. 
                  Giúp kiểm soát ngân sách và tránh overspend/underspend.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge className={cn("gap-1", config.bgColor, config.color, config.borderColor)}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{periodLabel}</span>
            <span className="font-medium">
              {formatCurrency(summary.totalActualSpend)}đ / {formatCurrency(summary.totalPlannedBudget)}đ
            </span>
          </div>
          
          <div className="relative">
            <Progress 
              value={Math.min(summary.overallPacing, 100)} 
              className="h-3"
            />
            {/* Expected position marker */}
            <div 
              className="absolute top-0 w-0.5 h-3 bg-foreground/50"
              style={{ left: `${summary.expectedPacing}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Ngày {summary.daysElapsed}/30</span>
            <span>
              {summary.overallPacing.toFixed(0)}% đã chi 
              (kỳ vọng: {summary.expectedPacing.toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* Variance Alert */}
        {summary.status !== 'on-track' && (
          <div className={cn(
            "p-3 rounded-lg border text-sm",
            config.bgColor,
            config.borderColor
          )}>
            <div className="flex items-start gap-2">
              <StatusIcon className={cn("h-4 w-4 mt-0.5", config.color)} />
              <div>
                <span className={cn("font-medium", config.color)}>
                  {summary.variance > 0 ? '+' : ''}{formatCurrency(summary.variance)}đ
                </span>
                <span className="text-muted-foreground ml-1">
                  ({summary.variancePercent > 0 ? '+' : ''}{summary.variancePercent.toFixed(0)}% so với kế hoạch)
                </span>
                {summary.projectedOverspend > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Dự kiến cuối tháng: {formatCurrency(summary.projectedTotal)}đ 
                    (vượt {formatCurrency(summary.projectedOverspend)}đ)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Chi/ngày TB</p>
            <p className="text-sm font-medium">{formatCurrency(summary.dailyAvgSpend)}đ</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Còn lại</p>
            <p className="text-sm font-medium">{formatCurrency(summary.totalPlannedBudget - summary.totalActualSpend)}đ</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Còn {summary.daysRemaining} ngày</p>
            <p className="text-sm font-medium">
              {formatCurrency((summary.totalPlannedBudget - summary.totalActualSpend) / Math.max(summary.daysRemaining, 1))}đ/ngày
            </p>
          </div>
        </div>

        {/* Top Channels Pacing */}
        {channelMetrics.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Pacing theo kênh</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {channelMetrics.map((channel) => {
                const progressValue = channel.pacing === null ? 0 : Math.min(channel.pacing, 100);
                const pacingLabel = channel.pacing === null ? '—' : `${channel.pacing.toFixed(0)}%`;
                const isOverspend = channel.status === 'overspend' || channel.status === 'critical';
                const isUnderspend = channel.status === 'underspend';

                return (
                  <div key={channel.channel} className="flex items-center gap-2">
                    <span className="text-xs w-20 truncate">{channel.displayName}</span>
                    <div className="flex-1 relative">
                      <Progress 
                        value={progressValue}
                        className={cn(
                          "h-1.5",
                          channel.pacing === null && "opacity-40",
                          isOverspend && "[&>div]:bg-yellow-500",
                          isUnderspend && "[&>div]:bg-blue-500"
                        )}
                      />
                    </div>
                    <span className={cn(
                      "text-xs w-12 text-right",
                      channel.pacing === null && "text-muted-foreground",
                      isOverspend && "text-yellow-400",
                      isUnderspend && "text-blue-400"
                    )}>
                      {pacingLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
