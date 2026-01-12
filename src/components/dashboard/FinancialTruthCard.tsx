/**
 * Financial Truth Card
 * 
 * Consolidates the 4 most critical financial metrics in a single view:
 * 1. Net Revenue (after all fees)
 * 2. Contribution Margin
 * 3. Cash Position (real cash)
 * 4. Cash Runway
 * 
 * This is the "single source of truth" for financial health.
 */

import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatVNDCompact } from '@/lib/formatters';
import { useCentralFinancialMetrics } from '@/hooks/useCentralFinancialMetrics';
import { useCashRunway } from '@/hooks/useCashRunway';
import { useAllChannelsPL } from '@/hooks/useAllChannelsPL';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricItemProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: number;
  status: 'healthy' | 'warning' | 'critical' | 'neutral';
  icon: React.ReactNode;
  tooltip?: string;
}

function MetricItem({ label, value, subtext, trend, status, icon, tooltip }: MetricItemProps) {
  const statusColors = {
    healthy: 'text-emerald-400',
    warning: 'text-amber-400',
    critical: 'text-red-400',
    neutral: 'text-slate-300'
  };

  const statusBgColors = {
    healthy: 'bg-emerald-500/10',
    warning: 'bg-amber-500/10',
    critical: 'bg-red-500/10',
    neutral: 'bg-slate-500/10'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className={`p-4 rounded-xl ${statusBgColors[status]} border border-slate-700/50 cursor-help`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-lg ${statusBgColors[status]}`}>
                {icon}
              </div>
              {trend !== undefined && (
                <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trend >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(trend).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${statusColors[status]}`}>{value}</p>
            {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
          </motion.div>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function HealthIndicator({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  const config = {
    healthy: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Khỏe mạnh' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Cần chú ý' },
    critical: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Cảnh báo' }
  };

  const Icon = config[status].icon;

  return (
    <Badge className={`${config[status].bg} ${config[status].color} border-none`}>
      <Icon className="h-3 w-3 mr-1" />
      {config[status].label}
    </Badge>
  );
}

export default function FinancialTruthCard() {
  const { data: metrics, isLoading: metricsLoading } = useCentralFinancialMetrics();
  const { data: cashRunway, isLoading: runwayLoading } = useCashRunway();
  const { data: channelPL, isLoading: plLoading } = useAllChannelsPL();

  const isLoading = metricsLoading || runwayLoading || plLoading;

  // Calculate Net Revenue from channel P&L
  const netRevenue = channelPL?.totals?.totalRevenue || 0;
  
  // Calculate Contribution Margin
  const grossProfit = channelPL?.totals?.grossProfit || 0;
  const contributionMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  // Cash Position
  const cashPosition = metrics?.cashOnHand || 0;

  // Runway
  const runwayMonths = cashRunway?.runwayMonths || 0;
  const runwayDays = cashRunway?.runwayDays || 0;

  // Determine overall health status
  const getOverallHealth = (): 'healthy' | 'warning' | 'critical' => {
    if (runwayMonths < 3 || contributionMargin < 0) return 'critical';
    if (runwayMonths < 6 || contributionMargin < 10) return 'warning';
    return 'healthy';
  };

  // Individual metric statuses
  const getRevenueStatus = (): 'healthy' | 'warning' | 'critical' | 'neutral' => {
    if (netRevenue > 0) return 'healthy';
    return 'neutral';
  };

  const getMarginStatus = (): 'healthy' | 'warning' | 'critical' | 'neutral' => {
    if (contributionMargin < 0) return 'critical';
    if (contributionMargin < 10) return 'warning';
    if (contributionMargin >= 20) return 'healthy';
    return 'neutral';
  };

  const getCashStatus = (): 'healthy' | 'warning' | 'critical' | 'neutral' => {
    if (cashPosition < 0) return 'critical';
    if (cashPosition < 100000000) return 'warning'; // < 100M
    return 'healthy';
  };

  const getRunwayStatus = (): 'healthy' | 'warning' | 'critical' | 'neutral' => {
    if (runwayMonths === Infinity) return 'healthy';
    if (runwayMonths < 3) return 'critical';
    if (runwayMonths < 6) return 'warning';
    return 'healthy';
  };

  const formatRunway = () => {
    if (!cashRunway?.hasEnoughData) return 'N/A';
    if (runwayMonths === Infinity) return '∞';
    if (runwayMonths < 1) return `${runwayDays} ngày`;
    return `${runwayMonths.toFixed(1)} tháng`;
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-slate-700/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-100">Financial Truth</CardTitle>
                <p className="text-xs text-slate-400">Sự thật tài chính - Nguồn duy nhất</p>
              </div>
            </div>
            <HealthIndicator status={getOverallHealth()} />
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricItem
              label="Net Revenue"
              value={formatVNDCompact(netRevenue)}
              subtext="Sau tất cả phí sàn/ads/logistics"
              status={getRevenueStatus()}
              icon={<DollarSign className={`h-5 w-5 ${getRevenueStatus() === 'healthy' ? 'text-emerald-400' : 'text-slate-400'}`} />}
              tooltip="Doanh thu thực tế sau khi trừ tất cả các loại phí: phí sàn, phí thanh toán, phí vận chuyển, phí quảng cáo..."
            />
            
            <MetricItem
              label="Contribution Margin"
              value={`${contributionMargin.toFixed(1)}%`}
              subtext={`${formatVNDCompact(grossProfit)} lợi nhuận gộp`}
              status={getMarginStatus()}
              icon={<TrendingUp className={`h-5 w-5 ${getMarginStatus() === 'healthy' ? 'text-emerald-400' : getMarginStatus() === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />}
              tooltip="Tỷ lệ lợi nhuận gộp trên doanh thu thuần. Dưới 10% là cảnh báo, dưới 0% là nguy hiểm."
            />
            
            <MetricItem
              label="Cash Position"
              value={formatVNDCompact(cashPosition)}
              subtext="Tiền thật trong bank"
              status={getCashStatus()}
              icon={<Wallet className={`h-5 w-5 ${getCashStatus() === 'healthy' ? 'text-emerald-400' : getCashStatus() === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />}
              tooltip="Số dư tiền mặt thực tế trong các tài khoản ngân hàng. Không bao gồm AR chưa thu."
            />
            
            <MetricItem
              label="Cash Runway"
              value={formatRunway()}
              subtext={cashRunway?.avgMonthlyBurn > 0 ? `Burn: ${formatVNDCompact(cashRunway.avgMonthlyBurn)}/tháng` : undefined}
              status={getRunwayStatus()}
              icon={<Clock className={`h-5 w-5 ${getRunwayStatus() === 'healthy' ? 'text-emerald-400' : getRunwayStatus() === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />}
              tooltip="Số tháng công ty có thể hoạt động với tiền mặt hiện có, dựa trên burn rate trung bình 3 tháng gần nhất."
            />
          </div>

          {/* Warning messages */}
          {getOverallHealth() !== 'healthy' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  {runwayMonths < 3 && (
                    <p className="text-amber-300 mb-1">⚠️ Cash runway dưới 3 tháng - cần action ngay!</p>
                  )}
                  {contributionMargin < 0 && (
                    <p className="text-red-300 mb-1">🚨 Contribution margin âm - đang bán lỗ!</p>
                  )}
                  {contributionMargin >= 0 && contributionMargin < 10 && (
                    <p className="text-amber-300 mb-1">⚠️ Margin thấp ({contributionMargin.toFixed(1)}%) - cần tối ưu chi phí</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
