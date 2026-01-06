import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, Calendar, RefreshCw, Target, AlertCircle, 
  ChevronRight, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  useRollingForecasts, 
  useRollingForecastSummary, 
  useGenerateRollingForecast 
} from '@/hooks/useRollingForecast';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

export default function RollingForecastPage() {
  const { data: forecasts, isLoading } = useRollingForecasts();
  const { data: summary } = useRollingForecastSummary();
  const generateForecast = useGenerateRollingForecast();
  const [activeView, setActiveView] = useState<'chart' | 'table'>('chart');

  const handleGenerate = () => {
    generateForecast.mutate();
  };

  const chartData = summary?.byMonth.map(m => ({
    month: format(parseISO(m.month), 'MMM yy', { locale: vi }),
    revenue: m.revenue / 1000000,
    expense: m.expense / 1000000,
    netCash: m.netCash / 1000000,
  })) || [];

  const confidenceColors = {
    high: 'bg-green-500/20 text-green-700 dark:text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    low: 'bg-red-500/20 text-red-700 dark:text-red-400',
  };

  return (
    <>
      <Helmet>
        <title>Dự báo cuốn chiếu 18 tháng | CFO Dashboard</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader 
            title="Dự báo cuốn chiếu"
            subtitle="Rolling Forecast 18 tháng - Cập nhật liên tục dựa trên dữ liệu thực tế"
          />
          <Button 
            onClick={handleGenerate} 
            disabled={generateForecast.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${generateForecast.isPending ? 'animate-spin' : ''}`} />
            {generateForecast.isPending ? 'Đang tạo...' : 'Tạo dự báo mới'}
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tổng doanh thu dự báo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary?.byType['revenue']?.forecast || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    18 tháng tới
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tổng chi phí dự báo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary?.byType['expense']?.forecast || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    18 tháng tới
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Chênh lệch vs Ngân sách
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className={`text-2xl font-bold flex items-center gap-2 ${
                    (summary?.totalVariance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(summary?.totalVariance || 0) >= 0 ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5" />
                    )}
                    {formatCurrency(Math.abs(summary?.totalVariance || 0))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    So với kế hoạch ban đầu
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Độ chính xác dự báo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatPercent(summary?.forecastAccuracy || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dựa trên số liệu thực tế
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Biểu đồ dự báo 18 tháng
                </CardTitle>
                <CardDescription>
                  Doanh thu, chi phí và dòng tiền ròng theo tháng
                </CardDescription>
              </div>
              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'chart' | 'table')}>
                <TabsList>
                  <TabsTrigger value="chart">Biểu đồ</TabsTrigger>
                  <TabsTrigger value="table">Chi tiết</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <Calendar className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Chưa có dữ liệu dự báo</p>
                <p className="text-sm">Nhấn "Tạo dự báo mới" để bắt đầu</p>
              </div>
            ) : activeView === 'chart' ? (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis 
                      className="text-xs" 
                      tickFormatter={(value) => `${value}M`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(0)}M VND`, '']}
                      labelFormatter={(label) => `Tháng: ${label}`}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Doanh thu" 
                      stroke="hsl(var(--chart-1))" 
                      fill="hsl(var(--chart-1))"
                      fillOpacity={0.3}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expense" 
                      name="Chi phí" 
                      stroke="hsl(var(--chart-2))" 
                      fill="hsl(var(--chart-2))"
                      fillOpacity={0.3}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netCash" 
                      name="Dòng tiền ròng" 
                      stroke="hsl(var(--chart-3))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Tháng</th>
                      <th className="text-left py-3 px-2">Loại</th>
                      <th className="text-right py-3 px-2">Ngân sách</th>
                      <th className="text-right py-3 px-2">Dự báo</th>
                      <th className="text-right py-3 px-2">Chênh lệch</th>
                      <th className="text-center py-3 px-2">Độ tin cậy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecasts?.slice(0, 24).map((f) => (
                      <tr key={f.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2">
                          {format(parseISO(f.forecast_month), 'MMM yyyy', { locale: vi })}
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant="outline">
                            {f.forecast_type === 'revenue' ? 'Doanh thu' : 'Chi phí'}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {formatCurrency(f.original_budget)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {formatCurrency(f.current_forecast)}
                        </td>
                        <td className={`py-2 px-2 text-right font-mono ${
                          f.variance_amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {f.variance_amount >= 0 ? '+' : ''}
                          {formatPercent(f.variance_percent)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge className={confidenceColors[f.confidence_level]}>
                            {f.confidence_level === 'high' ? 'Cao' : 
                             f.confidence_level === 'medium' ? 'TB' : 'Thấp'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confidence Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Giải thích độ tin cậy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <Badge className={confidenceColors.high}>Cao</Badge>
                <div className="text-sm">
                  <p className="font-medium">1-3 tháng tới</p>
                  <p className="text-muted-foreground">
                    Dựa trên đơn hàng/hợp đồng đã ký, độ chính xác cao
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className={confidenceColors.medium}>Trung bình</Badge>
                <div className="text-sm">
                  <p className="font-medium">4-9 tháng tới</p>
                  <p className="text-muted-foreground">
                    Dựa trên xu hướng lịch sử và pipeline kinh doanh
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className={confidenceColors.low}>Thấp</Badge>
                <div className="text-sm">
                  <p className="font-medium">10-18 tháng tới</p>
                  <p className="text-muted-foreground">
                    Ước tính dựa trên giả định tăng trưởng, cần cập nhật thường xuyên
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
