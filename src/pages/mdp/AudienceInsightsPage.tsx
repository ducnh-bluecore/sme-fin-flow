import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  UserCheck,
  UserX,
  Clock,
  ShoppingCart,
  Repeat,
  Star,
  MapPin,
  Smartphone,
  Monitor,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useAudienceData } from '@/hooks/useAudienceData';

const formatCurrency = (value: number) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

export default function AudienceInsightsPage() {
  const { segments, demographics, geographicData, stats, isLoading, error } = useAudienceData();
  const [activeTab, setActiveTab] = useState('segments');

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-muted-foreground">Không thể tải dữ liệu Audience</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-7 w-7 text-violet-400" />
          Audience Insights
        </h1>
        <p className="text-muted-foreground mt-1">Phân tích chi tiết đối tượng khách hàng và dự đoán LTV</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/20">
                    <Users className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng khách hàng</p>
                    <p className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</p>
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
                    <p className="text-2xl font-bold">{formatCurrency(stats.avgLTV)}</p>
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
                    <p className="text-2xl font-bold">{stats.highValueCount.toLocaleString()}</p>
                    <p className="text-xs text-emerald-400">Top 10% khách hàng</p>
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
                    <p className="text-2xl font-bold">{stats.atRiskCount.toLocaleString()}</p>
                    <p className="text-xs text-red-400">Cần hành động</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
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
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : segments.every(s => s.size === 0) ? (
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có dữ liệu khách hàng</p>
                <p className="text-sm text-muted-foreground mt-1">Dữ liệu sẽ được phân tích từ đơn hàng</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {segments.map((segment, idx) => (
                <Card key={idx} className="border-border bg-card shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Segment Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: segment.color }}
                          />
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
                          <span className="text-sm text-muted-foreground">({segment.percentage.toFixed(1)}% tổng)</span>
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
                          <p className="font-semibold">{segment.purchaseFrequency.toFixed(1)}x</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">Retention</p>
                          <p className={cn(
                            "font-semibold",
                            segment.retentionRate >= 70 ? "text-emerald-400" :
                            segment.retentionRate >= 50 ? "text-yellow-400" : "text-red-400"
                          )}>
                            {segment.retentionRate.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
                    <BarChart data={demographics.ageDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="%" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
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
                        data={demographics.genderDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {demographics.genderDistribution.map((entry, index) => (
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
                {demographics.deviceData.map((device, idx) => (
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
                    <Repeat className="h-5 w-5 mx-auto mb-2 text-violet-400" />
                    <p className="text-sm text-muted-foreground">Repeat Rate</p>
                    <p className="font-semibold">{stats.repeatRate.toFixed(0)}%</p>
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
              {geographicData.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Chưa có dữ liệu địa lý</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {geographicData.map((loc, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{loc.city}</span>
                          <span className="text-sm text-muted-foreground">{loc.percentage.toFixed(1)}%</span>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
