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
    if (firstStage.count === 0) return 0;
    return Math.max(20, (stage.count / firstStage.count) * 100);
  };

  const isHighDrop = (dropRate: number) => dropRate > MDP_THRESHOLDS.MAX_FUNNEL_DROP * 100;

  return (
    <Card className="border-blue-500/20 bg-card/50 backdrop-blur">
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
        <div className="space-y-4">
          {funnelData.map((stage, index) => {
            const width = getWidthPercent(stage, index);
            const highDrop = isHighDrop(stage.drop_rate);
            
            return (
              <div key={stage.stage} className="space-y-2">
                {/* Stage Bar */}
                <div 
                  className="relative mx-auto transition-all"
                  style={{ width: `${width}%` }}
                >
                  <div className={cn(
                    "p-4 rounded-lg border transition-colors",
                    index === 0 ? "bg-blue-500/20 border-blue-500/30" :
                    index === 1 ? "bg-cyan-500/20 border-cyan-500/30" :
                    index === 2 ? "bg-green-500/20 border-green-500/30" :
                    "bg-emerald-500/20 border-emerald-500/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{stage.stage}</span>
                      <span className="text-lg font-bold">{formatNumber(stage.count)}</span>
                    </div>
                    {index > 0 && (
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>Conversion: {stage.conversion_rate.toFixed(1)}%</span>
                        {highDrop && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            High Drop
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Drop Arrow */}
                {index < funnelData.length - 1 && (
                  <div className="flex flex-col items-center py-1">
                    <ArrowDown className={cn(
                      "h-5 w-5",
                      funnelData[index + 1] && isHighDrop(funnelData[index + 1].drop_rate)
                        ? "text-yellow-400"
                        : "text-muted-foreground"
                    )} />
                    {funnelData[index + 1] && funnelData[index + 1].drop_rate > 0 && (
                      <span className={cn(
                        "text-xs",
                        isHighDrop(funnelData[index + 1].drop_rate)
                          ? "text-yellow-400"
                          : "text-muted-foreground"
                      )}>
                        -{funnelData[index + 1].drop_rate.toFixed(1)}% drop
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
