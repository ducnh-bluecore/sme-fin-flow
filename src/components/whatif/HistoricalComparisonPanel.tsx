import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, TrendingUp, TrendingDown, DollarSign, 
  BarChart3, ArrowRight, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatVNDCompact } from '@/lib/formatters';
import { HistoricalMetrics } from '@/hooks/useWhatIfRealData';
import { format, parseISO, addMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart, ComposedChart, Bar
} from 'recharts';

interface Props {
  historicalData: HistoricalMetrics[];
  currentMetrics: {
    totalRevenue: number;
    totalNetProfit: number;
    overallMargin: number;
    monthlyGrowthRate: number;
  };
  isLoading?: boolean;
}

export function HistoricalComparisonPanel({ historicalData, currentMetrics, isLoading }: Props) {
  const [forecastMonths, setForecastMonths] = useState(3);
  const [growthScenario, setGrowthScenario] = useState<'pessimistic' | 'realistic' | 'optimistic'>('realistic');
  const [customGrowthRate, setCustomGrowthRate] = useState(currentMetrics.monthlyGrowthRate || 5);

  // Calculate growth rates based on scenario
  const getGrowthRate = () => {
    switch (growthScenario) {
      case 'pessimistic': return Math.max(-10, customGrowthRate - 10);
      case 'optimistic': return customGrowthRate + 10;
      default: return customGrowthRate;
    }
  };

  // Generate forecast data
  const forecastData = useMemo(() => {
    if (historicalData.length === 0) return [];

    const lastMonth = historicalData[historicalData.length - 1];
    const growthRate = getGrowthRate();
    const monthlyMultiplier = 1 + growthRate / 100;

    const forecast: (HistoricalMetrics & { isForecast: boolean })[] = [];
    let currentRevenue = lastMonth.revenue;
    let currentProfit = lastMonth.netProfit;
    
    // Add historical data
    historicalData.forEach(m => {
      forecast.push({ ...m, isForecast: false });
    });

    // Add forecast data
    for (let i = 1; i <= forecastMonths; i++) {
      const nextMonth = format(addMonths(parseISO(lastMonth.month + '-01'), i), 'yyyy-MM');
      currentRevenue *= monthlyMultiplier;
      currentProfit *= monthlyMultiplier;
      
      forecast.push({
        month: nextMonth,
        revenue: currentRevenue,
        cogs: currentRevenue * 0.65, // Assume 65% COGS
        fees: currentRevenue * 0.1, // Assume 10% fees
        netProfit: currentProfit,
        orders: Math.round(lastMonth.orders * Math.pow(monthlyMultiplier, i)),
        avgOrderValue: lastMonth.avgOrderValue,
        margin: currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0,
        isForecast: true,
      });
    }

    return forecast;
  }, [historicalData, forecastMonths, growthScenario, customGrowthRate]);

  // Calculate summary
  const summary = useMemo(() => {
    const historical = forecastData.filter(d => !d.isForecast);
    const forecast = forecastData.filter(d => d.isForecast);

    const historicalRevenue = historical.reduce((sum, m) => sum + m.revenue, 0);
    const forecastRevenue = forecast.reduce((sum, m) => sum + m.revenue, 0);
    const historicalProfit = historical.reduce((sum, m) => sum + m.netProfit, 0);
    const forecastProfit = forecast.reduce((sum, m) => sum + m.netProfit, 0);

    // Calculate YoY if we have enough data
    const currentYear = historical.slice(-12);
    const prevYear = historical.slice(0, 12);
    
    const currentYearRevenue = currentYear.reduce((sum, m) => sum + m.revenue, 0);
    const prevYearRevenue = prevYear.reduce((sum, m) => sum + m.revenue, 0);
    const yoyGrowth = prevYearRevenue > 0 ? ((currentYearRevenue - prevYearRevenue) / prevYearRevenue) * 100 : 0;

    return {
      historicalRevenue,
      forecastRevenue,
      historicalProfit,
      forecastProfit,
      totalProjectedRevenue: historicalRevenue + forecastRevenue,
      totalProjectedProfit: historicalProfit + forecastProfit,
      yoyGrowth,
      avgMonthlyRevenue: historical.length > 0 ? historicalRevenue / historical.length : 0,
      avgMonthlyProfit: historical.length > 0 ? historicalProfit / historical.length : 0,
    };
  }, [forecastData]);

  // Chart data for display
  const chartData = useMemo(() => {
    return forecastData.map(d => ({
      month: format(parseISO(d.month + '-01'), 'MMM yy', { locale: vi }),
      revenue: d.revenue,
      profit: d.netProfit,
      margin: d.margin,
      isForecast: d.isForecast,
    }));
  }, [forecastData]);

  // Month-over-month growth chart
  const momGrowthData = useMemo(() => {
    if (historicalData.length < 2) return [];
    
    return historicalData.slice(1).map((m, i) => {
      const prev = historicalData[i];
      const growth = prev.revenue > 0 ? ((m.revenue - prev.revenue) / prev.revenue) * 100 : 0;
      return {
        month: format(parseISO(m.month + '-01'), 'MMM yy', { locale: vi }),
        growth,
        revenue: m.revenue,
      };
    });
  }, [historicalData]);

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-muted/30 rounded-lg" />;
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Doanh thu lịch sử</p>
                <p className="text-2xl font-bold">{formatVNDCompact(summary.historicalRevenue)}</p>
                <p className="text-xs text-muted-foreground">
                  {historicalData.length} tháng
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 to-transparent border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Dự báo {forecastMonths} tháng</p>
                <p className="text-2xl font-bold">{formatVNDCompact(summary.forecastRevenue)}</p>
                <Badge variant="secondary" className="mt-1">
                  {growthScenario === 'pessimistic' ? 'Bi quan' : 
                   growthScenario === 'optimistic' ? 'Lạc quan' : 'Thực tế'}
                </Badge>
              </div>
              <Sparkles className="w-8 h-8 text-violet-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Tăng trưởng YoY</p>
                <p className="text-2xl font-bold">{summary.yoyGrowth.toFixed(1)}%</p>
                <div className={`flex items-center gap-1 text-xs ${summary.yoyGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {summary.yoyGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  so với năm trước
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">TB mỗi tháng</p>
                <p className="text-2xl font-bold">{formatVNDCompact(summary.avgMonthlyRevenue)}</p>
                <p className="text-xs text-muted-foreground">
                  LN: {formatVNDCompact(summary.avgMonthlyProfit)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Forecast Parameters */}
        <Card className="lg:col-span-1 border-0 shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Tham số dự báo
            </CardTitle>
            <CardDescription className="text-xs">
              Điều chỉnh kịch bản dự báo
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            {/* Forecast Period */}
            <div className="space-y-2">
              <Label className="text-sm">Số tháng dự báo</Label>
              <Select
                value={forecastMonths.toString()}
                onValueChange={(v) => setForecastMonths(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 tháng</SelectItem>
                  <SelectItem value="6">6 tháng</SelectItem>
                  <SelectItem value="12">12 tháng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Growth Scenario */}
            <div className="space-y-2">
              <Label className="text-sm">Kịch bản tăng trưởng</Label>
              <div className="flex gap-2">
                {(['pessimistic', 'realistic', 'optimistic'] as const).map((scenario) => (
                  <Button
                    key={scenario}
                    variant={growthScenario === scenario ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGrowthScenario(scenario)}
                    className="flex-1"
                  >
                    {scenario === 'pessimistic' ? 'Bi quan' : 
                     scenario === 'optimistic' ? 'Lạc quan' : 'Thực tế'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Growth Rate */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Tỷ lệ tăng trưởng cơ sở</Label>
                <span className="text-sm font-medium">{customGrowthRate}%/tháng</span>
              </div>
              <Slider
                value={[customGrowthRate]}
                onValueChange={([v]) => setCustomGrowthRate(v)}
                min={-20}
                max={50}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Áp dụng: {getGrowthRate().toFixed(1)}%/tháng ({growthScenario})
              </p>
            </div>

            {/* Growth calculation explanation */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-2 text-xs">
              <p className="font-medium">Cách tính:</p>
              <div className="space-y-1 text-muted-foreground">
                <p>• Bi quan: Cơ sở - 10%</p>
                <p>• Thực tế: Giữ nguyên cơ sở</p>
                <p>• Lạc quan: Cơ sở + 10%</p>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => {
                setForecastMonths(3);
                setGrowthScenario('realistic');
                setCustomGrowthRate(currentMetrics.monthlyGrowthRate || 5);
              }}
            >
              Reset
            </Button>
          </CardContent>
        </Card>

        {/* Right: Charts */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="trend">
            <TabsList>
              <TabsTrigger value="trend">Xu hướng</TabsTrigger>
              <TabsTrigger value="growth">Tăng trưởng MoM</TabsTrigger>
              <TabsTrigger value="profit">Lợi nhuận</TabsTrigger>
            </TabsList>

            <TabsContent value="trend">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Doanh thu lịch sử & Dự báo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis tickFormatter={(v) => formatVNDCompact(v)} className="text-xs" />
                        <Tooltip 
                          formatter={(v: number) => formatVNDCompact(v)}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          labelFormatter={(label, payload) => {
                            const isForecast = payload?.[0]?.payload?.isForecast;
                            return `${label} ${isForecast ? '(Dự báo)' : ''}`;
                          }}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          name="Doanh thu"
                          fill="hsl(var(--primary))" 
                          fillOpacity={0.1}
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="profit" 
                          name="Lợi nhuận"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-0.5 bg-primary" />
                      <span>Thực tế</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-0.5 bg-primary border-dashed border-t-2 border-primary" style={{ borderStyle: 'dashed' }} />
                      <span>Dự báo</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="growth">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tăng trưởng tháng-qua-tháng</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={momGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis 
                          yAxisId="left"
                          tickFormatter={(v) => `${v}%`} 
                          className="text-xs" 
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          tickFormatter={(v) => formatVNDCompact(v)} 
                          className="text-xs" 
                        />
                        <Tooltip 
                          formatter={(v: number, name: string) => 
                            name === 'Tăng trưởng' ? `${v.toFixed(1)}%` : formatVNDCompact(v)
                          }
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar 
                          yAxisId="left"
                          dataKey="growth" 
                          name="Tăng trưởng"
                          radius={[4, 4, 0, 0]}
                          fill="#22c55e"
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="revenue" 
                          name="Doanh thu"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profit">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Biên lợi nhuận theo thời gian</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} className="text-xs" />
                        <Tooltip 
                          formatter={(v: number) => `${v.toFixed(1)}%`}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="margin" 
                          name="Biên lợi nhuận"
                          fill="#22c55e"
                          fillOpacity={0.2}
                          stroke="#22c55e"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Summary Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tổng hợp dự báo</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-3 font-medium text-xs">Chỉ số</th>
                    <th className="text-right p-3 font-medium text-xs">Lịch sử</th>
                    <th className="text-center p-3 font-medium text-xs w-8"><ArrowRight className="w-3 h-3 mx-auto" /></th>
                    <th className="text-right p-3 font-medium text-xs">Dự báo +{forecastMonths}T</th>
                    <th className="text-right p-3 font-medium text-xs">Tổng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-medium">Doanh thu</td>
                    <td className="text-right p-3">{formatVNDCompact(summary.historicalRevenue)}</td>
                    <td></td>
                    <td className="text-right p-3 text-primary">{formatVNDCompact(summary.forecastRevenue)}</td>
                    <td className="text-right p-3 font-bold">{formatVNDCompact(summary.totalProjectedRevenue)}</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-medium">Lợi nhuận ròng</td>
                    <td className="text-right p-3">{formatVNDCompact(summary.historicalProfit)}</td>
                    <td></td>
                    <td className="text-right p-3 text-green-500">{formatVNDCompact(summary.forecastProfit)}</td>
                    <td className="text-right p-3 font-bold">{formatVNDCompact(summary.totalProjectedProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
