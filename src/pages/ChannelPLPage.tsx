import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Package, Percent, Receipt, ShoppingCart, Megaphone, BarChart3, PieChart as PieChartIcon, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useChannelPL, useAvailableChannels } from '@/hooks/useChannelPL';
import { formatCurrency, formatPercent, formatRatio } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line
} from 'recharts';

const CHANNEL_COLORS: Record<string, string> = {
  SHOPEE: '#EE4D2D',
  TIKTOK: '#000000',
  LAZADA: '#0F146D',
  HARAVAN: '#2196F3',
  'NHANH.VN': '#4CAF50',
  NHANH: '#4CAF50',
  DEFAULT: '#6366f1',
};

const CHANNEL_ICONS: Record<string, string> = {
  SHOPEE: '🛒',
  TIKTOK: '🎵',
  LAZADA: '🛍️',
  HARAVAN: '🏪',
  'NHANH.VN': '⚡',
  NHANH: '⚡',
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color = 'primary'
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  icon: React.ElementType;
  trend?: number;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
}) {
  const colorMap = {
    primary: 'text-primary',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    destructive: 'text-red-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className={`p-2 rounded-lg bg-${color}/10`}>
                <Icon className={`h-5 w-5 ${colorMap[color]}`} />
              </div>
              {trend !== undefined && (
                <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(trend).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ChannelPLPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const channelName = channelId?.toUpperCase() || '';
  
  const { data: plData, isLoading, error } = useChannelPL(channelName, 12);
  const { data: availableChannels } = useAvailableChannels();

  const channelColor = CHANNEL_COLORS[channelName] || CHANNEL_COLORS.DEFAULT;
  const channelIcon = CHANNEL_ICONS[channelName] || '📊';

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !plData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg text-muted-foreground">Không có dữ liệu cho kênh {channelName}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/channel-analytics')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  const feeData = [
    { name: 'Phí sàn', value: plData.feeBreakdown.platform, color: '#EE4D2D' },
    { name: 'Hoa hồng', value: plData.feeBreakdown.commission, color: '#F59E0B' },
    { name: 'Phí thanh toán', value: plData.feeBreakdown.payment, color: '#8B5CF6' },
    { name: 'Phí vận chuyển', value: plData.feeBreakdown.shipping, color: '#06B6D4' },
  ].filter(d => d.value > 0);

  const plBreakdown = [
    { name: 'Doanh thu', value: plData.totalRevenue, color: '#22C55E' },
    { name: 'Phí kênh', value: -plData.totalFees, color: '#EF4444' },
    { name: 'COGS', value: -plData.totalCogs, color: '#F59E0B' },
    { name: 'Chi phí Ads', value: -plData.totalAds, color: '#8B5CF6' },
  ];

  const monthlyChartData = plData.monthlyData.map(m => ({
    month: format(parseISO(m.period + '-01'), 'MM/yy', { locale: vi }),
    revenue: m.grossRevenue,
    fees: m.totalFees,
    cogs: m.cogs,
    ads: m.adsCost,
    profit: m.operatingProfit,
    margin: m.marginPercent,
    orders: m.orderCount,
    aov: m.avgOrderValue,
  }));

  return (
    <>
      <Helmet>
        <title>{channelName} P&L Analysis | CFO Dashboard</title>
        <meta name="description" content={`Phân tích P&L chi tiết cho kênh ${channelName}`} />
      </Helmet>

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/channel-analytics')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{channelIcon}</span>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: channelColor }}>
                  {channelName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Phân tích P&L chi tiết 12 tháng gần nhất
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {/* What-If Button */}
            <Button
              variant="outline"
              onClick={() => navigate(`/channel/${channelId}/whatif`)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              What-If
            </Button>

            {/* Channel Switcher */}
            {availableChannels?.map(ch => (
              <Button
                key={ch}
                variant={ch === channelName ? 'default' : 'outline'}
                size="sm"
                onClick={() => navigate(`/channel/${ch.toLowerCase()}`)}
                style={ch === channelName ? { backgroundColor: channelColor } : undefined}
              >
                {CHANNEL_ICONS[ch] || '📊'} {ch}
              </Button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Tổng Doanh Thu"
            value={formatCurrency(plData.totalRevenue)}
            subtitle={`${plData.orderCount.toLocaleString()} đơn hàng`}
            icon={DollarSign}
            color="success"
          />
          <StatCard
            title="Lợi Nhuận Gộp"
            value={formatCurrency(plData.grossProfit)}
            subtitle={`Margin: ${plData.grossMargin.toFixed(1)}%`}
            icon={TrendingUp}
            color={plData.grossProfit >= 0 ? 'success' : 'destructive'}
          />
          <StatCard
            title="Lợi Nhuận Sau Ads"
            value={formatCurrency(plData.operatingProfit)}
            subtitle={`Operating Margin: ${plData.operatingMargin.toFixed(1)}%`}
            icon={BarChart3}
            color={plData.operatingProfit >= 0 ? 'success' : 'destructive'}
          />
          <StatCard
            title="AOV"
            value={formatCurrency(plData.avgOrderValue)}
            subtitle={`Tỷ lệ hoàn: ${plData.returnRate.toFixed(1)}%`}
            icon={ShoppingCart}
            color="primary"
          />
        </div>

        {/* Cost Breakdown Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng Phí Kênh</p>
                  <p className="text-2xl font-bold text-red-500">{formatCurrency(plData.totalFees)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRatio(plData.totalFees, plData.totalRevenue)} doanh thu
                  </p>
                </div>
                <Receipt className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">COGS</p>
                  <p className="text-2xl font-bold text-yellow-500">{formatCurrency(plData.totalCogs)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRatio(plData.totalCogs, plData.totalRevenue)} doanh thu
                  </p>
                </div>
                <Package className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chi Phí Ads</p>
                  <p className="text-2xl font-bold text-purple-500">{formatCurrency(plData.totalAds)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRatio(plData.totalAds, plData.totalRevenue)} doanh thu
                  </p>
                </div>
                <Megaphone className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="monthly">Theo tháng</TabsTrigger>
            <TabsTrigger value="fees">Phân tích phí</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* P&L Waterfall */}
              <Card>
                <CardHeader>
                  <CardTitle>Cấu Trúc P&L</CardTitle>
                  <CardDescription>Doanh thu → Lợi nhuận</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={plBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(Math.abs(v), true)} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(Math.abs(value)), value >= 0 ? 'Thu' : 'Chi']}
                      />
                      <Bar dataKey="value" fill={channelColor}>
                        {plBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Fee Breakdown Pie */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân Bổ Phí Kênh</CardTitle>
                  <CardDescription>Chi tiết các loại phí</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={feeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={60}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${formatPercent(percent, true)}`}
                      >
                        {feeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Xu Hướng Doanh Thu & Lợi Nhuận</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(v) => formatCurrency(v, true)} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === 'margin') return [formatPercent(value), 'Margin'];
                        return [formatCurrency(value), name === 'revenue' ? 'Doanh thu' : name === 'profit' ? 'Lợi nhuận' : name];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" name="Doanh thu" fill={channelColor} opacity={0.8} />
                    <Bar yAxisId="left" dataKey="profit" name="Lợi nhuận" fill="#22C55E" />
                    <Line yAxisId="right" type="monotone" dataKey="margin" name="Margin %" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chi Tiết Theo Tháng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Tháng</th>
                        <th className="text-right p-3">Đơn hàng</th>
                        <th className="text-right p-3">Doanh thu</th>
                        <th className="text-right p-3">Phí kênh</th>
                        <th className="text-right p-3">COGS</th>
                        <th className="text-right p-3">Ads</th>
                        <th className="text-right p-3">Lợi nhuận</th>
                        <th className="text-right p-3">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plData.monthlyData.map((month, idx) => (
                        <tr key={month.period} className={idx % 2 === 0 ? 'bg-muted/50' : ''}>
                          <td className="p-3 font-medium">
                            {format(parseISO(month.period + '-01'), 'MM/yyyy', { locale: vi })}
                          </td>
                          <td className="text-right p-3">{month.orderCount.toLocaleString()}</td>
                          <td className="text-right p-3 text-green-600">{formatCurrency(month.grossRevenue)}</td>
                          <td className="text-right p-3 text-red-500">-{formatCurrency(month.totalFees)}</td>
                          <td className="text-right p-3 text-yellow-600">-{formatCurrency(month.cogs)}</td>
                          <td className="text-right p-3 text-purple-500">-{formatCurrency(month.adsCost)}</td>
                          <td className={`text-right p-3 font-semibold ${month.operatingProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatCurrency(month.operatingProfit)}
                          </td>
                          <td className="text-right p-3">
                            <Badge variant={month.marginPercent >= 20 ? 'default' : month.marginPercent >= 10 ? 'secondary' : 'destructive'}>
                              {month.marginPercent.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td className="p-3">TỔNG</td>
                        <td className="text-right p-3">{plData.orderCount.toLocaleString()}</td>
                        <td className="text-right p-3 text-green-600">{formatCurrency(plData.totalRevenue)}</td>
                        <td className="text-right p-3 text-red-500">-{formatCurrency(plData.totalFees)}</td>
                        <td className="text-right p-3 text-yellow-600">-{formatCurrency(plData.totalCogs)}</td>
                        <td className="text-right p-3 text-purple-500">-{formatCurrency(plData.totalAds)}</td>
                        <td className={`text-right p-3 ${plData.operatingProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {formatCurrency(plData.operatingProfit)}
                        </td>
                        <td className="text-right p-3">
                          <Badge variant={plData.grossMargin >= 20 ? 'default' : 'secondary'}>
                            {plData.grossMargin.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Orders & AOV Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Số Đơn & Giá Trị Đơn Trung Bình</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatCurrency(v, true)} />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === 'orders') return [value.toLocaleString(), 'Số đơn'];
                        return [formatCurrency(value), 'AOV'];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="orders" name="Số đơn" fill={channelColor} />
                    <Line yAxisId="right" type="monotone" dataKey="aov" name="AOV" stroke="#8B5CF6" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Fee by Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Chi Tiết Phí Kênh</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {feeData.map(fee => (
                    <div key={fee.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fee.color }} />
                        <span>{fee.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(fee.value)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRatio(fee.value, plData.totalFees)} tổng phí
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Fee Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Xu Hướng Phí Theo Tháng</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => formatCurrency(v, true)} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Area type="monotone" dataKey="fees" name="Phí kênh" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="ads" name="Chi phí Ads" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Cost Efficiency */}
            <Card>
              <CardHeader>
                <CardTitle>Hiệu Quả Chi Phí</CardTitle>
                <CardDescription>Tỷ lệ chi phí trên doanh thu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-muted-foreground">Phí kênh / Doanh thu</p>
                    <p className="text-2xl font-bold text-red-500">
                      {formatRatio(plData.totalFees, plData.totalRevenue)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm text-muted-foreground">COGS / Doanh thu</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {formatRatio(plData.totalCogs, plData.totalRevenue)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-sm text-muted-foreground">Ads / Doanh thu</p>
                    <p className="text-2xl font-bold text-purple-500">
                      {formatRatio(plData.totalAds, plData.totalRevenue)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-muted-foreground">ROAS (Ads)</p>
                    <p className="text-2xl font-bold text-green-500">
                      {plData.totalAds > 0 ? (plData.totalRevenue / plData.totalAds).toFixed(1) : '∞'}x
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* What-If Link */}
        <Card className="border-dashed border-2" style={{ borderColor: channelColor }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Phân tích What-If cho {channelName}</h3>
                <p className="text-sm text-muted-foreground">
                  Mô phỏng thay đổi phí sàn, volume, ads và xem tác động lên lợi nhuận
                </p>
              </div>
              <Button 
                onClick={() => navigate(`/channel/${channelId}/whatif`)}
                style={{ backgroundColor: channelColor }}
              >
                Mở What-If Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
