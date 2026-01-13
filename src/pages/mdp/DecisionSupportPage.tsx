import { useMDPData } from '@/hooks/useMDPData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Info, ThumbsUp, ThumbsDown, Scale } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DecisionPanel } from '@/components/mdp/cmo-mode/DecisionPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function DecisionSupportPage() {
  const { 
    profitAttribution,
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
            Không thể tải dữ liệu. Vui lòng thử lại sau.
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

  const canScale = cmoModeSummary.total_contribution_margin >= 0 && cmoModeSummary.cash_conversion_rate >= 0.7;
  const hasMargin = cmoModeSummary.total_contribution_margin >= 0;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Decision Support"
        subtitle="CMO Mode: Scale kênh nào? Cắt kênh nào? Quyết định dựa trên profit & cash thật"
      />

      {/* Big Decision */}
      <Card className={cn(
        "border-2",
        canScale 
          ? "border-green-500/50 bg-green-500/5" 
          : hasMargin
          ? "border-yellow-500/50 bg-yellow-500/5"
          : "border-red-500/50 bg-red-500/5"
      )}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Scale className="h-6 w-6 text-purple-400" />
                <h2 className="text-xl font-bold">Câu hỏi lớn: Marketing có nên scale?</h2>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                canScale ? "text-green-400" : hasMargin ? "text-yellow-400" : "text-red-400"
              )}>
                {canScale 
                  ? "✓ CÓ - Margin tốt + Cash flow dương" 
                  : hasMargin
                  ? "⚠ THẬN TRỌNG - Có margin nhưng cash chưa optimal"
                  : "✗ KHÔNG - Đang lỗ margin"
                }
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {canScale
                  ? "Marketing đang tạo ra giá trị thật. Có thể xem xét tăng ngân sách nếu có opportunity tốt."
                  : hasMargin
                  ? "Marketing có lãi nhưng tiền về chậm. Cần tối ưu collection trước khi scale."
                  : "Marketing đang phá huỷ giá trị. Dừng lại và review ngay lập tức."
                }
              </p>
            </div>
            {canScale ? (
              <ThumbsUp className="h-16 w-16 text-green-400" />
            ) : (
              <ThumbsDown className={cn(
                "h-16 w-16",
                hasMargin ? "text-yellow-400" : "text-red-400"
              )} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Decision Criteria */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Tiêu chí quyết định</CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  MDP Manifesto: Nếu insight marketing không làm rõ quyết định,
                  thì insight đó không cần tồn tại.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={cn(
              "p-4 rounded-lg border text-center",
              cmoModeSummary.total_contribution_margin >= 0 
                ? "border-green-500/30 bg-green-500/10" 
                : "border-red-500/30 bg-red-500/10"
            )}>
              <p className="text-xs text-muted-foreground mb-1">Contribution Margin</p>
              <p className={cn(
                "text-xl font-bold",
                cmoModeSummary.total_contribution_margin >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {cmoModeSummary.total_contribution_margin >= 0 ? '+' : ''}{formatCurrency(cmoModeSummary.total_contribution_margin)}đ
              </p>
              <Badge className={cn(
                "mt-2 text-xs",
                cmoModeSummary.total_contribution_margin >= 0 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-red-500/20 text-red-400"
              )}>
                {cmoModeSummary.total_contribution_margin >= 0 ? '✓ Pass' : '✗ Fail'}
              </Badge>
            </div>

            <div className={cn(
              "p-4 rounded-lg border text-center",
              cmoModeSummary.contribution_margin_percent >= 10 
                ? "border-green-500/30 bg-green-500/10" 
                : cmoModeSummary.contribution_margin_percent >= 0
                ? "border-yellow-500/30 bg-yellow-500/10"
                : "border-red-500/30 bg-red-500/10"
            )}>
              <p className="text-xs text-muted-foreground mb-1">CM % (ngưỡng: ≥10%)</p>
              <p className={cn(
                "text-xl font-bold",
                cmoModeSummary.contribution_margin_percent >= 10 ? "text-green-400" : 
                cmoModeSummary.contribution_margin_percent >= 0 ? "text-yellow-400" : "text-red-400"
              )}>
                {cmoModeSummary.contribution_margin_percent.toFixed(1)}%
              </p>
              <Badge className={cn(
                "mt-2 text-xs",
                cmoModeSummary.contribution_margin_percent >= 10 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-yellow-500/20 text-yellow-400"
              )}>
                {cmoModeSummary.contribution_margin_percent >= 10 ? '✓ Pass' : '⚠ Warning'}
              </Badge>
            </div>

            <div className={cn(
              "p-4 rounded-lg border text-center",
              cmoModeSummary.cash_conversion_rate >= 0.7 
                ? "border-green-500/30 bg-green-500/10" 
                : cmoModeSummary.cash_conversion_rate >= 0.5
                ? "border-yellow-500/30 bg-yellow-500/10"
                : "border-red-500/30 bg-red-500/10"
            )}>
              <p className="text-xs text-muted-foreground mb-1">Cash Conversion (ngưỡng: ≥70%)</p>
              <p className={cn(
                "text-xl font-bold",
                cmoModeSummary.cash_conversion_rate >= 0.7 ? "text-green-400" : 
                cmoModeSummary.cash_conversion_rate >= 0.5 ? "text-yellow-400" : "text-red-400"
              )}>
                {(cmoModeSummary.cash_conversion_rate * 100).toFixed(1)}%
              </p>
              <Badge className={cn(
                "mt-2 text-xs",
                cmoModeSummary.cash_conversion_rate >= 0.7 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-yellow-500/20 text-yellow-400"
              )}>
                {cmoModeSummary.cash_conversion_rate >= 0.7 ? '✓ Pass' : '⚠ Warning'}
              </Badge>
            </div>

            <div className={cn(
              "p-4 rounded-lg border text-center",
              cmoModeSummary.risk_alerts_count === 0 
                ? "border-green-500/30 bg-green-500/10" 
                : cmoModeSummary.critical_alerts_count === 0
                ? "border-yellow-500/30 bg-yellow-500/10"
                : "border-red-500/30 bg-red-500/10"
            )}>
              <p className="text-xs text-muted-foreground mb-1">Risk Alerts</p>
              <p className={cn(
                "text-xl font-bold",
                cmoModeSummary.risk_alerts_count === 0 ? "text-green-400" : 
                cmoModeSummary.critical_alerts_count === 0 ? "text-yellow-400" : "text-red-400"
              )}>
                {cmoModeSummary.risk_alerts_count} ({cmoModeSummary.critical_alerts_count} critical)
              </p>
              <Badge className={cn(
                "mt-2 text-xs",
                cmoModeSummary.risk_alerts_count === 0 
                  ? "bg-green-500/20 text-green-400" 
                  : cmoModeSummary.critical_alerts_count === 0
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-red-500/20 text-red-400"
              )}>
                {cmoModeSummary.risk_alerts_count === 0 ? '✓ No risks' : 
                 cmoModeSummary.critical_alerts_count === 0 ? '⚠ Has warnings' : '✗ Has critical'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channel-level Decision Panel */}
      <DecisionPanel 
        profitData={profitAttribution}
        cashImpact={cashImpact}
        summary={cmoModeSummary}
      />
    </div>
  );
}
