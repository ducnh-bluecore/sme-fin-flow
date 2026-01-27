/**
 * UnitEconomicsDecisionCards - Actionable decision insights
 * 
 * FDP Manifesto Principles:
 * - #6: Unit Economics → Action
 * - #8: Surface Problems
 * 
 * Shows warnings and opportunities based on thresholds
 */

import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  TrendingDown, 
  Target, 
  X,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatVNDCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { UnitEconomicsData } from '@/hooks/useUnitEconomics';
import { FDP_THRESHOLDS } from '@/lib/fdp-formulas';
import { useLanguage } from '@/contexts/LanguageContext';

interface DecisionCard {
  id: string;
  type: 'warning' | 'critical' | 'opportunity';
  metric: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  impact: string;
  suggestion: string;
  action?: string;
}

interface UnitEconomicsDecisionCardsProps {
  data: UnitEconomicsData;
  onDismiss?: (cardId: string) => void;
  onAction?: (cardId: string, action: string) => void;
}

export function UnitEconomicsDecisionCards({ 
  data, 
  onDismiss,
  onAction 
}: UnitEconomicsDecisionCardsProps) {
  const { t } = useLanguage();
  const cards: DecisionCard[] = [];

  // LTV:CAC Check
  if (data.ltvCacRatio < 3 && data.ltvCacRatio > 0) {
    cards.push({
      id: 'ltv-cac-low',
      type: data.ltvCacRatio < 2 ? 'critical' : 'warning',
      metric: 'LTV:CAC',
      title: 'LTV:CAC dưới ngưỡng an toàn',
      current: data.ltvCacRatio,
      target: 3,
      unit: 'x',
      impact: `Thiếu ${((3 - data.ltvCacRatio) / 3 * 100).toFixed(0)}% để đạt mục tiêu 3x`,
      suggestion: 'Giảm CAC hoặc tăng LTV qua upsell/cross-sell',
      action: 'Xem chi tiết CAC'
    });
  }

  // CM% Check
  if (data.contributionMarginPercent < FDP_THRESHOLDS.CM_WARNING_PERCENT && data.contributionMarginPercent !== 0) {
    const potentialLoss = (FDP_THRESHOLDS.CM_WARNING_PERCENT - data.contributionMarginPercent) / 100 * data.rawData.totalRevenue;
    cards.push({
      id: 'cm-low',
      type: data.contributionMarginPercent < FDP_THRESHOLDS.CM_CRITICAL_PERCENT ? 'critical' : 'warning',
      metric: 'Contribution Margin',
      title: 'Contribution Margin thấp',
      current: data.contributionMarginPercent,
      target: FDP_THRESHOLDS.CM_WARNING_PERCENT,
      unit: '%',
      impact: `Mất ~${formatVNDCompact(potentialLoss)} tiềm năng nếu không cải thiện`,
      suggestion: 'Review COGS và phí sàn cho top SKU',
      action: 'Xem SKU Profitability'
    });
  }

  // ROAS Check
  if (data.returnOnAdSpend < FDP_THRESHOLDS.ROAS_WARNING && data.returnOnAdSpend > 0) {
    cards.push({
      id: 'roas-low',
      type: data.returnOnAdSpend < FDP_THRESHOLDS.ROAS_CRITICAL ? 'critical' : 'warning',
      metric: 'ROAS',
      title: 'Hiệu quả quảng cáo thấp',
      current: data.returnOnAdSpend,
      target: FDP_THRESHOLDS.ROAS_WARNING,
      unit: 'x',
      impact: `ROAS ${data.returnOnAdSpend.toFixed(1)}x < ${FDP_THRESHOLDS.ROAS_WARNING}x ngưỡng tối thiểu`,
      suggestion: 'Review và tối ưu campaigns, cân nhắc pause campaigns kém hiệu quả',
      action: 'Xem MDP'
    });
  }

  // Opportunity: High margin potential
  if (data.avgOrderValue > 0 && data.contributionMarginPercent >= FDP_THRESHOLDS.CM_GOOD_PERCENT) {
    cards.push({
      id: 'opportunity-scale',
      type: 'opportunity',
      metric: 'Cơ hội',
      title: 'Unit Economics khỏe mạnh',
      current: data.contributionMarginPercent,
      target: 50,
      unit: '%',
      impact: `CM ${data.contributionMarginPercent.toFixed(1)}% cho phép scale với an toàn`,
      suggestion: 'Có thể tăng marketing spend để mở rộng nếu có runway',
      action: 'Xem kịch bản scale'
    });
  }

  if (cards.length === 0) {
    return null;
  }

  const typeConfig = {
    critical: {
      icon: AlertTriangle,
      bg: 'bg-destructive/10',
      border: 'border-destructive/50',
      iconColor: 'text-destructive',
      badgeClass: 'bg-destructive text-destructive-foreground'
    },
    warning: {
      icon: TrendingDown,
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/50',
      iconColor: 'text-amber-500',
      badgeClass: 'bg-amber-500 text-white'
    },
    opportunity: {
      icon: Lightbulb,
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/50',
      iconColor: 'text-emerald-500',
      badgeClass: 'bg-emerald-500 text-white'
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          {t('unit.decisionCards') || 'Quyết định cần hành động'}
          <Badge variant="secondary" className="text-xs">
            {cards.length} {cards.length === 1 ? 'insight' : 'insights'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {cards.map((card, index) => {
          const config = typeConfig[card.type];
          const Icon = config.icon;
          
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-4 rounded-lg border",
                config.bg,
                config.border
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn("p-2 rounded-lg", config.bg)}>
                    <Icon className={cn("h-4 w-4", config.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn("text-xs", config.badgeClass)}>
                        {card.metric}
                      </Badge>
                      <span className="font-medium text-sm">{card.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {card.impact}
                    </p>
                    <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      {card.suggestion}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-3">
                  {card.action && onAction && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => onAction(card.id, card.action!)}
                    >
                      {card.action}
                    </Button>
                  )}
                  {onDismiss && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => onDismiss(card.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Progress indicator */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      card.type === 'critical' ? 'bg-destructive' :
                      card.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                    style={{ 
                      width: `${Math.min((card.current / card.target) * 100, 100)}%` 
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {card.current.toFixed(1)}{card.unit} / {card.target}{card.unit}
                </span>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default UnitEconomicsDecisionCards;
