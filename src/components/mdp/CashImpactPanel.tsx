import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { 
  Wallet, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Info,
  TrendingDown,
  Banknote,
} from 'lucide-react';
import { MarketingCashImpact, MDPSummary } from '@/hooks/useMarketingProfitability';
import { cn } from '@/lib/utils';

interface CashImpactPanelProps {
  cashImpact: MarketingCashImpact[];
  summary: MDPSummary;
}

export function CashImpactPanel({ cashImpact, summary }: CashImpactPanelProps) {
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

  const totalRevenue = cashImpact.reduce((sum, c) => sum + c.revenue_generated, 0);
  const totalCashReceived = cashImpact.reduce((sum, c) => sum + c.cash_received, 0);
  const totalPending = cashImpact.reduce((sum, c) => sum + c.pending_cash, 0);
  const totalRefund = cashImpact.reduce((sum, c) => sum + c.refund_amount, 0);
  const overallConversionRate = totalRevenue > 0 ? totalCashReceived / totalRevenue : 0;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Cash Impact Analysis</CardTitle>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium mb-1">Marketing → Cashflow</p>
              <p className="text-xs text-muted-foreground">
                Không chỉ bán hàng - Marketing tiêu tiền. Tiền về nhanh hay chậm?
                Có bị hoàn/refund không? Có khóa cash không?
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <p className="text-xs text-green-400">Đã về tài khoản</p>
            </div>
            <p className="text-lg font-bold text-green-400">
              {formatCurrency(totalCashReceived)}đ
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-400" />
              <p className="text-xs text-yellow-400">Đang chờ về</p>
            </div>
            <p className="text-lg font-bold text-yellow-400">
              {formatCurrency(totalPending)}đ
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <p className="text-xs text-red-400">Hoàn/Refund</p>
            </div>
            <p className="text-lg font-bold text-red-400">
              {formatCurrency(totalRefund)}đ
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="h-4 w-4 text-orange-400" />
              <p className="text-xs text-orange-400">Cash bị khóa (Ads)</p>
            </div>
            <p className="text-lg font-bold text-orange-400">
              {formatCurrency(summary.total_cash_locked)}đ
            </p>
          </div>
        </div>

        {/* Overall Conversion Rate */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Tỷ lệ tiền thực về</span>
            <span className={cn(
              "text-lg font-bold",
              overallConversionRate >= 0.7 ? "text-green-400" : 
              overallConversionRate >= 0.5 ? "text-yellow-400" : "text-red-400"
            )}>
              {(overallConversionRate * 100).toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={overallConversionRate * 100} 
            className="h-2 bg-muted"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {formatCurrency(totalCashReceived)}đ / {formatCurrency(totalRevenue)}đ revenue
          </p>
        </div>

        {/* Channel Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Chi tiết theo kênh</h4>
          {cashImpact.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Chưa có dữ liệu chi tiêu marketing theo kênh
            </div>
          ) : (
            cashImpact.map((channel) => (
              <div 
                key={channel.channel} 
                className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {channel.channel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Chi: {formatCurrency(channel.total_spend)}đ
                    </span>
                  </div>
                  <div className={cn(
                    "text-sm font-medium",
                    channel.cash_conversion_rate >= 0.7 ? "text-green-400" : 
                    channel.cash_conversion_rate >= 0.5 ? "text-yellow-400" : "text-red-400"
                  )}>
                    {(channel.cash_conversion_rate * 100).toFixed(0)}% về
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Đã thu: </span>
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
                </div>
                <Progress 
                  value={channel.cash_conversion_rate * 100} 
                  className="h-1.5 bg-muted"
                />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
