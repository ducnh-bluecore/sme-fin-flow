import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, 
  ArrowRight,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react';
import { FunnelStage, MDP_THRESHOLDS } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';

interface FunnelChartProps {
  funnelData: FunnelStage[];
}

export function FunnelChart({ funnelData }: FunnelChartProps) {
  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const isHighDrop = (dropRate: number) => dropRate > MDP_THRESHOLDS.MAX_FUNNEL_DROP * 100;

  // Handle empty data or all zeros
  const hasData = funnelData && funnelData.length > 0 && funnelData[0]?.count > 0;
  
  if (!hasData) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-lg">Marketing Funnel</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Filter className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu funnel</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Dữ liệu sẽ hiển thị khi có campaign marketing
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall conversion and biggest drop
  const overallConversion = funnelData.length > 0 && funnelData[0].count > 0
    ? ((funnelData[funnelData.length - 1]?.count || 0) / funnelData[0].count * 100)
    : 0;
  
  const maxDropStage = funnelData.reduce((max, stage) => 
    stage.drop_rate > max.drop_rate ? stage : max
  , funnelData[0] || { stage: 'N/A', drop_rate: 0 });

  // Stage colors
  const stageColors = [
    { bg: 'bg-blue-500/20', border: 'border-blue-500/40', accent: 'text-blue-400', glow: 'shadow-blue-500/10' },
    { bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', accent: 'text-cyan-400', glow: 'shadow-cyan-500/10' },
    { bg: 'bg-green-500/20', border: 'border-green-500/40', accent: 'text-green-400', glow: 'shadow-green-500/10' },
    { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', accent: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
  ];

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-lg">Marketing Funnel</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Overall CVR</p>
              <p className={cn(
                "text-sm font-bold",
                overallConversion >= 1 ? "text-green-400" : "text-yellow-400"
              )}>
                {overallConversion.toFixed(2)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Max Drop</p>
              <p className="text-sm font-bold text-yellow-400">
                {maxDropStage.drop_rate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Horizontal Funnel */}
        <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
          {funnelData.map((stage, index) => {
            const colors = stageColors[index] || stageColors[3];
            const nextStage = funnelData[index + 1];
            const nextHighDrop = nextStage && isHighDrop(nextStage.drop_rate);
            const heightPercent = index === 0 ? 100 : Math.max(40, (stage.count / funnelData[0].count) * 100);
            
            return (
              <div key={stage.stage} className="flex items-center">
                {/* Stage Box */}
                <div 
                  className={cn(
                    "relative flex flex-col justify-center min-w-[140px] p-3 rounded-lg border transition-all",
                    colors.bg, colors.border, colors.glow,
                    "shadow-lg"
                  )}
                  style={{ 
                    minHeight: `${Math.max(heightPercent, 60)}px`,
                  }}
                >
                  <div className="text-center">
                    <p className={cn("text-xs font-medium mb-1", colors.accent)}>{stage.stage}</p>
                    <p className="text-2xl font-bold text-foreground">{formatNumber(stage.count)}</p>
                    {index > 0 && (
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          CVR: {stage.conversion_rate.toFixed(1)}%
                        </span>
                        {isHighDrop(stage.drop_rate) && (
                          <AlertTriangle className="h-3 w-3 text-yellow-400" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow to next stage */}
                {index < funnelData.length - 1 && (
                  <div className="flex flex-col items-center px-1 min-w-[50px]">
                    <ArrowRight className={cn(
                      "h-5 w-5",
                      nextHighDrop ? "text-yellow-400" : "text-muted-foreground/40"
                    )} />
                    {nextStage && nextStage.drop_rate > 0 && (
                      <span className={cn(
                        "text-[10px] font-medium whitespace-nowrap",
                        nextHighDrop ? "text-yellow-400" : "text-muted-foreground"
                      )}>
                        -{nextStage.drop_rate.toFixed(0)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Stats */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Impressions → Orders</span>
          </div>
          {maxDropStage.drop_rate > 50 && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 text-xs gap-1">
              <TrendingDown className="h-3 w-3" />
              Biggest drop at {maxDropStage.stage}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
