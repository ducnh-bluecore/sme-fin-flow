import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, RefreshCw, TrendingUp, TrendingDown, 
  AlertCircle, CheckCircle, ArrowUpRight, ArrowDownRight,
  FileText, Calendar
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  useVarianceAnalysis, 
  useVarianceSummary, 
  useGenerateVarianceAnalysis 
} from '@/hooks/useVarianceAnalysis';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
} from 'recharts';

export default function VarianceAnalysisPage() {
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('monthly');
  const { data: variances, isLoading } = useVarianceAnalysis(periodType);
  const { data: summary } = useVarianceSummary(periodType);
  const generateAnalysis = useGenerateVarianceAnalysis();

  const handleGenerate = () => {
    generateAnalysis.mutate(undefined);
  };

  const categoryChartData = Object.entries(summary?.byCategory || {}).map(([category, data]) => ({
    category: category === 'revenue' ? 'Doanh thu' : 
              category === 'expense' ? 'Chi phí' : category,
    budget: data.budget / 1000000,
    actual: data.actual / 1000000,
    variance: data.variance / 1000000,
    variancePct: data.budget !== 0 ? (data.variance / data.budget) * 100 : 0,
  }));

  const getVarianceColor = (variance: number, category: string) => {
    if (category === 'revenue' || category === 'Doanh thu') {
      return variance >= 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))';
    }
    return variance <= 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))';
  };

  const isFavorable = (variance: number, category: string) => {
    if (category === 'revenue' || category === 'Doanh thu') {
      return variance >= 0;
    }
    return variance <= 0;
  };

  return (
    <>
      <Helmet>
        <title>Phân tích chênh lệch | CFO Dashboard</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader 
            title="Phân tích chênh lệch"
            subtitle="Budget vs Actual - Variance Analysis tự động"
          />
          <div className="flex items-center gap-2">
            <Tabs value={periodType} onValueChange={(v) => setPeriodType(v as 'monthly' | 'quarterly')}>
              <TabsList>
                <TabsTrigger value="monthly">Hàng tháng</TabsTrigger>
                <TabsTrigger value="quarterly">Hàng quý</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button 
              onClick={handleGenerate} 
              disabled={generateAnalysis.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generateAnalysis.isPending ? 'animate-spin' : ''}`} />
              {generateAnalysis.isPending ? 'Đang phân tích...' : 'Phân tích mới'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tổng ngân sách
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(summary?.totalBudget || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Thực hiện
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(summary?.totalActual || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`${
            (summary?.totalVariance || 0) >= 0 
              ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' 
              : 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Chênh lệch
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className={`text-2xl font-bold flex items-center gap-1 ${
                  (summary?.totalVariance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(summary?.totalVariance || 0) >= 0 ? (
                    <ArrowUpRight className="h-5 w-5" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5" />
                  )}
                  {formatCurrency(Math.abs(summary?.totalVariance || 0))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Thuận lợi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-green-600">
                  {summary?.favorableCount || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Bất lợi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-red-600">
                  {summary?.unfavorableCount || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Variance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              So sánh Ngân sách vs Thực hiện
            </CardTitle>
            <CardDescription>
              Biểu đồ chênh lệch theo danh mục
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : categoryChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Chưa có dữ liệu phân tích</p>
                <p className="text-sm">Nhấn "Phân tích mới" để bắt đầu</p>
              </div>
            ) : (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="category" />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={(value) => `${value}M`}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === 'variancePct') return [`${value.toFixed(1)}%`, 'Chênh lệch %'];
                        return [`${value.toFixed(0)}M VND`, 
                          name === 'budget' ? 'Ngân sách' : 
                          name === 'actual' ? 'Thực hiện' : 'Chênh lệch'];
                      }}
                    />
                    <Legend 
                      formatter={(value) => 
                        value === 'budget' ? 'Ngân sách' : 
                        value === 'actual' ? 'Thực hiện' :
                        value === 'variance' ? 'Chênh lệch' : 'Chênh lệch %'
                      }
                    />
                    <Bar yAxisId="left" dataKey="budget" name="budget" fill="hsl(var(--muted-foreground))" />
                    <Bar yAxisId="left" dataKey="actual" name="actual" fill="hsl(var(--primary))" />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="variancePct" 
                      name="variancePct"
                      stroke="hsl(var(--chart-3))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-3))' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Significant Variances */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Chênh lệch đáng kể ({'>'}10%)
            </CardTitle>
            <CardDescription>
              Các khoản mục cần chú ý và hành động
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : !summary?.significantVariances || summary.significantVariances.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Không có chênh lệch đáng kể
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    Tất cả các khoản mục đều trong phạm vi cho phép (±10%)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {summary.significantVariances.map((v) => {
                  const favorable = isFavorable(v.variance_to_budget, v.category);
                  return (
                    <div 
                      key={v.id}
                      className={`p-4 rounded-lg border ${
                        favorable 
                          ? 'bg-green-50/50 dark:bg-green-950/20 border-green-500/50'
                          : 'bg-red-50/50 dark:bg-red-950/20 border-red-500/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">
                              {v.category === 'revenue' ? 'Doanh thu' : 
                               v.category === 'expense' ? 'Chi phí' : v.category}
                            </Badge>
                            {v.subcategory && (
                              <Badge variant="secondary">{v.subcategory}</Badge>
                            )}
                            <Badge className={favorable ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}>
                              {favorable ? 'Thuận lợi' : 'Bất lợi'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Ngân sách</p>
                              <p className="font-mono font-medium">{formatCurrency(v.budget_amount)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Thực hiện</p>
                              <p className="font-mono font-medium">{formatCurrency(v.actual_amount)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Chênh lệch</p>
                              <p className={`font-mono font-bold ${favorable ? 'text-green-600' : 'text-red-600'}`}>
                                {v.variance_to_budget >= 0 ? '+' : ''}
                                {formatCurrency(v.variance_to_budget)} ({formatPercent(v.variance_pct_budget)})
                              </p>
                            </div>
                          </div>

                          {/* Variance Drivers */}
                          {v.variance_drivers && v.variance_drivers.length > 0 && (
                            <div className="mt-3 p-2 bg-background rounded border">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Phân tích nguyên nhân:</p>
                              {v.variance_drivers.map((driver, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm">
                                  {driver.direction === 'positive' ? (
                                    <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-red-600 mt-0.5" />
                                  )}
                                  <span>{driver.explanation}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          {v.requires_action && (
                            <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400">
                              Cần hành động
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Kỳ: {format(parseISO(v.analysis_period), 'MMM yyyy', { locale: vi })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* YoY Comparison */}
        {variances && variances.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                So sánh cùng kỳ năm trước (YoY)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Danh mục</th>
                      <th className="text-right py-3 px-2">Kỳ trước</th>
                      <th className="text-right py-3 px-2">Kỳ này</th>
                      <th className="text-right py-3 px-2">Thay đổi</th>
                      <th className="text-right py-3 px-2">Cùng kỳ năm trước</th>
                      <th className="text-right py-3 px-2">YoY %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variances.slice(0, 10).map((v) => (
                      <tr key={v.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2">
                          <Badge variant="outline">
                            {v.category === 'revenue' ? 'Doanh thu' : 
                             v.category === 'expense' ? 'Chi phí' : v.category}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {formatCurrency(v.prior_period_amount)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {formatCurrency(v.actual_amount)}
                        </td>
                        <td className={`py-2 px-2 text-right font-mono ${
                          v.variance_to_prior >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {v.variance_to_prior >= 0 ? '+' : ''}
                          {formatCurrency(v.variance_to_prior)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {formatCurrency(v.prior_year_amount)}
                        </td>
                        <td className={`py-2 px-2 text-right font-mono font-bold ${
                          v.yoy_variance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {v.yoy_variance >= 0 ? '+' : ''}
                          {formatPercent(v.yoy_variance_pct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
