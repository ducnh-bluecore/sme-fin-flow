import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp,
  TrendingDown,
  Pause,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { ProfitAttribution, CashImpact, CMOModeSummary } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickActionCardsProps {
  profitData: ProfitAttribution[];
  cashImpact: CashImpact[];
  summary: CMOModeSummary;
  onAction?: (action: string, entityId: string) => void;
}

export function QuickActionCards({ profitData, cashImpact, summary, onAction }: QuickActionCardsProps) {
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  // Calculate quick stats
  const lossMakingCampaigns = profitData.filter(p => p.status === 'loss' || p.status === 'critical');
  const totalLoss = lossMakingCampaigns.reduce((sum, p) => sum + Math.abs(p.contribution_margin), 0);
  
  const profitableCampaigns = profitData.filter(p => p.status === 'profitable');
  const totalProfit = profitableCampaigns.reduce((sum, p) => sum + p.contribution_margin, 0);

  const cashPositiveChannels = cashImpact.filter(c => c.is_cash_positive);
  const cashNegativeChannels = cashImpact.filter(c => !c.is_cash_positive);

  const handleQuickAction = (action: string, description: string) => {
    toast.success(description, { description: 'Hành động đã được ghi nhận' });
    onAction?.(action, 'all');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Scale Card */}
      <Card className={cn(
        "border-2 transition-all hover:shadow-lg cursor-pointer group",
        profitableCampaigns.length > 0 && summary.cash_conversion_rate >= 0.7
          ? "border-green-500/50 bg-gradient-to-br from-green-500/10 to-green-500/5 hover:border-green-500"
          : "border-border/50 opacity-60"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              {profitableCampaigns.length} sẵn sàng
            </Badge>
          </div>
          <h3 className="font-bold text-lg text-green-400 mb-1">SCALE</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {cashPositiveChannels.length} kênh có margin + cash tốt
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Potential upside</span>
            <span className="text-lg font-bold text-green-400">
              +{formatCurrency(totalProfit * 0.3)}đ
            </span>
          </div>
          <Button 
            size="sm" 
            className="w-full mt-3 bg-green-600 hover:bg-green-700 gap-1"
            disabled={profitableCampaigns.length === 0}
            onClick={() => handleQuickAction('scale_all', 'Đã gửi lệnh scale các kênh profitable')}
          >
            <Zap className="h-4 w-4" />
            Scale ngay
          </Button>
        </CardContent>
      </Card>

      {/* Pause Card */}
      <Card className={cn(
        "border-2 transition-all hover:shadow-lg cursor-pointer group",
        lossMakingCampaigns.length > 0
          ? "border-red-500/50 bg-gradient-to-br from-red-500/10 to-red-500/5 hover:border-red-500"
          : "border-border/50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors">
              <Pause className="h-5 w-5 text-red-400" />
            </div>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              {lossMakingCampaigns.length} lỗ
            </Badge>
          </div>
          <h3 className="font-bold text-lg text-red-400 mb-1">PAUSE</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Campaigns đang đốt tiền cần dừng ngay
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Đang mất mỗi ngày</span>
            <span className="text-lg font-bold text-red-400">
              -{formatCurrency(totalLoss / 30)}đ
            </span>
          </div>
          <Button 
            size="sm" 
            variant="destructive"
            className="w-full mt-3 gap-1"
            disabled={lossMakingCampaigns.length === 0}
            onClick={() => handleQuickAction('pause_losses', `Đã pause ${lossMakingCampaigns.length} campaigns lỗ`)}
          >
            <Pause className="h-4 w-4" />
            Pause tất cả lỗ
          </Button>
        </CardContent>
      </Card>

      {/* Cash Review Card */}
      <Card className={cn(
        "border-2 transition-all hover:shadow-lg cursor-pointer group",
        cashNegativeChannels.length > 0
          ? "border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 hover:border-yellow-500"
          : "border-border/50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-yellow-500/20 group-hover:bg-yellow-500/30 transition-colors">
              <DollarSign className="h-5 w-5 text-yellow-400" />
            </div>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              {cashNegativeChannels.length} kênh
            </Badge>
          </div>
          <h3 className="font-bold text-lg text-yellow-400 mb-1">CASH REVIEW</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Kênh có margin nhưng cash flow chậm
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Cash đang chờ</span>
            <span className="text-lg font-bold text-yellow-400">
              {formatCurrency(summary.total_cash_pending)}đ
            </span>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            className="w-full mt-3 gap-1 border-yellow-500/30 hover:bg-yellow-500/10"
            onClick={() => handleQuickAction('review_cash', 'Đã đánh dấu review cash flow')}
          >
            <RefreshCw className="h-4 w-4" />
            Review cash
          </Button>
        </CardContent>
      </Card>

      {/* Health Status Card */}
      <Card className={cn(
        "border-2 transition-all hover:shadow-lg cursor-pointer group",
        summary.total_contribution_margin >= 0 && summary.cash_conversion_rate >= 0.7
          ? "border-green-500/50 bg-gradient-to-br from-green-500/10 to-green-500/5"
          : summary.total_contribution_margin >= 0
          ? "border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5"
          : "border-red-500/50 bg-gradient-to-br from-red-500/10 to-red-500/5"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              summary.total_contribution_margin >= 0 && summary.cash_conversion_rate >= 0.7
                ? "bg-green-500/20"
                : summary.total_contribution_margin >= 0
                ? "bg-yellow-500/20"
                : "bg-red-500/20"
            )}>
              {summary.total_contribution_margin >= 0 && summary.cash_conversion_rate >= 0.7 ? (
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              ) : summary.total_contribution_margin >= 0 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <Badge className={cn(
              summary.total_contribution_margin >= 0 && summary.cash_conversion_rate >= 0.7
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : summary.total_contribution_margin >= 0
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                : "bg-red-500/20 text-red-400 border-red-500/30"
            )}>
              {summary.total_contribution_margin >= 0 && summary.cash_conversion_rate >= 0.7
                ? "Healthy"
                : summary.total_contribution_margin >= 0
                ? "Caution"
                : "Critical"
              }
            </Badge>
          </div>
          <h3 className={cn(
            "font-bold text-lg mb-1",
            summary.total_contribution_margin >= 0 && summary.cash_conversion_rate >= 0.7
              ? "text-green-400"
              : summary.total_contribution_margin >= 0
              ? "text-yellow-400"
              : "text-red-400"
          )}>
            MARKETING HEALTH
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {summary.total_contribution_margin >= 0 && summary.cash_conversion_rate >= 0.7
              ? "Scale được - Margin + Cash đều tốt"
              : summary.total_contribution_margin >= 0
              ? "Có margin nhưng cash chưa optimal"
              : "STOP - Đang lỗ margin"
            }
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Net Marketing P&L</span>
            <span className={cn(
              "text-lg font-bold",
              summary.total_contribution_margin >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {summary.total_contribution_margin >= 0 ? '+' : ''}{formatCurrency(summary.total_contribution_margin)}đ
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
