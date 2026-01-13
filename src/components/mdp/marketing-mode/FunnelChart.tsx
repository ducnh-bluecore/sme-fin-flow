import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Filter, 
  ArrowDown,
  AlertTriangle,
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

  const getWidthPercent = (stage: FunnelStage, index: number) => {
    if (index === 0) return 100;
    const firstStage = funnelData[0];
    if (!firstStage || firstStage.count === 0) return 0;
    return Math.max(20, (stage.count / firstStage.count) * 100);
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

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-lg">Marketing Funnel</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
            Conversion Flow
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Funnel Visualization */}
        <div className="flex flex-col items-center space-y-1">
          {funnelData.map((stage, index) => {
            const width = getWidthPercent(stage, index);
            const highDrop = index > 0 && isHighDrop(stage.drop_rate);
            const nextStage = funnelData[index + 1];
            const nextHighDrop = nextStage && isHighDrop(nextStage.drop_rate);
            
            // Color palette for funnel stages
            const stageColors = [
              { bg: 'bg-blue-500/30', border: 'border-blue-500/50', text: 'text-blue-300' },
              { bg: 'bg-cyan-500/30', border: 'border-cyan-500/50', text: 'text-cyan-300' },
              { bg: 'bg-green-500/30', border: 'border-green-500/50', text: 'text-green-300' },
              { bg: 'bg-emerald-500/30', border: 'border-emerald-500/50', text: 'text-emerald-300' },
            ];
            const colors = stageColors[index] || stageColors[3];
            
            return (
              <div key={stage.stage} className="w-full flex flex-col items-center">
                {/* Stage Bar */}
                <div 
                  className={cn(
                    "relative py-3 px-4 rounded-lg border-l-4 transition-all duration-300",
                    colors.bg, colors.border
                  )}
                  style={{ 
                    width: `${Math.max(width, 30)}%`,
                    minWidth: '180px'
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-semibold", colors.text)}>{stage.stage}</span>
                    </div>
                    <span className="text-xl font-bold text-foreground">{formatNumber(stage.count)}</span>
                  </div>
                  
                  {index > 0 && (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Conversion: <span className="text-foreground font-medium">{stage.conversion_rate.toFixed(1)}%</span>
                      </span>
                      {highDrop && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] gap-0.5 py-0 h-5">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          High Drop
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Drop Arrow between stages */}
                {index < funnelData.length - 1 && (
                  <div className="flex flex-col items-center py-2">
                    <ArrowDown className={cn(
                      "h-4 w-4",
                      nextHighDrop ? "text-yellow-400" : "text-muted-foreground/50"
                    )} />
                    {nextStage && nextStage.drop_rate > 0 && (
                      <span className={cn(
                        "text-[11px] font-medium",
                        nextHighDrop ? "text-yellow-400" : "text-muted-foreground"
                      )}>
                        -{nextStage.drop_rate.toFixed(1)}% drop
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/50">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Overall Conversion</p>
            <p className="text-xl font-bold text-green-400">
              {funnelData.length > 0 && funnelData[0].count > 0
                ? ((funnelData[funnelData.length - 1]?.count || 0) / funnelData[0].count * 100).toFixed(2)
                : 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Impressions → Orders
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Biggest Drop</p>
            {(() => {
              const maxDropStage = funnelData.reduce((max, stage) => 
                stage.drop_rate > max.drop_rate ? stage : max
              , funnelData[0] || { stage: 'N/A', drop_rate: 0 });
              
              return (
                <>
                  <p className="text-xl font-bold text-yellow-400">
                    {maxDropStage.drop_rate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    At: {maxDropStage.stage}
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
