import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { subDays, startOfMonth, endOfMonth, startOfQuarter, startOfYear, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, ShoppingCart, DollarSign, 
  Package, Percent, Store, ArrowUpRight, ArrowDownRight, ExternalLink 
} from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent, formatDateShort, formatDate } from '@/lib/formatters';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  useChannelPerformance, 
  useDailyChannelRevenue, 
  useOrderStatusSummary,
  useChannelFeesSummary,
  useSettlementsSummary
} from '@/hooks/useChannelAnalytics';
import { DateRangeFilter, DateRange } from '@/components/filters/DateRangeFilter';

const CHANNEL_COLORS: Record<string, string> = {
  shopee: '#EE4D2D',
  lazada: '#0F146D',
  tiktok: '#000000',
  haravan: '#2563EB',
  sapo: '#10B981',
  kiotviet: '#F59E0B',
  woocommerce: '#7C3AED',
  invoice: '#8B5CF6',
  revenue: '#14B8A6',
  default: '#6B7280',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  processing: '#8B5CF6',
  shipped: '#06B6D4',
  delivered: '#10B981',
  cancelled: '#EF4444',
  returned: '#F97316',
  unknown: '#6B7280',
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

// Helper to get date range from preset
function getDateRangeFromPreset(preset: string): DateRange {
  const today = new Date();
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case '7days':
      return { from: subDays(today, 6), to: today };
    case '14days':
      return { from: subDays(today, 13), to: today };
    case '30days':
      return { from: subDays(today, 29), to: today };
    case '60days':
      return { from: subDays(today, 59), to: today };
    case '90days':
      return { from: subDays(today, 89), to: today };
    case 'this_month':
      return { from: startOfMonth(today), to: today };
    case 'last_month': {
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case 'this_quarter':
      return { from: startOfQuarter(today), to: today };
    case 'this_year':
      return { from: startOfYear(today), to: today };
    default:
      return { from: subDays(today, 29), to: today };
  }
}

export default function ChannelAnalyticsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeFromPreset('this_year'));
  const [selectedPreset, setSelectedPreset] = useState<string>('this_year');

  // Calculate days for the query (max range for fetching data)
  const queryDays = useMemo(() => {
    const diffTime = Math.abs(new Date().getTime() - dateRange.from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays + 1, 90); // Fetch at least 90 days
  }, [dateRange]);

  const { data: channelPerformance, isLoading: loadingPerformance } = useChannelPerformance();
  const { data: dailyRevenue, isLoading: loadingDaily } = useDailyChannelRevenue(queryDays);
  const { data: orderStatus, isLoading: loadingStatus } = useOrderStatusSummary();
  const { data: feesSummary, isLoading: loadingFees } = useChannelFeesSummary();
  const { data: settlements, isLoading: loadingSettlements } = useSettlementsSummary();

  // Filter daily revenue by date range
  const filteredDailyRevenue = useMemo(() => {
    if (!dailyRevenue) return [];
    return dailyRevenue.filter((item) => {
      const itemDate = parseISO(item.order_date);
      return isWithinInterval(itemDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [dailyRevenue, dateRange]);

  const handleDateRangeChange = (range: DateRange, preset?: string) => {
    setDateRange(range);
    if (preset) {
      setSelectedPreset(preset);
    }
  };

  const isLoading = loadingPerformance || loadingDaily || loadingStatus;

  // Calculate totals with source breakdown
  const totals = channelPerformance?.reduce(
    (acc, ch) => ({
      orders: acc.orders + (ch.total_orders || 0),
      grossRevenue: acc.grossRevenue + (ch.gross_revenue || 0),
      netRevenue: acc.netRevenue + (ch.net_revenue || 0),
      fees: acc.fees + (ch.total_fees || 0),
      profit: acc.profit + (ch.gross_profit || 0),
      cogs: acc.cogs + (ch.total_cogs || 0),
      ecommerceRevenue: acc.ecommerceRevenue + (ch.source === 'ecommerce' ? (ch.gross_revenue || 0) : 0),
      invoiceRevenue: acc.invoiceRevenue + (ch.source === 'invoice' ? (ch.gross_revenue || 0) : 0),
      otherRevenue: acc.otherRevenue + (ch.source === 'revenue' ? (ch.gross_revenue || 0) : 0),
    }),
    { orders: 0, grossRevenue: 0, netRevenue: 0, fees: 0, profit: 0, cogs: 0, ecommerceRevenue: 0, invoiceRevenue: 0, otherRevenue: 0 }
  ) || { orders: 0, grossRevenue: 0, netRevenue: 0, fees: 0, profit: 0, cogs: 0, ecommerceRevenue: 0, invoiceRevenue: 0, otherRevenue: 0 };

  // Prepare chart data with source labels
  const revenueByChannel = channelPerformance?.map((ch) => ({
    name: ch.shop_name || ch.connector_name,
    channel: ch.connector_type,
    grossRevenue: ch.gross_revenue || 0,
    netRevenue: ch.net_revenue || 0,
    fees: ch.total_fees || 0,
    profit: ch.gross_profit || 0,
    source: ch.source || 'ecommerce',
  })) || [];

  // Revenue by source for pie chart
  const revenueBySource = [
    { name: 'TMĐT', value: totals.ecommerceRevenue, fill: '#3B82F6' },
    { name: 'Hóa đơn B2B', value: totals.invoiceRevenue, fill: '#8B5CF6' },
    { name: 'Doanh thu khác', value: totals.otherRevenue, fill: '#14B8A6' },
  ].filter(item => item.value > 0);

  // Aggregate daily revenue by date (using filtered data)
  const dailyTrend = filteredDailyRevenue.reduce((acc, item) => {
    const existing = acc.find((d) => d.date === item.order_date);
    if (existing) {
      existing.grossRevenue += item.gross_revenue || 0;
      existing.netRevenue += item.net_revenue || 0;
      existing.orders += item.order_count || 0;
      existing.fees += item.platform_fees || 0;
    } else {
      acc.push({
        date: item.order_date,
        grossRevenue: item.gross_revenue || 0,
        netRevenue: item.net_revenue || 0,
        orders: item.order_count || 0,
        fees: item.platform_fees || 0,
      });
    }
    return acc;
  }, [] as { date: string; grossRevenue: number; netRevenue: number; orders: number; fees: number }[]).sort((a, b) => a.date.localeCompare(b.date));

  // Order status pie chart data
  const statusData = orderStatus?.map((s) => ({
    name: s.status,
    value: s.count,
    amount: s.total_amount,
    fill: STATUS_COLORS[s.status] || STATUS_COLORS.unknown,
  })) || [];

  // Fee breakdown
  const feeData = feesSummary?.map((f) => ({
    name: f.fee_type,
    value: f.amount,
  })) || [];

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{t('channel.title')} | Bluecore</title>
        </Helmet>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{t('channel.title')}</h1>
            <p className="text-muted-foreground">{t('channel.subtitle')}</p>
          </div>
          <LoadingSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('channel.title')} | Bluecore</title>
        <meta name="description" content={t('channel.subtitle')} />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('channel.title')}</h1>
            <p className="text-muted-foreground">{t('channel.subtitle')}</p>
          </div>
          <DateRangeFilter
            value={dateRange}
            onChange={handleDateRangeChange}
          />
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('channel.totalOrders')}
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totals.orders)}</div>
              <p className="text-xs text-muted-foreground">
                {t('channel.fromChannels').replace('{0}', String(channelPerformance?.length || 0))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('channel.totalRevenue')}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.grossRevenue)}</div>
              <div className="mt-2 space-y-1">
                {totals.ecommerceRevenue > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      {t('channel.ecommerce')}
                    </span>
                    <span className="font-medium">{formatCurrency(totals.ecommerceRevenue)}</span>
                  </div>
                )}
                {totals.invoiceRevenue > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-violet-500" />
                      B2B
                    </span>
                    <span className="font-medium">{formatCurrency(totals.invoiceRevenue)}</span>
                  </div>
                )}
                {totals.otherRevenue > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-teal-500" />
                      {t('channel.otherRevenue')}
                    </span>
                    <span className="font-medium">{formatCurrency(totals.otherRevenue)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('channel.platformFees')}
              </CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totals.fees)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totals.grossRevenue > 0 
                  ? `${formatPercent((totals.fees / totals.grossRevenue) * 100)} ${t('channel.ofRevenue')}`
                  : `0% ${t('channel.ofRevenue')}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('channel.grossProfit')}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.profit)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totals.grossRevenue > 0 
                  ? `${t('channel.margin')}: ${formatPercent((totals.profit / totals.grossRevenue) * 100)}`
                  : `${t('channel.margin')}: 0%`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">{t('channel.overview')}</TabsTrigger>
            <TabsTrigger value="channels">{t('channel.byChannel')}</TabsTrigger>
            <TabsTrigger value="orders">{t('channel.orders')}</TabsTrigger>
            <TabsTrigger value="settlements">{t('channel.settlements')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Revenue Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('channel.revenueTrend')}</CardTitle>
                  <CardDescription>{t('channel.revenueTrendDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(v) => formatDateShort(v)}
                        className="text-xs"
                      />
                      <YAxis 
                        tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                        className="text-xs"
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => formatDate(label)}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="grossRevenue" 
                        name={t('channel.grossRevenue')} 
                        stroke="#3B82F6" 
                        fill="#3B82F6" 
                        fillOpacity={0.3} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="netRevenue" 
                        name={t('channel.netRevenue')} 
                        stroke="#10B981" 
                        fill="#10B981" 
                        fillOpacity={0.3} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Revenue by Source */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('channel.revenueBySource')}</CardTitle>
                  <CardDescription>{t('channel.revenueBySourceDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={revenueBySource}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name}: ${formatPercent(percent * 100)}`}
                      >
                        {revenueBySource.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Order Status - moved below */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('channel.ecommerceOrderStatus')}</CardTitle>
                  <CardDescription>{t('channel.byStatus')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, percent }) => `${name}: ${formatPercent(percent * 100)}`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatNumber(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Orders Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Số lượng đơn hàng</CardTitle>
                <CardDescription>Đơn hàng theo ngày</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(v) => formatDateShort(v)}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => formatNumber(value)}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      name="Số đơn" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Revenue by Channel */}
              <Card>
                <CardHeader>
                  <CardTitle>Doanh thu theo kênh</CardTitle>
                  <CardDescription>So sánh giữa các kênh bán hàng</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByChannel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        type="number" 
                        tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                        className="text-xs"
                      />
                      <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="grossRevenue" name="Doanh thu gộp" fill="#3B82F6" />
                      <Bar dataKey="netRevenue" name="Doanh thu thuần" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Profit by Channel */}
              <Card>
                <CardHeader>
                  <CardTitle>Lợi nhuận & Chi phí</CardTitle>
                  <CardDescription>Phân tích theo kênh</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={revenueByChannel}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} className="text-xs" />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="fees" name="Phí sàn" fill="#F59E0B" />
                      <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#10B981" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Channel Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết hiệu suất kênh</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Kênh</th>
                        <th className="text-right py-3 px-4">Đơn hàng</th>
                        <th className="text-right py-3 px-4">Doanh thu</th>
                        <th className="text-right py-3 px-4">Phí sàn</th>
                        <th className="text-right py-3 px-4">COGS</th>
                        <th className="text-right py-3 px-4">Lợi nhuận</th>
                        <th className="text-right py-3 px-4">Margin</th>
                        <th className="text-right py-3 px-4">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {channelPerformance?.map((ch, idx) => {
                        const margin = ch.gross_revenue > 0 
                          ? (ch.gross_profit / ch.gross_revenue) * 100 
                          : 0;
                        return (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: CHANNEL_COLORS[ch.connector_type] || CHANNEL_COLORS.default }}
                                />
                                <span className="font-medium">{ch.shop_name || ch.connector_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {ch.connector_type}
                                </Badge>
                              </div>
                            </td>
                            <td className="text-right py-3 px-4">{formatNumber(ch.total_orders)}</td>
                            <td className="text-right py-3 px-4">{formatCurrency(ch.gross_revenue)}</td>
                            <td className="text-right py-3 px-4 text-orange-600">
                              {formatCurrency(ch.total_fees)}
                            </td>
                            <td className="text-right py-3 px-4">{formatCurrency(ch.total_cogs)}</td>
                            <td className={`text-right py-3 px-4 font-medium ${ch.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(ch.gross_profit)}
                            </td>
                            <td className="text-right py-3 px-4">
                              <Badge variant={margin >= 20 ? 'default' : margin >= 10 ? 'secondary' : 'destructive'}>
                                {margin.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-4">
                              {ch.source === 'ecommerce' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => navigate(`/channel/${ch.connector_type}`)}
                                  className="h-7 px-2"
                                >
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                  P&L
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-3">
              {orderStatus?.map((status) => (
                <Card key={status.status}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: STATUS_COLORS[status.status] || STATUS_COLORS.unknown }}
                      />
                      {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(status.count)}</div>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(status.total_amount)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Fee Breakdown */}
            {feeData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Phân loại phí sàn</CardTitle>
                  <CardDescription>Chi tiết các loại phí từ sàn TMĐT</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={feeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} className="text-xs" />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value" name="Số tiền" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settlements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử đối soát</CardTitle>
                <CardDescription>Các đợt thanh toán từ sàn TMĐT</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Mã đối soát</th>
                        <th className="text-left py-3 px-4">Kỳ</th>
                        <th className="text-right py-3 px-4">Doanh thu gộp</th>
                        <th className="text-right py-3 px-4">Tổng phí</th>
                        <th className="text-right py-3 px-4">Số tiền nhận</th>
                        <th className="text-center py-3 px-4">Trạng thái</th>
                        <th className="text-center py-3 px-4">Đối soát</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlements?.map((s) => (
                        <tr key={s.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-mono text-xs">
                            {s.settlement_number || s.settlement_id.slice(0, 12)}
                          </td>
                          <td className="py-3 px-4">
                            {formatDate(s.period_start)} - {formatDate(s.period_end)}
                          </td>
                          <td className="text-right py-3 px-4">
                            {formatCurrency(s.gross_sales || 0)}
                          </td>
                          <td className="text-right py-3 px-4 text-orange-600">
                            {formatCurrency(s.total_fees || 0)}
                          </td>
                          <td className="text-right py-3 px-4 font-medium text-green-600">
                            {formatCurrency(s.net_amount || 0)}
                          </td>
                          <td className="text-center py-3 px-4">
                            <Badge variant={s.status === 'completed' ? 'default' : 'secondary'}>
                              {s.status}
                            </Badge>
                          </td>
                          <td className="text-center py-3 px-4">
                            {s.is_reconciled ? (
                              <Badge variant="outline" className="text-green-600">Đã đối soát</Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600">Chưa đối soát</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(!settlements || settlements.length === 0) && (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-muted-foreground">
                            Chưa có dữ liệu đối soát
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
