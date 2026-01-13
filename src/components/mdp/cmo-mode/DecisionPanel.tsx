import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Scale, 
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Info,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { ProfitAttribution, CashImpact, CMOModeSummary } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';

interface DecisionPanelProps {
  profitData: ProfitAttribution[];
  cashImpact: CashImpact[];
  summary: CMOModeSummary;
}

interface ChannelDecision {
  channel: string;
  recommendation: 'scale' | 'maintain' | 'reduce' | 'pause';
  reason: string;
  margin_score: number;
  cash_score: number;
  overall_score: number;
  impact_if_scale: number;
  impact_if_pause: number;
}

export function DecisionPanel({ profitData, cashImpact, summary }: DecisionPanelProps) {
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  // Calculate channel-level decisions
  const channelDecisions: ChannelDecision[] = (() => {
    const channelMap = new Map<string, { margin: number; spend: number; cash: CashImpact | null }>();
    
    // Aggregate profit data by channel
    profitData.forEach(p => {
      const existing = channelMap.get(p.channel) || { margin: 0, spend: 0, cash: null };
      existing.margin += p.contribution_margin;
      existing.spend += p.ad_spend;
      channelMap.set(p.channel, existing);
    });
    
    // Add cash impact data
    cashImpact.forEach(c => {
      const existing = channelMap.get(c.channel);
      if (existing) {
        existing.cash = c;
      }
    });

    return Array.from(channelMap.entries()).map(([channel, data]) => {
      const marginPercent = data.spend > 0 ? (data.margin / data.spend) * 100 : 0;
      const cashScore = data.cash?.cash_impact_score || 0;
      
      // Score calculation
      const marginScore = Math.min(100, Math.max(-100, marginPercent * 3));
      const overallScore = (marginScore * 0.6) + (cashScore * 0.4);
      
      // Recommendation logic
      let recommendation: ChannelDecision['recommendation'];
      let reason: string;
      
      if (overallScore >= 30 && data.cash?.is_cash_positive) {
        recommendation = 'scale';
        reason = 'Margin tốt + Cash flow dương → Scale được';
      } else if (overallScore >= 0 && marginPercent >= 5) {
        recommendation = 'maintain';
        reason = 'Margin đủ nhưng cash chưa optimal → Giữ nguyên';
      } else if (overallScore >= -30) {
        recommendation = 'reduce';
        reason = 'Margin thấp hoặc cash issue → Giảm spend';
      } else {
        recommendation = 'pause';
        reason = 'Đốt tiền + ảnh hưởng cash → Dừng ngay';
      }

      return {
        channel,
        recommendation,
        reason,
        margin_score: marginScore,
        cash_score: cashScore,
        overall_score: overallScore,
        impact_if_scale: data.margin * 1.5,
        impact_if_pause: data.margin,
      };
    }).sort((a, b) => b.overall_score - a.overall_score);
  })();

  const getRecommendationConfig = (rec: ChannelDecision['recommendation']) => {
    const configs = {
      scale: { 
        icon: TrendingUp, 
        label: 'SCALE', 
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
        iconClass: 'text-green-400',
      },
      maintain: { 
        icon: Pause, 
        label: 'MAINTAIN', 
        className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        iconClass: 'text-blue-400',
      },
      reduce: { 
        icon: TrendingDown, 
        label: 'REDUCE', 
        className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        iconClass: 'text-yellow-400',
      },
      pause: { 
        icon: Play, 
        label: 'PAUSE', 
        className: 'bg-red-500/20 text-red-400 border-red-500/30',
        iconClass: 'text-red-400',
      },
    };
    return configs[rec];
  };

  return (
    <Card className="border-purple-500/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-purple-400" />
            <CardTitle className="text-lg">Decision Support</CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">CMO Decision Panel</p>
                <p className="text-xs text-muted-foreground">
                  Giúp trả lời: Scale kênh nào? Cắt kênh nào dù marketer thích?
                  Không trả lời được → MDP không cần tồn tại.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
            CMO Mode Only
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Marketing Health */}
        <div className={cn(
          "p-4 rounded-lg border",
          summary.total_contribution_margin >= 0 && summary.cash_conversion_rate >= 0.7
            ? "bg-green-500/10 border-green-500/30"
            : summary.total_contribution_margin >= 0
            ? "bg-yellow-500/10 border-yellow-500/30"
            : "bg-red-500/10 border-red-500/30"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Marketing có nên scale?</p>
              <p className={cn(
                "text-lg font-bold mt-1",
                summary.total_contribution_margin >= 0 && summary.cash_conversion_rate >= 0.7
                  ? "text-green-400"
                  : summary.total_contribution_margin >= 0
                  ? "text-yellow-400"
                  : "text-red-400"
              )}>
                {summary.total_contribution_margin >= 0 && summary.cash_conversion_rate >= 0.7
                  ? "CÓ THỂ SCALE - Margin + Cash đều tốt"
                  : summary.total_contribution_margin >= 0
                  ? "THẬN TRỌNG - Có margin nhưng cash chưa optimal"
                  : "KHÔNG NÊN - Đang lỗ margin"
                }
              </p>
            </div>
            {summary.total_contribution_margin >= 0 && summary.cash_conversion_rate >= 0.7 ? (
              <ThumbsUp className="h-8 w-8 text-green-400" />
            ) : (
              <ThumbsDown className={cn(
                "h-8 w-8",
                summary.total_contribution_margin >= 0 ? "text-yellow-400" : "text-red-400"
              )} />
            )}
          </div>
        </div>

        {/* Channel-level Decisions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            Quyết định theo kênh
            <Badge variant="outline" className="text-xs">
              Từ cao → thấp
            </Badge>
          </h4>
          
          {channelDecisions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Chưa có dữ liệu để đưa ra khuyến nghị
            </div>
          ) : (
            channelDecisions.map((decision) => {
              const config = getRecommendationConfig(decision.recommendation);
              const Icon = config.icon;
              
              return (
                <div 
                  key={decision.channel}
                  className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm font-medium">
                        {decision.channel}
                      </Badge>
                      <span className={cn(
                        "text-sm font-bold",
                        decision.overall_score >= 30 ? "text-green-400" :
                        decision.overall_score >= 0 ? "text-yellow-400" : "text-red-400"
                      )}>
                        Score: {decision.overall_score.toFixed(0)}
                      </span>
                    </div>
                    <Badge className={cn("gap-1", config.className)}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {decision.reason}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Margin Score: </span>
                      <span className={cn(
                        "font-medium",
                        decision.margin_score >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {decision.margin_score.toFixed(0)}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Cash Score: </span>
                      <span className={cn(
                        "font-medium",
                        decision.cash_score >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {decision.cash_score.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {decision.recommendation === 'scale' && (
                    <div className="p-2 rounded bg-green-500/10 border border-green-500/20 text-xs">
                      <span className="text-green-400 font-medium">
                        Nếu scale +50%: +{formatCurrency(decision.impact_if_scale)}đ margin dự kiến
                      </span>
                    </div>
                  )}
                  
                  {decision.recommendation === 'pause' && (
                    <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-xs">
                      <span className="text-red-400 font-medium">
                        Đang lỗ: -{formatCurrency(Math.abs(decision.impact_if_pause))}đ margin/tháng
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
