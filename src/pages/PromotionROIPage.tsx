import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Percent, TrendingUp, DollarSign, ShoppingCart, Target, Award, Users, MousePointer, Eye, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePromotionROI, usePromotionsByChannel } from '@/hooks/usePromotions';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { LoadingState, EmptyState } from '@/components/shared';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { PromotionDecisionCards } from '@/components/promotion/PromotionDecisionCards';


const CHANNEL_COLORS: Record<string, string> = {
  'Facebook Ads': '#1877f2',
  'Google Ads': '#ea4335',
  'TikTok Ads': '#000000',
  'Email': '#10b981',
  'Shopee Ads': '#ee4d2d',
  'Lazada Ads': '#0f1daf',
  'Other': '#6b7280',
};

const getROASColor = (roas: number) => {
  if (roas >= 6) return 'text-green-600';
  if (roas >= 4) return 'text-lime-600';
  if (roas >= 2) return 'text-yellow-600';
  return 'text-red-600';
};

const getROASBadge = (roas: number) => {
  if (roas >= 6) return <Badge className="bg-green-500">Excellent</Badge>;
  if (roas >= 4) return <Badge className="bg-lime-500">Good</Badge>;
  if (roas >= 2) return <Badge className="bg-yellow-500">Fair</Badge>;
  return <Badge variant="destructive">Poor</Badge>;
};

export default function PromotionROIPage() {
  const { campaigns, roiData, summary, isLoading } = usePromotionROI();
  const channelData = usePromotionsByChannel();
  const { t } = useLanguage();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">{t('promo.statusActive')}</Badge>;
      case 'completed': return <Badge variant="secondary">{t('promo.statusEnded')}</Badge>;
      case 'paused': return <Badge variant="outline">{t('promo.statusPaused')}</Badge>;
      case 'cancelled': return <Badge variant="destructive">{t('promo.statusCancelled')}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) return <LoadingState variant="page" />;

  // Chart data for channel performance
  const channelChartData = channelData.map(ch => ({
    name: ch.channel?.replace(' Ads', '') || 'Other',
    fullName: ch.channel,
    revenue: ch.revenue / 1000000,
    spend: ch.spend / 1000000,
    roas: ch.roas,
    campaigns: ch.campaigns,
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('promo.totalPrograms')}</p>
                  <p className="text-xl font-bold">{summary.totalCampaigns}</p>
                  <p className="text-xs text-green-600">{summary.activeCampaigns} {t('promo.running')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('promo.totalCost')}</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.totalSpend)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('promo.totalRevenue')}</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New: Total Discount KPI */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Tag className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Tổng Discount</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(summary.totalDiscount)}</p>
                  <p className="text-xs text-muted-foreground">Net: {formatCurrency(summary.netRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('promo.avgROAS')}</p>
                  <p className={`text-xl font-bold ${getROASColor(summary.avgROAS)}`}>
                    {summary.avgROAS.toFixed(2)}x
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MousePointer className="w-8 h-8 text-indigo-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('promo.clicks')}</p>
                  <p className="text-xl font-bold">{formatNumber(summary.totalClicks)}</p>
                  <p className="text-xs text-muted-foreground">CTR: {summary.avgCTR.toFixed(2)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {campaigns.length === 0 ? (
          <EmptyState
            icon={Percent}
            title={t('promo.noData')}
            description={t('promo.noDataDesc')}
          />
        ) : (
          <>
            {/* Decision Cards */}
            <PromotionDecisionCards roiData={roiData} summary={summary} />

            {/* Channel Performance Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('promo.channelPerformance')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={channelChartData} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `${v}M`} />
                      <YAxis dataKey="name" type="category" width={80} fontSize={12} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'revenue' ? `${value.toFixed(1)}M VND` : `${value.toFixed(1)}M VND`,
                          name === 'revenue' ? t('promo.revenue') : t('promo.cost')
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name={t('promo.revenue')} fill="#10b981" />
                      <Bar dataKey="spend" name={t('promo.cost')} fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top/Bottom Performers */}
              <div className="space-y-4">
                {summary.topPerformer && (
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-green-600 flex items-center gap-2 text-base">
                        <Award className="w-5 h-5" />
                        {t('promo.topPerformer')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-bold">{summary.topPerformer.promotion.campaign_name}</p>
                      <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">ROAS</p>
                          <p className="font-bold text-green-600">{summary.topPerformer.roas.toFixed(2)}x</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('promo.revenue')}</p>
                          <p className="font-bold">{formatCurrency(summary.topPerformer.totalRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">CTR</p>
                          <p className="font-bold">{summary.topPerformer.ctr.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('promo.orders')}</p>
                          <p className="font-bold">{summary.topPerformer.totalOrders}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {summary.worstPerformer && summary.worstPerformer.roas < 3 && (
                  <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-amber-600 flex items-center gap-2 text-base">
                        <TrendingUp className="w-5 h-5 rotate-180" />
                        {t('promo.needsImprovement')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-bold">{summary.worstPerformer.promotion.campaign_name}</p>
                      <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">ROAS</p>
                          <p className="font-bold text-amber-600">{summary.worstPerformer.roas.toFixed(2)}x</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('promo.costPerOrder')}</p>
                          <p className="font-bold">{formatCurrency(summary.worstPerformer.costPerOrder)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">CTR</p>
                          <p className="font-bold">{summary.worstPerformer.ctr.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('promo.orders')}</p>
                          <p className="font-bold">{summary.worstPerformer.totalOrders}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Campaign Detail Table */}
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
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Net Revenue</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">{t('promo.orders')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roiData.map(r => (
                      <TableRow key={r.promotion.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {r.promotion.campaign_name}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            style={{ 
                              borderColor: CHANNEL_COLORS[r.promotion.channel || 'Other'] || '#6b7280',
                              color: CHANNEL_COLORS[r.promotion.channel || 'Other'] || '#6b7280'
                            }}
                          >
                            {r.promotion.channel?.replace(' Ads', '') || 'Other'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(r.promotion.status)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.promotion.actual_cost)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(r.totalRevenue)}</TableCell>
                        <TableCell className="text-right text-orange-600">
                          {r.totalDiscount > 0 ? `-${formatCurrency(r.totalDiscount)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-700">
                          {formatCurrency(r.netRevenue)}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${getROASColor(r.roas)}`}>
                          {r.roas.toFixed(2)}x
                        </TableCell>
                        <TableCell className="text-right">{r.ctr.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{r.totalOrders}</TableCell>
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
