import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Factory, Handshake, CheckCircle2, ArrowRight, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { formatVNDCompact, formatCount } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface HeroDecisionCardProps {
  makeData: {
    fixedCost: number;
    variableCostPerUnit: number;
    volume: number;
  };
  buyData: {
    pricePerUnit: number;
    volume: number;
  };
  onMakeChange: (data: { fixedCost: number; variableCostPerUnit: number; volume: number }) => void;
  onBuyChange: (data: { pricePerUnit: number; volume: number }) => void;
}

export function HeroDecisionCard({
  makeData,
  buyData,
  onMakeChange,
  onBuyChange,
}: HeroDecisionCardProps) {
  const { t } = useLanguage();
  
  const makeTotalCost = makeData.fixedCost + (makeData.variableCostPerUnit * makeData.volume);
  const buyTotalCost = buyData.pricePerUnit * buyData.volume;
  const breakEvenVolume = Math.ceil(makeData.fixedCost / (buyData.pricePerUnit - makeData.variableCostPerUnit));
  
  const recommendation = makeTotalCost < buyTotalCost ? 'make' : 'buy';
  const savings = Math.abs(makeTotalCost - buyTotalCost);
  const savingsPercent = (savings / Math.max(makeTotalCost, buyTotalCost)) * 100;

  // Confidence score based on data completeness and margin
  const confidenceScore = Math.min(95, Math.max(60, savingsPercent * 5 + 50));
  const confidenceLevel = confidenceScore >= 80 ? 'high' : confidenceScore >= 65 ? 'medium' : 'low';

  return (
    <Card className="overflow-hidden border-0 shadow-elevated bg-gradient-to-br from-card via-card to-accent/20">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Quyết định: Sản xuất hay Thuê ngoài?</h2>
                <p className="text-sm text-muted-foreground">So sánh chi phí và đưa ra khuyến nghị</p>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                'px-3 py-1',
                confidenceLevel === 'high' && 'border-success text-success bg-success/10',
                confidenceLevel === 'medium' && 'border-warning text-warning bg-warning/10',
                confidenceLevel === 'low' && 'border-muted-foreground text-muted-foreground'
              )}
            >
              Confidence: {confidenceScore.toFixed(0)}%
            </Badge>
          </div>
        </div>

        {/* Main comparison area */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-6 items-center">
            {/* MAKE Option */}
            <motion.div
              className={cn(
                'relative rounded-2xl p-6 transition-all duration-300',
                recommendation === 'make' 
                  ? 'bg-primary/5 ring-2 ring-primary shadow-lg' 
                  : 'bg-muted/30 hover:bg-muted/50'
              )}
              whileHover={{ scale: 1.01 }}
            >
              {recommendation === 'make' && (
                <motion.div 
                  className="absolute -top-3 -right-3"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.3 }}
                >
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                </motion.div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Factory className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Tự sản xuất</h3>
                  <p className="text-xs text-muted-foreground">Fixed + Variable costs</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Chi phí cố định</Label>
                  <Input
                    type="number"
                    value={makeData.fixedCost}
                    onChange={(e) => onMakeChange({ ...makeData, fixedCost: Number(e.target.value) })}
                    className="mt-1 bg-background/50"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Chi phí biến đổi/đơn vị</Label>
                  <Input
                    type="number"
                    value={makeData.variableCostPerUnit}
                    onChange={(e) => onMakeChange({ ...makeData, variableCostPerUnit: Number(e.target.value) })}
                    className="mt-1 bg-background/50"
                  />
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-muted-foreground mb-1">Tổng chi phí</p>
                <p className="text-2xl font-bold text-blue-600">{formatVNDCompact(makeTotalCost)}</p>
              </div>
            </motion.div>

            {/* VS Divider */}
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xl font-bold text-muted-foreground">VS</span>
              </div>
              <motion.div
                animate={{ x: recommendation === 'buy' ? 10 : -10 }}
                transition={{ repeat: Infinity, duration: 1, repeatType: 'reverse' }}
              >
                <ArrowRight className={cn(
                  'h-6 w-6',
                  recommendation === 'buy' ? 'text-success' : 'text-primary rotate-180'
                )} />
              </motion.div>
            </div>

            {/* BUY Option */}
            <motion.div
              className={cn(
                'relative rounded-2xl p-6 transition-all duration-300',
                recommendation === 'buy' 
                  ? 'bg-success/5 ring-2 ring-success shadow-lg' 
                  : 'bg-muted/30 hover:bg-muted/50'
              )}
              whileHover={{ scale: 1.01 }}
            >
              {recommendation === 'buy' && (
                <motion.div 
                  className="absolute -top-3 -right-3"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.3 }}
                >
                  <div className="h-8 w-8 rounded-full bg-success flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="h-5 w-5 text-success-foreground" />
                  </div>
                </motion.div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Handshake className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Thuê ngoài</h3>
                  <p className="text-xs text-muted-foreground">Price per unit × Volume</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Giá mua/đơn vị</Label>
                  <Input
                    type="number"
                    value={buyData.pricePerUnit}
                    onChange={(e) => onBuyChange({ ...buyData, pricePerUnit: Number(e.target.value) })}
                    className="mt-1 bg-background/50"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Sản lượng dự kiến</Label>
                  <Input
                    type="number"
                    value={buyData.volume}
                    onChange={(e) => {
                      const vol = Number(e.target.value);
                      onBuyChange({ ...buyData, volume: vol });
                      onMakeChange({ ...makeData, volume: vol });
                    }}
                    className="mt-1 bg-background/50"
                  />
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-success/10 border border-success/20">
                <p className="text-xs text-muted-foreground mb-1">Tổng chi phí</p>
                <p className="text-2xl font-bold text-success">{formatVNDCompact(buyTotalCost)}</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Break-even slider */}
        <div className="px-6 pb-4">
          <div className="p-4 rounded-xl bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Điểm hòa vốn</span>
              <Badge variant="secondary" className="font-mono">
                {formatCount(breakEvenVolume)} đơn vị
              </Badge>
            </div>
            <div className="relative">
              <Slider
                value={[makeData.volume]}
                onValueChange={([v]) => {
                  onMakeChange({ ...makeData, volume: v });
                  onBuyChange({ ...buyData, volume: v });
                }}
                max={breakEvenVolume * 2 || 50000}
                min={1000}
                step={1000}
                className="[&_.relative]:h-2"
              />
              {/* Breakeven marker */}
              <div 
                className="absolute top-0 w-0.5 h-4 bg-destructive -translate-y-1"
                style={{ 
                  left: `${Math.min((breakEvenVolume / (breakEvenVolume * 2)) * 100, 100)}%` 
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>0</span>
              <span className="text-destructive font-medium">↑ Break-even: {formatCount(breakEvenVolume)}</span>
              <span>{formatCount(breakEvenVolume * 2)}</span>
            </div>
          </div>
        </div>

        {/* Recommendation footer */}
        <motion.div 
          className={cn(
            'p-6 border-t',
            recommendation === 'make' ? 'bg-primary/5' : 'bg-success/5'
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              'h-14 w-14 rounded-2xl flex items-center justify-center',
              recommendation === 'make' ? 'bg-primary/10' : 'bg-success/10'
            )}>
              <TrendingUp className={cn(
                'h-7 w-7',
                recommendation === 'make' ? 'text-primary' : 'text-success'
              )} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                Khuyến nghị: {recommendation === 'make' ? 'TỰ SẢN XUẤT' : 'THUÊ NGOÀI'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Tiết kiệm <span className="font-semibold text-foreground">{formatVNDCompact(savings)}</span>
                {' '}({savingsPercent.toFixed(1)}%) so với phương án còn lại
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Với sản lượng</p>
              <p className="text-lg font-bold">{formatCount(makeData.volume)} đơn vị</p>
            </div>
          </div>

          {makeData.volume < breakEvenVolume && recommendation === 'buy' && (
            <motion.div 
              className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">Lưu ý điểm hòa vốn</p>
                <p className="text-muted-foreground">
                  Cần sản xuất &gt;{formatCount(breakEvenVolume)} đơn vị để tự sản xuất có lợi hơn thuê ngoài.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}
