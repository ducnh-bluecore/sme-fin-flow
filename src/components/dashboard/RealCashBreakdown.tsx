/**
 * Real Cash Breakdown Component
 * 
 * FDP Manifesto Principle #4: Real Cash
 * Phân biệt rõ ràng:
 * 1. Cash đã về (bank balance)
 * 2. Cash sẽ về (AR không quá hạn)
 * 3. Cash nguy cơ không về (AR quá hạn > 90 ngày)
 * 4. Cash bị khóa (inventory, ads, ops)
 */

import { motion } from 'framer-motion';
import { 
  Wallet, 
  Clock, 
  AlertTriangle, 
  Lock,
  CheckCircle,
  TrendingUp,
  Package,
  Megaphone,
  Info,
  Truck,
  Store
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { formatVNDCompact, formatVND } from '@/lib/formatters';
import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { useCashRunway } from '@/hooks/useCashRunway';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CashCategory {
  label: string;
  amount: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
  status: 'safe' | 'warning' | 'danger';
}

export default function RealCashBreakdown() {
  // SSOT: Use useFinanceTruthSnapshot instead of deprecated useCentralFinancialMetrics
  const { data: snapshot, isLoading: snapshotLoading } = useFinanceTruthSnapshot();
  const { data: cashRunway, isLoading: runwayLoading } = useCashRunway();

  const isLoading = snapshotLoading || runwayLoading;

  // Map snapshot to metrics shape - now using DB-computed locked cash (Phase 4)
  const metrics = snapshot ? {
    cashToday: snapshot.cashToday,
    totalAR: snapshot.totalAR,
    overdueAR: snapshot.overdueAR,
    totalInventoryValue: snapshot.totalInventoryValue,
    totalMarketingSpend: snapshot.totalMarketingSpend,
    arAgingCurrent: snapshot.arAgingCurrent,
    arAging90d: snapshot.arAging90d + (snapshot.arAging60d ?? 0),
    // Phase 4: Use DB-computed locked cash instead of magic numbers
    lockedCashInventory: snapshot.lockedCashInventory,
    lockedCashAds: snapshot.lockedCashAds,
    lockedCashOps: snapshot.lockedCashOps,
    lockedCashPlatform: snapshot.lockedCashPlatform,
    lockedCashTotal: snapshot.lockedCashTotal,
  } : null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate cash categories - using SSOT metrics
  const bankBalance = metrics?.cashToday || 0;
  const totalAR = metrics?.totalAR || 0;
  const overdueAR = metrics?.overdueAR || 0;
  const currentAR = totalAR - overdueAR;
  
  // Phase 4: Use DB-computed locked cash (no magic numbers)
  const inventoryValue = metrics?.lockedCashInventory || metrics?.totalInventoryValue || 0;
  const adsFloat = metrics?.lockedCashAds || 0;
  const opsFloat = metrics?.lockedCashOps || 0;
  const platformHold = metrics?.lockedCashPlatform || 0;
  const lockedCash = metrics?.lockedCashTotal || (inventoryValue + adsFloat);

  // Calculate risk levels
  const totalCashPosition = bankBalance + currentAR;
  const atRiskCash = overdueAR;
  
  // Determine overall status
  const getOverallStatus = (): 'safe' | 'warning' | 'danger' => {
    const runway = cashRunway?.runwayMonths || 0;
    const atRiskRatio = totalAR > 0 ? overdueAR / totalAR : 0;
    
    if (runway < 3 || atRiskRatio > 0.3) return 'danger';
    if (runway < 6 || atRiskRatio > 0.15) return 'warning';
    return 'safe';
  };

  const categories: CashCategory[] = [
    {
      label: 'Cash đã về',
      amount: bankBalance,
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      description: 'Tiền thật trong tài khoản ngân hàng, có thể sử dụng ngay',
      status: bankBalance > 0 ? 'safe' : 'danger'
    },
    {
      label: 'Cash sẽ về',
      amount: currentAR,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: 'AR chưa quá hạn - khả năng thu hồi cao',
      status: currentAR > bankBalance * 2 ? 'warning' : 'safe'
    },
    {
      label: 'Cash nguy cơ không về',
      amount: atRiskCash,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      description: 'AR quá hạn - cần action thu hồi ngay hoặc trích dự phòng',
      status: atRiskCash > 0 ? 'danger' : 'safe'
    },
    {
      label: 'Cash bị khóa',
      amount: lockedCash,
      icon: <Lock className="h-5 w-5" />,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      description: 'Tiền đang nằm trong tồn kho, ads float, ops',
      status: lockedCash > bankBalance ? 'warning' : 'safe'
    }
  ];

  const totalTracked = categories.reduce((sum, c) => sum + c.amount, 0);
  const overallStatus = getOverallStatus();

  const statusConfig = {
    safe: { label: 'Khỏe mạnh', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    warning: { label: 'Cần theo dõi', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    danger: { label: 'CẢNH BÁO', color: 'text-red-500', bg: 'bg-red-500/10' }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Real Cash Breakdown
                  <Badge 
                    variant="outline" 
                    className="text-[10px] px-1.5 py-0 h-4 border-cyan-500/50 text-cyan-400 bg-cyan-500/10"
                  >
                    Live Snapshot
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Tiền thật vs Tiền trên giấy - Không đổi theo date range
                </p>
              </div>
            </div>
            <Badge className={cn(statusConfig[overallStatus].bg, statusConfig[overallStatus].color, 'border-none')}>
              {statusConfig[overallStatus].label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Cash Categories */}
          {categories.map((category, index) => (
            <TooltipProvider key={category.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "p-4 rounded-lg border cursor-help transition-all hover:border-primary/50",
                      category.bgColor,
                      category.status === 'danger' && 'border-red-500/50 animate-pulse'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded", category.bgColor)}>
                          <span className={category.color}>{category.icon}</span>
                        </div>
                        <span className="font-medium text-foreground">{category.label}</span>
                      </div>
                      <span className={cn("text-lg font-bold", category.color)}>
                        {formatVNDCompact(category.amount)}
                      </span>
                    </div>
                    
                    {/* Progress bar showing proportion */}
                    <Progress 
                      value={totalTracked > 0 ? (category.amount / totalTracked) * 100 : 0}
                      className="h-1.5"
                    />
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {totalTracked > 0 ? ((category.amount / totalTracked) * 100).toFixed(1) : 0}% tổng
                      </span>
                      {category.status === 'danger' && (
                        <Badge variant="destructive" className="text-xs">
                          Cần action ngay
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium mb-1">{category.label}</p>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                  <p className="text-sm mt-2">Số tiền: {formatVND(category.amount)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}

          {/* Locked Cash Breakdown - 4 columns */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Chi tiết Cash bị khóa
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Tồn kho</span>
                </div>
                <p className="font-semibold">{formatVNDCompact(inventoryValue)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Ads Float</span>
                </div>
                <p className="font-semibold">{formatVNDCompact(adsFloat)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Ops Float</span>
                </div>
                <p className="font-semibold">{formatVNDCompact(opsFloat)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Platform Hold</span>
                </div>
                <p className="font-semibold">{formatVNDCompact(platformHold)}</p>
              </div>
            </div>
          </div>

          {/* Key Insight */}
          {overallStatus !== 'safe' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={cn(
                "p-4 rounded-lg border",
                overallStatus === 'danger' 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : 'bg-amber-500/10 border-amber-500/30'
              )}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn(
                  "h-5 w-5 mt-0.5",
                  overallStatus === 'danger' ? 'text-red-500' : 'text-amber-500'
                )} />
                <div>
                  <p className={cn(
                    "font-medium",
                    overallStatus === 'danger' ? 'text-red-500' : 'text-amber-500'
                  )}>
                    {overallStatus === 'danger' 
                      ? '🚨 CẢNH BÁO: Cash position không an toàn'
                      : '⚠️ Cần theo dõi cash flow'
                    }
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    {atRiskCash > 0 && (
                      <li>• AR quá hạn: {formatVNDCompact(atRiskCash)} cần thu hồi gấp</li>
                    )}
                    {lockedCash > bankBalance && (
                      <li>• Cash bị khóa ({formatVNDCompact(lockedCash)}) &gt; Cash available ({formatVNDCompact(bankBalance)})</li>
                    )}
                    {(cashRunway?.runwayMonths || 0) < 6 && (
                      <li>• Runway chỉ còn {cashRunway?.runwayMonths?.toFixed(1)} tháng</li>
                    )}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
