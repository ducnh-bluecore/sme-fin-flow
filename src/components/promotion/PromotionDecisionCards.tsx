import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, Wallet, Pause, ArrowUpCircle, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useLanguage } from '@/contexts/LanguageContext';
import { PromotionROIData, PromotionSummary } from '@/hooks/usePromotions';

interface PromotionDecisionCardsProps {
  roiData: PromotionROIData[];
  summary: PromotionSummary;
}

export const PromotionDecisionCards = ({ roiData, summary }: PromotionDecisionCardsProps) => {
  const { t } = useLanguage();

  // Find campaigns that need action
  const campaignsToKill = roiData.filter(r => r.roas < 3 && r.promotion.status === 'active');
  const campaignsToScale = roiData.filter(r => r.roas >= 6 && r.promotion.status === 'active');
  const worstCampaign = campaignsToKill.sort((a, b) => a.roas - b.roas)[0];
  const bestCampaign = campaignsToScale.sort((a, b) => b.roas - a.roas)[0];

  // Calculate potential loss from low performers
  let potentialLoss = 0;
  for (const c of campaignsToKill) {
    if (c.roas < 1) {
      potentialLoss += (c.promotion.actual_cost - c.totalRevenue);
    } else {
      potentialLoss += (c.promotion.actual_cost * 0.3);
    }
  }

  // Budget utilization status
  const budgetStatus = summary.budgetUtilization > 90 
    ? 'danger' 
    : summary.budgetUtilization < 50 
      ? 'warning' 
      : 'success';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Campaign cần dừng */}
      <Card className={`border-l-4 ${campaignsToKill.length > 0 ? 'border-l-amber-500 bg-amber-50/50' : 'border-l-green-500 bg-green-50/50'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {campaignsToKill.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : (
              <TrendingUp className="w-5 h-5 text-green-600" />
            )}
            {t('promo.decisionKill')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {worstCampaign ? (
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-sm truncate">{worstCampaign.promotion.campaign_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    ROAS: {worstCampaign.roas.toFixed(2)}x
                  </Badge>
                  <Badge variant="outline" className="text-muted-foreground">
                    {worstCampaign.promotion.channel}
                  </Badge>
                </div>
              </div>
              
              {potentialLoss > 0 && (
                <div className="p-2 bg-amber-100 rounded-md">
                  <p className="text-xs text-amber-700">{t('promo.potentialLoss')}</p>
                  <p className="text-lg font-bold text-amber-800">{formatCurrency(potentialLoss)}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="w-4 h-4 mr-1" />
                  {t('common.view')}
                </Button>
                <Button variant="secondary" size="sm" className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-800">
                  <Pause className="w-4 h-4 mr-1" />
                  {t('promo.pauseCampaign')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-green-600 font-medium">{t('promo.allCampaignsHealthy')}</p>
              <p className="text-sm text-muted-foreground">{t('promo.noLowPerformers')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign nên scale */}
      <Card className={`border-l-4 ${bestCampaign ? 'border-l-green-500 bg-green-50/50' : 'border-l-muted'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            {t('promo.decisionScale')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bestCampaign ? (
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-sm truncate">{bestCampaign.promotion.campaign_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-green-500 text-white">
                    ROAS: {bestCampaign.roas.toFixed(2)}x
                  </Badge>
                  <Badge variant="outline" className="text-muted-foreground">
                    {bestCampaign.promotion.channel}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('promo.currentSpend')}</p>
                  <p className="font-semibold">{formatCurrency(bestCampaign.promotion.actual_cost)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('promo.revenue')}</p>
                  <p className="font-semibold text-green-600">{formatCurrency(bestCampaign.totalRevenue)}</p>
                </div>
              </div>

              <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                <ArrowUpCircle className="w-4 h-4 mr-1" />
                {t('promo.increaseBudget')}
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">{t('promo.noHighPerformers')}</p>
              <p className="text-sm text-muted-foreground">{t('promo.roasThreshold')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Efficiency */}
      <Card className={`border-l-4 ${
        budgetStatus === 'danger' ? 'border-l-red-500' : 
        budgetStatus === 'warning' ? 'border-l-amber-500' : 'border-l-green-500'
      }`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            {t('promo.budgetEfficiency')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('promo.totalBudget')}</span>
              <span className="font-semibold">{formatCurrency(summary.totalBudget)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('promo.actualSpend')}</span>
              <span className="font-semibold">{formatCurrency(summary.totalSpend)}</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{t('promo.utilization')}</span>
                <span className={`font-semibold ${
                  budgetStatus === 'danger' ? 'text-red-600' : 
                  budgetStatus === 'warning' ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {summary.budgetUtilization.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.min(summary.budgetUtilization, 100)} 
                className={`h-2 ${
                  budgetStatus === 'danger' ? '[&>div]:bg-red-500' : 
                  budgetStatus === 'warning' ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'
                }`}
              />
            </div>

            {budgetStatus === 'danger' && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                ⚠️ {t('promo.budgetWarningHigh')}
              </p>
            )}
            {budgetStatus === 'warning' && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                💡 {t('promo.budgetWarningLow')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
