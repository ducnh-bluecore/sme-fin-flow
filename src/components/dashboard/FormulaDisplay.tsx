/**
 * Formula Display Component
 * 
 * FDP Manifesto Principle #3: Truth > Flexibility
 * Hiển thị tất cả công thức đang được sử dụng
 * Để user biết rằng công thức là LOCKED, không thể thay đổi
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Lock, 
  Info, 
  ChevronDown, 
  Calculator,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FORMULA_REGISTRY, FDP_THRESHOLDS } from '@/lib/fdp-formulas';
import { cn } from '@/lib/utils';

interface FormulaDisplayProps {
  showThresholds?: boolean;
}

export default function FormulaDisplay({ showThresholds = true }: FormulaDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formulas = Object.entries(FORMULA_REGISTRY);
  
  const thresholdGroups = [
    {
      name: 'Cash & Runway',
      thresholds: [
        { label: 'Runway Critical', value: `< ${FDP_THRESHOLDS.RUNWAY_CRITICAL_MONTHS} tháng`, status: 'critical' },
        { label: 'Runway Warning', value: `< ${FDP_THRESHOLDS.RUNWAY_WARNING_MONTHS} tháng`, status: 'warning' },
      ]
    },
    {
      name: 'Profitability',
      thresholds: [
        { label: 'CM% Critical', value: `< ${FDP_THRESHOLDS.CM_CRITICAL_PERCENT}%`, status: 'critical' },
        { label: 'CM% Warning', value: `< ${FDP_THRESHOLDS.CM_WARNING_PERCENT}%`, status: 'warning' },
        { label: 'CM% Good', value: `≥ ${FDP_THRESHOLDS.CM_GOOD_PERCENT}%`, status: 'good' },
      ]
    },
    {
      name: 'Customer Economics',
      thresholds: [
        { label: 'LTV:CAC Critical', value: `< ${FDP_THRESHOLDS.LTV_CAC_CRITICAL}x`, status: 'critical' },
        { label: 'LTV:CAC Warning', value: `< ${FDP_THRESHOLDS.LTV_CAC_WARNING}x`, status: 'warning' },
        { label: 'LTV:CAC Good', value: `≥ ${FDP_THRESHOLDS.LTV_CAC_GOOD}x`, status: 'good' },
      ]
    },
    {
      name: 'Marketing',
      thresholds: [
        { label: 'ROAS Critical', value: `< ${FDP_THRESHOLDS.ROAS_CRITICAL}x`, status: 'critical' },
        { label: 'ROAS Warning', value: `< ${FDP_THRESHOLDS.ROAS_WARNING}x`, status: 'warning' },
        { label: 'ROAS Good', value: `≥ ${FDP_THRESHOLDS.ROAS_GOOD}x`, status: 'good' },
      ]
    },
    {
      name: 'SKU Decision',
      thresholds: [
        { label: 'STOP Immediately', value: `Margin < ${FDP_THRESHOLDS.SKU_CRITICAL_MARGIN_PERCENT}%`, status: 'critical' },
        { label: 'Review SKU', value: `Margin < ${FDP_THRESHOLDS.SKU_STOP_MARGIN_PERCENT}%`, status: 'warning' },
        { label: 'Low Margin', value: `Margin < ${FDP_THRESHOLDS.SKU_REVIEW_MARGIN_PERCENT}%`, status: 'warning' },
      ]
    },
    {
      name: 'DSO & CCC',
      thresholds: [
        { label: 'DSO Critical', value: `> ${FDP_THRESHOLDS.DSO_CRITICAL_DAYS} ngày`, status: 'critical' },
        { label: 'DSO Warning', value: `> ${FDP_THRESHOLDS.DSO_WARNING_DAYS} ngày`, status: 'warning' },
        { label: 'CCC Critical', value: `> ${FDP_THRESHOLDS.CCC_CRITICAL_DAYS} ngày`, status: 'critical' },
        { label: 'CCC Warning', value: `> ${FDP_THRESHOLDS.CCC_WARNING_DAYS} ngày`, status: 'warning' },
      ]
    },
    {
      name: 'AR & Channel',
      thresholds: [
        { label: 'AR Overdue Critical', value: `> ${FDP_THRESHOLDS.AR_OVERDUE_CRITICAL_PERCENT}%`, status: 'critical' },
        { label: 'AR Overdue Warning', value: `> ${FDP_THRESHOLDS.AR_OVERDUE_WARNING_PERCENT}%`, status: 'warning' },
        { label: 'Channel Fee Critical', value: `> ${FDP_THRESHOLDS.CHANNEL_FEE_CRITICAL_PERCENT}%`, status: 'critical' },
        { label: 'Channel Fee Warning', value: `> ${FDP_THRESHOLDS.CHANNEL_FEE_WARNING_PERCENT}%`, status: 'warning' },
      ]
    }
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <span>FDP Formula Library</span>
            <Badge variant="secondary" className="text-xs">
              {formulas.length} công thức LOCKED
            </Badge>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-3">
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Single Source of Truth</CardTitle>
              </div>
              <Badge className="bg-primary/10 text-primary border-none gap-1">
                <Lock className="h-3 w-3" />
                Không thể chỉnh sửa
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              FDP Principle #3: Truth &gt; Flexibility - Tất cả công thức được LOCK, không cho phép tùy chỉnh
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Formulas Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {formulas.map(([key, formula]) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm font-medium text-primary">{formula.name}</p>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mb-1">
                    {formula.formula}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formula.description}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Thresholds */}
            {showThresholds && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-medium">Ngưỡng cảnh báo LOCKED</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {thresholdGroups.map(group => (
                    <div key={group.name} className="p-3 rounded-lg bg-muted/20">
                      <p className="text-xs font-medium text-muted-foreground mb-2">{group.name}</p>
                      <div className="space-y-1">
                        {group.thresholds.map((t, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{t.label}</span>
                            <Badge 
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5",
                                t.status === 'critical' && 'border-red-500/50 text-red-500',
                                t.status === 'warning' && 'border-amber-500/50 text-amber-500',
                                t.status === 'good' && 'border-emerald-500/50 text-emerald-500'
                              )}
                            >
                              {t.value}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FDP Principle reminder */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">FDP Manifesto Compliance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tất cả metrics trong hệ thống đều sử dụng công thức từ thư viện này.
                    Không có phòng ban nào được tự định nghĩa metric riêng.
                    Không có "số đẹp" - chỉ có SỰ THẬT.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
