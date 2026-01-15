/**
 * VarianceAnalysisContent - Extracted from VarianceAnalysisPage
 * This component displays variance analysis with drivers
 * Used in PerformanceAnalysisPage as a tab
 */

import { useState } from 'react';
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
import { useLanguage } from '@/contexts/LanguageContext';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Line, Bar,
} from 'recharts';

export default function VarianceAnalysisContent() {
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('monthly');
  const { data: variances, isLoading } = useVarianceAnalysis(periodType);
  const { data: summary } = useVarianceSummary(periodType);
  const generateAnalysis = useGenerateVarianceAnalysis();
  const { t } = useLanguage();

  const handleGenerate = () => {
    generateAnalysis.mutate(undefined);
  };

  const categoryChartData = Object.entries(summary?.byCategory || {}).map(([category, data]) => ({
    category: category === 'revenue' ? t('variance.revenue') : 
              category === 'expense' ? t('variance.expense') : category,
    budget: data.budget / 1000000,
    actual: data.actual / 1000000,
    variance: data.variance / 1000000,
    variancePct: data.budget !== 0 ? (data.variance / data.budget) * 100 : 0,
  }));

  const isFavorable = (variance: number, category: string) => {
    if (category === 'revenue' || category === t('variance.revenue')) {
      return variance >= 0;
    }
    return variance <= 0;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-end gap-2">
        <Tabs value={periodType} onValueChange={(v) => setPeriodType(v as 'monthly' | 'quarterly')}>
          <TabsList>
            <TabsTrigger value="monthly">{t('variance.monthly')}</TabsTrigger>
            <TabsTrigger value="quarterly">{t('variance.quarterly')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={handleGenerate} disabled={generateAnalysis.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${generateAnalysis.isPending ? 'animate-spin' : ''}`} />
          {generateAnalysis.isPending ? t('variance.analyzing') : t('variance.newAnalysis')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('variance.totalBudget')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.totalBudget || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('variance.actual')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.totalActual || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card className={`${
          (summary?.totalVariance || 0) >= 0 
            ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' 
            : 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('variance.variance')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <div className={`text-2xl font-bold flex items-center gap-1 ${
                (summary?.totalVariance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(summary?.totalVariance || 0) >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                {formatCurrency(Math.abs(summary?.totalVariance || 0))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              {t('variance.favorable')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-green-600">{summary?.favorableCount || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-red-600" />
              {t('variance.unfavorable')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-red-600">{summary?.unfavorableCount || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Variance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('variance.budgetVsActual')}
          </CardTitle>
          <CardDescription>{t('variance.categoryChart')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[350px] w-full" /> : categoryChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">{t('variance.noData')}</p>
              <p className="text-sm">{t('variance.clickAnalyze')}</p>
            </div>
          ) : (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="category" />
                  <YAxis yAxisId="left" tickFormatter={(value) => `${value}M`} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'variancePct') return [`${value.toFixed(1)}%`, `${t('variance.variance')} %`];
                      return [`${value.toFixed(0)}M VND`, 
                        name === 'budget' ? t('variance.budget') : 
                        name === 'actual' ? t('variance.actual') : t('variance.variance')];
                    }}
                  />
                  <Legend 
                    formatter={(value) => 
                      value === 'budget' ? t('variance.budget') : 
                      value === 'actual' ? t('variance.actual') :
                      value === 'variance' ? t('variance.variance') : `${t('variance.variance')} %`
                    }
                  />
                  <Bar yAxisId="left" dataKey="budget" name="budget" fill="hsl(var(--muted-foreground))" />
                  <Bar yAxisId="left" dataKey="actual" name="actual" fill="hsl(var(--primary))" />
                  <Line 
                    yAxisId="right" type="monotone" dataKey="variancePct" name="variancePct"
                    stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-3))' }}
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
            {t('variance.significantVariances')}
          </CardTitle>
          <CardDescription>{t('variance.needsAttention')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : !summary?.significantVariances || summary.significantVariances.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">{t('variance.noSignificant')}</p>
                <p className="text-sm text-green-600 dark:text-green-500">{t('variance.allInRange')}</p>
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
                            {v.category === 'revenue' ? t('variance.revenue') : 
                             v.category === 'expense' ? t('variance.expense') : v.category}
                          </Badge>
                          {v.subcategory && <Badge variant="secondary">{v.subcategory}</Badge>}
                          <Badge className={favorable ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}>
                            {favorable ? t('variance.favorable') : t('variance.unfavorable')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">{t('variance.budget')}</p>
                            <p className="font-mono font-medium">{formatCurrency(v.budget_amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('variance.actual')}</p>
                            <p className="font-mono font-medium">{formatCurrency(v.actual_amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('variance.variance')}</p>
                            <p className={`font-mono font-bold ${favorable ? 'text-green-600' : 'text-red-600'}`}>
                              {v.variance_to_budget >= 0 ? '+' : ''}{formatCurrency(v.variance_to_budget)} ({formatPercent(v.variance_pct_budget)})
                            </p>
                          </div>
                        </div>

                        {/* Variance Drivers */}
                        {v.variance_drivers && v.variance_drivers.length > 0 && (
                          <div className="mt-3 p-2 bg-background rounded border">
                            <p className="text-xs font-medium text-muted-foreground mb-1">{t('variance.causeAnalysis')}</p>
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
                            {t('variance.needsAction')}
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {t('variance.period')}: {format(parseISO(v.analysis_period), 'MMM yyyy', { locale: vi })}
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
              {t('variance.yoyComparison')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">{t('variance.category')}</th>
                    <th className="text-right py-3 px-2">{t('variance.priorPeriod')}</th>
                    <th className="text-right py-3 px-2">{t('variance.currentPeriod')}</th>
                    <th className="text-right py-3 px-2">{t('variance.change')}</th>
                    <th className="text-right py-3 px-2">YoY %</th>
                  </tr>
                </thead>
                <tbody>
                  {variances.slice(0, 10).map((v) => (
                    <tr key={v.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">
                        <Badge variant="outline">
                          {v.category === 'revenue' ? t('variance.revenue') : 
                           v.category === 'expense' ? t('variance.expense') : v.category}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right font-mono">{formatCurrency(v.prior_period_amount)}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatCurrency(v.actual_amount)}</td>
                      <td className={`py-2 px-2 text-right font-mono ${v.yoy_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {v.yoy_variance >= 0 ? '+' : ''}{formatCurrency(v.yoy_variance)}
                      </td>
                      <td className={`py-2 px-2 text-right ${v.variance_pct_yoy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {v.variance_pct_yoy >= 0 ? '+' : ''}{formatPercent(v.variance_pct_yoy)}
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
  );
}
