import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Target, 
  ShoppingCart,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Zap,
  Info,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  ComposedChart,
  Area
} from 'recharts';
import { formatVND, formatVNDCompact } from '@/lib/formatters';
import { useUnitEconomics } from '@/hooks/useUnitEconomics';
import { PageHeader } from '@/components/shared/PageHeader';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function UnitEconomicsPage() {
  const { data, isLoading, error } = useUnitEconomics();
  const [showFormulas, setShowFormulas] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Không thể tải dữ liệu Unit Economics
      </div>
    );
  }

  const orderBreakdown = [
    { name: 'Doanh thu', value: data.avgOrderValue, color: 'hsl(var(--primary))' },
    { name: 'COGS', value: data.cogsPerOrder, color: 'hsl(var(--destructive))' },
    { name: 'Phí sàn', value: data.platformFeesPerOrder, color: 'hsl(var(--chart-2))' },
    { name: 'Vận chuyển', value: data.shippingCostPerOrder, color: 'hsl(var(--chart-3))' },
  ];

  const ltvStatus = data.ltvCacRatio >= 3 ? 'excellent' : data.ltvCacRatio >= 2 ? 'good' : data.ltvCacRatio >= 1 ? 'warning' : 'danger';
  const ltvStatusColor = {
    excellent: 'text-green-500 bg-green-500/10',
    good: 'text-blue-500 bg-blue-500/10',
    warning: 'text-yellow-500 bg-yellow-500/10',
    danger: 'text-red-500 bg-red-500/10'
  };

  return (
    <>
      <Helmet>
        <title>Unit Economics | CFO Dashboard</title>
      </Helmet>

      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <PageHeader
            title="Unit Economics"
            subtitle="Phân tích chi tiết hiệu quả kinh doanh theo đơn hàng và khách hàng"
          />
          <QuickDateSelector />
        </div>

        {/* Formula Reference */}
        <Collapsible open={showFormulas} onOpenChange={setShowFormulas}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Info className="h-4 w-4" />
              Công thức tính
              <ChevronDown className={`h-4 w-4 transition-transform ${showFormulas ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-primary">AOV (Giá trị đơn TB)</p>
                  <p className="text-muted-foreground font-mono">= Tổng doanh thu / Số đơn</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatVNDCompact(data.rawData.totalRevenue)} / {data.rawData.totalOrders}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-primary">CM/Order (Biên lợi nhuận gộp)</p>
                  <p className="text-muted-foreground font-mono">= AOV - COGS - Phí sàn - Ship</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatVNDCompact(data.avgOrderValue)} - {formatVNDCompact(data.cogsPerOrder)} - {formatVNDCompact(data.platformFeesPerOrder)} - {formatVNDCompact(data.shippingCostPerOrder)}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-primary">LTV (Giá trị vòng đời KH)</p>
                  <p className="text-muted-foreground font-mono">= AOV × Đơn/KH × CM%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatVNDCompact(data.avgOrderValue)} × {data.avgOrdersPerCustomer.toFixed(1)} × {data.contributionMarginPercent.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="font-medium text-primary">CAC (Chi phí thu hút KH)</p>
                  <p className="text-muted-foreground font-mono">= Marketing / Khách mới</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatVNDCompact(data.totalMarketingSpend)} / {data.newCustomersThisMonth || data.rawData.uniqueBuyers}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-primary">LTV:CAC Ratio</p>
                  <p className="text-muted-foreground font-mono">= LTV / CAC</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mục tiêu: ≥ 3x (tốt), ≥ 5x (xuất sắc)
                  </p>
                </div>
                <div>
                  <p className="font-medium text-primary">ROAS</p>
                  <p className="text-muted-foreground font-mono">= Doanh thu / Chi Marketing</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatVNDCompact(data.rawData.totalRevenue)} / {formatVNDCompact(data.totalMarketingSpend)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">AOV</span>
                </div>
                <p className="text-2xl font-bold">{formatVNDCompact(data.avgOrderValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Giá trị đơn TB</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">CM/Order</span>
                </div>
                <p className="text-2xl font-bold">{formatVNDCompact(data.contributionMarginPerOrder)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.contributionMarginPercent.toFixed(1)}% biên LN gộp
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className={`bg-gradient-to-br ${ltvStatusColor[ltvStatus]}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground">LTV:CAC</span>
                </div>
                <p className="text-2xl font-bold">{data.ltvCacRatio.toFixed(1)}x</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {ltvStatus === 'excellent' ? 'Xuất sắc' : ltvStatus === 'good' ? 'Tốt' : ltvStatus === 'warning' ? 'Cần cải thiện' : 'Rủi ro'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">ROAS</span>
                </div>
                <p className="text-2xl font-bold">{data.returnOnAdSpend.toFixed(1)}x</p>
                <p className="text-xs text-muted-foreground mt-1">Hiệu quả quảng cáo</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Tabs defaultValue="order" className="space-y-4">
          <TabsList>
            <TabsTrigger value="order">Chi phí/Đơn</TabsTrigger>
            <TabsTrigger value="customer">Khách hàng</TabsTrigger>
            <TabsTrigger value="channel">Theo kênh</TabsTrigger>
            <TabsTrigger value="trends">Xu hướng</TabsTrigger>
          </TabsList>

          <TabsContent value="order" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Breakdown Waterfall */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Phân tích chi phí/đơn hàng</CardTitle>
                  <CardDescription>Breakdown từ doanh thu đến lợi nhuận gộp</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                      <span className="font-medium">Doanh thu/đơn</span>
                      <span className="font-bold text-primary">{formatVND(data.avgOrderValue)}</span>
                    </div>
                    
                    <div className="space-y-2 pl-4 border-l-2 border-destructive/30">
                      <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                        <span className="text-sm">(-) COGS</span>
                        <span className="text-destructive">-{formatVND(data.cogsPerOrder)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                        <span className="text-sm">(-) Phí sàn</span>
                        <span className="text-destructive">-{formatVND(data.platformFeesPerOrder)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                        <span className="text-sm">(-) Vận chuyển</span>
                        <span className="text-destructive">-{formatVND(data.shippingCostPerOrder)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/10">
                      <span className="font-medium">= Contribution Margin</span>
                      <div className="text-right">
                        <span className="font-bold text-green-500">{formatVND(data.contributionMarginPerOrder)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({data.contributionMarginPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Structure Pie */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cơ cấu chi phí/đơn</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPie>
                      <Pie
                        data={orderBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {orderBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatVND(value)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customer" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Customer Lifetime Value (LTV)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">
                    {formatVNDCompact(data.customerLifetimeValue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    = AOV × Đơn/KH × CM%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Customer Acquisition Cost (CAC)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-destructive">
                    {formatVNDCompact(data.customerAcquisitionCost)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    = Marketing / KH mới
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">LTV:CAC Ratio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${data.ltvCacRatio >= 3 ? 'text-green-500' : data.ltvCacRatio >= 2 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.ltvCacRatio.toFixed(2)}x
                  </p>
                  <Progress 
                    value={Math.min(data.ltvCacRatio / 5 * 100, 100)} 
                    className="h-2 mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Mục tiêu: ≥ 3x
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Chỉ số khách hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tổng khách hàng</span>
                    <Badge variant="secondary">{data.totalCustomers}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Khách mới tháng này</span>
                    <Badge variant="outline">{data.newCustomersThisMonth}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tỷ lệ mua lại</span>
                    <Badge className="bg-green-500/10 text-green-500">
                      {data.repeatCustomerRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Đơn TB/khách</span>
                    <Badge variant="secondary">{data.avgOrdersPerCustomer.toFixed(1)}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Hiệu quả Marketing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Chi phí Marketing</span>
                    <span className="font-medium">{formatVNDCompact(data.totalMarketingSpend)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Chi phí/khách (CPA)</span>
                    <span className="font-medium">{formatVNDCompact(data.costPerAcquisition)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">ROAS</span>
                    <Badge className={data.returnOnAdSpend >= 3 ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}>
                      {data.returnOnAdSpend.toFixed(1)}x
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Marketing Efficiency</span>
                    <Badge variant="secondary">{data.marketingEfficiencyRatio.toFixed(1)}x</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="channel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Unit Economics theo kênh</CardTitle>
                <CardDescription>So sánh hiệu quả các kênh bán hàng</CardDescription>
              </CardHeader>
              <CardContent>
                {data.channelMetrics.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.channelMetrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
                        <Tooltip formatter={(value: number) => formatVND(value)} />
                        <Legend />
                        <Bar dataKey="revenue" name="Doanh thu" fill="hsl(var(--primary))" />
                        <Bar dataKey="cogs" name="COGS" fill="hsl(var(--destructive))" />
                        <Bar dataKey="fees" name="Phí" fill="hsl(var(--chart-2))" />
                        <Bar dataKey="contributionMargin" name="CM" fill="hsl(var(--chart-4))" />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Kênh</th>
                            <th className="text-right py-2">Đơn hàng</th>
                            <th className="text-right py-2">AOV</th>
                            <th className="text-right py-2">CM</th>
                            <th className="text-right py-2">CM %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.channelMetrics.map((channel) => (
                            <tr key={channel.channel} className="border-b">
                              <td className="py-2 font-medium">{channel.channel}</td>
                              <td className="py-2 text-right">{channel.orders}</td>
                              <td className="py-2 text-right">{formatVNDCompact(channel.aov)}</td>
                              <td className="py-2 text-right">{formatVNDCompact(channel.contributionMargin)}</td>
                              <td className="py-2 text-right">
                                <Badge 
                                  variant={channel.contributionMarginPercent >= 20 ? 'default' : 'secondary'}
                                  className={channel.contributionMarginPercent >= 20 ? 'bg-green-500/10 text-green-500' : ''}
                                >
                                  {channel.contributionMarginPercent.toFixed(1)}%
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    Chưa có dữ liệu kênh bán hàng
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Xu hướng Unit Economics</CardTitle>
                <CardDescription>Theo dõi các chỉ số qua thời gian</CardDescription>
              </CardHeader>
              <CardContent>
                {data.monthlyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={data.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" tickFormatter={(v) => formatVNDCompact(v)} />
                      <YAxis yAxisId="right" orientation="right" unit="%" />
                      <Tooltip 
                        formatter={(value: number, name: string) => 
                          name === 'AOV' ? formatVND(value) : `${value.toFixed(1)}%`
                        } 
                      />
                      <Legend />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="aov" 
                        name="AOV" 
                        fill="hsl(var(--primary) / 0.2)" 
                        stroke="hsl(var(--primary))" 
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="contributionMargin" 
                        name="CM %" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="roas" 
                        name="ROAS" 
                        stroke="hsl(var(--chart-4))" 
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    Chưa có dữ liệu xu hướng
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
