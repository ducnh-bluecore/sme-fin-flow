import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenantId } from "@/hooks/useActiveTenantId";
import { format, subMonths } from "date-fns";
import { vi } from "date-fns/locale";
import { useDateRangeForQuery } from "@/contexts/DateRangeContext";
import { QuickDateSelector } from "@/components/filters/DateRangeFilter";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { DataSourceNotice } from "@/components/shared/DataSourceNotice";
import {
  TrendingUp,
  RefreshCw,
  Calendar,
  Download,
  Search,
  Filter,
  ShoppingCart,
  Activity,
  FileSpreadsheet,
  Link2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatCount } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface Revenue {
  id: string;
  contract_name: string;
  customer_id: string | null;
  customer_name: string | null;
  revenue_type: string;
  source: string;
  amount: number;
  start_date: string;
  end_date: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface ConnectorData {
  id: string;
  name: string;
  type: string;
  status: string;
  lastSync: string | null;
  ordersCount: number;
  totalRevenue: number;
}

const sourceColors: Record<string, string> = {
  'haravan': '#3b82f6',
  'shopee': '#ee4d2d',
  'lazada': '#0f146d',
  'tiktok': '#000000',
  'kiotviet': '#8b5cf6',
  'sapo': '#22c55e',
  'manual': '#f97316',
  'other': '#64748b',
};

export default function RevenuePage() {
  const { data: tenantId } = useActiveTenantId();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");

  // Use global date range context
  const { startDateStr: start, endDateStr: end } = useDateRangeForQuery();

  // Fetch revenues from database
  const { data: revenues = [], refetch } = useQuery({
    queryKey: ["revenues-analytics", tenantId, start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenues")
        .select("*")
        .eq('tenant_id', tenantId)
        .gte('start_date', start)
        .lte('start_date', end)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Revenue[];
    },
    enabled: !!tenantId,
  });

  // Fetch connector integrations from database
  const { data: connectors = [], refetch: refetchConnectors } = useQuery({
    queryKey: ["connector-integrations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connector_integrations")
        .select("*")
        .eq('tenant_id', tenantId)
        .order("connector_name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch external orders for integrated revenue
  const { data: externalOrders = [] } = useQuery({
    queryKey: ["external-orders-revenue", tenantId, start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_orders")
        .select("integration_id, total_amount, status, channel, order_date")
        .eq('tenant_id', tenantId)
        .gte('order_date', start)
        .lte('order_date', end);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch previous period for comparison
  const { data: prevRevenues = [] } = useQuery({
    queryKey: ['revenues-prev', tenantId, start, end],
    queryFn: async () => {
      const prevStart = format(subMonths(new Date(start), 1), 'yyyy-MM-dd');
      const prevEnd = format(subMonths(new Date(end), 1), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('revenues')
        .select('amount')
        .eq('tenant_id', tenantId)
        .gte('start_date', prevStart)
        .lte('start_date', prevEnd);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Process connector data with order statistics
  const connectorData = useMemo<ConnectorData[]>(() => {
    return connectors.map(c => {
      const connectorOrders = externalOrders.filter(o => o.integration_id === c.id);
      const deliveredOrders = connectorOrders.filter(o => o.status === 'delivered');
      return {
        id: c.id,
        name: c.connector_name || c.shop_name || c.connector_type,
        type: c.connector_type,
        status: c.status || 'inactive',
        lastSync: c.last_sync_at,
        ordersCount: deliveredOrders.length,
        totalRevenue: deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
      };
    });
  }, [connectors, externalOrders]);

  // Filter revenues
  const filteredRevenues = revenues.filter((revenue) => {
    const matchesSearch =
      revenue.contract_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      revenue.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = filterSource === "all" || revenue.source === filterSource;
    return matchesSearch && matchesSource;
  });

  // Calculate summary
  const totalManualRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalIntegratedRevenue = connectorData.reduce((sum, c) => sum + c.totalRevenue, 0);
  const grandTotalRevenue = totalManualRevenue + totalIntegratedRevenue;
  const totalIntegratedOrders = connectorData.reduce((sum, c) => sum + c.ordersCount, 0);
  const activeConnectors = connectorData.filter(c => c.status === 'active');
  
  const prevTotalRevenue = prevRevenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const revenueChange = prevTotalRevenue > 0 
    ? ((grandTotalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 
    : 0;

  const hasData = grandTotalRevenue > 0 || revenues.length > 0 || connectorData.length > 0;

  // Source breakdown for chart
  const sourceBreakdown = useMemo(() => {
    const breakdown = connectorData
      .filter(c => c.totalRevenue > 0)
      .map(c => ({
        name: c.name,
        value: c.totalRevenue,
        color: sourceColors[c.type.toLowerCase()] || sourceColors['other'],
      }));

    if (totalManualRevenue > 0) {
      breakdown.push({
        name: 'Nhập tay',
        value: totalManualRevenue,
        color: sourceColors['manual'],
      });
    }

    return breakdown;
  }, [connectorData, totalManualRevenue]);

  // Monthly trend - combine manual revenues + integrated orders
  const trendData = useMemo(() => {
    const monthlyData: Record<string, number> = {};

    // Add manual revenues
    revenues.forEach((rev) => {
      try {
        const date = new Date(rev.start_date);
        if (!isNaN(date.getTime())) {
          const month = format(date, 'yyyy-MM');
          monthlyData[month] = (monthlyData[month] || 0) + Number(rev.amount);
        }
      } catch {
        // Skip invalid dates
      }
    });

    // Add external orders (delivered only)
    externalOrders
      .filter((o) => o.status === 'delivered' && o.order_date)
      .forEach((order) => {
        try {
          const date = new Date(order.order_date);
          if (!isNaN(date.getTime())) {
            const month = format(date, 'yyyy-MM');
            monthlyData[month] = (monthlyData[month] || 0) + Number(order.total_amount || 0);
          }
        } catch {
          // Skip invalid dates
        }
      });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => {
        try {
          return {
            month: format(new Date(month + '-01'), 'MMM yyyy', { locale: vi }),
            amount,
          };
        } catch {
          return { month, amount };
        }
      });
  }, [revenues, externalOrders]);

  // Top customers
  const topCustomers = useMemo(() => {
    const customerTotals = revenues.reduce((acc, rev) => {
      const customer = rev.customer_name || 'Không xác định';
      acc[customer] = (acc[customer] || 0) + Number(rev.amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(customerTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [revenues]);

  const handleRefresh = () => {
    refetch();
    refetchConnectors();
  };

  return (
    <>
      <Helmet>
        <title>Phân tích Doanh thu | Finance Platform</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Phân tích Doanh thu
            </h1>
            <p className="text-muted-foreground">
              Theo dõi và phân tích doanh thu từ các nguồn đã tích hợp
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Xuất Excel
            </Button>
            <Link to="/connectors">
              <Button size="sm">
                <Link2 className="w-4 h-4 mr-2" />
                Kết nối nguồn
              </Button>
            </Link>
          </div>
        </div>

        {/* Data Source Notice */}
        <DataSourceNotice 
          variant="green" 
          title="Dữ liệu được đồng bộ từ các nguồn tích hợp"
          description="Để thêm dữ liệu mới, vui lòng kết nối với hệ thống bán hàng hoặc import file tại"
          integrationCount={activeConnectors.length}
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {hasData ? formatCurrency(grandTotalRevenue) : '--'}
              </div>
              {hasData && prevTotalRevenue > 0 ? (
                <div className={cn(
                  "flex items-center text-xs mt-1",
                  revenueChange >= 0 ? "text-green-500" : "text-destructive"
                )}>
                  {revenueChange >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-1" />
                  )}
                  {Math.abs(revenueChange).toFixed(1)}% so với kỳ trước
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Chưa có dữ liệu so sánh</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Từ tích hợp</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalIntegratedRevenue > 0 ? formatCurrency(totalIntegratedRevenue) : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalIntegratedOrders > 0 ? `${formatCount(totalIntegratedOrders)} đơn hàng` : 'Chưa có đơn hàng'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số giao dịch</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {revenues.length + totalIntegratedOrders > 0 ? formatCount(revenues.length + totalIntegratedOrders) : '--'}
              </div>
              <p className="text-xs text-muted-foreground">trong kỳ phân tích</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nguồn kết nối</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {connectorData.length > 0 ? `${activeConnectors.length}/${connectorData.length}` : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                {connectorData.length > 0 ? 'đang hoạt động' : 'Chưa kết nối'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm doanh thu..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Nguồn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nguồn</SelectItem>
              <SelectItem value="manual">Nhập tay</SelectItem>
              <SelectItem value="integrated">Tích hợp</SelectItem>
            </SelectContent>
          </Select>
          <QuickDateSelector showYears />
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="sources">Nguồn doanh thu</TabsTrigger>
            <TabsTrigger value="detail">Chi tiết</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ theo nguồn</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {sourceBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={sourceBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {sourceBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Chưa có dữ liệu doanh thu
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Customers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top khách hàng</CardTitle>
                  <CardDescription>Theo tổng doanh thu</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topCustomers.length > 0 ? (
                      topCustomers.map(([customer, amount]) => (
                        <div key={customer} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{customer}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                          <Progress 
                            value={totalManualRevenue > 0 ? (amount / totalManualRevenue) * 100 : 0} 
                            className="h-2"
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Chưa có dữ liệu khách hàng
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng doanh thu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Area 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary) / 0.2)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Chưa có dữ liệu xu hướng
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources">
            <Card>
              <CardHeader>
                <CardTitle>Nguồn doanh thu đang kết nối</CardTitle>
                <CardDescription>
                  Quản lý kết nối tại <Link to="/connectors" className="text-primary underline">Connectors</Link>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {connectorData.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {connectorData.map((connector) => (
                      <Card key={connector.id} className="border-2">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{connector.name}</h4>
                              <p className="text-xs text-muted-foreground">{connector.type}</p>
                            </div>
                            <Badge variant={connector.status === 'active' ? 'default' : 'secondary'}>
                              {connector.status === 'active' ? 'Đang hoạt động' : 'Không hoạt động'}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Doanh thu</span>
                              <span className="font-semibold">
                                {connector.totalRevenue > 0 ? formatCurrency(connector.totalRevenue) : '--'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Đơn hàng</span>
                              <span>{connector.ordersCount > 0 ? connector.ordersCount.toLocaleString() : '--'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Cập nhật</span>
                              <span className="text-xs">
                                {connector.lastSync 
                                  ? format(new Date(connector.lastSync), 'dd/MM/yyyy HH:mm')
                                  : '--'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Chưa có nguồn doanh thu nào được kết nối</p>
                    <Link to="/connectors">
                      <Button variant="outline" className="mt-4">
                        <Link2 className="w-4 h-4 mr-2" />
                        Kết nối nguồn
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detail">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách giao dịch</CardTitle>
                <CardDescription>
                  {filteredRevenues.length} giao dịch trong kỳ phân tích
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredRevenues.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ngày</TableHead>
                          <TableHead>Tên hợp đồng</TableHead>
                          <TableHead>Khách hàng</TableHead>
                          <TableHead>Nguồn</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead className="text-right">Số tiền</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRevenues.slice(0, 20).map((revenue) => (
                          <TableRow key={revenue.id}>
                            <TableCell className="font-mono text-sm">
                              {format(new Date(revenue.start_date), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>{revenue.contract_name}</TableCell>
                            <TableCell>{revenue.customer_name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {revenue.source === 'manual' ? 'Nhập tay' : 'Tích hợp'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={revenue.revenue_type === 'recurring' ? 'default' : 'secondary'}>
                                {revenue.revenue_type === 'recurring' ? 'Định kỳ' : '1 lần'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              {formatCurrency(revenue.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredRevenues.length > 20 && (
                      <p className="text-center text-sm text-muted-foreground mt-4">
                        Hiển thị 20/{filteredRevenues.length} giao dịch
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có giao dịch doanh thu trong kỳ phân tích
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
