import { useState, useMemo } from 'react';
import { useMDPData } from '@/hooks/useMDPData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

export default function ROIAnalyticsPage() {
  const { 
    profitAttribution, 
    cmoModeSummary, 
    marketingModeSummary,
    isLoading, 
    error 
  } = useMDPData();
  
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate ROI by channel from real data
  const roiByChannel = useMemo(() => {
    const channelMap = new Map<string, {
      channel: string;
      spend: number;
      revenue: number;
      profit: number;
    }>();

    profitAttribution.forEach(campaign => {
      const existing = channelMap.get(campaign.channel) || {
        channel: campaign.channel,
        spend: 0,
        revenue: 0,
        profit: 0,
      };
      existing.spend += campaign.ad_spend;
      existing.revenue += campaign.net_revenue;
      existing.profit += campaign.contribution_margin;
      channelMap.set(campaign.channel, existing);
    });

    return Array.from(channelMap.values()).map(c => ({
      ...c,
      roi: c.spend > 0 ? (c.profit / c.spend) * 100 : 0,
      roas: c.spend > 0 ? c.revenue / c.spend : 0,
    })).sort((a, b) => b.roi - a.roi);
  }, [profitAttribution]);

  // Calculate campaign ROI from real data
  const campaignROI = useMemo(() => {
    return profitAttribution.map(campaign => ({
      campaign: campaign.campaign_name,
      channel: campaign.channel,
      spend: campaign.ad_spend,
      revenue: campaign.net_revenue,
      profit: campaign.contribution_margin,
      roi: campaign.ad_spend > 0 ? (campaign.contribution_margin / campaign.ad_spend) * 100 : 0,
      status: campaign.status,
    })).sort((a, b) => b.roi - a.roi);
  }, [profitAttribution]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalSpend = cmoModeSummary.total_marketing_spend;
    const totalRevenue = cmoModeSummary.total_net_revenue;
    const totalProfit = cmoModeSummary.total_contribution_margin;
    const overallROI = totalSpend > 0 ? (totalProfit / totalSpend) * 100 : 0;
    const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    return { totalSpend, totalRevenue, totalProfit, overallROI, overallROAS };
  }, [cmoModeSummary]);

  // Chart data
  const chartData = useMemo(() => {
    return roiByChannel.map(c => ({
      name: c.channel.replace(' Ads', '').replace(' Marketing', ''),
      spend: c.spend / 1000000,
      revenue: c.revenue / 1000000,
      profit: c.profit / 1000000,
      roi: c.roi,
    }));
  }, [roiByChannel]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
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
          Không thể tải dữ liệu ROI Analytics. Vui lòng thử lại sau.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="ROI Analytics"
        subtitle="Phân tích lợi tức đầu tư marketing theo kênh và chiến dịch"
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Spend</p>
            <p className="text-2xl font-bold">{formatCurrency(summaryMetrics.totalSpend)}</p>
            <p className="text-xs text-muted-foreground">
              {profitAttribution.length} campaigns
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Net Revenue</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(summaryMetrics.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">
              Sau khi trừ discount
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Contribution Margin</p>
            <p className={cn(
              "text-2xl font-bold",
              summaryMetrics.totalProfit >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(summaryMetrics.totalProfit)}
            </p>
            <p className="text-xs text-muted-foreground">
              CM% = {cmoModeSummary.contribution_margin_percent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Overall ROI</p>
            <p className={cn(
              "text-2xl font-bold",
              summaryMetrics.overallROI >= 0 ? "text-success" : "text-destructive"
            )}>
              {summaryMetrics.overallROI.toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {summaryMetrics.overallROI >= 100 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-warning" />
              )}
              Target: 100%+
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Profit ROAS</p>
            <p className={cn(
              "text-2xl font-bold",
              cmoModeSummary.overall_profit_roas >= 0.3 ? "text-success" : "text-warning"
            )}>
              {cmoModeSummary.overall_profit_roas.toFixed(2)}x
            </p>
            <p className="text-xs text-muted-foreground">
              Target: 0.3x+
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="channels">Theo kênh</TabsTrigger>
          <TabsTrigger value="campaigns">Theo chiến dịch</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Spend vs Revenue Chart */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Chi tiêu vs Doanh thu theo kênh</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" className="text-xs fill-muted-foreground" fontSize={11} />
                        <YAxis className="text-xs fill-muted-foreground" fontSize={12} tickFormatter={(v) => `${v}M`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          formatter={(value: number) => [`${value.toFixed(0)}M`, '']}
                        />
                        <Legend />
                        <Bar dataKey="spend" name="Chi tiêu" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="revenue" name="Doanh thu" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center text-muted-foreground">
                    Chưa có dữ liệu marketing
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ROI by Channel */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">ROI theo kênh (%)</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" className="text-xs fill-muted-foreground" fontSize={12} unit="%" />
                        <YAxis type="category" dataKey="name" className="text-xs fill-muted-foreground" fontSize={11} width={80} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          formatter={(value: number) => [`${value.toFixed(0)}%`, 'ROI']}
                        />
                        <Bar 
                          dataKey="roi" 
                          fill="hsl(var(--primary))" 
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center text-muted-foreground">
                    Chưa có dữ liệu marketing
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels" className="mt-6 space-y-4">
          {roiByChannel.length > 0 ? (
            roiByChannel.map((channel, idx) => (
              <Card key={idx} className="border-border bg-card shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{channel.channel}</h3>
                        <Badge className={cn(
                          channel.roi >= 100 ? "bg-success/20 text-success" :
                          channel.roi >= 50 ? "bg-warning/20 text-warning" :
                          "bg-destructive/20 text-destructive"
                        )}>
                          ROI {channel.roi.toFixed(0)}%
                        </Badge>
                        <Badge variant="outline">ROAS {channel.roas.toFixed(2)}x</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-6">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Chi tiêu</p>
                        <p className="font-semibold">{formatCurrency(channel.spend)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Doanh thu</p>
                        <p className="font-semibold text-success">{formatCurrency(channel.revenue)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Lợi nhuận</p>
                        <p className={cn(
                          "font-semibold",
                          channel.profit >= 0 ? "text-primary" : "text-destructive"
                        )}>
                          {formatCurrency(channel.profit)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">% Tổng profit</p>
                        <p className="font-semibold">
                          {summaryMetrics.totalProfit > 0 
                            ? ((channel.profit / summaryMetrics.totalProfit) * 100).toFixed(1)
                            : 0
                          }%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="p-8 text-center text-muted-foreground">
                Chưa có dữ liệu marketing. Vui lòng import dữ liệu để xem phân tích.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ROI theo chiến dịch</CardTitle>
            </CardHeader>
            <CardContent>
              {campaignROI.length > 0 ? (
                <div className="space-y-3">
                  {campaignROI.map((campaign, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{campaign.campaign}</span>
                          <Badge variant="outline" className="text-xs">{campaign.channel}</Badge>
                          <Badge className={cn(
                            "text-xs",
                            campaign.status === 'profitable' ? "bg-success/20 text-success" :
                            campaign.status === 'marginal' ? "bg-warning/20 text-warning" :
                            "bg-destructive/20 text-destructive"
                          )}>
                            {campaign.status === 'profitable' ? 'Có lãi' : 
                             campaign.status === 'marginal' ? 'Marginal' : 'Lỗ'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Spend: {formatCurrency(campaign.spend)} → Revenue: {formatCurrency(campaign.revenue)} → Profit: {formatCurrency(campaign.profit)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-xl font-bold",
                          campaign.roi >= 100 ? "text-success" :
                          campaign.roi >= 50 ? "text-warning" : "text-destructive"
                        )}>
                          {campaign.roi.toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">ROI</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Chưa có dữ liệu chiến dịch. Vui lòng import dữ liệu marketing.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
