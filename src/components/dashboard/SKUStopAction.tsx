/**
 * SKU Stop Action Component
 * 
 * FDP Manifesto Principle #6: Unit Economics → Action
 * Nếu một SKU:
 * - Bán càng nhiều càng âm
 * - Khóa cash
 * - Tăng ops risk
 * → FDP sẽ nói STOP.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { 
  OctagonX, 
  AlertTriangle, 
  TrendingDown,
  Package,
  DollarSign,
  ArrowRight,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatVNDCompact, formatVND } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface StopSKU {
  sku: string;
  productName: string;
  channel: string;
  marginPercent: number;
  monthlyLoss: number;
  lockedCash: number;
  reason: string[];
  severity: 'critical' | 'warning';
  recommendation: 'stop_immediately' | 'review_pricing' | 'reduce_ads';
}

interface SKUStopActionProps {
  stopSKUs: StopSKU[];
  onAcknowledge?: (sku: string, action: string) => void;
}

const recommendationConfig = {
  stop_immediately: {
    label: 'NGỪNG BÁN NGAY',
    color: 'bg-red-500 hover:bg-red-600 text-white',
    icon: OctagonX,
    description: 'SKU này đang gây thiệt hại nghiêm trọng. Ngừng bán ngay lập tức.'
  },
  review_pricing: {
    label: 'XEM XÉT GIÁ BÁN',
    color: 'bg-amber-500 hover:bg-amber-600 text-white',
    icon: DollarSign,
    description: 'Cần tăng giá hoặc giảm chi phí để có lãi.'
  },
  reduce_ads: {
    label: 'GIẢM QUẢNG CÁO',
    color: 'bg-orange-500 hover:bg-orange-600 text-white',
    icon: TrendingDown,
    description: 'Chi phí ads quá cao so với margin. Giảm ngân sách quảng cáo.'
  }
};

function SKUStopCard({ sku, onAction }: { sku: StopSKU; onAction: () => void }) {
  const config = recommendationConfig[sku.recommendation];
  const Icon = config.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "p-4 rounded-lg border-2",
        sku.severity === 'critical' 
          ? 'bg-red-500/10 border-red-500 animate-pulse' 
          : 'bg-amber-500/10 border-amber-500'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-lg",
            sku.severity === 'critical' ? 'bg-red-500/20' : 'bg-amber-500/20'
          )}>
            <Icon className={cn(
              "h-5 w-5",
              sku.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
            )} />
          </div>
          <div>
            <p className="font-semibold text-foreground">{sku.productName}</p>
            <p className="text-xs text-muted-foreground">{sku.sku} • {sku.channel}</p>
          </div>
        </div>
        <Badge 
          variant="destructive" 
          className={cn(
            sku.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
          )}
        >
          {sku.severity === 'critical' ? 'CRITICAL' : 'WARNING'}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 rounded bg-background/50">
          <p className="text-xs text-muted-foreground">Margin</p>
          <p className={cn(
            "font-bold",
            sku.marginPercent < 0 ? 'text-red-500' : 'text-amber-500'
          )}>
            {sku.marginPercent.toFixed(1)}%
          </p>
        </div>
        <div className="text-center p-2 rounded bg-background/50">
          <p className="text-xs text-muted-foreground">Lỗ/tháng</p>
          <p className="font-bold text-red-500">
            -{formatVNDCompact(Math.abs(sku.monthlyLoss))}
          </p>
        </div>
        <div className="text-center p-2 rounded bg-background/50">
          <p className="text-xs text-muted-foreground">Cash khóa</p>
          <p className="font-bold text-amber-500">
            {formatVNDCompact(sku.lockedCash)}
          </p>
        </div>
      </div>

      {/* Reasons */}
      <div className="mb-3">
        <p className="text-xs text-muted-foreground mb-1">Lý do:</p>
        <ul className="text-sm space-y-1">
          {sku.reason.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-foreground">
              <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      <Button 
        className={cn("w-full gap-2", config.color)}
        onClick={onAction}
      >
        <Icon className="h-4 w-4" />
        {config.label}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}

export default function SKUStopAction({ stopSKUs, onAcknowledge }: SKUStopActionProps) {
  const [selectedSKU, setSelectedSKU] = useState<StopSKU | null>(null);
  const [acknowledgedSKUs, setAcknowledgedSKUs] = useState<Set<string>>(new Set());

  const criticalCount = stopSKUs.filter(s => s.severity === 'critical').length;
  const warningCount = stopSKUs.filter(s => s.severity === 'warning').length;
  const totalMonthlyLoss = stopSKUs.reduce((sum, s) => sum + Math.abs(s.monthlyLoss), 0);

  const handleAcknowledge = (action: string) => {
    if (selectedSKU) {
      setAcknowledgedSKUs(prev => new Set([...prev, selectedSKU.sku]));
      onAcknowledge?.(selectedSKU.sku, action);
      setSelectedSKU(null);
    }
  };

  const visibleSKUs = stopSKUs.filter(s => !acknowledgedSKUs.has(s.sku));

  if (visibleSKUs.length === 0) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-2 border-red-500/50 bg-red-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <OctagonX className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-lg text-red-500 flex items-center gap-2">
                    SKU CẦN DỪNG BÁN
                    <Badge variant="destructive">{visibleSKUs.length}</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    FDP Principle #6: Unit Economics → Action
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Tổng thiệt hại/tháng</p>
                <p className="text-xl font-bold text-red-500">
                  -{formatVNDCompact(totalMonthlyLoss)}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {/* Summary */}
            <div className="flex gap-3 mb-4">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <OctagonX className="h-3 w-3" />
                  {criticalCount} CRITICAL
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge className="bg-amber-500 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {warningCount} WARNING
                </Badge>
              )}
            </div>

            {/* SKU Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {visibleSKUs.slice(0, 4).map(sku => (
                  <SKUStopCard 
                    key={sku.sku} 
                    sku={sku} 
                    onAction={() => setSelectedSKU(sku)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {visibleSKUs.length > 4 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Và {visibleSKUs.length - 4} SKU khác cần xem xét...
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedSKU} onOpenChange={() => setSelectedSKU(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <OctagonX className="h-5 w-5" />
              Xác nhận hành động
            </DialogTitle>
            <DialogDescription>
              {selectedSKU && (
                <>
                  <p className="mb-2">
                    <strong>{selectedSKU.productName}</strong> ({selectedSKU.sku})
                  </p>
                  <p className="mb-4">
                    {recommendationConfig[selectedSKU.recommendation].description}
                  </p>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-500">
                      ⚠️ SKU này đang gây lỗ <strong>{formatVND(Math.abs(selectedSKU.monthlyLoss))}/tháng</strong>
                    </p>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedSKU(null)}>
              Để sau
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleAcknowledge('acknowledged')}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Đã ghi nhận, sẽ xử lý
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
