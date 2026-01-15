import { useState, forwardRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  ShoppingCart,
  Eye,
  MousePointer,
  Pause,
  Play,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketingPerformance } from '@/hooks/useMDPData';

interface CampaignDetailDialogProps {
  campaign: MarketingPerformance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPauseCampaign?: (campaignId: string) => void;
  onResumeCampaign?: (campaignId: string) => void;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
};

export const CampaignDetailDialog = forwardRef<HTMLDivElement, CampaignDetailDialogProps>(
  function CampaignDetailDialog({
    campaign,
    open,
    onOpenChange,
    onPauseCampaign,
    onResumeCampaign,
  }, ref) {
    const [activeTab, setActiveTab] = useState('overview');

    if (!campaign) return null;

  const profit = campaign.revenue - campaign.spend;
  const profitMargin = campaign.revenue > 0 ? (profit / campaign.revenue) * 100 : 0;
  const isPositive = profit > 0;

  const getStatusBadge = (status: MarketingPerformance['status']) => {
    const config = {
      active: { label: 'Active', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      paused: { label: 'Paused', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      ended: { label: 'Ended', className: 'bg-muted text-muted-foreground border-border' },
    };
    return config[status];
  };

  const statusConfig = getStatusBadge(campaign.status);

  // Mock additional data
  const dailyData = [
    { date: 'T2', spend: 850000, revenue: 2400000, orders: 12 },
    { date: 'T3', spend: 920000, revenue: 2100000, orders: 10 },
    { date: 'T4', spend: 780000, revenue: 2800000, orders: 14 },
    { date: 'T5', spend: 1100000, revenue: 3200000, orders: 16 },
    { date: 'T6', spend: 1250000, revenue: 4100000, orders: 21 },
    { date: 'T7', spend: 1500000, revenue: 5200000, orders: 26 },
    { date: 'CN', spend: 1400000, revenue: 4800000, orders: 24 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{campaign.campaign_name}</DialogTitle>
              <Badge className={cn("text-xs", statusConfig.className)}>
                {statusConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {campaign.status === 'active' ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onPauseCampaign?.(campaign.campaign_id);
                    onOpenChange(false);
                  }}
                  className="text-yellow-400 border-yellow-400/30"
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Tạm dừng
                </Button>
              ) : campaign.status === 'paused' ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onResumeCampaign?.(campaign.campaign_id);
                    onOpenChange(false);
                  }}
                  className="text-green-400 border-green-400/30"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Tiếp tục
                </Button>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Channel: <Badge variant="outline">{campaign.channel}</Badge></span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Last 7 days
            </span>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="performance">Hiệu suất</TabsTrigger>
            <TabsTrigger value="insights">Phân tích</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-red-400" />
                    <span className="text-xs text-muted-foreground">Chi tiêu</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(campaign.spend)}đ</p>
                </CardContent>
              </Card>
              
              <Card className="border-border">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-green-400" />
                    <span className="text-xs text-muted-foreground">Doanh thu</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(campaign.revenue)}đ</p>
                </CardContent>
              </Card>
              
              <Card className="border-border">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-muted-foreground">Đơn hàng</span>
                  </div>
                  <p className="text-2xl font-bold">{campaign.orders}</p>
                </CardContent>
              </Card>
              
              <Card className={cn(
                "border-border",
                isPositive ? "bg-green-500/5" : "bg-red-500/5"
              )}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    )}
                    <span className="text-xs text-muted-foreground">Lợi nhuận</span>
                  </div>
                  <p className={cn(
                    "text-2xl font-bold",
                    isPositive ? "text-green-400" : "text-red-400"
                  )}>
                    {isPositive ? '+' : ''}{formatCurrency(profit)}đ
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Chỉ số hiệu suất</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ROAS</p>
                    <p className={cn(
                      "text-xl font-bold",
                      campaign.roas >= 3 ? "text-green-400" :
                      campaign.roas >= 2 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {campaign.roas.toFixed(2)}x
                    </p>
                    <p className="text-xs text-muted-foreground">Target: 3.0x</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">CPA</p>
                    <p className={cn(
                      "text-xl font-bold",
                      campaign.cpa < 100000 ? "text-green-400" :
                      campaign.cpa < 150000 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {formatCurrency(campaign.cpa)}đ
                    </p>
                    <p className="text-xs text-muted-foreground">Target: 100K</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Profit Margin</p>
                    <p className={cn(
                      "text-xl font-bold",
                      profitMargin > 20 ? "text-green-400" :
                      profitMargin > 10 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {profitMargin.toFixed(1)}%
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">AOV</p>
                    <p className="text-xl font-bold">
                      {campaign.orders > 0 ? formatCurrency(campaign.revenue / campaign.orders) : 0}đ
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 mt-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Hiệu suất 7 ngày gần nhất
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dailyData.map((day, index) => {
                    const dayRoas = day.spend > 0 ? day.revenue / day.spend : 0;
                    return (
                      <div key={day.date} className="flex items-center gap-4">
                        <span className="w-8 text-sm font-medium">{day.date}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>Spend: {formatCurrency(day.spend)}đ</span>
                            <span>Revenue: {formatCurrency(day.revenue)}đ</span>
                            <span className={cn(
                              "font-medium",
                              dayRoas >= 2 ? "text-green-400" : "text-red-400"
                            )}>
                              ROAS: {dayRoas.toFixed(1)}x
                            </span>
                          </div>
                          <Progress 
                            value={(day.revenue / 6000000) * 100} 
                            className="h-2"
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-16 text-right">
                          {day.orders} đơn
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4 mt-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">AI Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaign.roas >= 2.5 ? (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="flex items-start gap-2">
                      <ArrowUpRight className="h-4 w-4 text-green-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-400">Campaign hiệu quả cao</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ROAS {campaign.roas.toFixed(1)}x vượt benchmark. Đề xuất tăng budget 20-30% để scale.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <div className="flex items-start gap-2">
                      <ArrowDownRight className="h-4 w-4 text-red-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-400">Cần tối ưu</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ROAS {campaign.roas.toFixed(1)}x dưới mức sinh lời. Xem xét tối ưu targeting hoặc creative.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-400">Audience Insight</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Khách hàng từ {campaign.channel} có AOV cao hơn 15% so với trung bình. 
                        Focus vào phân khúc 25-34 tuổi để tối ưu.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-start gap-2">
                    <MousePointer className="h-4 w-4 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-400">Creative Performance</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Video ads đang outperform image ads 2.3x. Đề xuất chuyển budget sang video format.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
});
