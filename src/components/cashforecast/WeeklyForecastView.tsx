import { motion } from 'framer-motion';
import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ResponsiveContainer, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ComposedChart,
  Line,
  ReferenceLine,
  Bar
} from 'recharts';
import { formatVND, formatVNDCompact } from '@/lib/formatters';
import { useWeeklyCashForecast, WeeklyForecastMethod } from '@/hooks/useWeeklyCashForecast';
import { ForecastMethodToggle, ForecastMethod } from './ForecastMethodToggle';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

function WeeklyFormulaPanel({ method }: { method: WeeklyForecastMethod }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Công thức tính
        </CardTitle>
        <CardDescription>
          {method === 'rule-based' ? 'Phương pháp Theo quy tắc' : 'Phương pháp Đơn giản (15%/tuần)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="collection">
            <AccordionTrigger className="text-sm">Thu hồi công nợ</AccordionTrigger>
            <AccordionContent className="space-y-3">
              {method === 'rule-based' ? (
                <div className="bg-emerald-500/10 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-emerald-700 mb-2">Theo quy tắc</p>
                  <div className="font-mono bg-background/50 p-2 rounded space-y-1">
                    <p>Collection = AR_Remaining × 15% × P(week)</p>
                    <p className="text-muted-foreground">P(week): Tuần 1-4: 90% | 5-8: 75% | 9-13: 60%</p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-500/10 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-blue-700 mb-2">Đơn giản</p>
                  <div className="font-mono bg-background/50 p-2 rounded">
                    <p>Collection = AR_Remaining × 15%</p>
                    <p className="text-muted-foreground">Tỷ lệ cố định 15%/tuần</p>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sales">
            <AccordionTrigger className="text-sm">Doanh số dự kiến</AccordionTrigger>
            <AccordionContent>
              {method === 'rule-based' ? (
                <div className="bg-emerald-500/10 rounded-lg p-3 text-xs">
                  <div className="font-mono bg-background/50 p-2 rounded">
                    <p>Sales[week] = AvgWeeklySales × (1 + 2%)^(week-1)</p>
                  </div>
                  <p className="mt-2 text-muted-foreground">Tăng trưởng 2%/tuần</p>
                </div>
              ) : (
                <div className="bg-blue-500/10 rounded-lg p-3 text-xs">
                  <div className="font-mono bg-background/50 p-2 rounded">
                    <p>Sales[week] = AvgWeeklySales</p>
                  </div>
                  <p className="mt-2 text-muted-foreground">Không tăng trưởng</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="confidence">
            <AccordionTrigger className="text-sm">Độ tin cậy</AccordionTrigger>
            <AccordionContent>
              {method === 'rule-based' ? (
                <div className="bg-muted/50 rounded-lg p-3 text-xs">
                  <p>Tuần 1-4: <Badge variant="outline" className="bg-green-500/10 text-green-500">Cao</Badge></p>
                  <p>Tuần 5-8: <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Trung bình</Badge></p>
                  <p>Tuần 9-13: <Badge variant="outline" className="bg-red-500/10 text-red-500">Thấp</Badge></p>
                </div>
              ) : (
                <div className="bg-amber-500/10 rounded-lg p-3 text-xs">
                  <p className="text-muted-foreground">
                    Phương pháp đơn giản: Tất cả tuần đều có độ tin cậy <Badge variant="outline" className="bg-green-500/10 text-green-500">Cao</Badge> vì công thức cố định.
                  </p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

export function WeeklyForecastView() {
  const [forecastMethod, setForecastMethod] = useState<ForecastMethod>('rule-based');
  const { data, isLoading, error } = useWeeklyCashForecast(forecastMethod);
  const [showDetails, setShowDetails] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Không thể tải dữ liệu Cash Forecast
      </div>
    );
  }

  const cashChange = data.endingCash - data.currentCash;
  const cashChangePercent = data.currentCash > 0 ? (cashChange / data.currentCash) * 100 : 0;
  const isLowCash = data.lowestPoint < data.currentCash * 0.2;

  return (
    <div className="space-y-6">
      {/* Method Toggle */}
      <div className="flex justify-start">
        <ForecastMethodToggle value={forecastMethod} onChange={setForecastMethod} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Tiền mặt hiện tại</span>
              </div>
              <p className="text-2xl font-bold">{formatVNDCompact(data.currentCash)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownLeft className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Tổng thu vào</span>
              </div>
              <p className="text-2xl font-bold text-green-500">{formatVNDCompact(data.totalInflows)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Tổng chi ra</span>
              </div>
              <p className="text-2xl font-bold text-red-500">{formatVNDCompact(data.totalOutflows)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className={`bg-gradient-to-br ${cashChange >= 0 ? 'from-green-500/10 to-green-500/5 border-green-500/20' : 'from-red-500/10 to-red-500/5 border-red-500/20'}`}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                {cashChange >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                <span className="text-xs text-muted-foreground">Cuối kỳ (tuần 13)</span>
              </div>
              <p className={`text-2xl font-bold ${cashChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatVNDCompact(data.endingCash)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {cashChange >= 0 ? '+' : ''}{cashChangePercent.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className={isLowCash ? 'bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                {isLowCash ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                <span className="text-xs text-muted-foreground">Điểm thấp nhất</span>
              </div>
              <p className={`text-2xl font-bold ${isLowCash ? 'text-red-500' : ''}`}>
                {formatVNDCompact(data.lowestPoint)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Tuần {data.lowestPointWeek}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Low Cash Warning */}
      {isLowCash && (
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cảnh báo thanh khoản</AlertTitle>
          <AlertDescription>
            Tiền mặt dự kiến xuống mức thấp {formatVNDCompact(data.lowestPoint)} vào tuần {data.lowestPointWeek}. 
            Cân nhắc các biện pháp tăng thu hoặc giảm chi.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart">Biểu đồ</TabsTrigger>
          <TabsTrigger value="table">Chi tiết tuần</TabsTrigger>
          <TabsTrigger value="scenarios">Kịch bản</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Cash Flow Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Dự báo dòng tiền 13 tuần</CardTitle>
                <CardDescription>Theo dõi số dư tiền mặt qua các tuần</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={data.weeks}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
                    <Tooltip formatter={(value: number, name: string) => [formatVND(value), name]} labelFormatter={(label) => `${label}`} />
                    <Legend />
                    <Bar dataKey="totalInflows" name="Thu vào" fill="hsl(142, 76%, 36%)" />
                    <Bar dataKey="totalOutflows" name="Chi ra" fill="hsl(0, 84%, 60%)" />
                    <Line type="monotone" dataKey="closingBalance" name="Số dư cuối" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                    <ReferenceLine y={data.currentCash * 0.2} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: 'Mức tối thiểu', position: 'right', fontSize: 10 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Assumptions & Formula */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Giả định dự báo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">Tỷ lệ thu hồi công nợ</p>
                    <p className="text-2xl font-bold text-primary">{data.assumptions.collectionRate}%</p>
                    <p className="text-xs text-muted-foreground">mỗi tuần</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">Tăng trưởng doanh số</p>
                    <p className="text-2xl font-bold text-green-500">+{data.assumptions.salesGrowthRate}%</p>
                    <p className="text-xs text-muted-foreground">mỗi tuần</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">Doanh số TB/tuần</p>
                    <p className="text-xl font-bold">{formatVNDCompact(data.assumptions.avgWeeklySales)}</p>
                  </div>
                </CardContent>
              </Card>
              
              <WeeklyFormulaPanel method={forecastMethod} />
            </div>
          </div>

          {/* Inflows vs Outflows */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thu vs Chi theo tuần</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.weeks}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
                  <Tooltip formatter={(value: number) => formatVND(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="totalInflows" name="Thu vào" fill="hsl(142, 76%, 36% / 0.3)" stroke="hsl(142, 76%, 36%)" />
                  <Area type="monotone" dataKey="totalOutflows" name="Chi ra" fill="hsl(0, 84%, 60% / 0.3)" stroke="hsl(0, 84%, 60%)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Chi tiết dự báo theo tuần</CardTitle>
                <CardDescription>Breakdown thu chi từng tuần</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? 'Ẩn bớt' : 'Chi tiết'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-2 px-2">Tuần</th>
                      <th className="text-center py-2 px-2">Ngày</th>
                      <th className="text-right py-2 px-2">Số dư đầu</th>
                      <th className="text-right py-2 px-2 text-green-600">Thu vào</th>
                      <th className="text-right py-2 px-2 text-red-600">Chi ra</th>
                      <th className="text-right py-2 px-2">Net</th>
                      <th className="text-right py-2 px-2">Số dư cuối</th>
                      <th className="text-center py-2 px-2">Độ tin cậy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.weeks.map((week) => (
                      <>
                        <tr key={week.weekNumber} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-2 font-medium">{week.weekLabel}</td>
                          <td className="py-2 px-2 text-center text-muted-foreground text-xs">
                            {week.startDate} - {week.endDate}
                          </td>
                          <td className="py-2 px-2 text-right">{formatVNDCompact(week.openingBalance)}</td>
                          <td className="py-2 px-2 text-right text-green-600">+{formatVNDCompact(week.totalInflows)}</td>
                          <td className="py-2 px-2 text-right text-red-600">-{formatVNDCompact(week.totalOutflows)}</td>
                          <td className={`py-2 px-2 text-right font-medium ${week.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {week.netCashFlow >= 0 ? '+' : ''}{formatVNDCompact(week.netCashFlow)}
                          </td>
                          <td className="py-2 px-2 text-right font-bold">{formatVNDCompact(week.closingBalance)}</td>
                          <td className="py-2 px-2 text-center">
                            <Badge 
                              variant="outline"
                              className={
                                week.confidence === 'high' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                                week.confidence === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' :
                                'bg-red-500/10 text-red-500 border-red-500/30'
                              }
                            >
                              {week.confidence === 'high' ? 'Cao' : week.confidence === 'medium' ? 'TB' : 'Thấp'}
                            </Badge>
                          </td>
                        </tr>
                        {showDetails && (
                          <tr className="bg-muted/20 text-xs">
                            <td colSpan={8} className="py-2 px-4">
                              <div className="flex gap-6">
                                <div>
                                  <span className="text-green-600 font-medium">Thu: </span>
                                  <span>Thu hồi CN: {formatVNDCompact(week.expectedCollections)}</span>
                                  <span className="mx-2">|</span>
                                  <span>Bán hàng: {formatVNDCompact(week.expectedSales)}</span>
                                </div>
                                <div>
                                  <span className="text-red-600 font-medium">Chi: </span>
                                  {week.payroll > 0 && <span>Lương: {formatVNDCompact(week.payroll)} | </span>}
                                  {week.rent > 0 && <span>Thuê: {formatVNDCompact(week.rent)} | </span>}
                                  <span>NCC: {formatVNDCompact(week.suppliers)} | </span>
                                  <span>Marketing: {formatVNDCompact(week.marketing)}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Base Scenario */}
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  Kịch bản cơ sở
                </CardTitle>
                <CardDescription>Dựa trên dữ liệu lịch sử</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Số dư cuối kỳ</p>
                  <p className="text-2xl font-bold">{formatVNDCompact(data.scenarios.base.endingCash)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số dư thấp nhất</p>
                  <p className="text-xl font-medium">{formatVNDCompact(data.scenarios.base.minCash)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Optimistic Scenario */}
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  Kịch bản lạc quan
                </CardTitle>
                <CardDescription>Thu +20%, Chi -10%</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Số dư cuối kỳ</p>
                  <p className="text-2xl font-bold text-green-500">{formatVNDCompact(data.scenarios.optimistic.endingCash)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số dư thấp nhất</p>
                  <p className="text-xl font-medium">{formatVNDCompact(data.scenarios.optimistic.minCash)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Pessimistic Scenario */}
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  Kịch bản bi quan
                </CardTitle>
                <CardDescription>Thu -20%, Chi +10%</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Số dư cuối kỳ</p>
                  <p className="text-2xl font-bold text-red-500">{formatVNDCompact(data.scenarios.pessimistic.endingCash)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số dư thấp nhất</p>
                  <p className="text-xl font-medium">{formatVNDCompact(data.scenarios.pessimistic.minCash)}</p>
                  {data.scenarios.pessimistic.minCash < 0 && (
                    <Badge variant="destructive" className="mt-1">Thiếu hụt tiền mặt!</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert className="border-blue-500/30 bg-blue-500/5">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-500">Lưu ý về kịch bản</AlertTitle>
            <AlertDescription className="text-sm">
              Các kịch bản được tính toán dựa trên điều chỉnh tỷ lệ thu/chi so với kịch bản cơ sở. 
              Kịch bản bi quan giúp bạn chuẩn bị cho trường hợp xấu nhất và có kế hoạch dự phòng.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
