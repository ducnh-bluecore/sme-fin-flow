import { useState, useMemo } from 'react';
import { useMDPDataSSOT } from '@/hooks/useMDPDataSSOT';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  Clock,
  Star,
  ShoppingCart,
  Repeat,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

export default function CustomerLTVPage() {
  const { 
    profitAttribution, 
    marketingModeSummary,
    cmoModeSummary,
    thresholds,
    isLoading, 
    error 
  } = useMDPDataSSOT();

  const [activeTab, setActiveTab] = useState('overview');

  // Calculate LTV metrics by channel from real data
  const ltvByChannel = useMemo(() => {
    const channelMap = new Map<string, {
      channel: string;
      revenue: number;
      orders: number;
      adSpend: number;
      margin: number;
    }>();

    profitAttribution.forEach(campaign => {
      const existing = channelMap.get(campaign.channel) || {
        channel: campaign.channel,
        revenue: 0,
        orders: 0,
        adSpend: 0,
        margin: 0,
      };
      existing.revenue += campaign.net_revenue;
      existing.adSpend += campaign.ad_spend;
      existing.margin += campaign.contribution_margin;
      channelMap.set(campaign.channel, existing);
    });

    // Use total orders from marketing summary distributed by revenue share
    const totalRevenue = Array.from(channelMap.values()).reduce((sum, c) => sum + c.revenue, 0);
    const totalOrders = marketingModeSummary.total_orders || 100; // Fallback

    return Array.from(channelMap.values()).map(c => {
      const orderShare = totalRevenue > 0 ? c.revenue / totalRevenue : 0;
      const estimatedOrders = Math.max(1, Math.floor(totalOrders * orderShare));
      const estimatedCustomers = Math.max(1, Math.floor(estimatedOrders * 0.7)); // 70% unique customers estimate
      
      // LTV = (Revenue - COGS) / Customers (simplified as margin / customers for now)
      const ltv = c.margin / estimatedCustomers;
      // CAC = Ad Spend / New Customers
      const cac = c.adSpend / estimatedCustomers;
      const ratio = cac > 0 ? ltv / cac : 0;

      return {
        channel: c.channel,
        ltv,
        cac,
        ratio,
        customers: estimatedCustomers,
        revenue: c.revenue,
        margin: c.margin,
      };
    }).sort((a, b) => b.ratio - a.ratio);
  }, [profitAttribution, marketingModeSummary]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    if (ltvByChannel.length === 0) {
      return { avgLTV: 0, avgCAC: 0, ltvCacRatio: 0, paybackMonths: 0 };
    }

    const totalLTV = ltvByChannel.reduce((sum, c) => sum + c.ltv * c.customers, 0);
    const totalCAC = ltvByChannel.reduce((sum, c) => sum + c.cac * c.customers, 0);
    const totalCustomers = ltvByChannel.reduce((sum, c) => sum + c.customers, 0);

    const avgLTV = totalCustomers > 0 ? totalLTV / totalCustomers : 0;
    const avgCAC = totalCustomers > 0 ? totalCAC / totalCustomers : 0;
    const ltvCacRatio = avgCAC > 0 ? avgLTV / avgCAC : 0;
    // Payback = CAC / (LTV / 12 months) = CAC * 12 / LTV
    const paybackMonths = avgLTV > 0 ? (avgCAC * 12) / avgLTV : 0;

    return { avgLTV, avgCAC, ltvCacRatio, paybackMonths };
  }, [ltvByChannel]);

  // LTV Projection data (estimated from current data)
  const ltvProjection = useMemo(() => {
    const monthlyValue = summaryMetrics.avgLTV / 12;
    return [
      { month: 'M1', value: monthlyValue * 2, cumulative: monthlyValue * 2 },
      { month: 'M3', value: monthlyValue * 1.2, cumulative: monthlyValue * 3.2 },
      { month: 'M6', value: monthlyValue, cumulative: summaryMetrics.avgLTV * 0.5 },
      { month: 'M12', value: monthlyValue * 0.8, cumulative: summaryMetrics.avgLTV },
    ];
  }, [summaryMetrics.avgLTV]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Không thể tải dữ liệu Customer LTV. Vui lòng thử lại sau.
        </AlertDescription>
      </Alert>
    );
  }

  const hasData = ltvByChannel.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Customer Lifetime Value"
        subtitle="Phân tích giá trị vòng đời khách hàng theo kênh marketing"
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. LTV</p>
                <p className="text-2xl font-bold">{formatCurrency(summaryMetrics.avgLTV)}</p>
                <p className="text-xs text-muted-foreground">
                  {hasData ? 'Từ dữ liệu thực' : 'Chưa có dữ liệu'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Target className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. CAC</p>
                <p className="text-2xl font-bold">{formatCurrency(summaryMetrics.avgCAC)}</p>
                <p className="text-xs text-muted-foreground">
                  Target: &lt; {thresholds.MAX_CAC_TO_AOV * 100}% AOV
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">LTV:CAC Ratio</p>
                <p className={cn(
                  "text-2xl font-bold",
                  summaryMetrics.ltvCacRatio >= 3 ? "text-success" : 
                  summaryMetrics.ltvCacRatio >= 1 ? "text-warning" : "text-destructive"
                )}>
                  {summaryMetrics.ltvCacRatio.toFixed(1)}x
                </p>
                <p className="text-xs text-muted-foreground">Target: 3x+</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payback Period</p>
                <p className={cn(
                  "text-2xl font-bold",
                  summaryMetrics.paybackMonths <= 6 ? "text-success" :
                  summaryMetrics.paybackMonths <= 12 ? "text-warning" : "text-destructive"
                )}>
                  {summaryMetrics.paybackMonths.toFixed(1)} tháng
                </p>
                <p className="text-xs text-muted-foreground">Target: &lt;6 tháng</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="channels">Theo kênh</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* LTV Projection */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dự báo LTV theo thời gian</CardTitle>
              <CardDescription>Giá trị khách hàng tích lũy qua các tháng (ước tính từ dữ liệu thực)</CardDescription>
            </CardHeader>
            <CardContent>
              {hasData ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ltvProjection}>
                      <defs>
                        <linearGradient id="colorLTV" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs fill-muted-foreground" fontSize={12} />
                      <YAxis className="text-xs fill-muted-foreground" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [formatCurrency(value), '']}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="cumulative" 
                        stroke="hsl(var(--primary))" 
                        fill="url(#colorLTV)"
                        strokeWidth={2}
                        name="LTV tích lũy"
                      />
                      <Bar 
                        dataKey="value" 
                        fill="hsl(var(--chart-2))" 
                        name="Giá trị mỗi kỳ"
                        radius={[4, 4, 0, 0]}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-muted-foreground">
                  Chưa có dữ liệu marketing để phân tích LTV
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="font-medium">Avg. Order Value</span>
                </div>
                <p className="text-2xl font-bold mb-1">
                  {formatCurrency(marketingModeSummary.total_orders > 0 
                    ? marketingModeSummary.total_revenue / marketingModeSummary.total_orders 
                    : 0
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Từ {marketingModeSummary.total_orders} đơn hàng
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-success" />
                  <span className="font-medium">Total Customers (Est.)</span>
                </div>
                <p className="text-2xl font-bold mb-1">
                  {ltvByChannel.reduce((sum, c) => sum + c.customers, 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Ước tính từ orders</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-warning" />
                  <span className="font-medium">Total Customer Value</span>
                </div>
                <p className="text-2xl font-bold mb-1 text-success">
                  {formatCurrency(cmoModeSummary.total_contribution_margin)}
                </p>
                <p className="text-xs text-muted-foreground">Contribution Margin</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels" className="mt-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">LTV theo kênh marketing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasData ? (
                ltvByChannel.map((channel, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{channel.channel}</h3>
                          <Badge className={cn(
                            channel.ratio >= 3 ? "bg-success/20 text-success" :
                            channel.ratio >= 1 ? "bg-warning/20 text-warning" :
                            "bg-destructive/20 text-destructive"
                          )}>
                            LTV:CAC {channel.ratio.toFixed(1)}x
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {channel.customers.toLocaleString()} khách hàng (ước tính)
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-6 lg:gap-8">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">LTV</p>
                          <p className="font-semibold text-primary">{formatCurrency(channel.ltv)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">CAC</p>
                          <p className="font-semibold">{formatCurrency(channel.cac)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Net Value</p>
                          <p className={cn(
                            "font-semibold",
                            channel.margin >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {formatCurrency(channel.margin)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Chưa có dữ liệu marketing. Vui lòng import dữ liệu để phân tích LTV.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
