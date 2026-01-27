/**
 * UnitEconomicsCalculator - Interactive What-If Scenario Tool
 * 
 * FDP Manifesto Principle #7: Today's Decision
 * Helps simulate impact of changes on unit economics
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown,
  RotateCcw,
  Percent,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatVNDCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { UnitEconomicsData } from '@/hooks/useUnitEconomics';
import { useLanguage } from '@/contexts/LanguageContext';

interface UnitEconomicsCalculatorProps {
  data: UnitEconomicsData;
}

export function UnitEconomicsCalculator({ data }: UnitEconomicsCalculatorProps) {
  const { t } = useLanguage();
  
  // Adjustment sliders (as percentages)
  const [cogsAdjust, setCogsAdjust] = useState(0);
  const [aovAdjust, setAovAdjust] = useState(0);
  const [marketingAdjust, setMarketingAdjust] = useState(0);

  // Calculate projected values
  const projections = useMemo(() => {
    const baseAOV = data.avgOrderValue;
    const baseCOGS = data.cogsPerOrder;
    const baseCM = data.contributionMarginPerOrder;
    const baseMarketing = data.totalMarketingSpend;
    const baseLTV = data.customerLifetimeValue;
    const baseCAC = data.customerAcquisitionCost;
    const baseROAS = data.returnOnAdSpend;
    
    // Apply adjustments
    const newAOV = baseAOV * (1 + aovAdjust / 100);
    const newCOGS = baseCOGS * (1 + cogsAdjust / 100);
    const newMarketing = baseMarketing * (1 + marketingAdjust / 100);
    
    // Recalculate CM
    const feePerOrder = data.platformFeesPerOrder + data.shippingCostPerOrder;
    const newCMPerOrder = newAOV - newCOGS - feePerOrder;
    const newCMPercent = newAOV > 0 ? (newCMPerOrder / newAOV) * 100 : 0;
    
    // Recalculate CAC & LTV
    const newCAC = data.totalCustomers > 0 ? newMarketing / data.totalCustomers : 0;
    const avgOrdersPerCustomer = data.avgOrdersPerCustomer || 1;
    const newLTV = newAOV * avgOrdersPerCustomer * (newCMPercent / 100);
    const newLTVCAC = newCAC > 0 ? newLTV / newCAC : 0;
    
    // Recalculate ROAS
    const newRevenue = data.rawData.totalRevenue * (1 + aovAdjust / 100);
    const newROAS = newMarketing > 0 ? newRevenue / newMarketing : 0;
    
    return {
      aov: { base: baseAOV, new: newAOV, change: aovAdjust },
      cogs: { base: baseCOGS, new: newCOGS, change: cogsAdjust },
      cmPerOrder: { base: baseCM, new: newCMPerOrder, change: baseCM > 0 ? ((newCMPerOrder - baseCM) / baseCM) * 100 : 0 },
      cmPercent: { base: data.contributionMarginPercent, new: newCMPercent, change: newCMPercent - data.contributionMarginPercent },
      ltv: { base: baseLTV, new: newLTV, change: baseLTV > 0 ? ((newLTV - baseLTV) / baseLTV) * 100 : 0 },
      cac: { base: baseCAC, new: newCAC, change: baseCAC > 0 ? ((newCAC - baseCAC) / baseCAC) * 100 : 0 },
      ltvCac: { base: data.ltvCacRatio, new: newLTVCAC, change: newLTVCAC - data.ltvCacRatio },
      roas: { base: baseROAS, new: newROAS, change: baseROAS > 0 ? ((newROAS - baseROAS) / baseROAS) * 100 : 0 },
    };
  }, [data, cogsAdjust, aovAdjust, marketingAdjust]);

  const handleReset = () => {
    setCogsAdjust(0);
    setAovAdjust(0);
    setMarketingAdjust(0);
  };

  const hasChanges = cogsAdjust !== 0 || aovAdjust !== 0 || marketingAdjust !== 0;

  const MetricChange = ({ 
    label, 
    base, 
    projected, 
    change,
    format = 'currency',
    suffix = ''
  }: { 
    label: string; 
    base: number; 
    projected: number; 
    change: number;
    format?: 'currency' | 'percent' | 'ratio';
    suffix?: string;
  }) => {
    const isPositive = change > 0;
    const formatValue = (val: number) => {
      if (format === 'currency') return formatVNDCompact(val);
      if (format === 'percent') return `${val.toFixed(1)}%`;
      return `${val.toFixed(2)}x`;
    };

    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground/70">
            {formatValue(base)}
          </span>
          <span className="text-sm">→</span>
          <span className={cn(
            "font-medium text-sm",
            change > 0 ? 'text-emerald-500' : change < 0 ? 'text-destructive' : ''
          )}>
            {formatValue(projected)}{suffix}
          </span>
          {change !== 0 && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                isPositive ? 'text-emerald-500 border-emerald-500/50' : 'text-destructive border-destructive/50'
              )}
            >
              {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {isPositive ? '+' : ''}{change.toFixed(1)}%
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              {t('unit.whatIfCalculator') || 'What-If Calculator'}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('unit.whatIfDesc') || 'Mô phỏng tác động thay đổi COGS, AOV, Marketing'}
            </CardDescription>
          </div>
          {hasChanges && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-8 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Sliders */}
        <div className="space-y-5">
          {/* COGS Adjustment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                COGS
              </label>
              <Badge variant={cogsAdjust < 0 ? 'default' : cogsAdjust > 0 ? 'destructive' : 'secondary'}>
                {cogsAdjust > 0 ? '+' : ''}{cogsAdjust}%
              </Badge>
            </div>
            <Slider
              value={[cogsAdjust]}
              onValueChange={(v) => setCogsAdjust(v[0])}
              min={-20}
              max={20}
              step={1}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>-20% (giảm giá vốn)</span>
              <span>+20% (tăng giá vốn)</span>
            </div>
          </div>

          {/* AOV Adjustment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                AOV (Giá đơn TB)
              </label>
              <Badge variant={aovAdjust > 0 ? 'default' : aovAdjust < 0 ? 'destructive' : 'secondary'}>
                {aovAdjust > 0 ? '+' : ''}{aovAdjust}%
              </Badge>
            </div>
            <Slider
              value={[aovAdjust]}
              onValueChange={(v) => setAovAdjust(v[0])}
              min={-20}
              max={20}
              step={1}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>-20% (giảm giá)</span>
              <span>+20% (tăng giá/upsell)</span>
            </div>
          </div>

          {/* Marketing Adjustment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                Marketing Spend
              </label>
              <Badge variant={marketingAdjust < 0 ? 'default' : marketingAdjust > 0 ? 'secondary' : 'secondary'}>
                {marketingAdjust > 0 ? '+' : ''}{marketingAdjust}%
              </Badge>
            </div>
            <Slider
              value={[marketingAdjust]}
              onValueChange={(v) => setMarketingAdjust(v[0])}
              min={-30}
              max={30}
              step={5}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>-30% (cắt giảm)</span>
              <span>+30% (scale)</span>
            </div>
          </div>
        </div>

        {/* Projected Results */}
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="border-t border-border pt-4 space-y-1"
          >
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Dự kiến kết quả
            </p>
            
            <MetricChange 
              label="CM/Order" 
              base={projections.cmPerOrder.base}
              projected={projections.cmPerOrder.new}
              change={projections.cmPerOrder.change}
            />
            <MetricChange 
              label="CM%" 
              base={projections.cmPercent.base}
              projected={projections.cmPercent.new}
              change={projections.cmPercent.change}
              format="percent"
            />
            <MetricChange 
              label="LTV:CAC" 
              base={projections.ltvCac.base}
              projected={projections.ltvCac.new}
              change={projections.ltvCac.change * 100 / (projections.ltvCac.base || 1)}
              format="ratio"
            />
            <MetricChange 
              label="ROAS" 
              base={projections.roas.base}
              projected={projections.roas.new}
              change={projections.roas.change}
              format="ratio"
            />
          </motion.div>
        )}

        {!hasChanges && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Điều chỉnh các thanh trượt để xem dự đoán
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default UnitEconomicsCalculator;
