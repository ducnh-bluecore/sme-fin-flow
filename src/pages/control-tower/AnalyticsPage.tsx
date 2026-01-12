import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Store,
  Calendar,
  Loader2,
  Database,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useControlTowerAnalytics } from '@/hooks/useControlTowerAnalytics';
import DataSourceHealthPanel from '@/components/control-tower/DataSourceHealthPanel';
import StoreHealthMap from '@/components/control-tower/StoreHealthMap';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data, isLoading } = useControlTowerAnalytics();

  const revenueData = data?.revenueData || [];
  const categoryData = data?.categoryData || [];
  const storePerformance = data?.storePerformance || [];
  const hourlyData = data?.hourlyData || [];
  const summary = data?.summary || {
    totalRevenue: 0,
    totalOrders: 0,
    newCustomers: 0,
    aov: 0,
    revenueChange: 0,
    ordersChange: 0,
    customersChange: 0,
    aovChange: 0,
  };

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `₫${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `₫${(value / 1e6).toFixed(0)}M`;
    if (value >= 1e3) return `₫${(value / 1e3).toFixed(0)}K`;
    return `₫${value}`;
  };

  return (
    <>
      <Helmet>
        <title>Phân tích | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-emerald-400" />
              Phân tích vận hành
            </h1>
            <p className="text-slate-400 text-sm mt-1">Báo cáo và phân tích dữ liệu thời gian thực</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-slate-700 text-slate-300">
              <Calendar className="h-4 w-4 mr-2" />
              7 ngày qua
            </Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white">
              Xuất báo cáo
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900/50 border border-slate-800/50">
            <TabsTrigger value="overview" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400 gap-2">
              <BarChart3 className="h-4 w-4" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="data-health" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400 gap-2">
              <Database className="h-4 w-4" />
              Nguồn dữ liệu
            </TabsTrigger>
            <TabsTrigger value="store-map" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400 gap-2">
              <MapPin className="h-4 w-4" />
              Bản đồ cửa hàng
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data-health" className="mt-6">
            <DataSourceHealthPanel />
          </TabsContent>

          <TabsContent value="store-map" className="mt-6">
            <StoreHealthMap />
          </TabsContent>

          <TabsContent value="overview" className="mt-6 space-y-6">

        {/* KPI Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Doanh thu</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-100 mt-1">
                      {formatCurrency(summary.totalRevenue)}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    {summary.revenueChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span className={`text-xs ${summary.revenueChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {summary.revenueChange >= 0 ? '+' : ''}{summary.revenueChange}%
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Đơn hàng</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-100 mt-1">
                      {summary.totalOrders.toLocaleString()}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    {summary.ordersChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span className={`text-xs ${summary.ordersChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {summary.ordersChange >= 0 ? '+' : ''}{summary.ordersChange}%
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <ShoppingCart className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Khách hàng mới</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-100 mt-1">
                      {summary.newCustomers.toLocaleString()}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    {summary.customersChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span className={`text-xs ${summary.customersChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {summary.customersChange >= 0 ? '+' : ''}{summary.customersChange}%
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">AOV</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-100 mt-1">
                      {formatCurrency(summary.aov)}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    {summary.aovChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span className={`text-xs ${summary.aovChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {summary.aovChange >= 0 ? '+' : ''}{summary.aovChange}%
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Store className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <Card className="bg-slate-900/50 border-slate-800/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-slate-100">Doanh thu theo ngày</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#64748B" fontSize={12} />
                      <YAxis stroke="#64748B" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1E293B', 
                          border: '1px solid #334155',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="target" 
                        stroke="#64748B" 
                        fill="#64748B20" 
                        strokeDasharray="5 5"
                        name="Target"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#10B981" 
                        fill="#10B98120" 
                        name="Doanh thu"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-100">Phân bổ doanh thu</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : categoryData.length > 0 ? (
                <>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1E293B', 
                            border: '1px solid #334155',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {categoryData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }} 
                          />
                          <span className="text-sm text-slate-400">{item.name}</span>
                        </div>
                        <span className="text-sm text-slate-300">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-400">
                  Chưa có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hourly Orders */}
        <Card className="bg-slate-900/50 border-slate-800/50">
          <CardHeader>
            <CardTitle className="text-slate-100">Đơn hàng theo giờ (hôm nay)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="hour" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1E293B', 
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Đơn hàng" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Store Performance Table */}
        <Card className="bg-slate-900/50 border-slate-800/50">
          <CardHeader>
            <CardTitle className="text-slate-100">Hiệu suất cửa hàng</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : storePerformance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Cửa hàng</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">Doanh thu (M)</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">Đơn hàng</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">Tăng trưởng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storePerformance.map((store) => (
                      <tr key={store.store} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-sm text-slate-200">{store.store}</td>
                        <td className="py-3 px-4 text-sm text-slate-300 text-right">₫{store.revenue}M</td>
                        <td className="py-3 px-4 text-sm text-slate-300 text-right">{store.orders.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <Badge className={`text-xs ${store.growth >= 0 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                          } border`}>
                            {store.growth >= 0 ? '+' : ''}{store.growth}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có dữ liệu cửa hàng</p>
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
