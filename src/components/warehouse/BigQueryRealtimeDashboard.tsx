import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw, 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  BarChart3,
  Clock,
  Database,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useBigQueryRealtime, 
  useInvalidateBigQueryCache 
} from '@/hooks/useBigQueryRealtime';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

const CHANNEL_COLORS: Record<string, string> = {
  shopee: 'hsl(var(--chart-1))',
  lazada: 'hsl(var(--chart-2))',
  tiktok: 'hsl(var(--chart-3))',
  tiki: 'hsl(var(--chart-4))',
};

interface BigQueryRealtimeDashboardProps {
  startDate?: string;
  endDate?: string;
}

export function BigQueryRealtimeDashboard({ 
  startDate, 
  endDate 
}: BigQueryRealtimeDashboardProps) {
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const defaultEndDate = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const dateParams = {
    startDate: startDate || defaultStartDate,
    endDate: endDate || defaultEndDate,
  };

  // Fetch data from BigQuery
  const { data: channelSummary, isLoading: loadingSummary, refetch: refetchSummary } = useBigQueryRealtime({
    queryType: 'channel_summary',
    ...dateParams,
  });

  const { data: dailyRevenue, isLoading: loadingDaily } = useBigQueryRealtime({
    queryType: 'daily_revenue',
    ...dateParams,
  });

  const { data: orderStatus, isLoading: loadingStatus } = useBigQueryRealtime({
    queryType: 'order_status',
    ...dateParams,
  });

  const invalidateCache = useInvalidateBigQueryCache();

  // Process channel summary data
  const summaryData = useMemo(() => {
    if (!channelSummary?.data) return null;
    
    const total = {
      orders: 0,
      grossRevenue: 0,
      netRevenue: 0,
    };

    const channels = channelSummary.data.map((row: any) => {
      total.orders += parseInt(row.total_orders || 0);
      total.grossRevenue += parseFloat(row.gross_revenue || 0);
      total.netRevenue += parseFloat(row.net_revenue || 0);
      
      return {
        channel: row.channel,
        orders: parseInt(row.total_orders || 0),
        grossRevenue: parseFloat(row.gross_revenue || 0),
        netRevenue: parseFloat(row.net_revenue || 0),
        avgOrderValue: parseFloat(row.avg_order_value || 0),
      };
    });

    return { total, channels };
  }, [channelSummary]);

  // Process daily revenue for chart
  const dailyChartData = useMemo(() => {
    if (!dailyRevenue?.data) return [];
    
    // Group by date
    const grouped: Record<string, any> = {};
    
    dailyRevenue.data.forEach((row: any) => {
      const date = row.date;
      if (!grouped[date]) {
        grouped[date] = { date };
      }
      grouped[date][row.channel] = parseFloat(row.revenue || 0);
      grouped[date][`${row.channel}_orders`] = parseInt(row.order_count || 0);
    });

    return Object.values(grouped).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [dailyRevenue]);

  // Process order status for pie chart
  const statusChartData = useMemo(() => {
    if (!orderStatus?.data) return [];
    
    const statusMap: Record<string, number> = {};
    
    orderStatus.data.forEach((row: any) => {
      const status = row.status || 'unknown';
      statusMap[status] = (statusMap[status] || 0) + parseInt(row.count || 0);
    });

    return Object.entries(statusMap).map(([status, count]) => ({
      name: status,
      value: count,
    }));
  }, [orderStatus]);

  const STATUS_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--muted))',
  ];

  const handleRefresh = () => {
    invalidateCache.mutate();
    refetchSummary();
  };

  const isLoading = loadingSummary || loadingDaily || loadingStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Real-time Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Dữ liệu trực tiếp từ BigQuery
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {channelSummary?.cached && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" />
              Cached
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={invalidateCache.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${invalidateCache.isPending ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </Card>
          ))
        ) : summaryData ? (
          <>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm">Tổng đơn hàng</span>
              </div>
              <p className="text-2xl font-bold">{summaryData.total.orders.toLocaleString()}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Doanh thu thô</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(summaryData.total.grossRevenue)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Doanh thu ròng</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(summaryData.total.netRevenue)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm">Kênh hoạt động</span>
              </div>
              <p className="text-2xl font-bold">{summaryData.channels.length}</p>
            </Card>
          </>
        ) : (
          <Card className="p-4 col-span-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span>Không có dữ liệu. Vui lòng cấu hình kết nối BigQuery.</span>
            </div>
          </Card>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Revenue Chart */}
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Doanh thu theo ngày</h4>
          {loadingDaily ? (
            <Skeleton className="h-64 w-full" />
          ) : dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
                />
                <Legend />
                <Line type="monotone" dataKey="shopee" stroke={CHANNEL_COLORS.shopee} strokeWidth={2} dot={false} name="Shopee" />
                <Line type="monotone" dataKey="lazada" stroke={CHANNEL_COLORS.lazada} strokeWidth={2} dot={false} name="Lazada" />
                <Line type="monotone" dataKey="tiktok" stroke={CHANNEL_COLORS.tiktok} strokeWidth={2} dot={false} name="TikTok" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Không có dữ liệu
            </div>
          )}
        </Card>

        {/* Channel Comparison */}
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">So sánh kênh bán hàng</h4>
          {loadingSummary ? (
            <Skeleton className="h-64 w-full" />
          ) : summaryData?.channels?.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={summaryData.channels}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="channel" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="grossRevenue" name="Doanh thu thô" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="netRevenue" name="Doanh thu ròng" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Không có dữ liệu
            </div>
          )}
        </Card>
      </div>

      {/* Order Status Pie Chart */}
      <Card className="p-6">
        <h4 className="text-sm font-medium mb-4">Phân bổ trạng thái đơn hàng</h4>
        {loadingStatus ? (
          <Skeleton className="h-64 w-full" />
        ) : statusChartData.length > 0 ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {statusChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {statusChartData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }}
                    />
                    <span className="text-sm capitalize">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Không có dữ liệu
          </div>
        )}
      </Card>

      {/* Query Stats */}
      {channelSummary && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            <span>Query time: {channelSummary.query_time_ms || 'cached'}ms</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {channelSummary.cached 
                ? `Cached at ${new Date(channelSummary.cached_at!).toLocaleTimeString('vi-VN')}`
                : 'Fresh data'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
