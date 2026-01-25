import { useMDPDataSSOT } from '@/hooks/useMDPDataSSOT';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Info } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProfitAttributionPanel } from '@/components/mdp/cmo-mode/ProfitAttributionPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function ProfitAttributionPage() {
  const { 
    profitAttribution,
    cmoModeSummary,
    isLoading, 
    error,
  } = useMDPDataSSOT();

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
            Không thể tải dữ liệu profit attribution. Vui lòng thử lại sau.
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

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Profit Attribution"
        subtitle="CMO Mode: Phân tích lợi nhuận thật sau toàn bộ chi phí marketing"
      />

      {/* Formula Explanation */}
      <Card className="border-primary/30 bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base text-foreground">Công thức tính lợi nhuận Marketing</CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <p className="text-xs">
                  Đây là công thức FDP Truth - không phải ROAS thông thường mà marketer hay dùng.
                  CMO phải nhìn số này để biết marketing có thật sự tạo ra lợi nhuận hay không.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-sm bg-muted p-3 rounded-lg border border-border">
            <span className="text-green-500 font-bold">Contribution Margin</span>
            <span className="text-foreground"> = </span>
            <span className="text-blue-500">Net Revenue</span>
            <span className="text-foreground"> - </span>
            <span className="text-red-500">(COGS + Platform Fees + Logistics + Payment Fees + Return Cost + Ad Spend)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="text-center p-2 rounded bg-muted border border-border">
              <p className="text-xs text-muted-foreground">COGS</p>
              <p className="font-medium text-foreground">~55%</p>
            </div>
            <div className="text-center p-2 rounded bg-muted border border-border">
              <p className="text-xs text-muted-foreground">Platform Fees</p>
              <p className="font-medium text-foreground">~12%</p>
            </div>
            <div className="text-center p-2 rounded bg-muted border border-border">
              <p className="text-xs text-muted-foreground">Logistics</p>
              <p className="font-medium text-foreground">25K/đơn</p>
            </div>
            <div className="text-center p-2 rounded bg-muted border border-border">
              <p className="text-xs text-muted-foreground">Return Cost</p>
              <p className="font-medium text-foreground">~5%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Tổng CM Marketing</p>
            <p className={cn(
              "text-2xl font-bold",
              cmoModeSummary.total_contribution_margin >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {cmoModeSummary.total_contribution_margin >= 0 ? '+' : ''}{formatCurrency(cmoModeSummary.total_contribution_margin)}đ
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">CM %</p>
            <p className={cn(
              "text-2xl font-bold",
              cmoModeSummary.contribution_margin_percent >= 10 ? "text-green-500" : 
              cmoModeSummary.contribution_margin_percent >= 0 ? "text-yellow-500" : "text-red-500"
            )}>
              {cmoModeSummary.contribution_margin_percent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Campaigns lãi</p>
            <p className="text-2xl font-bold text-green-500">
              {cmoModeSummary.profitable_campaigns}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Campaigns lỗ</p>
            <p className="text-2xl font-bold text-red-500">
              {cmoModeSummary.loss_campaigns}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Profit Attribution Panel */}
      <ProfitAttributionPanel 
        profitData={profitAttribution}
        summary={cmoModeSummary}
      />
    </div>
  );
}
