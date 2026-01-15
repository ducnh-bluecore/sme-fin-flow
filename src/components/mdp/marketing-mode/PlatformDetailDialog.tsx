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
  DollarSign,
  ShoppingCart,
  Eye,
  MousePointer,
  Pause,
  Play,
  ArrowUp,
  ArrowDown,
  ShoppingBag,
  Store,
  Video,
  Search,
  Facebook,
  BarChart3,
  Target,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlatformAdsData } from './PlatformAdsOverview';

interface PlatformDetailDialogProps {
  platform: PlatformAdsData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPausePlatform?: (platform: string) => void;
  onResumePlatform?: (platform: string) => void;
  onAdjustBudget?: (platform: string, direction: 'up' | 'down') => void;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
};

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

const getPlatformIcon = (platform: PlatformAdsData['platform_icon']) => {
  const icons: Record<string, React.ReactNode> = {
    shopee: <ShoppingBag className="h-5 w-5 text-orange-400" />,
    lazada: <Store className="h-5 w-5 text-purple-400" />,
    tiktok: <Video className="h-5 w-5 text-pink-400" />,
    google: <Search className="h-5 w-5 text-blue-400" />,
    meta: <Facebook className="h-5 w-5 text-blue-500" />,
    sendo: <Store className="h-5 w-5 text-red-400" />,
  };
  return icons[platform] || <BarChart3 className="h-5 w-5" />;
};

export const PlatformDetailDialog = forwardRef<HTMLDivElement, PlatformDetailDialogProps>(
  function PlatformDetailDialog({
    platform,
    open,
    onOpenChange,
    onPausePlatform,
    onResumePlatform,
    onAdjustBudget,
  }, ref) {
    const [activeTab, setActiveTab] = useState('overview');

    if (!platform) return null;

  const profit = platform.revenue - platform.spend_month;
  const profitMargin = platform.revenue > 0 ? (profit / platform.revenue) * 100 : 0;
  const isPositive = profit > 0;

  // Mock campaign data for this platform
  const platformCampaigns = [
    { name: 'Flash Sale Weekend', spend: 12500000, revenue: 42000000, orders: 210, roas: 3.36, status: 'active' },
    { name: 'New Collection Launch', spend: 8500000, revenue: 25500000, orders: 128, roas: 3.00, status: 'active' },
    { name: 'Retargeting - Cart Abandoners', spend: 5200000, revenue: 18200000, orders: 91, roas: 3.50, status: 'active' },
    { name: 'Brand Awareness', spend: 15000000, revenue: 28000000, orders: 140, roas: 1.87, status: 'paused' },
    { name: 'Competitor Keywords', spend: 3800000, revenue: 14300000, orders: 72, roas: 3.76, status: 'active' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getPlatformIcon(platform.platform_icon)}
              <DialogTitle className="text-xl">{platform.platform}</DialogTitle>
              {platform.is_active ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Active
                </Badge>
              ) : (
                <Badge className="bg-muted text-muted-foreground">
                  Paused
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAdjustBudget?.(platform.platform, 'up')}
                className="text-green-400 border-green-400/30"
              >
                <ArrowUp className="h-4 w-4 mr-1" />
                +20%
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAdjustBudget?.(platform.platform, 'down')}
                className="text-yellow-400 border-yellow-400/30"
              >
                <ArrowDown className="h-4 w-4 mr-1" />
                -20%
              </Button>
              {platform.is_active ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onPausePlatform?.(platform.platform);
                    onOpenChange(false);
                  }}
                  className="text-red-400 border-red-400/30"
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Dừng
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onResumePlatform?.(platform.platform);
                    onOpenChange(false);
                  }}
                  className="text-green-400 border-green-400/30"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Chạy
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="funnel">Funnel</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Budget Progress */}
            <Card className="border-border">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Budget tháng này</span>
                  <span className={cn(
                    "text-sm font-medium",
                    platform.budget_utilization > 90 ? "text-red-400" :
                    platform.budget_utilization > 70 ? "text-yellow-400" : "text-green-400"
                  )}>
                    {formatCurrency(platform.spend_month)}đ / {formatCurrency(platform.budget_month)}đ
                  </span>
                </div>
                <Progress value={platform.budget_utilization} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Sử dụng {platform.budget_utilization.toFixed(0)}% budget
                </p>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-muted-foreground">Impressions</span>
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(platform.impressions)}</p>
                  <p className="text-xs text-muted-foreground">CPM: {formatCurrency(platform.cpm)}đ</p>
                </CardContent>
              </Card>
              
              <Card className="border-border">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MousePointer className="h-4 w-4 text-purple-400" />
                    <span className="text-xs text-muted-foreground">Clicks</span>
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(platform.clicks)}</p>
                  <p className="text-xs text-muted-foreground">
                    CTR: {platform.ctr.toFixed(2)}% | CPC: {formatCurrency(platform.cpc)}đ
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-border">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="h-4 w-4 text-green-400" />
                    <span className="text-xs text-muted-foreground">Orders</span>
                  </div>
                  <p className="text-2xl font-bold">{platform.orders}</p>
                  <p className="text-xs text-muted-foreground">
                    CVR: {platform.cvr.toFixed(2)}% | CPA: {formatCurrency(platform.cpa)}đ
                  </p>
                </CardContent>
              </Card>
              
              <Card className={cn(
                "border-border",
                isPositive ? "bg-green-500/5" : "bg-red-500/5"
              )}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-yellow-400" />
                    <span className="text-xs text-muted-foreground">Revenue</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(platform.revenue)}đ</p>
                  <p className={cn(
                    "text-xs font-medium",
                    isPositive ? "text-green-400" : "text-red-400"
                  )}>
                    Profit: {isPositive ? '+' : ''}{formatCurrency(profit)}đ
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
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">ROAS</p>
                    <p className={cn(
                      "text-lg font-bold",
                      platform.roas >= 3 ? "text-green-400" :
                      platform.roas >= 2 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {platform.roas.toFixed(2)}x
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {platform.roas_trend > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-400" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-400" />
                      )}
                      <span className={cn(
                        "text-xs",
                        platform.roas_trend > 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {platform.roas_trend > 0 ? '+' : ''}{platform.roas_trend}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">ACOS</p>
                    <p className={cn(
                      "text-lg font-bold",
                      platform.acos <= 15 ? "text-green-400" :
                      platform.acos <= 25 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {platform.acos.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Target: &lt;20%</p>
                  </div>
                  
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">CTR</p>
                    <p className={cn(
                      "text-lg font-bold",
                      platform.ctr >= 2 ? "text-green-400" :
                      platform.ctr >= 1 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {platform.ctr.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Benchmark: 1.5%</p>
                  </div>
                  
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">CVR</p>
                    <p className={cn(
                      "text-lg font-bold",
                      platform.cvr >= 3 ? "text-green-400" :
                      platform.cvr >= 2 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {platform.cvr.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Benchmark: 2%</p>
                  </div>
                  
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">ATC Rate</p>
                    <p className={cn(
                      "text-lg font-bold",
                      platform.atc_rate >= 15 ? "text-green-400" :
                      platform.atc_rate >= 10 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {platform.atc_rate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Add to Cart</p>
                  </div>
                  
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Profit Margin</p>
                    <p className={cn(
                      "text-lg font-bold",
                      profitMargin > 20 ? "text-green-400" :
                      profitMargin > 10 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {profitMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4 mt-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Campaigns trên {platform.platform}</span>
                  <Badge variant="outline">{platformCampaigns.length} campaigns</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {platformCampaigns.map((campaign, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{campaign.name}</p>
                          <Badge className={cn(
                            "text-xs",
                            campaign.status === 'active' 
                              ? "bg-green-500/20 text-green-400" 
                              : "bg-yellow-500/20 text-yellow-400"
                          )}>
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Spend: {formatCurrency(campaign.spend)}đ | {campaign.orders} orders
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(campaign.revenue)}đ</p>
                        <p className={cn(
                          "text-xs font-medium",
                          campaign.roas >= 2.5 ? "text-green-400" :
                          campaign.roas >= 1.5 ? "text-yellow-400" : "text-red-400"
                        )}>
                          ROAS: {campaign.roas.toFixed(2)}x
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="funnel" className="space-y-4 mt-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Funnel visualization */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm text-muted-foreground">Impressions</div>
                    <div className="flex-1">
                      <Progress value={100} className="h-8" />
                    </div>
                    <div className="w-24 text-right font-medium">{formatNumber(platform.impressions)}</div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm text-muted-foreground">Clicks</div>
                    <div className="flex-1">
                      <Progress value={(platform.clicks / platform.impressions) * 100} className="h-8" />
                    </div>
                    <div className="w-24 text-right">
                      <span className="font-medium">{formatNumber(platform.clicks)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({platform.ctr.toFixed(2)}%)</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm text-muted-foreground">Add to Cart</div>
                    <div className="flex-1">
                      <Progress value={(platform.add_to_cart / platform.impressions) * 100} className="h-8" />
                    </div>
                    <div className="w-24 text-right">
                      <span className="font-medium">{formatNumber(platform.add_to_cart)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({platform.atc_rate.toFixed(1)}%)</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm text-muted-foreground">Orders</div>
                    <div className="flex-1">
                      <Progress value={(platform.orders / platform.impressions) * 100} className="h-8" />
                    </div>
                    <div className="w-24 text-right">
                      <span className="font-medium">{platform.orders}</span>
                      <span className="text-xs text-muted-foreground ml-1">({platform.cvr.toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>

                {/* Drop-off analysis */}
                <div className="mt-6 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium mb-3">Drop-off Analysis</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-xs text-muted-foreground">Impressions → Clicks</p>
                      <p className="text-lg font-bold text-yellow-400">
                        -{(100 - platform.ctr).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-xs text-muted-foreground">Clicks → Add to Cart</p>
                      <p className="text-lg font-bold text-yellow-400">
                        -{(100 - platform.atc_rate).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-xs text-muted-foreground">Cart → Orders</p>
                      <p className="text-lg font-bold text-yellow-400">
                        -{(100 - (platform.orders / platform.add_to_cart * 100)).toFixed(1)}%
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
