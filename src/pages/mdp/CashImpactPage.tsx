import { useMDPData } from '@/hooks/useMDPData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { CMOCashImpactPanel } from '@/components/mdp/cmo-mode/CashImpactPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function CashImpactPage() {
  const { 
    cashImpact,
    cmoModeSummary,
    isLoading, 
    error,
  } = useMDPData();

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
          <AlertDescription>
            Không thể tải dữ liệu cash impact. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Calculate net cash position
  const netCashPosition = cmoModeSummary.total_cash_received - cmoModeSummary.total_marketing_spend;
  const cashHealthy = cmoModeSummary.cash_conversion_rate >= 0.7;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Cash Impact Analysis"
        subtitle="CMO Mode: Marketing tạo cash hay đốt cash? Tiền về nhanh hay chậm?"
      />

      {/* Cash Flow Summary */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Tổng quan Cash Flow Marketing</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    MDP Manifesto: Marketing không chỉ bán hàng - marketing tiêu tiền.
                    CMO phải trả lời: tiền về nhanh hay chậm? có bị hoàn không? có khóa cash không?
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Badge className={cn(
              cashHealthy 
                ? "bg-green-500/20 text-green-400 border-green-500/30" 
                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
            )}>
              {cashHealthy ? 'Cash Healthy' : 'Cash At Risk'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Net Cash Position */}
          <div className={cn(
            "p-4 rounded-lg border",
            netCashPosition >= 0 
              ? "bg-green-500/10 border-green-500/30" 
              : "bg-red-500/10 border-red-500/30"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Cash Position (Đã thu - Chi marketing)</p>
                <p className={cn(
                  "text-3xl font-bold",
                  netCashPosition >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {netCashPosition >= 0 ? '+' : ''}{formatCurrency(netCashPosition)}đ
                </p>
              </div>
              {netCashPosition >= 0 ? (
                <TrendingUp className="h-10 w-10 text-green-400" />
              ) : (
                <TrendingDown className="h-10 w-10 text-red-400" />
              )}
            </div>
          </div>

          {/* Cash Flow Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-xs text-green-400">Đã thu về</p>
              <p className="text-xl font-bold text-green-400">
                {formatCurrency(cmoModeSummary.total_cash_received)}đ
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-xs text-yellow-400">Đang chờ về</p>
              <p className="text-xl font-bold text-yellow-400">
                {formatCurrency(cmoModeSummary.total_cash_pending)}đ
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <p className="text-xs text-orange-400">Bị khóa trong Ads</p>
              <p className="text-xl font-bold text-orange-400">
                {formatCurrency(cmoModeSummary.total_cash_locked)}đ
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground">Đã chi Marketing</p>
              <p className="text-xl font-bold">
                {formatCurrency(cmoModeSummary.total_marketing_spend)}đ
              </p>
            </div>
          </div>

          {/* Cash Conversion Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cash Conversion Rate</span>
              <span className={cn(
                "text-lg font-bold",
                cmoModeSummary.cash_conversion_rate >= 0.7 ? "text-green-400" : 
                cmoModeSummary.cash_conversion_rate >= 0.5 ? "text-yellow-400" : "text-red-400"
              )}>
                {(cmoModeSummary.cash_conversion_rate * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={cmoModeSummary.cash_conversion_rate * 100} 
              className="h-3"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Thu được / Tổng doanh thu</span>
              <span className={cn(
                cmoModeSummary.cash_conversion_rate >= 0.7 ? "text-green-400" : "text-yellow-400"
              )}>
                Ngưỡng tốt: ≥70%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Cash Impact by Channel */}
      <CMOCashImpactPanel 
        cashImpact={cashImpact}
        summary={cmoModeSummary}
      />
    </div>
  );
}
