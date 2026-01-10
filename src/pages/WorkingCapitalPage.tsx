import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Wallet, TrendingUp, TrendingDown, Target, 
  ArrowRight, Clock, DollarSign, AlertCircle,
  CheckCircle, MinusCircle, Info, ChevronDown
} from 'lucide-react';
import { useWorkingCapitalSummary } from '@/hooks/useWorkingCapital';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { DateRangeIndicator } from '@/components/shared/DateRangeIndicator';

export default function WorkingCapitalPage() {
  const { data: summary, isLoading } = useWorkingCapitalSummary();
  const [showFormulas, setShowFormulas] = useState(false);
  
  const current = summary?.current;
  const cccData = [
    { name: 'DSO', days: current?.dso_days || 0, target: current?.target_dso || 30, color: 'hsl(var(--chart-1))' },
    { name: 'DIO', days: current?.dio_days || 0, target: current?.target_dio || 0, color: 'hsl(var(--chart-2))' },
    { name: 'DPO', days: current?.dpo_days || 0, target: current?.target_dpo || 45, color: 'hsl(var(--chart-3))' },
  ];

  const cccChartData = [
    { 
      metric: 'DSO', 
      current: current?.dso_days || 0, 
      target: current?.target_dso || 30,
      description: 'Ngày thu tiền bình quân'
    },
    { 
      metric: 'DIO', 
      current: current?.dio_days || 0, 
      target: current?.target_dio || 0,
      description: 'Ngày tồn kho bình quân'
    },
    { 
      metric: 'DPO', 
      current: current?.dpo_days || 0, 
      target: current?.target_dpo || 45,
      description: 'Ngày thanh toán bình quân'
    },
  ];

  const trendData = summary?.trend.map(t => ({
    date: format(parseISO(t.metric_date), 'MMM yy', { locale: vi }),
    ccc: t.ccc_days,
    dso: t.dso_days,
    dpo: t.dpo_days,
  })).reverse() || [];

  const priorityColors = {
    high: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500',
    medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500',
    low: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500',
  };

  const getTrendIcon = () => {
    if (summary?.cccTrend === 'improving') return <TrendingDown className="h-5 w-5 text-green-600" />;
    if (summary?.cccTrend === 'worsening') return <TrendingUp className="h-5 w-5 text-red-600" />;
    return <MinusCircle className="h-5 w-5 text-yellow-600" />;
  };

  const getTrendLabel = () => {
    if (summary?.cccTrend === 'improving') return 'Đang cải thiện';
    if (summary?.cccTrend === 'worsening') return 'Đang xấu đi';
    return 'Ổn định';
  };

  return (
    <>
      <Helmet>
        <title>Tối ưu vốn lưu động | CFO Dashboard</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <PageHeader 
            title="Tối ưu vốn lưu động"
            subtitle="Phân tích và tối ưu chu kỳ tiền mặt (Cash Conversion Cycle)"
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
                  <p className="text-muted-foreground font-mono text-xs">= (Phải thu / Doanh thu) × Số ngày</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Số ngày thu tiền từ khách hàng
                  </p>
                </div>
                <div>
                  <p className="font-medium text-orange-500">DIO (Days Inventory Outstanding)</p>
                  <p className="text-muted-foreground font-mono text-xs">= (Tồn kho / COGS) × Số ngày</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Số ngày tồn kho trước khi bán
                  </p>
                </div>
                <div>
                  <p className="font-medium text-purple-500">DPO (Days Payable Outstanding)</p>
                  <p className="text-muted-foreground font-mono text-xs">= (Phải trả / Mua hàng) × Số ngày</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Số ngày thanh toán cho NCC
                  </p>
                </div>
                <div>
                  <p className="font-medium text-primary">CCC (Cash Conversion Cycle)</p>
                  <p className="text-muted-foreground font-mono text-xs">= DSO + DIO - DPO</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hiện tại: {current?.dso_days || 0} + {current?.dio_days || 0} - {current?.dpo_days || 0} = {current?.ccc_days || 0} ngày
                  </p>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Summary KPIs */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                DSO
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{current?.dso_days || 0} ngày</div>
                  <p className="text-xs text-muted-foreground">
                    Mục tiêu: {current?.target_dso || 30} ngày
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Wallet className="h-4 w-4" />
                DIO
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{current?.dio_days || 0} ngày</div>
                  <p className="text-xs text-muted-foreground">
                    Ngày tồn kho
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                DPO
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{current?.dpo_days || 0} ngày</div>
                  <p className="text-xs text-muted-foreground">
                    Mục tiêu: {current?.target_dpo || 45} ngày
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Target className="h-4 w-4" />
                CCC (Chu kỳ tiền mặt)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    {current?.ccc_days || 0} ngày
                    {getTrendIcon()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getTrendLabel()}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Tiềm năng giải phóng vốn
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(summary?.totalPotentialCashRelease || 0)}
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    Nếu đạt mục tiêu
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* CCC Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Phân tích CCC
              </CardTitle>
              <CardDescription>
                DSO + DIO - DPO = CCC
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cccChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="metric" width={60} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `${value} ngày`,
                          name === 'current' ? 'Hiện tại' : 'Mục tiêu'
                        ]}
                      />
                      <Legend 
                        formatter={(value) => value === 'current' ? 'Hiện tại' : 'Mục tiêu'}
                      />
                      <Bar dataKey="current" fill="hsl(var(--primary))" name="current" />
                      <Bar dataKey="target" fill="hsl(var(--muted-foreground))" name="target" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-lg font-mono">
                  <span className="text-primary font-bold">{current?.dso_days || 0}</span>
                  <span className="text-muted-foreground">+</span>
                  <span className="text-primary font-bold">{current?.dio_days || 0}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-primary font-bold">{current?.dpo_days || 0}</span>
                  <span className="text-muted-foreground">=</span>
                  <span className="text-2xl font-bold text-primary">{current?.ccc_days || 0}</span>
                  <span className="text-sm text-muted-foreground">ngày</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CCC Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Xu hướng CCC
              </CardTitle>
              <CardDescription>
                Diễn biến chu kỳ tiền mặt theo thời gian
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || trendData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>Chưa có dữ liệu xu hướng</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`${value} ngày`, '']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="ccc" 
                        name="CCC" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="dso" 
                        name="DSO" 
                        stroke="hsl(var(--chart-1))" 
                        strokeDasharray="5 5"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="dpo" 
                        name="DPO" 
                        stroke="hsl(var(--chart-3))" 
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Working Capital Breakdown */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Phải thu khách hàng (AR)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(current?.accounts_receivable || 0)}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Vòng quay:</span>
                <strong>{formatNumber(current?.ar_turnover || 0)}x</strong>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tồn kho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(current?.inventory_value || 0)}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Vòng quay:</span>
                <strong>{formatNumber(current?.inventory_turnover || 0)}x</strong>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Phải trả nhà cung cấp (AP)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(current?.accounts_payable || 0)}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Vòng quay:</span>
                <strong>{formatNumber(current?.ap_turnover || 0)}x</strong>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Khuyến nghị tối ưu
            </CardTitle>
            <CardDescription>
              Các hành động để cải thiện vốn lưu động
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : !summary?.recommendations || summary.recommendations.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Vốn lưu động đang được quản lý tốt
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    Các chỉ số DSO, DPO, DIO đều trong ngưỡng tối ưu
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {summary.recommendations.map((rec) => (
                  <div 
                    key={rec.id}
                    className={`p-4 rounded-lg border ${priorityColors[rec.priority]}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={priorityColors[rec.priority]}>
                            {rec.priority === 'high' ? 'Ưu tiên cao' : 
                             rec.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                          </Badge>
                          <Badge variant="outline">
                            {rec.type.toUpperCase()}
                          </Badge>
                        </div>
                        <h4 className="font-semibold">{rec.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                        <div className="flex items-center gap-2 mt-2 text-sm">
                          <ArrowRight className="h-4 w-4" />
                          <span className="font-medium">{rec.action}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(rec.potentialImpact)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Tiềm năng giải phóng
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
