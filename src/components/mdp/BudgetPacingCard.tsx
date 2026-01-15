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
import { useChannelBudgets } from '@/hooks/useChannelBudgets';

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
  totalPlannedBudget: fallbackPlannedBudget, 
  totalActualSpend,
  periodLabel = 'Tháng này'
}: BudgetPacingCardProps) {
  // Get channel budgets from database as source of truth
  const { budgets, budgetsMap } = useChannelBudgets();
  
  const hasConfiguredBudgets = useMemo(() => {
    return budgets.some(b => b.is_active && (b.budget_amount || 0) > 0);
  }, [budgets]);

  // Total planned budget: single source of truth = active channel_budgets
  const totalPlannedBudget = useMemo(() => {
    if (!hasConfiguredBudgets) return fallbackPlannedBudget;
    return budgets
      .filter(b => b.is_active)
      .reduce((sum, b) => sum + (b.budget_amount || 0), 0);
  }, [budgets, fallbackPlannedBudget, hasConfiguredBudgets]);

  // Total actual spend MUST match the same set of channels included in planned budget
  const effectiveActualSpend = useMemo(() => {
    if (!hasConfiguredBudgets) return totalActualSpend;

    const normalizeChannel = (channel: string): string => {
      const lower = channel?.toLowerCase() || 'unknown';
      if (lower.includes('facebook') || lower.includes('fb') || lower.includes('meta')) return 'facebook';
      if (lower.includes('google') || lower.includes('gg')) return 'google';
      if (lower.includes('shopee')) return 'shopee';
      if (lower.includes('lazada')) return 'lazada';
      if (lower.includes('tiktok') || lower.includes('tik')) return 'tiktok';
      if (lower.includes('website') || lower.includes('direct')) return 'website';
      if (lower.includes('offline') || lower.includes('retail')) return 'offline';
      return lower;
    };

    const activeChannels = new Set(
      budgets.filter(b => b.is_active).map(b => b.channel.toLowerCase())
    );

    return budgetData.reduce((sum, row) => {
      const ch = normalizeChannel(row.channel);
      if (!activeChannels.has(ch)) return sum;
      return sum + (row.actualSpend || 0);
    }, 0);
  }, [hasConfiguredBudgets, budgets, budgetData, totalActualSpend]);
  
  const pacingMetrics = useMemo(() => {
    const daysInMonth = 30;
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysElapsed = dayOfMonth;
    const daysRemaining = daysInMonth - daysElapsed;
    
    // Expected spend based on linear pacing
    const expectedSpend = (totalPlannedBudget / daysInMonth) * daysElapsed;
    const pacingPercent = totalPlannedBudget > 0 ? (effectiveActualSpend / totalPlannedBudget) * 100 : 0;
    const expectedPercent = (daysElapsed / daysInMonth) * 100;
    
    // Variance analysis
    const variance = effectiveActualSpend - expectedSpend;
    const variancePercent = expectedSpend > 0 ? (variance / expectedSpend) * 100 : 0;
    
    // Projected end-of-month spend
    const dailyAvgSpend = daysElapsed > 0 ? effectiveActualSpend / daysElapsed : 0;
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
  }, [totalPlannedBudget, effectiveActualSpend]);

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

  // Display name mapping for channels
  const getChannelDisplayName = (channel: string): string => {
    const lower = channel?.toLowerCase() || '';
    if (lower === 'all' || lower.includes('multi')) return 'Đa kênh';
    if (lower.includes('facebook') || lower.includes('fb')) return 'Facebook';
    if (lower.includes('google')) return 'Google';
    if (lower.includes('shopee')) return 'Shopee';
    if (lower.includes('lazada')) return 'Lazada';
    if (lower.includes('tiktok')) return 'TikTok';
    if (lower.includes('sendo')) return 'Sendo';
    return channel.charAt(0).toUpperCase() + channel.slice(1);
  };

  // All channels by spend - merge with channel_budgets data
  const allChannels = useMemo(() => {
    // Normalize channel name
    const normalizeChannel = (channel: string): string => {
      const lower = channel?.toLowerCase() || 'unknown';
      if (lower.includes('facebook') || lower.includes('fb') || lower.includes('meta')) return 'facebook';
      if (lower.includes('google') || lower.includes('gg')) return 'google';
      if (lower.includes('shopee')) return 'shopee';
      if (lower.includes('lazada')) return 'lazada';
      if (lower.includes('tiktok') || lower.includes('tik')) return 'tiktok';
      if (lower.includes('website') || lower.includes('direct')) return 'website';
      if (lower.includes('offline') || lower.includes('retail')) return 'offline';
      return lower;
    };

    return [...budgetData]
      .map(ch => {
        const normalizedChannel = normalizeChannel(ch.channel);
        const configuredBudget = budgetsMap.get(normalizedChannel);

        const plannedBudget = hasConfiguredBudgets
          ? (configuredBudget?.is_active ? (configuredBudget.budget_amount || 0) : 0)
          : (configuredBudget?.budget_amount || ch.plannedBudget);

        const hasBudget = plannedBudget > 0;
        const pacing = hasBudget ? (ch.actualSpend / plannedBudget) * 100 : null;
        const expectedPacing = ch.totalDays > 0 ? (ch.daysElapsed / ch.totalDays) * 100 : 0;

        const isOverspend = hasBudget ? (pacing! > expectedPacing + 10) : false;
        const isUnderspend = hasBudget ? (pacing! < expectedPacing - 10) : false;

        return {
          ...ch,
          displayName: getChannelDisplayName(ch.channel),
          plannedBudget,
          pacing,
          expectedPacing,
          isOverspend,
          isUnderspend,
          isConfigured: !!configuredBudget?.is_active,
          hasBudget,
        };
      })
      .sort((a, b) => b.actualSpend - a.actualSpend);
  }, [budgetData, budgetsMap, hasConfiguredBudgets]);

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
              {formatCurrency(effectiveActualSpend)}đ / {formatCurrency(totalPlannedBudget)}đ
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
            <p className="text-sm font-medium">{formatCurrency(totalPlannedBudget - effectiveActualSpend)}đ</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Còn {pacingMetrics.daysRemaining} ngày</p>
            <p className="text-sm font-medium">
              {formatCurrency((totalPlannedBudget - effectiveActualSpend) / Math.max(pacingMetrics.daysRemaining, 1))}đ/ngày
            </p>
          </div>
        </div>

        {/* Top Channels Pacing */}
        {allChannels.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Pacing theo kênh</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allChannels.map((channel) => {
                const progressValue = channel.pacing === null ? 0 : Math.min(channel.pacing, 100);
                const pacingLabel = channel.pacing === null ? '—' : `${channel.pacing.toFixed(0)}%`;

                return (
                  <div key={channel.channel} className="flex items-center gap-2">
                    <span className="text-xs w-20 truncate">{channel.displayName}</span>
                    <div className="flex-1 relative">
                      <Progress 
                        value={progressValue}
                        className={cn(
                          "h-1.5",
                          channel.pacing === null && "opacity-40",
                          channel.isOverspend && "[&>div]:bg-yellow-500",
                          channel.isUnderspend && "[&>div]:bg-blue-500"
                        )}
                      />
                    </div>
                    <span className={cn(
                      "text-xs w-12 text-right",
                      channel.pacing === null && "text-muted-foreground",
                      channel.isOverspend && "text-yellow-400",
                      channel.isUnderspend && "text-blue-400"
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
