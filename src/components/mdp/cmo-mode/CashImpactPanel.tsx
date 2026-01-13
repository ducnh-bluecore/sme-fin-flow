import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Wallet, 
  CheckCircle2,
  Clock,
  TrendingDown,
  Lock,
  Info,
  ArrowRight,
} from 'lucide-react';
import { CashImpact, CMOModeSummary } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';

interface CMOCashImpactPanelProps {
  cashImpact: CashImpact[];
  summary: CMOModeSummary;
}

export function CMOCashImpactPanel({ cashImpact, summary }: CMOCashImpactPanelProps) {
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const getCashImpactColor = (score: number) => {
    if (score >= 20) return 'text-green-400';
    if (score >= 0) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-purple-400" />
          <CardTitle className="text-lg">Cash Impact Analysis</CardTitle>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium mb-1">Marketing → Cashflow</p>
              <p className="text-xs text-muted-foreground">
                CMO phải trả lời: Marketing tạo cash nhanh hay chậm? Scale được không?
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cash Flow Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <p className="text-xs text-green-400">Đã thu</p>
            </div>
            <p className="text-lg font-bold text-green-400">
              {formatCurrency(summary.total_cash_received)}đ
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-400" />
              <p className="text-xs text-yellow-400">Đang chờ</p>
            </div>
            <p className="text-lg font-bold text-yellow-400">
              {formatCurrency(summary.total_cash_pending)}đ
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-orange-400" />
              <p className="text-xs text-orange-400">Khóa trong Ads</p>
            </div>
            <p className="text-lg font-bold text-orange-400">
              {formatCurrency(summary.total_cash_locked)}đ
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Marketing Spend</p>
            </div>
            <p className="text-lg font-bold">
              {formatCurrency(summary.total_marketing_spend)}đ
            </p>
          </div>
        </div>

        {/* Cash Conversion Rate */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Cash Conversion Rate</span>
            <span className={cn(
              "text-xl font-bold",
              summary.cash_conversion_rate >= 0.7 ? "text-green-400" : 
              summary.cash_conversion_rate >= 0.5 ? "text-yellow-400" : "text-red-400"
            )}>
              {(summary.cash_conversion_rate * 100).toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={summary.cash_conversion_rate * 100} 
            className="h-2 bg-muted"
          />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Cash thu được / (Cash thu + Chờ)</span>
            <span>Ngưỡng tốt: ≥70%</span>
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Cash Impact theo kênh</h4>
            <Badge variant="outline" className="text-xs">
              Scale khuyến nghị
            </Badge>
          </div>
          
          {cashImpact.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Chưa có dữ liệu cash impact
            </div>
          ) : (
            cashImpact.slice(0, 5).map((channel) => (
              <div 
                key={channel.channel}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  channel.is_cash_positive 
                    ? "bg-green-500/5 border-green-500/20" 
                    : "bg-red-500/5 border-red-500/20"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {channel.channel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Spend: {formatCurrency(channel.total_spend)}đ
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-bold",
                      getCashImpactColor(channel.cash_impact_score)
                    )}>
                      {channel.cash_impact_score > 0 ? '+' : ''}{channel.cash_impact_score.toFixed(0)}
                    </span>
                    <Badge className={cn(
                      "text-xs",
                      channel.is_cash_positive 
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    )}>
                      {channel.is_cash_positive ? 'SCALE' : 'REVIEW'}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Thu: </span>
                    <span className="text-green-400">{formatCurrency(channel.cash_received)}đ</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Chờ: </span>
                    <span className="text-yellow-400">{formatCurrency(channel.pending_cash)}đ</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hoàn: </span>
                    <span className="text-red-400">{formatCurrency(channel.refund_amount)}đ</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Conv: </span>
                    <span className={cn(
                      channel.cash_conversion_rate >= 0.7 ? "text-green-400" : 
                      channel.cash_conversion_rate >= 0.5 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {(channel.cash_conversion_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                
                <Progress 
                  value={channel.cash_conversion_rate * 100} 
                  className="h-1.5 bg-muted mt-2"
                />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
