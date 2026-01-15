/**
 * CashConversionCycleContent - Extracted from CashConversionCyclePage
 * This component displays detailed CCC analysis with benchmarks
 * Used in WorkingCapitalHubPage as a tab
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, TrendingUp, TrendingDown, Package, CreditCard, Wallet,
  Target, AlertTriangle, CheckCircle2, Info, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import { formatVNDCompact } from '@/lib/formatters';
import { useCashConversionCycle } from '@/hooks/useCashConversionCycle';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CashConversionCycleContent() {
  const { data, isLoading, error } = useCashConversionCycle();
  const [showFormulas, setShowFormulas] = useState(false);
  const { t } = useLanguage();

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
      <div className="p-6 text-center text-muted-foreground">
        {t('ccc.loadError')}
      </div>
    );
  }

  const cccStatus = data.ccc <= data.industryBenchmark.ccc ? 'good' : data.ccc <= data.industryBenchmark.ccc * 1.5 ? 'warning' : 'danger';
  const cccImprovement = data.ccc - data.industryBenchmark.ccc;

  return (
    <div className="space-y-6">
      {/* Formula Reference */}
      <Collapsible open={showFormulas} onOpenChange={setShowFormulas}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Info className="h-4 w-4" />
            {t('ccc.formulas')}
            <ChevronDown className={`h-4 w-4 transition-transform ${showFormulas ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <Card className="bg-muted/30">
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium text-blue-500">{t('workingCapital.dsoFull')}</p>
                <p className="text-muted-foreground font-mono">{t('workingCapital.dsoFormula')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  = {formatVNDCompact(data.avgAR)} / ({formatVNDCompact(data.rawData.totalSales)} / {data.rawData.daysInPeriod})
                </p>
              </div>
              <div>
                <p className="font-medium text-orange-500">{t('workingCapital.dioFull')}</p>
                <p className="text-muted-foreground font-mono">{t('workingCapital.dioFormula')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  = {formatVNDCompact(data.avgInventory)} / ({formatVNDCompact(data.rawData.totalCogs)} / {data.rawData.daysInPeriod})
                </p>
              </div>
              <div>
                <p className="font-medium text-purple-500">{t('workingCapital.dpoFull')}</p>
                <p className="text-muted-foreground font-mono">{t('workingCapital.dpoFormula')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  = {formatVNDCompact(data.avgAP)} / ({formatVNDCompact(data.rawData.totalPurchases)} / {data.rawData.daysInPeriod})
                </p>
              </div>
              <div>
                <p className="font-medium text-primary">{t('workingCapital.ccc')}</p>
                <p className="text-muted-foreground font-mono">{t('workingCapital.cccFormula')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  = {data.dso} + {data.dio} - {data.dpo} = {data.ccc} {t('workingCapital.days')}
                </p>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* CCC Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={`border-2 ${cccStatus === 'good' ? 'border-green-500/30 bg-green-500/5' : cccStatus === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* CCC Formula Visual */}
              <div className="flex items-center gap-4 flex-wrap justify-center">
                <div className="text-center">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium">{t('workingCapital.dso')}</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-500">{data.dso}</p>
                  <p className="text-xs text-muted-foreground">{t('workingCapital.days')}</p>
                </div>
                
                <span className="text-2xl text-muted-foreground">+</span>
                
                <div className="text-center">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Package className="h-5 w-5 text-orange-500" />
                    <span className="text-sm font-medium">{t('workingCapital.dio')}</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-500">{data.dio}</p>
                  <p className="text-xs text-muted-foreground">{t('workingCapital.days')}</p>
                </div>
                
                <span className="text-2xl text-muted-foreground">−</span>
                
                <div className="text-center">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Wallet className="h-5 w-5 text-purple-500" />
                    <span className="text-sm font-medium">{t('workingCapital.dpo')}</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-500">{data.dpo}</p>
                  <p className="text-xs text-muted-foreground">{t('workingCapital.days')}</p>
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
                  <p className="text-xs text-muted-foreground">{t('workingCapital.days')}</p>
                </div>
              </div>

              {/* Benchmark Comparison */}
              <div className="text-center md:text-right">
                <p className="text-sm text-muted-foreground mb-1">{t('ccc.vsIndustry')}</p>
                <div className="flex items-center gap-2 justify-center md:justify-end">
                  {cccImprovement <= 0 ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-green-500 font-medium">
                        {t('ccc.betterBy')} {Math.abs(cccImprovement)} {t('workingCapital.days')}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span className="text-yellow-500 font-medium">
                        {t('ccc.slowerBy')} {cccImprovement} {t('workingCapital.days')}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('ccc.industryBenchmark')}: {data.industryBenchmark.ccc} {t('workingCapital.days')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Component Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* DSO Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm">{t('workingCapital.dsoFull')}</CardTitle>
              </div>
              <CardDescription>{t('ccc.dsoDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold">{data.dso}</span>
                <span className="text-muted-foreground">{t('workingCapital.days')}</span>
                {data.dso <= data.industryBenchmark.dso ? (
                  <Badge className="bg-green-500/10 text-green-500">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {t('ccc.good')}
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/10 text-yellow-500">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {t('ccc.high')}
                  </Badge>
                )}
              </div>
              <Progress value={Math.min((data.industryBenchmark.dso / data.dso) * 100, 100)} className="h-2 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('ccc.receivables')}: {formatVNDCompact(data.avgAR)}</span>
                <span>{t('ccc.benchmark')}: {data.industryBenchmark.dso}d</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* DIO Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-500" />
                <CardTitle className="text-sm">{t('workingCapital.dioFull')}</CardTitle>
              </div>
              <CardDescription>{t('ccc.dioDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold">{data.dio}</span>
                <span className="text-muted-foreground">{t('workingCapital.days')}</span>
                {data.dio <= data.industryBenchmark.dio ? (
                  <Badge className="bg-green-500/10 text-green-500">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {t('ccc.good')}
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/10 text-yellow-500">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {t('ccc.high')}
                  </Badge>
                )}
              </div>
              <Progress value={Math.min((data.industryBenchmark.dio / data.dio) * 100, 100)} className="h-2 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('ccc.inventoryValue')}: {formatVNDCompact(data.avgInventory)}</span>
                <span>{t('ccc.benchmark')}: {data.industryBenchmark.dio}d</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* DPO Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm">{t('workingCapital.dpoFull')}</CardTitle>
              </div>
              <CardDescription>{t('ccc.dpoDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold">{data.dpo}</span>
                <span className="text-muted-foreground">{t('workingCapital.days')}</span>
                {data.dpo >= data.industryBenchmark.dpo ? (
                  <Badge className="bg-green-500/10 text-green-500">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {t('ccc.good')}
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/10 text-yellow-500">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {t('ccc.low')}
                  </Badge>
                )}
              </div>
              <Progress value={Math.min((data.dpo / data.industryBenchmark.dpo) * 100, 100)} className="h-2 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('ccc.payables')}: {formatVNDCompact(data.avgAP)}</span>
                <span>{t('ccc.benchmark')}: {data.industryBenchmark.dpo}d</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('ccc.trendTitle')}</CardTitle>
          <CardDescription>{t('ccc.trendDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis unit={` ${t('workingCapital.days')}`} />
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
                  label={{ value: t('ccc.benchmark'), position: 'right', fontSize: 10 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">{t('ccc.noTrendData')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
