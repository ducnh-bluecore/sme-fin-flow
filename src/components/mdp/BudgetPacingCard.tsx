import { useMemo } from 'react';
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
  Clock,
  Target,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetPacingData {
  channel: string;
  plannedBudget: number;
  actualSpend: number;
  daysElapsed: number;
  totalDays: number;
}

interface BudgetPacingCardProps {
  budgetData: BudgetPacingData[];
  totalPlannedBudget: number;
  totalActualSpend: number;
  periodLabel?: string;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
};

export function BudgetPacingCard({ 
  budgetData, 
  totalPlannedBudget, 
  totalActualSpend,
  periodLabel = 'Tháng này'
}: BudgetPacingCardProps) {
  
  const pacingMetrics = useMemo(() => {
    const daysInMonth = 30;
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysElapsed = dayOfMonth;
    const daysRemaining = daysInMonth - daysElapsed;
    
    // Expected spend based on linear pacing
    const expectedSpend = (totalPlannedBudget / daysInMonth) * daysElapsed;
    const pacingPercent = totalPlannedBudget > 0 ? (totalActualSpend / totalPlannedBudget) * 100 : 0;
    const expectedPercent = (daysElapsed / daysInMonth) * 100;
    
    // Variance analysis
    const variance = totalActualSpend - expectedSpend;
    const variancePercent = expectedSpend > 0 ? (variance / expectedSpend) * 100 : 0;
    
    // Projected end-of-month spend
    const dailyAvgSpend = daysElapsed > 0 ? totalActualSpend / daysElapsed : 0;
    const projectedTotal = dailyAvgSpend * daysInMonth;
    const projectedOverspend = projectedTotal - totalPlannedBudget;
    
    // Status determination
    let status: 'on-track' | 'underspend' | 'overspend' | 'critical';
    if (Math.abs(variancePercent) <= 10) {
      status = 'on-track';
    } else if (variancePercent < -10) {
      status = 'underspend';
    } else if (variancePercent > 20) {
      status = 'critical';
    } else {
      status = 'overspend';
    }
    
    return {
      daysElapsed,
      daysRemaining,
      expectedSpend,
      pacingPercent,
      expectedPercent,
      variance,
      variancePercent,
      dailyAvgSpend,
      projectedTotal,
      projectedOverspend,
      status,
    };
  }, [totalPlannedBudget, totalActualSpend]);

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

  const config = statusConfig[pacingMetrics.status];
  const StatusIcon = config.icon;

  // Top channels by spend
  const topChannels = useMemo(() => {
    return [...budgetData]
      .sort((a, b) => b.actualSpend - a.actualSpend)
      .slice(0, 3)
      .map(ch => {
        const pacing = ch.plannedBudget > 0 ? (ch.actualSpend / ch.plannedBudget) * 100 : 0;
        const expectedPacing = ch.totalDays > 0 ? (ch.daysElapsed / ch.totalDays) * 100 : 0;
        return {
          ...ch,
          pacing,
          expectedPacing,
          isOverspend: pacing > expectedPacing + 10,
          isUnderspend: pacing < expectedPacing - 10,
        };
      });
  }, [budgetData]);

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
              {formatCurrency(totalActualSpend)}đ / {formatCurrency(totalPlannedBudget)}đ
            </span>
          </div>
          
          <div className="relative">
            <Progress 
              value={Math.min(pacingMetrics.pacingPercent, 100)} 
              className="h-3"
            />
            {/* Expected position marker */}
            <div 
              className="absolute top-0 w-0.5 h-3 bg-foreground/50"
              style={{ left: `${pacingMetrics.expectedPercent}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Ngày {pacingMetrics.daysElapsed}/30</span>
            <span>
              {pacingMetrics.pacingPercent.toFixed(0)}% đã chi 
              (kỳ vọng: {pacingMetrics.expectedPercent.toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* Variance Alert */}
        {pacingMetrics.status !== 'on-track' && (
          <div className={cn(
            "p-3 rounded-lg border text-sm",
            config.bgColor,
            config.borderColor
          )}>
            <div className="flex items-start gap-2">
              <StatusIcon className={cn("h-4 w-4 mt-0.5", config.color)} />
              <div>
                <span className={cn("font-medium", config.color)}>
                  {pacingMetrics.variance > 0 ? '+' : ''}{formatCurrency(pacingMetrics.variance)}đ
                </span>
                <span className="text-muted-foreground ml-1">
                  ({pacingMetrics.variancePercent > 0 ? '+' : ''}{pacingMetrics.variancePercent.toFixed(0)}% so với kế hoạch)
                </span>
                {pacingMetrics.projectedOverspend > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Dự kiến cuối tháng: {formatCurrency(pacingMetrics.projectedTotal)}đ 
                    (vượt {formatCurrency(pacingMetrics.projectedOverspend)}đ)
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
            <p className="text-sm font-medium">{formatCurrency(pacingMetrics.dailyAvgSpend)}đ</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Còn lại</p>
            <p className="text-sm font-medium">{formatCurrency(totalPlannedBudget - totalActualSpend)}đ</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Còn {pacingMetrics.daysRemaining} ngày</p>
            <p className="text-sm font-medium">
              {formatCurrency((totalPlannedBudget - totalActualSpend) / Math.max(pacingMetrics.daysRemaining, 1))}đ/ngày
            </p>
          </div>
        </div>

        {/* Top Channels Pacing */}
        {topChannels.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Pacing theo kênh</p>
            <div className="space-y-2">
              {topChannels.map((channel) => (
                <div key={channel.channel} className="flex items-center gap-2">
                  <span className="text-xs w-16 truncate">{channel.channel}</span>
                  <div className="flex-1 relative">
                    <Progress 
                      value={Math.min(channel.pacing, 100)} 
                      className={cn(
                        "h-1.5",
                        channel.isOverspend && "[&>div]:bg-yellow-500",
                        channel.isUnderspend && "[&>div]:bg-blue-500"
                      )}
                    />
                  </div>
                  <span className={cn(
                    "text-xs w-12 text-right",
                    channel.isOverspend && "text-yellow-400",
                    channel.isUnderspend && "text-blue-400"
                  )}>
                    {channel.pacing.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
