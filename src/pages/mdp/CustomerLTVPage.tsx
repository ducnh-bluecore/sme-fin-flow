import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, ZAxis
} from 'recharts';

const ltvByChannel = [
  { channel: 'Facebook Ads', ltv: 4200000, cac: 850000, ratio: 4.9, customers: 25000 },
  { channel: 'Google Ads', ltv: 5800000, cac: 1200000, ratio: 4.8, customers: 18000 },
  { channel: 'TikTok Ads', ltv: 2800000, cac: 650000, ratio: 4.3, customers: 32000 },
  { channel: 'Email Marketing', ltv: 6500000, cac: 120000, ratio: 54.2, customers: 15000 },
  { channel: 'Organic', ltv: 5200000, cac: 0, ratio: 999, customers: 42000 },
  { channel: 'Referral', ltv: 7800000, cac: 350000, ratio: 22.3, customers: 8500 },
];

const cohortData = [
  { cohort: 'Jan 2024', m1: 100, m2: 42, m3: 28, m4: 22, m5: 18, m6: 15 },
  { cohort: 'Dec 2023', m1: 100, m2: 45, m3: 31, m4: 25, m5: 21, m6: 18 },
  { cohort: 'Nov 2023', m1: 100, m2: 40, m3: 26, m4: 20, m5: 16, m6: 13 },
  { cohort: 'Oct 2023', m1: 100, m2: 38, m3: 24, m4: 18, m5: 14, m6: 11 },
  { cohort: 'Sep 2023', m1: 100, m2: 44, m3: 29, m4: 23, m5: 19, m6: 16 },
];

const ltvProjection = [
  { month: 'M1', value: 850000, cumulative: 850000 },
  { month: 'M3', value: 420000, cumulative: 1270000 },
  { month: 'M6', value: 680000, cumulative: 1950000 },
  { month: 'M12', value: 1200000, cumulative: 3150000 },
  { month: 'M18', value: 850000, cumulative: 4000000 },
  { month: 'M24', value: 650000, cumulative: 4650000 },
];

const customerSegments = [
  { segment: 'Champions', ltv: 15200000, percentage: 8, count: 12000, action: 'Reward & Retain' },
  { segment: 'Loyal Customers', ltv: 8500000, percentage: 15, count: 22500, action: 'Upsell & Cross-sell' },
  { segment: 'Potential Loyalists', ltv: 4200000, percentage: 22, count: 33000, action: 'Engage & Nurture' },
  { segment: 'New Customers', ltv: 1500000, percentage: 18, count: 27000, action: 'Onboard & Activate' },
  { segment: 'At Risk', ltv: 3800000, percentage: 12, count: 18000, action: 'Win Back Campaign' },
  { segment: 'Hibernating', ltv: 2200000, percentage: 25, count: 37500, action: 'Re-engagement' },
];

const formatCurrency = (value: number) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

export default function CustomerLTVPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const avgLTV = 4850000;
  const avgCAC = 720000;
  const ltvCacRatio = avgLTV / avgCAC;
  const paybackMonths = 4.2;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Star className="h-7 w-7 text-violet-400" />
            Customer Lifetime Value
          </h1>
          <p className="text-slate-400 mt-1">Phân tích giá trị vòng đời khách hàng theo kênh marketing</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
          <Sparkles className="h-4 w-4" />
          Dự đoán LTV
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <DollarSign className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. LTV</p>
                <p className="text-2xl font-bold">{formatCurrency(avgLTV)}</p>
                <p className="text-xs text-emerald-400">+8.5% vs quý trước</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Target className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. CAC</p>
                <p className="text-2xl font-bold">{formatCurrency(avgCAC)}</p>
                <p className="text-xs text-emerald-400">-5.2% vs quý trước</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">LTV:CAC Ratio</p>
                <p className="text-2xl font-bold text-emerald-400">{ltvCacRatio.toFixed(1)}x</p>
                <p className="text-xs text-muted-foreground">Target: 3x+</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payback Period</p>
                <p className="text-2xl font-bold">{paybackMonths} tháng</p>
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
          <TabsTrigger value="cohorts">Cohort Analysis</TabsTrigger>
          <TabsTrigger value="segments">Phân khúc</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* LTV Projection */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dự báo LTV theo thời gian</CardTitle>
              <CardDescription>Giá trị khách hàng tích lũy qua các tháng</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ltvProjection}>
                    <defs>
                      <linearGradient id="colorLTV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                      labelStyle={{ color: '#f8fafc' }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="cumulative" 
                      stroke="#8b5cf6" 
                      fill="url(#colorLTV)"
                      strokeWidth={2}
                      name="LTV tích lũy"
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#3b82f6" 
                      name="Giá trị mỗi kỳ"
                      radius={[4, 4, 0, 0]}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart className="h-4 w-4 text-blue-400" />
                  <span className="font-medium">Avg. Order Value</span>
                </div>
                <p className="text-2xl font-bold mb-1">1,250,000đ</p>
                <Progress value={72} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">72% của target 1.75M</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Repeat className="h-4 w-4 text-emerald-400" />
                  <span className="font-medium">Repeat Purchase Rate</span>
                </div>
                <p className="text-2xl font-bold mb-1">42%</p>
                <Progress value={84} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">84% của target 50%</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  <span className="font-medium">Avg. Purchase Frequency</span>
                </div>
                <p className="text-2xl font-bold mb-1">2.8x / năm</p>
                <Progress value={70} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">Target: 4x / năm</p>
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
              {ltvByChannel.map((channel, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{channel.channel}</h3>
                        <Badge className={cn(
                          channel.ratio >= 5 ? "bg-emerald-500/20 text-emerald-400" :
                          channel.ratio >= 3 ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        )}>
                          LTV:CAC {channel.ratio > 100 ? '∞' : `${channel.ratio.toFixed(1)}x`}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {channel.customers.toLocaleString()} khách hàng
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-6 lg:gap-8">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">LTV</p>
                        <p className="font-semibold text-violet-400">{formatCurrency(channel.ltv)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">CAC</p>
                        <p className="font-semibold">{channel.cac > 0 ? formatCurrency(channel.cac) : '-'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Net Value</p>
                        <p className="font-semibold text-emerald-400">
                          {formatCurrency((channel.ltv - channel.cac) * channel.customers)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cohorts" className="mt-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Retention Cohort Analysis</CardTitle>
              <CardDescription>Phần trăm khách hàng quay lại theo tháng</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 font-medium">Cohort</th>
                      <th className="text-center p-2 font-medium">M1</th>
                      <th className="text-center p-2 font-medium">M2</th>
                      <th className="text-center p-2 font-medium">M3</th>
                      <th className="text-center p-2 font-medium">M4</th>
                      <th className="text-center p-2 font-medium">M5</th>
                      <th className="text-center p-2 font-medium">M6</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohortData.map((cohort, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="p-2 font-medium">{cohort.cohort}</td>
                        {['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map((month, mIdx) => {
                          const value = cohort[month as keyof typeof cohort] as number;
                          const bgOpacity = value / 100;
                          return (
                            <td key={mIdx} className="p-2 text-center">
                              <span 
                                className="inline-block px-3 py-1 rounded"
                                style={{ 
                                  backgroundColor: `rgba(139, 92, 246, ${bgOpacity * 0.5})`,
                                  color: value > 50 ? '#fff' : '#94a3b8'
                                }}
                              >
                                {value}%
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="mt-6">
          <div className="space-y-4">
            {customerSegments.map((segment, idx) => (
              <Card key={idx} className="border-border bg-card shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{segment.segment}</h3>
                        <Badge variant="outline">{segment.percentage}% base</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {segment.count.toLocaleString()} khách hàng • LTV: {formatCurrency(segment.ltv)}
                      </p>
                      <div className="mt-2">
                        <Progress value={segment.percentage} className="h-2" />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                        <p className="font-semibold text-violet-400">
                          {formatCurrency(segment.ltv * segment.count)}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                        {segment.action}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
