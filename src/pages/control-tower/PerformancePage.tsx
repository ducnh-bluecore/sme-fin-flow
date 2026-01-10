import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Target,
  Award,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

const monthlyData = [
  { month: 'T1', revenue: 1200, target: 1000, orders: 3200 },
  { month: 'T2', revenue: 1350, target: 1100, orders: 3500 },
  { month: 'T3', revenue: 1100, target: 1200, orders: 3100 },
  { month: 'T4', revenue: 1450, target: 1300, orders: 3800 },
  { month: 'T5', revenue: 1600, target: 1400, orders: 4200 },
  { month: 'T6', revenue: 1750, target: 1500, orders: 4600 },
  { month: 'T7', revenue: 1950, target: 1600, orders: 5100 },
];

const kpiData = [
  { metric: 'Doanh thu', value: 98, fullMark: 100 },
  { metric: 'Đơn hàng', value: 85, fullMark: 100 },
  { metric: 'Khách hàng', value: 92, fullMark: 100 },
  { metric: 'Lợi nhuận', value: 78, fullMark: 100 },
  { metric: 'NPS', value: 88, fullMark: 100 },
  { metric: 'Hiệu suất', value: 95, fullMark: 100 },
];

const topPerformers = [
  { name: 'Nguyễn Văn A', role: 'Sales Lead', revenue: 125.5, orders: 342, growth: 18.5, avatar: 'NVA' },
  { name: 'Trần Thị B', role: 'Sales Executive', revenue: 98.2, orders: 287, growth: 12.3, avatar: 'TTB' },
  { name: 'Lê Văn C', role: 'Sales Executive', revenue: 87.8, orders: 256, growth: 8.7, avatar: 'LVC' },
  { name: 'Phạm Thị D', role: 'Store Manager', revenue: 76.4, orders: 198, growth: 15.2, avatar: 'PTD' },
  { name: 'Hoàng Văn E', role: 'Sales Executive', revenue: 65.3, orders: 176, growth: -2.4, avatar: 'HVE' },
];

const storeRankings = [
  { name: 'Thủ Đức - Vincom', target: 95, actual: 102, revenue: 521 },
  { name: 'Quận 1 - Nguyễn Huệ', target: 90, actual: 95, revenue: 452 },
  { name: 'Quận 3 - Võ Văn Tần', target: 85, actual: 88, revenue: 385 },
  { name: 'Bình Thạnh', target: 80, actual: 78, revenue: 312 },
  { name: 'Quận 7 - PMH', target: 90, actual: 63, revenue: 283 },
];

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: string;
  target?: number;
  actual?: number;
}

function KPICard({ title, value, change, changeLabel, icon: Icon, color, target, actual }: KPICardProps) {
  const isPositive = change >= 0;
  const progress = target && actual ? (actual / target) * 100 : undefined;
  
  return (
    <Card className="bg-slate-900/50 border-slate-800/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-slate-100">{value}</p>
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-400" />
              )}
              <span className={isPositive ? 'text-emerald-400 text-sm' : 'text-red-400 text-sm'}>
                {isPositive ? '+' : ''}{change}%
              </span>
              <span className="text-slate-500 text-sm">{changeLabel}</span>
            </div>
            {progress !== undefined && (
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Target</span>
                  <span className={progress >= 100 ? 'text-emerald-400' : 'text-amber-400'}>
                    {progress.toFixed(0)}%
                  </span>
                </div>
                <Progress value={Math.min(progress, 100)} className="h-1.5" />
              </div>
            )}
          </div>
          <div 
            className="p-3 rounded-xl ml-4"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PerformancePage() {
  return (
    <>
      <Helmet>
        <title>Hiệu suất | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-amber-400" />
              Hiệu suất kinh doanh
            </h1>
            <p className="text-slate-400 text-sm mt-1">Theo dõi và đánh giá hiệu suất tổng thể</p>
          </div>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            Xuất báo cáo
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Tổng doanh thu" 
            value="₫1.95B" 
            change={12.5} 
            changeLabel="vs tháng trước"
            icon={DollarSign}
            color="#10B981"
            target={2000}
            actual={1950}
          />
          <KPICard 
            title="Tổng đơn hàng" 
            value="5,847" 
            change={8.2} 
            changeLabel="vs tháng trước"
            icon={ShoppingCart}
            color="#3B82F6"
            target={6000}
            actual={5847}
          />
          <KPICard 
            title="Khách hàng mới" 
            value="1,234" 
            change={15.3} 
            changeLabel="vs tháng trước"
            icon={Users}
            color="#8B5CF6"
          />
          <KPICard 
            title="Đạt target" 
            value="4/5" 
            change={-1} 
            changeLabel="cửa hàng"
            icon={Target}
            color="#F59E0B"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend */}
          <Card className="bg-slate-900/50 border-slate-800/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-slate-100">Xu hướng doanh thu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
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
            </CardContent>
          </Card>

          {/* KPI Radar */}
          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-100">Chỉ số KPI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={kpiData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="metric" stroke="#64748B" fontSize={11} />
                    <PolarRadiusAxis stroke="#334155" />
                    <Radar
                      name="Hiện tại"
                      dataKey="value"
                      stroke="#F59E0B"
                      fill="#F59E0B"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-400" />
                  Top nhân viên
                </CardTitle>
                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Tháng này
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {topPerformers.map((person, index) => (
                <motion.div
                  key={person.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/30"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm font-medium">
                    {person.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{person.name}</p>
                    <p className="text-xs text-slate-500">{person.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-100">₫{person.revenue}M</p>
                    <p className={`text-xs flex items-center justify-end ${person.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {person.growth >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                      {person.growth >= 0 ? '+' : ''}{person.growth}%
                    </p>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Store Rankings */}
          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-400" />
                  Xếp hạng cửa hàng
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {storeRankings.map((store, index) => {
                const progress = (store.actual / store.target) * 100;
                const achieved = progress >= 100;
                return (
                  <motion.div
                    key={store.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-200">{store.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">₫{store.revenue}M</span>
                        <Badge className={`text-xs ${achieved 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        } border`}>
                          {progress.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
