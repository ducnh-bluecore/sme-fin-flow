import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ComposedChart, Area
} from 'recharts';

const roiByChannel = [
  { channel: 'Facebook Ads', spend: 450000000, revenue: 1440000000, profit: 432000000, roi: 196, roas: 3.2 },
  { channel: 'Google Ads', spend: 380000000, revenue: 1558000000, profit: 467400000, roi: 223, roas: 4.1 },
  { channel: 'TikTok Ads', spend: 280000000, revenue: 504000000, profit: 151200000, roi: 54, roas: 1.8 },
  { channel: 'Email Marketing', spend: 85000000, revenue: 722500000, profit: 216750000, roi: 755, roas: 8.5 },
  { channel: 'Shopee Ads', spend: 220000000, revenue: 616000000, profit: 184800000, roi: 84, roas: 2.8 },
  { channel: 'Lazada Ads', spend: 185000000, revenue: 388500000, profit: 116550000, roi: 63, roas: 2.1 },
];

const roiTrend = [
  { month: 'T8', roi: 145, roas: 2.8, spend: 1200 },
  { month: 'T9', roi: 158, roas: 3.0, spend: 1350 },
  { month: 'T10', roi: 172, roas: 3.2, spend: 1480 },
  { month: 'T11', roi: 168, roas: 3.1, spend: 1520 },
  { month: 'T12', roi: 185, roas: 3.4, spend: 1650 },
  { month: 'T1', roi: 192, roas: 3.5, spend: 1600 },
];

const campaignROI = [
  { campaign: 'Tết 2024 Sale', channel: 'Facebook', spend: 120000000, revenue: 480000000, roi: 300, status: 'completed' },
  { campaign: 'New Year Flash Sale', channel: 'Shopee', spend: 85000000, revenue: 255000000, roi: 200, status: 'completed' },
  { campaign: 'Brand Awareness Q1', channel: 'TikTok', spend: 150000000, revenue: 225000000, roi: 50, status: 'running' },
  { campaign: 'Retargeting Winter', channel: 'Google', spend: 65000000, revenue: 325000000, roi: 400, status: 'completed' },
  { campaign: 'Email Winback', channel: 'Email', spend: 15000000, revenue: 180000000, roi: 1100, status: 'running' },
];

const formatCurrency = (value: number) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

export default function ROIAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const totalSpend = roiByChannel.reduce((acc, c) => acc + c.spend, 0);
  const totalRevenue = roiByChannel.reduce((acc, c) => acc + c.revenue, 0);
  const totalProfit = roiByChannel.reduce((acc, c) => acc + c.profit, 0);
  const overallROI = (totalProfit / totalSpend) * 100;
  const overallROAS = totalRevenue / totalSpend;

  const chartData = roiByChannel.map(c => ({
    name: c.channel.replace(' Ads', '').replace(' Marketing', ''),
    spend: c.spend / 1000000,
    revenue: c.revenue / 1000000,
    profit: c.profit / 1000000,
    roi: c.roi,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-violet-400" />
            ROI Analytics
          </h1>
          <p className="text-slate-400 mt-1">Phân tích lợi tức đầu tư marketing theo kênh và chiến dịch</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Last 30 days
          </Button>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Bộ lọc
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Spend</p>
            <p className="text-2xl font-bold">{formatCurrency(totalSpend)}</p>
            <p className="text-xs text-yellow-400 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              +12.5% vs tháng trước
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              +18.2% vs tháng trước
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Profit</p>
            <p className="text-2xl font-bold text-violet-400">{formatCurrency(totalProfit)}</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              +22.8% vs tháng trước
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Overall ROI</p>
            <p className="text-2xl font-bold">{overallROI.toFixed(0)}%</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +8.5% vs tháng trước
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Overall ROAS</p>
            <p className="text-2xl font-bold">{overallROAS.toFixed(2)}x</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +0.3x vs tháng trước
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
          <TabsTrigger value="trends">Xu hướng</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Spend vs Revenue Chart */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Chi tiêu vs Doanh thu theo kênh</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}M`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        labelStyle={{ color: '#f8fafc' }}
                        formatter={(value: number) => [`${value.toFixed(0)}M`, '']}
                      />
                      <Legend />
                      <Bar dataKey="spend" name="Chi tiêu" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="revenue" name="Doanh thu" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ROI by Channel */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">ROI theo kênh (%)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} unit="%" />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={80} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        labelStyle={{ color: '#f8fafc' }}
                        formatter={(value: number) => [`${value}%`, 'ROI']}
                      />
                      <Bar 
                        dataKey="roi" 
                        fill="#8b5cf6" 
                        radius={[0, 4, 4, 0]}
                        label={{ position: 'right', fill: '#94a3b8', fontSize: 11 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels" className="mt-6 space-y-4">
          {roiByChannel
            .sort((a, b) => b.roi - a.roi)
            .map((channel, idx) => (
            <Card key={idx} className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{channel.channel}</h3>
                      <Badge className={cn(
                        channel.roi >= 200 ? "bg-emerald-500/20 text-emerald-400" :
                        channel.roi >= 100 ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-red-500/20 text-red-400"
                      )}>
                        ROI {channel.roi}%
                      </Badge>
                      <Badge variant="outline">ROAS {channel.roas}x</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Chi tiêu</p>
                      <p className="font-semibold">{formatCurrency(channel.spend)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Doanh thu</p>
                      <p className="font-semibold text-emerald-400">{formatCurrency(channel.revenue)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Lợi nhuận</p>
                      <p className="font-semibold text-violet-400">{formatCurrency(channel.profit)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">% Tổng profit</p>
                      <p className="font-semibold">{((channel.profit / totalProfit) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ROI theo chiến dịch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {campaignROI
                  .sort((a, b) => b.roi - a.roi)
                  .map((campaign, idx) => (
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
                          campaign.status === 'running' ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"
                        )}>
                          {campaign.status === 'running' ? 'Đang chạy' : 'Hoàn thành'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Spend: {formatCurrency(campaign.spend)} → Revenue: {formatCurrency(campaign.revenue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-xl font-bold",
                        campaign.roi >= 200 ? "text-emerald-400" :
                        campaign.roi >= 100 ? "text-yellow-400" : "text-red-400"
                      )}>
                        {campaign.roi}%
                      </p>
                      <p className="text-xs text-muted-foreground">ROI</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Xu hướng ROI & ROAS theo thời gian</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={roiTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                      labelStyle={{ color: '#f8fafc' }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="spend"
                      name="Spend (M)"
                      fill="#6366f1"
                      fillOpacity={0.2}
                      stroke="#6366f1"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="roi"
                      name="ROI (%)"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6' }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="roas"
                      name="ROAS"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
