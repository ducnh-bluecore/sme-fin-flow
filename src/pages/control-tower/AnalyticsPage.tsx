import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Store,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const revenueData = [
  { date: '01/01', revenue: 125, target: 120 },
  { date: '02/01', revenue: 138, target: 125 },
  { date: '03/01', revenue: 142, target: 130 },
  { date: '04/01', revenue: 156, target: 135 },
  { date: '05/01', revenue: 148, target: 140 },
  { date: '06/01', revenue: 165, target: 145 },
  { date: '07/01', revenue: 172, target: 150 },
];

const categoryData = [
  { name: 'Điện thoại', value: 45, color: '#3B82F6' },
  { name: 'Laptop', value: 25, color: '#10B981' },
  { name: 'Phụ kiện', value: 15, color: '#F59E0B' },
  { name: 'Tablet', value: 10, color: '#8B5CF6' },
  { name: 'Khác', value: 5, color: '#6B7280' },
];

const storePerformance = [
  { store: 'Q1 - Nguyễn Huệ', revenue: 452, orders: 1250, growth: 12.5 },
  { store: 'Q3 - Võ Văn Tần', revenue: 385, orders: 980, growth: 8.2 },
  { store: 'Q7 - PMH', revenue: 283, orders: 720, growth: -5.3 },
  { store: 'Thủ Đức - Vincom', revenue: 521, orders: 1420, growth: 15.8 },
  { store: 'Bình Thạnh', revenue: 312, orders: 850, growth: 3.2 },
];

const hourlyData = [
  { hour: '8h', orders: 12 },
  { hour: '9h', orders: 25 },
  { hour: '10h', orders: 45 },
  { hour: '11h', orders: 68 },
  { hour: '12h', orders: 52 },
  { hour: '13h', orders: 38 },
  { hour: '14h', orders: 55 },
  { hour: '15h', orders: 72 },
  { hour: '16h', orders: 85 },
  { hour: '17h', orders: 92 },
  { hour: '18h', orders: 78 },
  { hour: '19h', orders: 65 },
  { hour: '20h', orders: 48 },
  { hour: '21h', orders: 32 },
];

export default function AnalyticsPage() {
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

        {/* KPI Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Doanh thu</p>
                  <p className="text-2xl font-bold text-slate-100 mt-1">₫1.95B</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400">+12.5%</span>
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
                  <p className="text-2xl font-bold text-slate-100 mt-1">5,847</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400">+8.2%</span>
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
                  <p className="text-2xl font-bold text-slate-100 mt-1">1,234</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400">+15.3%</span>
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
                  <p className="text-2xl font-bold text-slate-100 mt-1">₫334K</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingDown className="h-3 w-3 text-red-400" />
                    <span className="text-xs text-red-400">-2.1%</span>
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
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      fill="#10B98120" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-100">Phân bổ doanh thu</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        {/* Hourly Orders */}
        <Card className="bg-slate-900/50 border-slate-800/50">
          <CardHeader>
            <CardTitle className="text-slate-100">Đơn hàng theo giờ (hôm nay)</CardTitle>
          </CardHeader>
          <CardContent>
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
                  <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Store Performance Table */}
        <Card className="bg-slate-900/50 border-slate-800/50">
          <CardHeader>
            <CardTitle className="text-slate-100">Hiệu suất cửa hàng</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </>
  );
}
