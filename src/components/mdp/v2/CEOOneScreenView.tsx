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
      {/* === HEADER: Overall Verdict - PAINFUL === */}
      <div className={cn(
        "p-6 rounded-xl border-2 transition-all",
        snapshot.isCreatingMoney 
          ? "bg-emerald-500/10 border-emerald-500/30" 
          : "bg-red-500/10 border-red-500/50 animate-pulse shadow-lg shadow-red-500/20"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-4 rounded-full",
              snapshot.isCreatingMoney ? "bg-emerald-500/20" : "bg-red-500/30"
            )}>
              {snapshot.isCreatingMoney ? (
                <TrendingUp className="h-10 w-10 text-emerald-400" />
              ) : (
                <Skull className="h-10 w-10 text-red-400 animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                {snapshot.isCreatingMoney ? 'Tình trạng' : '⚠️ CẢNH BÁO'}
              </p>
              <h1 className={cn(
                "text-4xl font-black tracking-tight",
                snapshot.isCreatingMoney ? "text-emerald-400" : "text-red-400"
              )}>
                {snapshot.isCreatingMoney ? 'ĐANG TẠO GIÁ TRỊ' : 'ĐANG PHÁ HỦY TIỀN'}
              </h1>
              {!snapshot.isCreatingMoney && (
                <p className="text-sm text-red-400/80 font-medium mt-1">
                  Mỗi phút chậm trễ = thêm tiền mất
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Margin</p>
            <p className={cn(
              "text-5xl font-black",
              snapshot.netMarginPosition >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {snapshot.netMarginPosition >= 0 ? '+' : ''}{formatVND(snapshot.netMarginPosition)}
            </p>
            <Badge className={cn(
              "mt-2",
              snapshot.marginTrend === 'improving' ? "bg-emerald-500/20 text-emerald-400" : 
              snapshot.marginTrend === 'deteriorating' ? "bg-red-500/20 text-red-400 animate-pulse" : 
              "bg-muted text-muted-foreground"
            )}>
              {snapshot.marginTrend === 'improving' ? '📈 Đang cải thiện' : 
               snapshot.marginTrend === 'deteriorating' ? '📉 ĐANG XẤU ĐI' : '→ Ổn định'}
            </Badge>
          </div>
        </div>

        {/* Margin Breakdown - More aggressive */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/50">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Margin tạo ra</p>
              <p className="text-2xl font-black text-emerald-400">+{formatVND(snapshot.totalMarginCreated)}</p>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg",
            snapshot.totalMarginDestroyed > 0 ? "bg-red-500/10" : "bg-muted/30"
          )}>
            <div className={cn(
              "p-2 rounded-lg",
              snapshot.totalMarginDestroyed > 0 ? "bg-red-500/20" : "bg-muted"
            )}>
              <TrendingDown className={cn(
                "h-6 w-6",
                snapshot.totalMarginDestroyed > 0 ? "text-red-400" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {snapshot.totalMarginDestroyed > 0 ? '💀 ĐANG BỊ PHÁ HỦY' : 'Margin mất'}
              </p>
              <p className={cn(
                "text-2xl font-black",
                snapshot.totalMarginDestroyed > 0 ? "text-red-400" : "text-muted-foreground"
              )}>
                -{formatVND(snapshot.totalMarginDestroyed)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* === CASH STATUS - PAINFUL COPY === */}
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="h-6 w-6 text-blue-400" />
            <h2 className="text-lg font-bold">Tiền của bạn đang ở đâu?</h2>
            {snapshot.totalCashAtRisk > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                ⚠️ {formatVND(snapshot.totalCashAtRisk)} ĐANG BỊ GIAM
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {/* Cash Received */}
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">✅ Đã về tài khoản</span>
              </div>
              <p className="text-2xl font-black text-emerald-400">{formatVND(snapshot.cashReceived)}</p>
              <p className="text-xs text-emerald-400/60 mt-1">Tiền thật, có thể sử dụng</p>
            </div>

            {/* Cash Pending */}
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">⏳ CHƯA VỀ</span>
              </div>
              <p className="text-2xl font-black text-yellow-400">{formatVND(snapshot.cashPending)}</p>
              <p className="text-xs text-yellow-400/60 mt-1">Có thể không thu được</p>
            </div>

            {/* Cash Locked */}
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-red-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">🔒 BỊ KHÓA</span>
              </div>
              <p className="text-2xl font-black text-red-400">{formatVND(snapshot.cashLocked)}</p>
              <p className="text-xs text-red-400/60 mt-1">Không thể rút về</p>
            </div>

            {/* Cash Conversion */}
            <div className={cn(
              "p-4 rounded-lg border",
              snapshot.cashConversionRate < 0.5 ? "bg-red-500/10 border-red-500/20" : "bg-muted/50 border-border"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className={cn(
                  "h-4 w-4",
                  snapshot.cashConversionRate < 0.5 ? "text-red-400" : "text-primary"
                )} />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Tỷ lệ thu về</span>
              </div>
              <p className={cn(
                "text-2xl font-black",
                snapshot.cashConversionRate >= 0.7 ? "text-emerald-400" :
                snapshot.cashConversionRate >= 0.5 ? "text-yellow-400" : "text-red-400"
              )}>
                {(snapshot.cashConversionRate * 100).toFixed(0)}%
              </p>
              <Progress 
                value={snapshot.cashConversionRate * 100} 
                className="h-1.5 mt-2" 
              />
              {snapshot.cashConversionRate < 0.5 && (
                <p className="text-xs text-red-400 mt-1 font-medium">⚠️ QUÁ THẤP</p>
              )}
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
                <Flame className="h-8 w-8 text-red-400 animate-pulse" />
              ) : (
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              )}
              <div>
                <h2 className={cn(
                  "text-xl font-black",
                  snapshot.immediateActions > 0 ? "text-red-400" : "text-emerald-400"
                )}>
                  {snapshot.immediateActions > 0 
                    ? `🚨 ${snapshot.immediateActions} VẤN ĐỀ CẦN GIẢI QUYẾT NGAY` 
                    : '✅ Không có lửa cần dập'}
                </h2>
                <p className={cn(
                  "text-sm font-medium",
                  snapshot.immediateActions > 0 ? "text-red-400/80" : "text-muted-foreground"
                )}>
                  {snapshot.immediateActions > 0 
                    ? 'MỖI GIỜ CHẬM TRỄ = THÊM TIỀN MẤT' 
                    : 'Marketing đang vận hành ổn định'}
                </p>
              </div>
            </div>
            
            {snapshot.immediateActions > 0 && (
              <Badge className="bg-red-600 text-white text-xl px-6 py-3 animate-pulse font-black">
                {snapshot.immediateActions} LỬA
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
                          {card.urgency === 'IMMEDIATE' ? '🔥 NGAY LÚC NÀY' : `⏰ Còn ${card.deadlineHours}h`}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-bold">
                          {card.channel}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          👤 {card.owner}
                        </Badge>
                      </div>

                      {/* Problem - PAINFUL */}
                      <p className="font-black text-xl text-red-400 mb-1">{card.title}</p>
                      <p className="text-base font-bold mb-1">{card.headline}</p>
                      <p className="text-sm text-muted-foreground font-medium">{card.campaignName}</p>

                      {/* Metrics */}
                      <div className="flex gap-4 mt-3 pt-3 border-t border-border/30">
                        {card.metrics.slice(0, 3).map((m, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">{m.label}:</span>
                            <span className={cn(
                              "text-sm font-black",
                              m.severity === 'critical' ? "text-red-400" :
                              m.severity === 'warning' ? "text-yellow-400" : "text-emerald-400"
                            )}>
                              {m.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Side - MORE AGGRESSIVE */}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-red-400/80 uppercase tracking-wide font-bold mb-1">💸 Đang mất</p>
                      <p className="text-3xl font-black text-red-400">
                        -{formatVND(card.impactAmount)}
                      </p>
                      <p className="text-xs text-orange-400 mt-1 font-medium">
                        +{formatVND(card.projectedLoss)} nếu không xử lý
                      </p>
                      
                      <Button 
                        size="lg"
                        className={cn("mt-4 gap-2 font-black text-base", getActionColor(card.recommendedAction))}
                        onClick={() => onDecisionAction(card)}
                      >
                        {card.recommendedAction === 'KILL' ? '☠️ GIẾT NGAY' :
                         card.recommendedAction === 'PAUSE' ? '⏸️ DỪNG' :
                         card.recommendedAction === 'CAP' ? '🔻 CẮT GIẢM' :
                         card.recommendedAction}
                        <ArrowRight className="h-5 w-5" />
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
