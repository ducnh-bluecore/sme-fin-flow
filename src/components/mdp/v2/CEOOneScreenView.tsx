import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Skull, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  AlertTriangle,
  Clock,
  ArrowRight,
  Flame,
  Lock,
  CheckCircle,
  XCircle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CEOMarketingSnapshot, MarketingDecisionCard, formatVND, getUrgencyColor, getActionColor } from '@/types/mdp-v2';

interface CEOOneScreenViewProps {
  snapshot: CEOMarketingSnapshot;
  onDecisionAction: (card: MarketingDecisionCard) => void;
}

/**
 * CEO ONE-SCREEN VIEW
 * 
 * Shows ONLY:
 * 1. Is marketing creating or destroying money?
 * 2. How much cash is at risk or locked?
 * 3. Which campaigns must be paused/killed NOW?
 * 
 * 30-second rule: CEO must know exactly what to do
 */
export function CEOOneScreenView({ snapshot, onDecisionAction }: CEOOneScreenViewProps) {
  return (
    <div className="space-y-6">
      {/* === HEADER: Overall Verdict === */}
      <div className={cn(
        "p-6 rounded-xl border-2 transition-all",
        snapshot.isCreatingMoney 
          ? "bg-emerald-500/10 border-emerald-500/30" 
          : "bg-red-500/10 border-red-500/30 animate-pulse"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-4 rounded-full",
              snapshot.isCreatingMoney ? "bg-emerald-500/20" : "bg-red-500/20"
            )}>
              {snapshot.isCreatingMoney ? (
                <TrendingUp className="h-8 w-8 text-emerald-400" />
              ) : (
                <Skull className="h-8 w-8 text-red-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Marketing đang</p>
              <h1 className={cn(
                "text-3xl font-black",
                snapshot.isCreatingMoney ? "text-emerald-400" : "text-red-400"
              )}>
                {snapshot.isCreatingMoney ? 'TẠO TIỀN' : 'PHÁ HỦY TIỀN'}
              </h1>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Net Margin Position</p>
            <p className={cn(
              "text-4xl font-black",
              snapshot.netMarginPosition >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {snapshot.netMarginPosition >= 0 ? '+' : ''}{formatVND(snapshot.netMarginPosition)}
            </p>
            <div className="flex items-center gap-2 justify-end mt-1">
              <Badge variant="outline" className="text-xs">
                {snapshot.marginTrend === 'improving' ? '↑ Đang tốt lên' : 
                 snapshot.marginTrend === 'deteriorating' ? '↓ Đang xấu đi' : '→ Ổn định'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Margin Breakdown */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margin tạo ra</p>
              <p className="text-xl font-bold text-emerald-400">+{formatVND(snapshot.totalMarginCreated)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margin bị phá hủy</p>
              <p className="text-xl font-bold text-red-400">-{formatVND(snapshot.totalMarginDestroyed)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* === CASH STATUS === */}
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="h-6 w-6 text-blue-400" />
            <h2 className="text-lg font-bold">Cash Position</h2>
            {snapshot.totalCashAtRisk > 0 && (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                {formatVND(snapshot.totalCashAtRisk)} đang bị khóa/chờ
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {/* Cash Received */}
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground">Đã thu về</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{formatVND(snapshot.cashReceived)}</p>
            </div>

            {/* Cash Pending */}
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-muted-foreground">Đang chờ</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{formatVND(snapshot.cashPending)}</p>
            </div>

            {/* Cash Locked */}
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-red-400" />
                <span className="text-xs text-muted-foreground">Bị khóa (Ads)</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{formatVND(snapshot.cashLocked)}</p>
            </div>

            {/* Cash Conversion */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Cash Convert</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                snapshot.cashConversionRate >= 0.7 ? "text-emerald-400" :
                snapshot.cashConversionRate >= 0.5 ? "text-yellow-400" : "text-red-400"
              )}>
                {(snapshot.cashConversionRate * 100).toFixed(0)}%
              </p>
              <Progress 
                value={snapshot.cashConversionRate * 100} 
                className="h-1 mt-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === IMMEDIATE ACTIONS === */}
      <Card className={cn(
        "border-2 transition-all",
        snapshot.immediateActions > 0 
          ? "border-red-500/50 bg-red-500/5" 
          : "border-emerald-500/30 bg-emerald-500/5"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {snapshot.immediateActions > 0 ? (
                <Flame className="h-6 w-6 text-red-400 animate-pulse" />
              ) : (
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              )}
              <div>
                <h2 className="text-lg font-bold">
                  {snapshot.immediateActions > 0 
                    ? `${snapshot.immediateActions} Quyết định CẦN LÀM NGAY` 
                    : 'Không có vấn đề khẩn cấp'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {snapshot.immediateActions > 0 
                    ? 'Mỗi giờ chậm trễ = thêm tiền mất' 
                    : 'Marketing đang vận hành tốt'}
                </p>
              </div>
            </div>
            
            {snapshot.immediateActions > 0 && (
              <Badge className="bg-red-500 text-white text-lg px-4 py-2 animate-pulse">
                {snapshot.immediateActions} CRITICAL
              </Badge>
            )}
          </div>

          {/* Decision Cards */}
          {snapshot.criticalCards.length > 0 ? (
            <div className="space-y-3">
              {snapshot.criticalCards.map((card) => (
                <div 
                  key={card.id}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all",
                    card.urgency === 'IMMEDIATE' 
                      ? "border-red-500/50 bg-red-500/10" 
                      : "border-orange-500/30 bg-orange-500/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getUrgencyColor(card.urgency)}>
                          {card.urgency === 'IMMEDIATE' ? '⚡ NGAY BÂY GIỜ' : `⏰ ${card.deadlineHours}h`}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {card.channel}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Owner: {card.owner}
                        </Badge>
                      </div>

                      {/* Problem */}
                      <p className="font-black text-lg text-red-400 mb-1">{card.title}</p>
                      <p className="text-base font-medium mb-2">{card.headline}</p>
                      <p className="text-sm text-muted-foreground">{card.campaignName}</p>

                      {/* Metrics */}
                      <div className="flex gap-4 mt-3">
                        {card.metrics.slice(0, 3).map((m, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">{m.label}:</span>
                            <span className={cn(
                              "text-sm font-bold",
                              m.severity === 'critical' ? "text-red-400" :
                              m.severity === 'warning' ? "text-yellow-400" : "text-emerald-400"
                            )}>
                              {m.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Side */}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground mb-1">Đang mất</p>
                      <p className="text-2xl font-black text-red-400">
                        -{formatVND(card.impactAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        +{formatVND(card.projectedLoss)} nếu không xử lý
                      </p>
                      
                      <Button 
                        className={cn("mt-3 gap-2 font-bold", getActionColor(card.recommendedAction))}
                        onClick={() => onDecisionAction(card)}
                      >
                        {card.recommendedAction}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-lg font-medium text-emerald-400">Tất cả campaigns đang hoạt động bình thường</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tiếp tục theo dõi - system sẽ cảnh báo khi có vấn đề
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === DATA CONFIDENCE === */}
      <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-muted/30 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            snapshot.dataConfidence === 'high' ? "bg-emerald-400" :
            snapshot.dataConfidence === 'medium' ? "bg-yellow-400" : "bg-red-400"
          )} />
          <span>
            Độ tin cậy dữ liệu: {
              snapshot.dataConfidence === 'high' ? 'Cao' :
              snapshot.dataConfidence === 'medium' ? 'Trung bình' : 'Thấp'
            }
          </span>
        </div>
        <span>Cập nhật: {new Date(snapshot.lastUpdated).toLocaleTimeString('vi-VN')}</span>
      </div>
    </div>
  );
}
