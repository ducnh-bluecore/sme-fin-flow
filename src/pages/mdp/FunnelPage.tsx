import { useMDPData } from '@/hooks/useMDPData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, Target, Eye, MousePointer, ShoppingCart, DollarSign } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { FunnelChart } from '@/components/mdp/marketing-mode';
import { cn } from '@/lib/utils';

export default function FunnelPage() {
  const { funnelData, isLoading, error } = useMDPData();

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

  // Calculate funnel metrics
  const funnelMetrics = {
    impressions: 3300000,
    clicks: 57700,
    addToCart: 8450,
    checkout: 4800,
    orders: 1147,
    revenue: 448500000,
  };

  const conversionRates = {
    ctr: (funnelMetrics.clicks / funnelMetrics.impressions * 100).toFixed(2),
    atcRate: (funnelMetrics.addToCart / funnelMetrics.clicks * 100).toFixed(2),
    checkoutRate: (funnelMetrics.checkout / funnelMetrics.addToCart * 100).toFixed(2),
    orderRate: (funnelMetrics.orders / funnelMetrics.checkout * 100).toFixed(2),
    overallCvr: (funnelMetrics.orders / funnelMetrics.clicks * 100).toFixed(2),
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

      {/* Funnel by Channel */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Funnel theo Kênh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { channel: 'TikTok Shop', impressions: 1200000, clicks: 28000, orders: 480, cvr: 1.71, color: 'text-pink-400' },
              { channel: 'Shopee Ads', impressions: 850000, clicks: 12500, orders: 320, cvr: 2.56, color: 'text-orange-400' },
              { channel: 'Lazada Ads', impressions: 620000, clicks: 8900, orders: 210, cvr: 2.36, color: 'text-purple-400' },
              { channel: 'Meta Ads', impressions: 480000, clicks: 6200, orders: 95, cvr: 1.53, color: 'text-blue-400' },
              { channel: 'Google Ads', impressions: 150000, clicks: 2100, orders: 42, cvr: 2.00, color: 'text-green-400' },
            ].map((item) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
