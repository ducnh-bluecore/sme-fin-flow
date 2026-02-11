import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Target, 
  ShoppingCart,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Zap,
  Info,
  ChevronDown,
  OctagonX
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  ComposedChart,
  Area
} from 'recharts';
import { formatVND, formatVNDCompact } from '@/lib/formatters';
import { useUnitEconomics } from '@/hooks/useUnitEconomics';
import { FDP_THRESHOLDS } from '@/lib/fdp-formulas';
import SKUProfitabilityAnalysis from '@/components/dashboard/SKUProfitabilityAnalysis';
import SKUStopAction from '@/components/dashboard/SKUStopAction';
import FormulaDisplay from '@/components/dashboard/FormulaDisplay';
import { PageHeader } from '@/components/shared/PageHeader';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCachedSKUProfitability } from '@/hooks/useSKUProfitabilityCache';
import UnitEconomicsDecisionCards from '@/components/unit-economics/UnitEconomicsDecisionCards';
import FDPOutcomeTracker from '@/components/dashboard/FDPOutcomeTracker';
import { useRecordOutcome } from '@/hooks/control-tower';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function UnitEconomicsPage() {
  const { data, isLoading, error } = useUnitEconomics();
  const { data: skuData } = useCachedSKUProfitability();
  const [showFormulas, setShowFormulas] = useState(false);
  const { t } = useLanguage();
  const { mutate: recordOutcome, isPending: isRecordingOutcome } = useRecordOutcome();

  // FDP Principle #6: Identify SKUs that need STOP action using FDP_THRESHOLDS
  const stopSKUs = useMemo(() => {
    if (!skuData?.skuMetrics) return [];
    
    return skuData.skuMetrics
      .filter(m => m.margin_percent < FDP_THRESHOLDS.SKU_STOP_MARGIN_PERCENT) // Use threshold constant
      .map(m => {
        const reasons: string[] = [];
        const severity = m.margin_percent < FDP_THRESHOLDS.SKU_CRITICAL_MARGIN_PERCENT ? 'critical' as const : 'warning' as const;
        
        if (m.margin_percent < 0) {
          reasons.push(`Margin âm ${m.margin_percent.toFixed(1)}% - bán càng nhiều càng lỗ`);
        }
        if (m.cogs > m.revenue * 0.7) {
          reasons.push('Giá vốn quá cao so với giá bán');
        }
        if (m.fees > m.revenue * 0.2) {
          reasons.push('Phí sàn/logistics chiếm quá 20% doanh thu');
        }
        
        // Estimate locked cash (inventory for this SKU)
        const avgInventoryValue = m.cogs * 0.5; // Rough estimate: half month of COGS
        
        return {
          sku: m.sku,
          productName: m.product_name || m.sku,
          channel: m.channel,
          marginPercent: m.margin_percent,
          monthlyLoss: Math.abs(m.profit),
          lockedCash: avgInventoryValue,
          reason: reasons,
          severity,
          recommendation: m.margin_percent < FDP_THRESHOLDS.SKU_CRITICAL_MARGIN_PERCENT 
            ? 'stop_immediately' as const 
            : m.fees > m.revenue * 0.15 
              ? 'reduce_ads' as const 
              : 'review_pricing' as const
        };
      })
      .sort((a, b) => a.marginPercent - b.marginPercent)
      .slice(0, 10); // Top 10 worst SKUs
  }, [skuData]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        {t('unit.loadError')}
      </div>
    );
  }

  const orderBreakdown = [
    { name: t('board.revenue'), value: data.avgOrderValue, color: 'hsl(var(--primary))' },
    { name: t('unit.cogs'), value: data.cogsPerOrder, color: 'hsl(var(--destructive))' },
    { name: t('unit.platformFee'), value: data.platformFeesPerOrder, color: 'hsl(var(--chart-2))' },
    { name: t('unit.shipping'), value: data.shippingCostPerOrder, color: 'hsl(var(--chart-3))' },
  ];

  const ltvStatus = data.ltvCacRatio >= 3 ? 'excellent' : data.ltvCacRatio >= 2 ? 'good' : data.ltvCacRatio >= 1 ? 'warning' : 'danger';
  const ltvStatusColor = {
    excellent: 'text-green-500 bg-green-500/10',
    good: 'text-blue-500 bg-blue-500/10',
    warning: 'text-yellow-500 bg-yellow-500/10',
    danger: 'text-red-500 bg-red-500/10'
  };

  const ltvStatusLabel = {
    excellent: t('unit.excellent'),
    good: t('unit.good'),
    warning: t('unit.needsImprovement'),
    danger: t('unit.atRisk')
  };

  return (
    <>
      <Helmet>
        <title>{t('unit.title')} | CFO Dashboard</title>
      </Helmet>

      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <PageHeader
            title={t('unit.title')}
            subtitle="FDP Principle: Unit Economics → Action | Mỗi đồng doanh thu đều đi kèm cái giá"
          />
          <QuickDateSelector />
        </div>

        {/* FDP Principle #6: SKU STOP Action - Show at TOP for immediate attention */}
        {stopSKUs.length > 0 && (
          <SKUStopAction 
            stopSKUs={stopSKUs}
            isSubmitting={isRecordingOutcome}
            onAcknowledge={(sku, action) => {
              const skuInfo = stopSKUs.find(s => s.sku === sku);
              if (!skuInfo) return;
              
              recordOutcome({
                decisionTitle: `${skuInfo.productName} (${sku})`,
                decisionType: 'FDP_SKU_STOP',
                predictedImpactAmount: skuInfo.monthlyLoss,
                outcomeVerdict: 'pending_followup',
                outcomeNotes: `Action: ${action} | Channel: ${skuInfo.channel} | Margin: ${skuInfo.marginPercent.toFixed(1)}% | Locked cash: ${skuInfo.lockedCash} | Reasons: ${skuInfo.reason.join('; ')}`,
                followupDueDate: addDays(new Date(), 7).toISOString(),
              });
            }}
          />
        )}

        {/* FDP Outcome Tracker - theo dõi kết quả quyết định SKU */}
        <FDPOutcomeTracker />

        {/* Decision Cards */}
        <UnitEconomicsDecisionCards 
          data={data}
          onDismiss={(cardId) => console.log('Dismissed:', cardId)}
          onAction={(cardId, action) => console.log('Action:', cardId, action)}
        />

        {/* FDP Principle #3: Formula Library - LOCKED */}
        <FormulaDisplay showThresholds={true} />

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">AOV</span>
                </div>
                <p className="text-2xl font-bold">{formatVNDCompact(data.avgOrderValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('unit.avgOrderValue')}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">CM/Order</span>
                </div>
                <p className="text-2xl font-bold">{formatVNDCompact(data.contributionMarginPerOrder)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.contributionMarginPercent.toFixed(1)}% {t('unit.grossMargin')}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className={`bg-gradient-to-br ${ltvStatusColor[ltvStatus]}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground">LTV:CAC</span>
                </div>
                <p className="text-2xl font-bold">{data.ltvCacRatio.toFixed(1)}x</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {ltvStatusLabel[ltvStatus]}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">ROAS</span>
                </div>
                <p className="text-2xl font-bold">{data.returnOnAdSpend.toFixed(1)}x</p>
                <p className="text-xs text-muted-foreground mt-1">{t('unit.adEfficiency')}</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Tabs defaultValue="order" className="space-y-4">
          <TabsList>
            <TabsTrigger value="order">{t('unit.costPerOrder')}</TabsTrigger>
            <TabsTrigger value="customer">{t('unit.customer')}</TabsTrigger>
            <TabsTrigger value="channel">{t('unit.channel')}</TabsTrigger>
            <TabsTrigger value="trends">{t('unit.trends')}</TabsTrigger>
            <TabsTrigger value="sku">SKU Profitability</TabsTrigger>
          </TabsList>

          <TabsContent value="order" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Breakdown Waterfall */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('unit.orderCostBreakdown')}</CardTitle>
                  <CardDescription>{t('unit.breakdownDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                      <span className="font-medium">{t('unit.revenuePerOrder')}</span>
                      <span className="font-bold text-primary">{formatVND(data.avgOrderValue)}</span>
                    </div>
                    
                    <div className="space-y-2 pl-4 border-l-2 border-destructive/30">
                      <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                        <span className="text-sm">(-) {t('unit.cogs')}</span>
                        <span className="text-destructive">-{formatVND(data.cogsPerOrder)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                        <span className="text-sm">(-) {t('unit.platformFee')}</span>
                        <span className="text-destructive">-{formatVND(data.platformFeesPerOrder)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                        <span className="text-sm">(-) {t('unit.shipping')}</span>
                        <span className="text-destructive">-{formatVND(data.shippingCostPerOrder)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/10">
                      <span className="font-medium">= {t('unit.contributionMargin')}</span>
                      <div className="text-right">
                        <span className="font-bold text-green-500">{formatVND(data.contributionMarginPerOrder)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({data.contributionMarginPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Structure Pie */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('unit.costStructure')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPie>
                      <Pie
                        data={orderBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {orderBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatVND(value)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customer" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('unit.ltv')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">
                    {formatVNDCompact(data.customerLifetimeValue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('unit.ltvFormula')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('unit.cac')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-destructive">
                    {formatVNDCompact(data.customerAcquisitionCost)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('unit.cacFormula')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('unit.ltvCacRatio')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${data.ltvCacRatio >= 3 ? 'text-green-500' : data.ltvCacRatio >= 2 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.ltvCacRatio.toFixed(2)}x
                  </p>
                  <Progress 
                    value={Math.min(data.ltvCacRatio / 5 * 100, 100)} 
                    className="h-2 mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('unit.ltvCacTarget')}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('unit.customerMetrics')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('unit.totalCustomers')}</span>
                    <Badge variant="secondary">{data.totalCustomers}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('unit.newCustomers')}</span>
                    <Badge variant="outline">{data.newCustomersThisMonth}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('unit.repeatRate')}</span>
                    <Badge className="bg-green-500/10 text-green-500">
                      {data.repeatCustomerRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('unit.avgOrdersPerCustomer')}</span>
                    <Badge variant="secondary">{data.avgOrdersPerCustomer.toFixed(1)}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('unit.marketingEfficiency')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('unit.marketingSpend')}</span>
                    <span className="font-medium">{formatVNDCompact(data.totalMarketingSpend)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('unit.cpa')}</span>
                    <span className="font-medium">{formatVNDCompact(data.costPerAcquisition)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('unit.roas')}</span>
                    <Badge className={data.returnOnAdSpend >= 3 ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}>
                      {data.returnOnAdSpend.toFixed(1)}x
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('unit.mer')}</span>
                    <Badge variant="secondary">{data.marketingEfficiencyRatio.toFixed(1)}x</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="channel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('unit.byChannel')}</CardTitle>
                <CardDescription>{t('unit.channelDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.channelMetrics.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.channelMetrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
                        <Tooltip formatter={(value: number) => formatVND(value)} />
                        <Legend />
                        <Bar dataKey="revenue" name={t('board.revenue')} fill="hsl(var(--primary))" />
                        <Bar dataKey="cogs" name={t('unit.cogs')} fill="hsl(var(--destructive))" />
                        <Bar dataKey="fees" name={t('unit.platformFee')} fill="hsl(var(--chart-2))" />
                        <Bar dataKey="contributionMargin" name="CM" fill="hsl(var(--chart-4))" />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">{t('unit.channel')}</th>
                            <th className="text-right py-2">{t('unit.orders')}</th>
                            <th className="text-right py-2">AOV</th>
                            <th className="text-right py-2">CM</th>
                            <th className="text-right py-2">CM %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.channelMetrics.map((channel) => (
                            <tr key={channel.channel} className="border-b">
                              <td className="py-2 font-medium">{channel.channel}</td>
                              <td className="py-2 text-right">{channel.orders}</td>
                              <td className="py-2 text-right">{formatVNDCompact(channel.aov)}</td>
                              <td className="py-2 text-right">{formatVNDCompact(channel.contributionMargin)}</td>
                              <td className="py-2 text-right">
                                <Badge 
                                  variant={channel.contributionMarginPercent >= 20 ? 'default' : 'secondary'}
                                  className={channel.contributionMarginPercent >= 20 ? 'bg-green-500/10 text-green-500' : ''}
                                >
                                  {channel.contributionMarginPercent.toFixed(1)}%
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    {t('unit.noChannelData')}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('unit.trendsTitle')}</CardTitle>
                <CardDescription>{t('unit.trendsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.monthlyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={data.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" tickFormatter={(v) => formatVNDCompact(v)} />
                      <YAxis yAxisId="right" orientation="right" unit="%" />
                      <Tooltip 
                        formatter={(value: number, name: string) => 
                          name === 'AOV' ? formatVND(value) : `${value.toFixed(1)}%`
                        } 
                      />
                      <Legend />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="aov" 
                        name="AOV" 
                        fill="hsl(var(--primary) / 0.2)" 
                        stroke="hsl(var(--primary))" 
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="contributionMargin" 
                        name="CM %" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="roas" 
                        name="ROAS" 
                        stroke="hsl(var(--chart-4))" 
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    {t('unit.noTrendData')}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SKU Profitability Tab */}
          <TabsContent value="sku" className="space-y-6">
            <SKUProfitabilityAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
