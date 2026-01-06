import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Zap,
  Info,
  CheckCircle2,
  XCircle,
  Database,
  FileText,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ComposedChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useForecastInputs, generateForecast, ForecastInputs, ForecastMethod } from '@/hooks/useForecastInputs';
import { useCashRunway } from '@/hooks/useCashRunway';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ForecastMethodToggle } from './ForecastMethodToggle';

const formatVND = (value: number) => {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  return value.toLocaleString();
};

const CustomTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium" style={{ color: entry.color }}>
            {formatVND(entry.value)} ₫
          </span>
        </div>
      ))}
    </div>
  );
};

function ForecastInsight({ 
  type, 
  title, 
  description, 
  value 
}: { 
  type: 'warning' | 'opportunity' | 'info';
  title: string;
  description: string;
  value?: string;
}) {
  const config = {
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    opportunity: { icon: Lightbulb, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    info: { icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  };
  
  const { icon: Icon, color, bg } = config[type];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn('flex gap-3 p-3 rounded-lg', bg)}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', color)} />
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {value && (
        <span className={cn('text-sm font-bold', color)}>{value}</span>
      )}
    </motion.div>
  );
}

function DataStatusPanel({ inputs }: { inputs: ForecastInputs }) {
  const { dataStatus } = inputs;
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Card className={cn(
      'border-2',
      dataStatus.dataQualityScore >= 70 ? 'border-emerald-500/30' : 
      dataStatus.dataQualityScore >= 40 ? 'border-amber-500/30' : 'border-destructive/30'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            Trạng thái dữ liệu
          </CardTitle>
          <Badge variant={
            dataStatus.dataQualityScore >= 70 ? 'default' : 
            dataStatus.dataQualityScore >= 40 ? 'secondary' : 'destructive'
          }>
            {dataStatus.dataQualityScore}% độ tin cậy
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={dataStatus.dataQualityScore} className="h-2" />
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            {dataStatus.hasBankData ? 
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : 
              <XCircle className="w-3.5 h-3.5 text-destructive" />
            }
            <span>Số dư ngân hàng</span>
          </div>
          <div className="flex items-center gap-1.5">
            {dataStatus.hasInvoiceData ? 
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : 
              <XCircle className="w-3.5 h-3.5 text-destructive" />
            }
            <span>Hóa đơn AR</span>
          </div>
          <div className="flex items-center gap-1.5">
            {dataStatus.hasBillData ? 
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : 
              <XCircle className="w-3.5 h-3.5 text-destructive" />
            }
            <span>Hóa đơn AP</span>
          </div>
          <div className="flex items-center gap-1.5">
            {dataStatus.hasExpenseData ? 
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : 
              <XCircle className="w-3.5 h-3.5 text-destructive" />
            }
            <span>Chi phí định kỳ</span>
          </div>
          <div className="flex items-center gap-1.5">
            {dataStatus.hasOrderData ? 
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : 
              <XCircle className="w-3.5 h-3.5 text-destructive" />
            }
            <span>Đơn hàng eCommerce</span>
          </div>
          <div className="flex items-center gap-1.5">
            {dataStatus.hasHistoricalData ? 
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : 
              <XCircle className="w-3.5 h-3.5 text-destructive" />
            }
            <span>Lịch sử ({dataStatus.historicalDaysAvailable} ngày)</span>
          </div>
        </div>

        {dataStatus.missingData.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-xs">
                <AlertTriangle className="w-3 h-3 mr-1.5 text-amber-500" />
                {dataStatus.missingData.length} nguồn dữ liệu thiếu
                <Info className="w-3 h-3 ml-auto" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {dataStatus.missingData.map((item, idx) => (
                <div key={idx} className="text-xs text-muted-foreground pl-4 py-1 border-l-2 border-amber-500/50">
                  {item}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

function InputSummaryPanel({ inputs }: { inputs: ForecastInputs }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Dữ liệu đầu vào
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Số dư ngân hàng</p>
            <p className="font-semibold">{formatVND(inputs.bankBalance)} ₫</p>
            <p className="text-xs text-muted-foreground">{inputs.bankAccountCount} tài khoản</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Phải thu (AR)</p>
            <p className="font-semibold text-emerald-600">{formatVND(inputs.arTotal)} ₫</p>
            <p className="text-xs text-muted-foreground">{inputs.invoiceCount} hóa đơn</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Phải trả (AP)</p>
            <p className="font-semibold text-destructive">{formatVND(inputs.apTotal)} ₫</p>
            <p className="text-xs text-muted-foreground">{inputs.billCount} hóa đơn</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Chi phí định kỳ/tháng</p>
            <p className="font-semibold">{formatVND(inputs.recurringExpensesMonthly)} ₫</p>
            <p className="text-xs text-muted-foreground">{inputs.expenseCount} khoản</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Chờ thanh toán (eCommerce)</p>
            <p className="font-semibold text-blue-600">{formatVND(inputs.pendingSettlements)} ₫</p>
            <p className="text-xs text-muted-foreground">{inputs.orderCount} đơn giao</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">TB Thu/Chi ngày (lịch sử)</p>
            <p className="font-semibold">
              <span className="text-emerald-600">+{formatVND(inputs.avgDailyInflow)}</span>
              {' / '}
              <span className="text-destructive">-{formatVND(inputs.avgDailyOutflow)}</span>
            </p>
            <p className="text-xs text-muted-foreground">{inputs.historicalDays} ngày dữ liệu</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FormulaPanel({ method }: { method: ForecastMethod }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Công thức tính
        </CardTitle>
        <CardDescription>
          {method === 'ai' ? 'Phương pháp AI/Xác suất' : 'Phương pháp Đơn giản (15%/tuần)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="main">
            <AccordionTrigger className="text-sm">Công thức chính</AccordionTrigger>
            <AccordionContent>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-2">
                <p><strong>Closing[t]</strong> = Opening[t] + Σ(Inflows[t]) - Σ(Outflows[t])</p>
                <p><strong>Opening[t+1]</strong> = Closing[t]</p>
                <p className="text-muted-foreground mt-2">Trong đó t là ngày dự báo</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="inflows">
            <AccordionTrigger className="text-sm">Dự báo dòng tiền vào</AccordionTrigger>
            <AccordionContent className="space-y-3">
              {method === 'ai' ? (
                <div className="bg-emerald-500/10 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-emerald-700 mb-2">Thu hồi công nợ (AI)</p>
                  <div className="font-mono bg-background/50 p-2 rounded">
                    AR_Collection = Σ(invoices.balance) × P(collection)
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    P(collection): Chưa hạn: 85% | Quá hạn 1-30d: 70% | 31-60d: 50% | 61-90d: 30% | &gt;90d: 10%
                  </p>
                </div>
              ) : (
                <div className="bg-blue-500/10 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-blue-700 mb-2">Thu hồi công nợ (Đơn giản)</p>
                  <div className="font-mono bg-background/50 p-2 rounded">
                    AR_Collection = AR_Remaining × 15% / 7 ngày
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    Tỷ lệ cố định: 15% AR/tuần ≈ 2.14%/ngày
                  </p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {method === 'ai' && (
            <AccordionItem value="confidence">
              <AccordionTrigger className="text-sm">Khoảng tin cậy</AccordionTrigger>
              <AccordionContent>
                <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-2">
                  <p><strong>uncertainty</strong> = min(0.6, days_ahead × 0.012)</p>
                  <p><strong>upperBound</strong> = balance × (1 + uncertainty)</p>
                  <p><strong>lowerBound</strong> = balance × (1 - uncertainty)</p>
                  <p className="text-muted-foreground mt-2">
                    Độ không chắc chắn tăng 1.2%/ngày, tối đa 60%
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {method === 'simple' && (
            <AccordionItem value="simple-note">
              <AccordionTrigger className="text-sm">Ghi chú</AccordionTrigger>
              <AccordionContent>
                <div className="bg-amber-500/10 rounded-lg p-3 text-xs">
                  <p className="text-muted-foreground">
                    Phương pháp đơn giản không có khoảng tin cậy (confidence bands). 
                    Kết quả dự báo là giá trị cố định, dễ kiểm tra và dễ hiểu.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}

export function DailyForecastView() {
  const [forecastPeriod, setForecastPeriod] = useState('30');
  const [forecastMethod, setForecastMethod] = useState<ForecastMethod>('ai');
  const { inputs, isLoading } = useForecastInputs();
  const { data: cashRunway, isLoading: isLoadingRunway } = useCashRunway();
  
  const forecastData = useMemo(() => {
    if (!inputs) return [];
    return generateForecast(inputs, 90, forecastMethod);
  }, [inputs, forecastMethod]);

  const displayData = useMemo(() => {
    const days = parseInt(forecastPeriod);
    return forecastData.slice(0, days);
  }, [forecastData, forecastPeriod]);
  
  const metrics = useMemo(() => {
    if (!displayData || displayData.length === 0) {
      return {
        currentBalance: inputs?.bankBalance || 0,
        projectedBalance: 0,
        change: 0,
        changePercent: 0,
        minBalance: 0,
        minBalanceDate: '',
        totalInflow: 0,
        totalOutflow: 0,
        avgDailyInflow: 0,
        avgDailyOutflow: 0,
        runwayDays: 0,
        riskDays: 0,
      };
    }

    const lastDay = displayData[displayData.length - 1];
    const firstDay = displayData[0];
    const minBalance = Math.min(...displayData.map(d => d.balance));
    const minBalanceData = displayData.find(d => d.balance === minBalance);
    const totalInflow = displayData.reduce((sum, d) => sum + d.inflow, 0);
    const totalOutflow = displayData.reduce((sum, d) => sum + d.outflow, 0);
    const threshold = 500000000;
    const lowBalanceDays = displayData.filter(d => d.lowerBound < threshold);
    const avgDailyOutflow = totalOutflow / displayData.length;
    
    return {
      currentBalance: firstDay.balance,
      projectedBalance: lastDay.balance,
      change: lastDay.balance - firstDay.balance,
      changePercent: firstDay.balance > 0 ? ((lastDay.balance - firstDay.balance) / firstDay.balance) * 100 : 0,
      minBalance,
      minBalanceDate: minBalanceData?.displayDate || '',
      totalInflow,
      totalOutflow,
      avgDailyInflow: totalInflow / displayData.length,
      avgDailyOutflow,
      runwayDays: avgDailyOutflow > 0 ? Math.floor(firstDay.balance / avgDailyOutflow) : 999,
      riskDays: lowBalanceDays.length,
    };
  }, [displayData, inputs]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <ForecastMethodToggle value={forecastMethod} onChange={setForecastMethod} />
        
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 ngày</SelectItem>
              <SelectItem value="60">60 ngày</SelectItem>
              <SelectItem value="90">90 ngày</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Cập nhật
          </Button>
          <Button size="sm">
            <Download className="w-4 h-4 mr-2" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* Data Status & Input Summary */}
      {inputs && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DataStatusPanel inputs={inputs} />
          <InputSummaryPanel inputs={inputs} />
          <FormulaPanel method={forecastMethod} />
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Số dư hiện tại</p>
                <p className="text-2xl font-bold">{formatVND(metrics.currentBalance)} ₫</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dự báo sau {forecastPeriod} ngày</p>
                <p className="text-2xl font-bold">{formatVND(metrics.projectedBalance)} ₫</p>
                <div className={cn(
                  'flex items-center gap-1 text-xs mt-1',
                  metrics.change >= 0 ? 'text-emerald-500' : 'text-destructive'
                )}>
                  {metrics.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {metrics.changePercent.toFixed(1)}%
                </div>
              </div>
              <div className={cn('p-2 rounded-lg', metrics.change >= 0 ? 'bg-emerald-500/10' : 'bg-destructive/10')}>
                {metrics.change >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash Runway</p>
                {isLoadingRunway ? (
                  <Skeleton className="h-8 w-20" />
                ) : !cashRunway?.hasEnoughData ? (
                  <>
                    <p className="text-lg font-medium text-muted-foreground">Chưa đủ dữ liệu</p>
                    <p className="text-xs text-muted-foreground">Cần ít nhất 1 tháng chi tiêu</p>
                  </>
                ) : cashRunway.runwayMonths === Infinity ? (
                  <>
                    <p className="text-2xl font-bold text-emerald-500">∞</p>
                    <p className="text-xs text-muted-foreground">Không có chi tiêu</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold">
                      {cashRunway.runwayMonths && cashRunway.runwayMonths < 1 
                        ? `${cashRunway.runwayDays} ngày` 
                        : `${cashRunway.runwayMonths?.toFixed(1)} tháng`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Burn: {formatVND(cashRunway.avgMonthlyBurn)}/tháng
                    </p>
                  </>
                )}
              </div>
              <div className={cn(
                'p-2 rounded-lg',
                !cashRunway?.hasEnoughData ? 'bg-muted' :
                cashRunway.runwayMonths === Infinity ? 'bg-emerald-500/10' :
                (cashRunway.runwayMonths ?? 0) < 3 ? 'bg-destructive/10' :
                (cashRunway.runwayMonths ?? 0) < 6 ? 'bg-amber-500/10' :
                'bg-emerald-500/10'
              )}>
                <Calendar className={cn(
                  'w-5 h-5',
                  !cashRunway?.hasEnoughData ? 'text-muted-foreground' :
                  cashRunway.runwayMonths === Infinity ? 'text-emerald-500' :
                  (cashRunway.runwayMonths ?? 0) < 3 ? 'text-destructive' :
                  (cashRunway.runwayMonths ?? 0) < 6 ? 'text-amber-500' :
                  'text-emerald-500'
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Số dư thấp nhất</p>
                <p className="text-2xl font-bold">{formatVND(metrics.minBalance)} ₫</p>
                <p className="text-xs text-muted-foreground">Vào ngày {metrics.minBalanceDate}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Dự báo số dư tiền mặt</CardTitle>
          <CardDescription>
            Vùng màu đậm là dự báo chính, vùng mờ là khoảng tin cậy 95%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="displayDate" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => formatVND(value)} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltipContent />} />
                <ReferenceLine y={500000000} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: 'Ngưỡng tối thiểu', position: 'right', fill: 'hsl(var(--destructive))', fontSize: 12 }} />
                <Area type="monotone" dataKey="upperBound" stroke="transparent" fill="url(#confidenceGradient)" name="Giới hạn trên" />
                <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#balanceGradient)" name="Số dư dự báo" />
                <Area type="monotone" dataKey="lowerBound" stroke="transparent" fill="transparent" name="Giới hạn dưới" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Inflow/Outflow Chart & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dòng tiền vào/ra</CardTitle>
            <CardDescription>Chi tiết thu chi theo ngày (30 ngày đầu)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={displayData.slice(0, 30)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="displayDate" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => formatVND(value)} />
                  <Tooltip content={<CustomTooltipContent />} />
                  <Legend />
                  <Bar dataKey="inflow" name="Thu vào" fill="hsl(142 71% 45%)" opacity={0.8} />
                  <Bar dataKey="outflow" name="Chi ra" fill="hsl(0 84% 60%)" opacity={0.8} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              AI Insights
            </CardTitle>
            <CardDescription>Phân tích và cảnh báo tự động</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {inputs && inputs.dataStatus.dataQualityScore < 50 && (
              <ForecastInsight
                type="warning"
                title="Độ tin cậy thấp"
                description={`Chỉ có ${inputs.dataStatus.dataQualityScore}% dữ liệu cần thiết.`}
                value={`${inputs.dataStatus.missingData.length} thiếu`}
              />
            )}
            
            {metrics.riskDays > 0 && (
              <ForecastInsight
                type="warning"
                title="Cảnh báo thanh khoản"
                description={`Có ${metrics.riskDays} ngày số dư có thể dưới ngưỡng an toàn 500M`}
                value={`${metrics.riskDays} ngày`}
              />
            )}
            
            <ForecastInsight
              type="info"
              title="Thu chi trung bình"
              description={`Thu: ${formatVND(metrics.avgDailyInflow)}₫/ngày | Chi: ${formatVND(metrics.avgDailyOutflow)}₫/ngày`}
            />
            
            {metrics.change > 0 ? (
              <ForecastInsight
                type="opportunity"
                title="Xu hướng tích cực"
                description="Dòng tiền dự kiến tăng trong kỳ dự báo"
                value={`+${formatVND(metrics.change)}₫`}
              />
            ) : metrics.change < 0 ? (
              <ForecastInsight
                type="warning"
                title="Cần lưu ý"
                description="Dòng tiền dự kiến giảm, cân nhắc tối ưu chi phí"
                value={`${formatVND(metrics.change)}₫`}
              />
            ) : null}
            
            {inputs && inputs.arOverdue > 0 && (
              <ForecastInsight
                type="opportunity"
                title="Thu hồi AR quá hạn"
                description={`Có ${formatVND(inputs.arOverdue)}₫ AR quá hạn cần đẩy mạnh thu hồi`}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
