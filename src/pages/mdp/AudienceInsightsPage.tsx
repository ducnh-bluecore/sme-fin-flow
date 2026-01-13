import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  UserCheck,
  UserX,
  Clock,
  ShoppingCart,
  Repeat,
  Star,
  MapPin,
  Smartphone,
  Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const audienceSegments = [
  { 
    name: 'High-Value Customers', 
    size: 12500, 
    percentage: 8.5,
    ltv: 15200000, 
    avgOrderValue: 2850000,
    purchaseFrequency: 4.2,
    retentionRate: 85,
    trend: 'up',
    change: 12.5
  },
  { 
    name: 'Regular Customers', 
    size: 45000, 
    percentage: 30.6,
    ltv: 5800000, 
    avgOrderValue: 1250000,
    purchaseFrequency: 2.8,
    retentionRate: 68,
    trend: 'up',
    change: 5.2
  },
  { 
    name: 'Occasional Buyers', 
    size: 62000, 
    percentage: 42.2,
    ltv: 2200000, 
    avgOrderValue: 850000,
    purchaseFrequency: 1.4,
    retentionRate: 42,
    trend: 'stable',
    change: 0.8
  },
  { 
    name: 'At-Risk Customers', 
    size: 18500, 
    percentage: 12.6,
    ltv: 1800000, 
    avgOrderValue: 920000,
    purchaseFrequency: 0.8,
    retentionRate: 25,
    trend: 'down',
    change: -8.3
  },
  { 
    name: 'New Customers', 
    size: 9000, 
    percentage: 6.1,
    ltv: 800000, 
    avgOrderValue: 680000,
    purchaseFrequency: 1.0,
    retentionRate: 55,
    trend: 'up',
    change: 18.5
  },
];

const ageDistribution = [
  { range: '18-24', value: 15, color: '#8b5cf6' },
  { range: '25-34', value: 35, color: '#a855f7' },
  { range: '35-44', value: 28, color: '#c084fc' },
  { range: '45-54', value: 15, color: '#d8b4fe' },
  { range: '55+', value: 7, color: '#e9d5ff' },
];

const genderDistribution = [
  { name: 'Nữ', value: 62, color: '#ec4899' },
  { name: 'Nam', value: 35, color: '#3b82f6' },
  { name: 'Khác', value: 3, color: '#9ca3af' },
];

const deviceData = [
  { device: 'Mobile', sessions: 68, conversions: 4.2, revenue: 65 },
  { device: 'Desktop', sessions: 28, conversions: 5.8, revenue: 32 },
  { device: 'Tablet', sessions: 4, conversions: 3.5, revenue: 3 },
];

const locationData = [
  { city: 'TP. Hồ Chí Minh', customers: 52000, revenue: 285000000000, percentage: 42 },
  { city: 'Hà Nội', customers: 38000, revenue: 195000000000, percentage: 28 },
  { city: 'Đà Nẵng', customers: 12000, revenue: 58000000000, percentage: 9 },
  { city: 'Cần Thơ', customers: 8500, revenue: 42000000000, percentage: 6 },
  { city: 'Khác', customers: 36500, revenue: 120000000000, percentage: 15 },
];

const formatCurrency = (value: number) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

export default function AudienceInsightsPage() {
  const [activeTab, setActiveTab] = useState('segments');

  const totalCustomers = audienceSegments.reduce((acc, s) => acc + s.size, 0);
  const avgLTV = audienceSegments.reduce((acc, s) => acc + s.ltv * s.size, 0) / totalCustomers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Users className="h-7 w-7 text-violet-400" />
          Audience Insights
        </h1>
        <p className="text-slate-400 mt-1">Phân tích chi tiết đối tượng khách hàng và dự đoán LTV</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Users className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng khách hàng</p>
                <p className="text-2xl font-bold">{totalCustomers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. LTV</p>
                <p className="text-2xl font-bold">{formatCurrency(avgLTV)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <UserCheck className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">High-Value</p>
                <p className="text-2xl font-bold">{audienceSegments[0].size.toLocaleString()}</p>
                <p className="text-xs text-emerald-400">+12.5% vs tháng trước</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <UserX className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">At-Risk</p>
                <p className="text-2xl font-bold">{audienceSegments[3].size.toLocaleString()}</p>
                <p className="text-xs text-red-400">Cần hành động</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="segments">Phân khúc</TabsTrigger>
          <TabsTrigger value="demographics">Nhân khẩu học</TabsTrigger>
          <TabsTrigger value="behavior">Hành vi</TabsTrigger>
          <TabsTrigger value="geography">Địa lý</TabsTrigger>
        </TabsList>

        <TabsContent value="segments" className="mt-6">
          <div className="space-y-4">
            {audienceSegments.map((segment, idx) => (
              <Card key={idx} className="border-border bg-card shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Segment Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">{segment.name}</h3>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            segment.trend === 'up' ? 'border-emerald-500/30 text-emerald-400' :
                            segment.trend === 'down' ? 'border-red-500/30 text-red-400' :
                            'border-slate-500/30 text-slate-400'
                          )}
                        >
                          {segment.trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                          {segment.trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                          {segment.change > 0 ? '+' : ''}{segment.change}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl font-bold">{segment.size.toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground">({segment.percentage}% tổng)</span>
                      </div>
                      <Progress value={segment.percentage} className="h-2" />
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">LTV</p>
                        <p className="font-semibold text-violet-400">{formatCurrency(segment.ltv)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">AOV</p>
                        <p className="font-semibold">{formatCurrency(segment.avgOrderValue)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Frequency</p>
                        <p className="font-semibold">{segment.purchaseFrequency}x/năm</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Retention</p>
                        <p className={cn(
                          "font-semibold",
                          segment.retentionRate >= 70 ? "text-emerald-400" :
                          segment.retentionRate >= 50 ? "text-yellow-400" : "text-red-400"
                        )}>
                          {segment.retentionRate}%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="demographics" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Age Distribution */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Phân bố độ tuổi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} unit="%" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        labelStyle={{ color: '#f8fafc' }}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Phân bố giới tính</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {genderDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Device Usage */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Thiết bị sử dụng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {deviceData.map((device, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {device.device === 'Mobile' && <Smartphone className="h-4 w-4 text-violet-400" />}
                        {device.device === 'Desktop' && <Monitor className="h-4 w-4 text-blue-400" />}
                        {device.device === 'Tablet' && <Monitor className="h-4 w-4 text-emerald-400" />}
                        <span className="font-medium">{device.device}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{device.sessions}% sessions</span>
                        <span>CVR: {device.conversions}%</span>
                        <span>{device.revenue}% revenue</span>
                      </div>
                    </div>
                    <Progress value={device.sessions} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Purchase Patterns */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Mô hình mua hàng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Clock className="h-5 w-5 mx-auto mb-2 text-blue-400" />
                    <p className="text-sm text-muted-foreground">Giờ mua nhiều nhất</p>
                    <p className="font-semibold">20:00 - 22:00</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Repeat className="h-5 w-5 mx-auto mb-2 text-emerald-400" />
                    <p className="text-sm text-muted-foreground">Avg. Order Cycle</p>
                    <p className="font-semibold">28 ngày</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Star className="h-5 w-5 mx-auto mb-2 text-yellow-400" />
                    <p className="text-sm text-muted-foreground">NPS Score</p>
                    <p className="font-semibold">72</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Target className="h-5 w-5 mx-auto mb-2 text-violet-400" />
                    <p className="text-sm text-muted-foreground">Repeat Rate</p>
                    <p className="font-semibold">42%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="geography" className="mt-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Phân bố địa lý
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {locationData.map((loc, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{loc.city}</span>
                        <span className="text-sm text-muted-foreground">{loc.percentage}%</span>
                      </div>
                      <Progress value={loc.percentage} className="h-2" />
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{loc.customers.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(loc.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
