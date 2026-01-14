import { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Package,
  Truck,
  CreditCard,
  Percent,
  RotateCcw,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfitAttribution, CashImpact } from '@/hooks/useMDPData';

interface CampaignProfitDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: ProfitAttribution | null;
  cashData?: CashImpact | null;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
};

export function CampaignProfitDrilldown({
  open,
  onOpenChange,
  campaign,
  cashData
}: CampaignProfitDrilldownProps) {
  const [activeTab, setActiveTab] = useState('pl');

  if (!campaign) return null;

  const statusConfig = {
    profitable: { label: 'Có lãi', color: 'text-green-400', bgColor: 'bg-green-500/10' },
    marginal: { label: 'Biên mỏng', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    loss: { label: 'Lỗ', color: 'text-red-400', bgColor: 'bg-red-500/10' },
    critical: { label: 'Lỗ nặng', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  };

  const status = statusConfig[campaign.status] || statusConfig.marginal;
  
  // Calculate percentages for waterfall
  const totalCosts = campaign.cogs + campaign.platform_fees + campaign.logistics_cost + 
                     campaign.payment_fees + campaign.return_cost + campaign.ad_spend;
  const grossRevenue = campaign.gross_revenue;

  const costBreakdown = [
    { 
      label: 'COGS (Giá vốn)', 
      value: campaign.cogs, 
      percent: grossRevenue > 0 ? (campaign.cogs / grossRevenue) * 100 : 0,
      icon: Package,
      color: 'text-orange-400'
    },
    { 
      label: 'Platform Fees', 
      value: campaign.platform_fees, 
      percent: grossRevenue > 0 ? (campaign.platform_fees / grossRevenue) * 100 : 0,
      icon: Percent,
      color: 'text-purple-400'
    },
    { 
      label: 'Logistics', 
      value: campaign.logistics_cost, 
      percent: grossRevenue > 0 ? (campaign.logistics_cost / grossRevenue) * 100 : 0,
      icon: Truck,
      color: 'text-blue-400'
    },
    { 
      label: 'Payment Fees', 
      value: campaign.payment_fees, 
      percent: grossRevenue > 0 ? (campaign.payment_fees / grossRevenue) * 100 : 0,
      icon: CreditCard,
      color: 'text-cyan-400'
    },
    { 
      label: 'Returns/Refunds', 
      value: campaign.return_cost, 
      percent: grossRevenue > 0 ? (campaign.return_cost / grossRevenue) * 100 : 0,
      icon: RotateCcw,
      color: 'text-pink-400'
    },
    { 
      label: 'Ad Spend', 
      value: campaign.ad_spend, 
      percent: grossRevenue > 0 ? (campaign.ad_spend / grossRevenue) * 100 : 0,
      icon: DollarSign,
      color: 'text-yellow-400'
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{campaign.campaign_name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <span>{campaign.channel}</span>
                <span>•</span>
                <span>{campaign.cohort}</span>
              </DialogDescription>
            </div>
            <Badge className={cn("gap-1", status.bgColor, status.color)}>
              {campaign.contribution_margin >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {status.label}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pl">P&L Chi tiết</TabsTrigger>
            <TabsTrigger value="cash">Cash Flow</TabsTrigger>
            <TabsTrigger value="metrics">KPIs</TabsTrigger>
          </TabsList>

          {/* P&L Tab */}
          <TabsContent value="pl" className="mt-4 space-y-4">
            {/* Revenue Section */}
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Doanh thu gộp</span>
                  <span className="text-xl font-bold text-green-400">
                    +{formatCurrency(campaign.gross_revenue)}đ
                  </span>
                </div>
                {campaign.discount_given > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-yellow-400">-{formatCurrency(campaign.discount_given)}đ</span>
                  </div>
                )}
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Net Revenue</span>
                  <span className="text-lg font-bold">{formatCurrency(campaign.net_revenue)}đ</span>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown Waterfall */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Chi phí chi tiết
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {costBreakdown.map((cost) => {
                  const Icon = cost.icon;
                  return (
                    <div key={cost.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", cost.color)} />
                          <span className="text-muted-foreground">{cost.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-400">-{formatCurrency(cost.value)}đ</span>
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {cost.percent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={Math.min(cost.percent, 100)} 
                        className="h-1.5 [&>div]:bg-red-500/50"
                      />
                    </div>
                  );
                })}
                
                <Separator className="my-3" />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tổng chi phí</span>
                  <span className="text-red-400 font-medium">-{formatCurrency(totalCosts)}đ</span>
                </div>
              </CardContent>
            </Card>

            {/* Contribution Margin Result */}
            <Card className={cn(
              "border-2",
              campaign.contribution_margin >= 0 ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"
            )}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Contribution Margin</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Net Revenue - Tất cả chi phí
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-2xl font-bold",
                      campaign.contribution_margin >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {campaign.contribution_margin >= 0 ? '+' : ''}{formatCurrency(campaign.contribution_margin)}đ
                    </p>
                    <p className={cn(
                      "text-sm",
                      campaign.contribution_margin_percent >= 10 ? "text-green-400" : 
                      campaign.contribution_margin_percent >= 0 ? "text-yellow-400" : "text-red-400"
                    )}>
                      CM%: {campaign.contribution_margin_percent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Flow Tab */}
          <TabsContent value="cash" className="mt-4 space-y-4">
            {cashData ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-muted-foreground">Cash đã về</span>
                      </div>
                      <p className="text-xl font-bold text-green-400">
                        {formatCurrency(cashData.cash_received)}đ
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm text-muted-foreground">Đang chờ</span>
                      </div>
                      <p className="text-xl font-bold text-yellow-400">
                        {formatCurrency(cashData.pending_cash)}đ
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Cash Conversion Rate</span>
                      <span className={cn(
                        "font-bold",
                        cashData.cash_conversion_rate >= 0.7 ? "text-green-400" : "text-yellow-400"
                      )}>
                        {(cashData.cash_conversion_rate * 100).toFixed(0)}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg Days to Cash</span>
                      <span className={cn(
                        "font-bold",
                        cashData.avg_days_to_cash <= 14 ? "text-green-400" : 
                        cashData.avg_days_to_cash <= 30 ? "text-yellow-400" : "text-red-400"
                      )}>
                        {cashData.avg_days_to_cash} ngày
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Cash Locked (Ads)</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(cashData.cash_locked_ads)}đ
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Refunds</span>
                      <span className="text-red-400">
                        -{formatCurrency(cashData.refund_amount)}đ
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "border",
                  cashData.is_cash_positive ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                )}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {cashData.is_cash_positive ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                        )}
                        <span className="font-medium">Cash Position</span>
                      </div>
                      <Badge className={cn(
                        cashData.is_cash_positive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      )}>
                        {cashData.is_cash_positive ? 'Dương' : 'Âm'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>Chưa có dữ liệu cash flow cho campaign này</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* KPIs Tab */}
          <TabsContent value="metrics" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Profit ROAS</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    campaign.profit_roas >= 0.3 ? "text-green-400" : 
                    campaign.profit_roas >= 0 ? "text-yellow-400" : "text-red-400"
                  )}>
                    {campaign.profit_roas.toFixed(2)}x
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CM / Ad Spend
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">CM %</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    campaign.contribution_margin_percent >= 15 ? "text-green-400" : 
                    campaign.contribution_margin_percent >= 5 ? "text-yellow-400" : "text-red-400"
                  )}>
                    {campaign.contribution_margin_percent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CM / Net Revenue
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">ROAS thường</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {campaign.net_revenue > 0 && campaign.ad_spend > 0 
                      ? (campaign.net_revenue / campaign.ad_spend).toFixed(2) 
                      : '0.00'}x
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Revenue / Ad Spend
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Cost Ratio</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    (totalCosts / campaign.gross_revenue * 100) < 85 ? "text-green-400" : "text-red-400"
                  )}>
                    {campaign.gross_revenue > 0 
                      ? ((totalCosts / campaign.gross_revenue) * 100).toFixed(0) 
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tổng CP / Doanh thu
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Cost Structure Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cơ cấu chi phí</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {costBreakdown
                    .filter(c => c.value > 0)
                    .sort((a, b) => b.value - a.value)
                    .map((cost) => {
                      const Icon = cost.icon;
                      return (
                        <div key={cost.label} className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", cost.color)} />
                          <span className="text-sm flex-1">{cost.label}</span>
                          <span className="text-sm font-medium">{cost.percent.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
