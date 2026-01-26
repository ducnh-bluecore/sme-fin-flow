/**
 * WorkingCapitalContent - Extracted from WorkingCapitalPage
 * This component displays working capital overview with KPIs, charts, and recommendations
 * Used in WorkingCapitalHubPage as a tab
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Wallet, TrendingUp, TrendingDown, Target, 
  ArrowRight, Clock, DollarSign, AlertCircle,
  CheckCircle, MinusCircle, Info, ChevronDown
} from 'lucide-react';
import { useWorkingCapitalSummary } from '@/hooks/useWorkingCapital';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { useLanguage } from '@/contexts/LanguageContext';
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
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function WorkingCapitalContent() {
  const { data: summary, isLoading } = useWorkingCapitalSummary();
  const [showFormulas, setShowFormulas] = useState(false);
  const { t } = useLanguage();
  
  const current = summary?.current;
  
  const cccChartData = [
    { 
      metric: 'DSO', 
      current: current?.dso_days || 0, 
      target: current?.target_dso || 30,
    },
    { 
      metric: 'DIO', 
      current: current?.dio_days || 0, 
      target: current?.target_dio || 0,
    },
    { 
      metric: 'DPO', 
      current: current?.dpo_days || 0, 
      target: current?.target_dpo || 45,
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
    if (summary?.cccTrend === 'improving') return t('workingCapital.improving');
    if (summary?.cccTrend === 'worsening') return t('workingCapital.worsening');
    return t('workingCapital.stable');
  };

  return (
    <div className="space-y-6">
      {/* Formula Reference */}
      <Collapsible open={showFormulas} onOpenChange={setShowFormulas}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Info className="h-4 w-4" />
            {t('workingCapital.formulas')}
            <ChevronDown className={`h-4 w-4 transition-transform ${showFormulas ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <Card className="bg-muted/30">
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium text-blue-500">{t('workingCapital.dsoFull')}</p>
                <p className="text-muted-foreground font-mono text-xs">{t('workingCapital.dsoFormula')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('workingCapital.dsoDesc')}</p>
              </div>
              <div>
                <p className="font-medium text-orange-500">{t('workingCapital.dioFull')}</p>
                <p className="text-muted-foreground font-mono text-xs">{t('workingCapital.dioFormula')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('workingCapital.dioDesc')}</p>
              </div>
              <div>
                <p className="font-medium text-purple-500">{t('workingCapital.dpoFull')}</p>
                <p className="text-muted-foreground font-mono text-xs">{t('workingCapital.dpoFormula')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('workingCapital.dpoDesc')}</p>
              </div>
              <div>
                <p className="font-medium text-primary">{t('workingCapital.ccc')}</p>
                <p className="text-muted-foreground font-mono text-xs">{t('workingCapital.cccFormula')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('workingCapital.current')}: {current?.dso_days || 0} + {current?.dio_days || 0} - {current?.dpo_days || 0} = {current?.ccc_days || 0} {t('workingCapital.days')}
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
              {t('workingCapital.dso')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{current?.dso_days || 0} {t('workingCapital.days')}</div>
                <p className="text-xs text-muted-foreground">
                  {t('workingCapital.target')}: {current?.target_dso || 30} {t('workingCapital.days')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Wallet className="h-4 w-4" />
              {t('workingCapital.dio')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{current?.dio_days || 0} {t('workingCapital.days')}</div>
                <p className="text-xs text-muted-foreground">{t('workingCapital.inventoryDays')}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {t('workingCapital.dpo')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{current?.dpo_days || 0} {t('workingCapital.days')}</div>
                <p className="text-xs text-muted-foreground">
                  {t('workingCapital.target')}: {current?.target_dpo || 45} {t('workingCapital.days')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Target className="h-4 w-4" />
              {t('workingCapital.ccc')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {current?.ccc_days || 0} {t('workingCapital.days')}
                  {getTrendIcon()}
                </div>
                <p className="text-xs text-muted-foreground">{getTrendLabel()}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          (summary?.totalPotentialCashRelease || 0) >= 0 
            ? "bg-sky-50 border-sky-200" 
            : "bg-red-50 border-red-200"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className={cn(
              "text-sm font-medium flex items-center gap-1",
              (summary?.totalPotentialCashRelease || 0) >= 0 
                ? "text-sky-700" 
                : "text-red-700"
            )}>
              <TrendingUp className="h-4 w-4" />
              {t('workingCapital.potentialRelease')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className={cn(
                  "text-2xl font-bold",
                  (summary?.totalPotentialCashRelease || 0) >= 0 
                    ? "text-sky-600" 
                    : "text-red-600"
                )}>
                  {formatCurrency(summary?.totalPotentialCashRelease || 0)}
                </div>
                <p className={cn(
                  "text-xs",
                  (summary?.totalPotentialCashRelease || 0) >= 0 
                    ? "text-sky-600" 
                    : "text-red-600"
                )}>
                  {t('workingCapital.ifTargetMet')}
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
              {t('workingCapital.cccAnalysis')}
            </CardTitle>
            <CardDescription>DSO + DIO - DPO = CCC</CardDescription>
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
                        `${value} ${t('workingCapital.days')}`,
                        name === 'current' ? t('workingCapital.current') : t('workingCapital.target')
                      ]}
                    />
                    <Legend formatter={(value) => value === 'current' ? t('workingCapital.current') : t('workingCapital.target')} />
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
                <span className="text-sm text-muted-foreground">{t('workingCapital.days')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CCC Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('workingCapital.cccTrend')}
            </CardTitle>
            <CardDescription>{t('workingCapital.cccTrendDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || trendData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>{t('workingCapital.noTrendData')}</p>
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`${value} ${t('workingCapital.days')}`, '']} />
                    <Legend />
                    <Line type="monotone" dataKey="ccc" name="CCC" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))' }} />
                    <Line type="monotone" dataKey="dso" name="DSO" stroke="hsl(var(--chart-1))" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="dpo" name="DPO" stroke="hsl(var(--chart-3))" strokeDasharray="5 5" />
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
            <CardTitle className="text-base">{t('workingCapital.ar')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(current?.accounts_receivable || 0)}</div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t('workingCapital.turnover')}:</span>
              <strong>{formatNumber(current?.ar_turnover || 0)}x</strong>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('workingCapital.inventory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(current?.inventory_value || 0)}</div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t('workingCapital.turnover')}:</span>
              <strong>{formatNumber(current?.inventory_turnover || 0)}x</strong>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('workingCapital.ap')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(current?.accounts_payable || 0)}</div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t('workingCapital.turnover')}:</span>
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
            {t('workingCapital.recommendations')}
          </CardTitle>
          <CardDescription>{t('workingCapital.recommendationsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : summary?.recommendations && summary.recommendations.length > 0 ? (
            <div className="space-y-3">
              {summary.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${priorityColors[rec.priority as keyof typeof priorityColors] || priorityColors.medium}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{rec.type}</Badge>
                        <Badge className={priorityColors[rec.priority as keyof typeof priorityColors]}>
                          {rec.priority === 'high' ? t('workingCapital.highPriority') : 
                           rec.priority === 'medium' ? t('workingCapital.mediumPriority') : t('workingCapital.lowPriority')}
                        </Badge>
                      </div>
                      <p className="font-medium">{rec.description}</p>
                      {rec.potentialImpact && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('workingCapital.potentialImpact')}: {formatCurrency(rec.potentialImpact)}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">{t('workingCapital.noRecommendations')}</p>
                <p className="text-sm text-green-600 dark:text-green-500">{t('workingCapital.allOptimized')}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
