import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Percent, TrendingUp, DollarSign, ShoppingCart, Target, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePromotionROI } from '@/hooks/usePromotions';
import { formatCurrency } from '@/lib/formatters';
import { LoadingState, EmptyState } from '@/components/shared';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const getROIColor = (roi: number) => {
  if (roi >= 100) return 'text-green-600';
  if (roi >= 50) return 'text-lime-600';
  if (roi >= 0) return 'text-yellow-600';
  return 'text-red-600';
};

export default function PromotionROIPage() {
  const { promotions, roiData, summary, isLoading } = usePromotionROI();
  const { t } = useLanguage();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">{t('promo.statusActive')}</Badge>;
      case 'ended': return <Badge variant="secondary">{t('promo.statusEnded')}</Badge>;
      case 'draft': return <Badge variant="outline">{t('promo.statusDraft')}</Badge>;
      case 'cancelled': return <Badge variant="destructive">{t('promo.statusCancelled')}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChannelBadge = (channel: string | null) => {
    if (!channel) return null;
    const colors: Record<string, string> = {
      shopee: 'bg-orange-500',
      lazada: 'bg-blue-500',
      tiktok: 'bg-black',
      website: 'bg-purple-500',
      all: 'bg-gray-500',
    };
    return <Badge className={colors[channel] || 'bg-gray-500'}>{channel}</Badge>;
  };

  if (isLoading) return <LoadingState variant="page" />;

  const chartData = roiData.slice(0, 10).map(r => ({
    name: r.promotion.promotion_name.substring(0, 20),
    roi: r.roi,
    roas: r.roas,
    revenue: r.totalRevenue / 1000000,
  }));

  return (
    <>
      <Helmet>
        <title>{t('promo.title')} | Bluecore Finance</title>
      </Helmet>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Percent className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t('promo.title')}</h1>
            <p className="text-muted-foreground">{t('promo.subtitle')}</p>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('promo.totalPrograms')}</p>
                  <p className="text-2xl font-bold">{summary.totalPromotions}</p>
                  <p className="text-xs text-green-600">{summary.activePromotions} {t('promo.running')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('promo.totalCost')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.totalSpend)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('promo.totalRevenue')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('promo.avgROI')}</p>
                  <p className={`text-2xl font-bold ${getROIColor(summary.avgROI)}`}>
                    {summary.avgROI.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">ROAS: {summary.avgROAS.toFixed(2)}x</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {promotions.length === 0 ? (
          <EmptyState
            icon={Percent}
            title={t('promo.noData')}
            description={t('promo.noDataDesc')}
          />
        ) : (
          <>
            {/* Top/Bottom Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {summary.topPerformer && (
                <Card className="border-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-green-600 flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      {t('promo.topPerformer')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold text-lg">{summary.topPerformer.promotion.promotion_name}</p>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">ROI</p>
                        <p className="text-xl font-bold text-green-600">{summary.topPerformer.roi.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ROAS</p>
                        <p className="text-xl font-bold">{summary.topPerformer.roas.toFixed(2)}x</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('promo.revenue')}</p>
                        <p className="text-xl font-bold">{formatCurrency(summary.topPerformer.totalRevenue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {summary.worstPerformer && summary.worstPerformer.roi < 0 && (
                <Card className="border-red-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 rotate-180" />
                      {t('promo.needsImprovement')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold text-lg">{summary.worstPerformer.promotion.promotion_name}</p>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">ROI</p>
                        <p className="text-xl font-bold text-red-600">{summary.worstPerformer.roi.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ROAS</p>
                        <p className="text-xl font-bold">{summary.worstPerformer.roas.toFixed(2)}x</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('promo.costPerOrder')}</p>
                        <p className="text-xl font-bold">{formatCurrency(summary.worstPerformer.costPerOrder)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('promo.roiByProgram')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Bar dataKey="roi" name="ROI %" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('promo.roasVsRevenue')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={80} />
                      <YAxis yAxisId="left" orientation="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="roas" name="ROAS" stroke="#3b82f6" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" name={t('promo.revenueMillion')} stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Promotions Table */}
            <Card>
              <CardHeader>
                <CardTitle>{t('promo.programDetails')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('promo.programName')}</TableHead>
                      <TableHead>{t('promo.channel')}</TableHead>
                      <TableHead>{t('promo.status')}</TableHead>
                      <TableHead className="text-right">{t('promo.cost')}</TableHead>
                      <TableHead className="text-right">{t('promo.revenue')}</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                      <TableHead>{t('promo.progress')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roiData.map(r => (
                      <TableRow key={r.promotion.id}>
                        <TableCell className="font-medium">{r.promotion.promotion_name}</TableCell>
                        <TableCell>{getChannelBadge(r.promotion.channel)}</TableCell>
                        <TableCell>{getStatusBadge(r.promotion.status)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.promotion.actual_spend)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.totalRevenue)}</TableCell>
                        <TableCell className={`text-right font-bold ${getROIColor(r.roi)}`}>
                          {r.roi.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">{r.roas.toFixed(2)}x</TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress value={r.conversionRate} className="h-2" />
                            <span className="text-xs text-muted-foreground">{r.conversionRate.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
