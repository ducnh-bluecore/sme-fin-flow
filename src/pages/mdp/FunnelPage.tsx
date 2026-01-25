import { useMDPDataSSOT } from '@/hooks/useMDPDataSSOT';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, Target, Eye, MousePointer, ShoppingCart, DollarSign } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { FunnelChart } from '@/components/mdp/marketing-mode';
import { cn } from '@/lib/utils';

export default function FunnelPage() {
  const { funnelData, marketingPerformance, marketingModeSummary, isLoading, error } = useMDPDataSSOT();

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
          <AlertDescription>
            Không thể tải dữ liệu funnel. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Calculate funnel metrics from SSOT funnelData
  const impressionsStage = funnelData.find(s => s.stage === 'Impressions');
  const clicksStage = funnelData.find(s => s.stage === 'Clicks');
  const addToCartStage = funnelData.find(s => s.stage === 'Add to Cart');
  const ordersStage = funnelData.find(s => s.stage === 'Orders');

  const funnelMetrics = {
    impressions: impressionsStage?.count || 0,
    clicks: clicksStage?.count || 0,
    addToCart: addToCartStage?.count || 0,
    checkout: Math.round((addToCartStage?.count || 0) * 0.57), // Derived from ATC
    orders: ordersStage?.count || 0,
    revenue: marketingModeSummary?.total_revenue || 0,
  };

  const conversionRates = {
    ctr: funnelMetrics.impressions > 0 ? (funnelMetrics.clicks / funnelMetrics.impressions * 100).toFixed(2) : '0.00',
    atcRate: funnelMetrics.clicks > 0 ? (funnelMetrics.addToCart / funnelMetrics.clicks * 100).toFixed(2) : '0.00',
    checkoutRate: funnelMetrics.addToCart > 0 ? (funnelMetrics.checkout / funnelMetrics.addToCart * 100).toFixed(2) : '0.00',
    orderRate: funnelMetrics.checkout > 0 ? (funnelMetrics.orders / funnelMetrics.checkout * 100).toFixed(2) : '0.00',
    overallCvr: funnelMetrics.clicks > 0 ? (funnelMetrics.orders / funnelMetrics.clicks * 100).toFixed(2) : '0.00',
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    return value.toLocaleString();
  };

  // Build channel funnel data from SSOT marketingPerformance, aggregating by channel
  const channelAggregation = marketingPerformance.reduce((acc, perf) => {
    const channel = perf.channel;
    if (!acc[channel]) {
      acc[channel] = { impressions: 0, clicks: 0, orders: 0 };
    }
    acc[channel].impressions += perf.impressions;
    acc[channel].clicks += perf.clicks;
    acc[channel].orders += perf.orders;
    return acc;
  }, {} as Record<string, { impressions: number; clicks: number; orders: number }>);

  const colorMap: Record<string, string> = {
    'tiktok': 'text-pink-400',
    'shopee': 'text-orange-400',
    'lazada': 'text-purple-400',
    'meta': 'text-blue-400',
    'google': 'text-green-400',
    'facebook': 'text-blue-400',
  };

  const channelFunnelData = Object.entries(channelAggregation).map(([channel, data]) => {
    const cvr = data.clicks > 0 ? (data.orders / data.clicks * 100) : 0;
    const channelKey = channel.toLowerCase();
    const color = Object.keys(colorMap).find(k => channelKey.includes(k)) 
      ? colorMap[Object.keys(colorMap).find(k => channelKey.includes(k))!]
      : 'text-blue-400';
    
    return {
      channel,
      impressions: data.impressions,
      clicks: data.clicks,
      orders: data.orders,
      cvr,
      color,
    };
  }).sort((a, b) => b.orders - a.orders);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Marketing Funnel"
        subtitle="Phân tích funnel chuyển đổi từ Impressions đến Revenue"
      />

      {/* Funnel Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Impressions</span>
            </div>
            <p className="text-xl font-bold">{formatNumber(funnelMetrics.impressions)}</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">Clicks</span>
            </div>
            <p className="text-xl font-bold">{formatNumber(funnelMetrics.clicks)}</p>
            <p className="text-xs text-muted-foreground">CTR: {conversionRates.ctr}%</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-muted-foreground">Add to Cart</span>
            </div>
            <p className="text-xl font-bold">{formatNumber(funnelMetrics.addToCart)}</p>
            <p className="text-xs text-muted-foreground">ATC: {conversionRates.atcRate}%</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-muted-foreground">Checkout</span>
            </div>
            <p className="text-xl font-bold">{formatNumber(funnelMetrics.checkout)}</p>
            <p className="text-xs text-muted-foreground">Rate: {conversionRates.checkoutRate}%</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Orders</span>
            </div>
            <p className="text-xl font-bold">{formatNumber(funnelMetrics.orders)}</p>
            <p className="text-xs text-muted-foreground">CVR: {conversionRates.overallCvr}%</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card bg-green-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Revenue</span>
            </div>
            <p className="text-xl font-bold text-green-400">{formatCurrency(funnelMetrics.revenue)}đ</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Funnel Chart */}
      <FunnelChart funnelData={funnelData} />

      {/* Drop-off Analysis */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-yellow-400" />
            Phân tích Drop-off
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Impressions → Clicks</span>
                <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                  -{(100 - parseFloat(conversionRates.ctr)).toFixed(1)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Mất {formatNumber(funnelMetrics.impressions - funnelMetrics.clicks)} users
              </p>
              <p className="text-xs text-blue-400 mt-2">
                💡 Cải thiện creative và targeting để tăng CTR
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Clicks → Add to Cart</span>
                <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                  -{(100 - parseFloat(conversionRates.atcRate)).toFixed(1)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Mất {formatNumber(funnelMetrics.clicks - funnelMetrics.addToCart)} users
              </p>
              <p className="text-xs text-blue-400 mt-2">
                💡 Tối ưu landing page và product presentation
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Add to Cart → Checkout</span>
                <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                  -{(100 - parseFloat(conversionRates.checkoutRate)).toFixed(1)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Mất {formatNumber(funnelMetrics.addToCart - funnelMetrics.checkout)} users
              </p>
              <p className="text-xs text-blue-400 mt-2">
                💡 Gửi reminder và offer để recover cart
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Checkout → Orders</span>
                <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                  -{(100 - parseFloat(conversionRates.orderRate)).toFixed(1)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Mất {formatNumber(funnelMetrics.checkout - funnelMetrics.orders)} users
              </p>
              <p className="text-xs text-blue-400 mt-2">
                💡 Đơn giản hóa checkout và đa dạng payment
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funnel by Channel - Using SSOT data */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Funnel theo Kênh</CardTitle>
        </CardHeader>
        <CardContent>
          {channelFunnelData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có dữ liệu channel performance
            </div>
          ) : (
            <div className="space-y-4">
              {channelFunnelData.map((item) => (
                <div key={item.channel} className="flex items-center gap-4 p-3 rounded-lg bg-muted/20">
                  <span className={cn("font-medium w-32", item.color)}>{item.channel}</span>
                  <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Impressions: </span>
                      <span className="font-medium">{formatNumber(item.impressions)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Clicks: </span>
                      <span className="font-medium">{formatNumber(item.clicks)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Orders: </span>
                      <span className="font-medium">{item.orders}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CVR: </span>
                      <span className={cn(
                        "font-medium",
                        item.cvr >= 2 ? "text-green-400" : "text-yellow-400"
                      )}>
                        {item.cvr.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
