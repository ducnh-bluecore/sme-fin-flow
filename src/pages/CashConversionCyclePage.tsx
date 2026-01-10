import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Package,
  CreditCard,
  Wallet,
  ArrowRight,
  Target,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ResponsiveContainer, 
  ComposedChart,
  Bar,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import { formatVND, formatVNDCompact } from '@/lib/formatters';
import { useCashConversionCycle } from '@/hooks/useCashConversionCycle';
import { PageHeader } from '@/components/shared/PageHeader';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { DateRangeIndicator } from '@/components/shared/DateRangeIndicator';

export default function CashConversionCyclePage() {
  const { data, isLoading, error } = useCashConversionCycle();
  const [showFormulas, setShowFormulas] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Không thể tải dữ liệu Cash Conversion Cycle
      </div>
    );
  }

  const cccStatus = data.ccc <= data.industryBenchmark.ccc ? 'good' : data.ccc <= data.industryBenchmark.ccc * 1.5 ? 'warning' : 'danger';
  const cccImprovement = data.ccc - data.industryBenchmark.ccc;

  return (
    <>
      <Helmet>
        <title>Cash Conversion Cycle | CFO Dashboard</title>
      </Helmet>

      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <PageHeader
            title="Cash Conversion Cycle (CCC)"
            subtitle="Phân tích vòng quay vốn lưu động: DSO + DIO - DPO"
          />
          <div className="flex flex-col items-end gap-2">
            <QuickDateSelector />
            <DateRangeIndicator variant="badge" />
          </div>
        </div>

        {/* Formula Reference */}
        <Collapsible open={showFormulas} onOpenChange={setShowFormulas}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Info className="h-4 w-4" />
              Công thức tính
              <ChevronDown className={`h-4 w-4 transition-transform ${showFormulas ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium text-blue-500">DSO (Days Sales Outstanding)</p>
                  <p className="text-muted-foreground font-mono">= Phải thu / (Doanh thu / Số ngày)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatVNDCompact(data.avgAR)} / ({formatVNDCompact(data.rawData.totalSales)} / {data.rawData.daysInPeriod})
                  </p>
                </div>
                <div>
                  <p className="font-medium text-orange-500">DIO (Days Inventory Outstanding)</p>
                  <p className="text-muted-foreground font-mono">= Tồn kho / (COGS / Số ngày)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatVNDCompact(data.avgInventory)} / ({formatVNDCompact(data.rawData.totalCogs)} / {data.rawData.daysInPeriod})
                  </p>
                </div>
                <div>
                  <p className="font-medium text-purple-500">DPO (Days Payable Outstanding)</p>
                  <p className="text-muted-foreground font-mono">= Phải trả / (Mua hàng / Số ngày)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatVNDCompact(data.avgAP)} / ({formatVNDCompact(data.rawData.totalPurchases)} / {data.rawData.daysInPeriod})
                  </p>
                </div>
                <div>
                  <p className="font-medium text-primary">CCC (Cash Conversion Cycle)</p>
                  <p className="text-muted-foreground font-mono">= DSO + DIO - DPO</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    = {data.dso} + {data.dio} - {data.dpo} = {data.ccc} ngày
                  </p>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* CCC Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`border-2 ${cccStatus === 'good' ? 'border-green-500/30 bg-green-500/5' : cccStatus === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* CCC Formula Visual */}
                <div className="flex items-center gap-4 flex-wrap justify-center">
                  <div className="text-center">
                    <div className="flex items-center gap-2 justify-center mb-2">
                      <CreditCard className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium">DSO</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-500">{data.dso}</p>
                    <p className="text-xs text-muted-foreground">ngày</p>
                  </div>
                  
                  <span className="text-2xl text-muted-foreground">+</span>
                  
                  <div className="text-center">
                    <div className="flex items-center gap-2 justify-center mb-2">
                      <Package className="h-5 w-5 text-orange-500" />
                      <span className="text-sm font-medium">DIO</span>
                    </div>
                    <p className="text-3xl font-bold text-orange-500">{data.dio}</p>
                    <p className="text-xs text-muted-foreground">ngày</p>
                  </div>
                  
                  <span className="text-2xl text-muted-foreground">−</span>
                  
                  <div className="text-center">
                    <div className="flex items-center gap-2 justify-center mb-2">
                      <Wallet className="h-5 w-5 text-purple-500" />
                      <span className="text-sm font-medium">DPO</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-500">{data.dpo}</p>
                    <p className="text-xs text-muted-foreground">ngày</p>
                  </div>
                  
                  <span className="text-2xl text-muted-foreground">=</span>
                  
                  <div className="text-center bg-background/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 justify-center mb-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">CCC</span>
                    </div>
                    <p className={`text-4xl font-bold ${cccStatus === 'good' ? 'text-green-500' : cccStatus === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}>
                      {data.ccc}
                    </p>
                    <p className="text-xs text-muted-foreground">ngày</p>
                  </div>
                </div>

                {/* Benchmark Comparison */}
                <div className="text-center md:text-right">
                  <p className="text-sm text-muted-foreground mb-1">So với ngành</p>
                  <div className="flex items-center gap-2 justify-center md:justify-end">
                    {cccImprovement <= 0 ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-green-500 font-medium">
                          Tốt hơn {Math.abs(cccImprovement)} ngày
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <span className="text-yellow-500 font-medium">
                          Chậm hơn {cccImprovement} ngày
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Benchmark ngành: {data.industryBenchmark.ccc} ngày
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Component Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* DSO Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-sm">Days Sales Outstanding (DSO)</CardTitle>
                </div>
                <CardDescription>Thời gian thu hồi công nợ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-bold">{data.dso}</span>
                  <span className="text-muted-foreground">ngày</span>
                  {data.dso <= data.industryBenchmark.dso ? (
                    <Badge className="bg-green-500/10 text-green-500">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Tốt
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/10 text-yellow-500">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Cao
                    </Badge>
                  )}
                </div>
                <Progress 
                  value={Math.min((data.industryBenchmark.dso / data.dso) * 100, 100)} 
                  className="h-2 mb-2" 
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Phải thu: {formatVNDCompact(data.avgAR)}</span>
                  <span>Benchmark: {data.industryBenchmark.dso}d</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* DIO Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-orange-500" />
                  <CardTitle className="text-sm">Days Inventory Outstanding (DIO)</CardTitle>
                </div>
                <CardDescription>Thời gian tồn kho</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-bold">{data.dio}</span>
                  <span className="text-muted-foreground">ngày</span>
                  {data.dio <= data.industryBenchmark.dio ? (
                    <Badge className="bg-green-500/10 text-green-500">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Tốt
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/10 text-yellow-500">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Cao
                    </Badge>
                  )}
                </div>
                <Progress 
                  value={Math.min((data.industryBenchmark.dio / data.dio) * 100, 100)} 
                  className="h-2 mb-2" 
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Tồn kho: {formatVNDCompact(data.avgInventory)}</span>
                  <span>Benchmark: {data.industryBenchmark.dio}d</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* DPO Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-purple-500" />
                  <CardTitle className="text-sm">Days Payable Outstanding (DPO)</CardTitle>
                </div>
                <CardDescription>Thời gian thanh toán NCC</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-bold">{data.dpo}</span>
                  <span className="text-muted-foreground">ngày</span>
                  {data.dpo >= data.industryBenchmark.dpo ? (
                    <Badge className="bg-green-500/10 text-green-500">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Tốt
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/10 text-yellow-500">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Thấp
                    </Badge>
                  )}
                </div>
                <Progress 
                  value={Math.min((data.dpo / data.industryBenchmark.dpo) * 100, 100)} 
                  className="h-2 mb-2" 
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Phải trả: {formatVNDCompact(data.avgAP)}</span>
                  <span>Benchmark: {data.industryBenchmark.dpo}d</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Trends and Working Capital */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CCC Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Xu hướng CCC</CardTitle>
              <CardDescription>Theo dõi các thành phần qua thời gian</CardDescription>
            </CardHeader>
            <CardContent>
              {data.trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis unit=" ngày" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="dso" name="DSO" fill="hsl(210, 100%, 60%)" stackId="stack" />
                    <Bar dataKey="dio" name="DIO" fill="hsl(30, 100%, 60%)" stackId="stack" />
                    <Bar dataKey="dpo" name="DPO" fill="hsl(270, 70%, 60%)" />
                    <Line 
                      type="monotone" 
                      dataKey="ccc" 
                      name="CCC" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <ReferenceLine 
                      y={data.industryBenchmark.ccc} 
                      stroke="hsl(var(--destructive))" 
                      strokeDasharray="5 5"
                      label={{ value: 'Benchmark', position: 'right', fontSize: 10 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  Chưa có dữ liệu xu hướng
                </p>
              )}
            </CardContent>
          </Card>

          {/* Working Capital Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tác động Working Capital</CardTitle>
              <CardDescription>Vốn lưu động đang bị chiếm dụng</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-2">Vốn đang bị kẹt</p>
                <p className="text-3xl font-bold text-destructive">
                  {formatVNDCompact(data.workingCapitalTied)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  = Phải thu + Tồn kho - Phải trả
                </p>
              </div>

              {data.potentialSavings > 0 && (
                <Alert className="border-green-500/30 bg-green-500/5">
                  <Target className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-500">Cơ hội cải thiện</AlertTitle>
                  <AlertDescription className="text-sm">
                    Nếu đạt CCC = {data.industryBenchmark.ccc} ngày (benchmark ngành), 
                    bạn có thể giải phóng{' '}
                    <strong className="text-green-500">{formatVNDCompact(data.potentialSavings)}</strong>{' '}
                    vốn lưu động.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Đề xuất cải thiện:</h4>
                {data.dso > data.industryBenchmark.dso && (
                  <div className="flex items-start gap-2 p-2 rounded bg-blue-500/5">
                    <CreditCard className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-500">Giảm DSO</p>
                      <p className="text-muted-foreground">
                        Thu hồi công nợ nhanh hơn, giảm {data.dso - data.industryBenchmark.dso} ngày
                      </p>
                    </div>
                  </div>
                )}
                {data.dio > data.industryBenchmark.dio && (
                  <div className="flex items-start gap-2 p-2 rounded bg-orange-500/5">
                    <Package className="h-4 w-4 text-orange-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-orange-500">Giảm DIO</p>
                      <p className="text-muted-foreground">
                        Tối ưu tồn kho, giảm {data.dio - data.industryBenchmark.dio} ngày
                      </p>
                    </div>
                  </div>
                )}
                {data.dpo < data.industryBenchmark.dpo && (
                  <div className="flex items-start gap-2 p-2 rounded bg-purple-500/5">
                    <Wallet className="h-4 w-4 text-purple-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-purple-500">Tăng DPO</p>
                      <p className="text-muted-foreground">
                        Đàm phán điều khoản thanh toán NCC, thêm {data.industryBenchmark.dpo - data.dpo} ngày
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
