import { motion } from 'framer-motion';
import { Crosshair, Package, DollarSign, AlertTriangle, TrendingDown, ArrowRight, Scissors, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';
import { formatVNDCompact } from '@/lib/formatters';
import { useSizeIntelligenceSummary } from '@/hooks/inventory/useSizeIntelligenceSummary';
import { useClearanceCandidates } from '@/hooks/inventory/useClearanceIntelligence';

export default function CommandOverviewPage() {
  const navigate = useNavigate();
  const { tenantId, isReady } = useTenantQueryBuilder();
  const { summary: siSummary } = useSizeIntelligenceSummary();
  const { data: clearanceCandidates } = useClearanceCandidates();

  // Aggregate inventory stats via RPC
  const { data: invStats } = useQuery({
    queryKey: ['command-inv-stats', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_inv_overview_stats', { p_tenant_id: tenantId });
      if (error || !data || (data as any[]).length === 0) return { totalUnits: 0, lockedCash: 0 };
      const row = (data as any[])[0];
      return { totalUnits: Number(row.total_units) || 0, lockedCash: Number(row.locked_cash) || 0 };
    },
    enabled: !!tenantId && isReady,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch distortion summary
  const { data: distortionData } = useQuery({
    queryKey: ['command-distortion', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_inventory_distortion')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('as_of_date', { ascending: false })
        .limit(50);
      if (error || !data || data.length === 0) return { avgScore: 0, totalLockedCash: 0 };
      const avgScore = data.reduce((s: number, r: any) => s + (r.distortion_score || 0), 0) / data.length;
      const totalLockedCash = data.reduce((s: number, r: any) => s + (r.locked_cash_estimate || 0), 0);
      return { avgScore, totalLockedCash };
    },
    enabled: !!tenantId && isReady,
    staleTime: 2 * 60 * 1000,
  });

  // Capital Misallocation
  const capitalMisallocation = (siSummary?.totalLostRevenue || 0) + (siSummary?.totalCashLocked || 0) + (siSummary?.totalMarginLeak || 0);
  const clampedDistortion = distortionData?.avgScore ? Math.min(100, Math.max(0, distortionData.avgScore)) : null;

  // Clearance summary
  const clCandidates = clearanceCandidates || [];
  const clCount = clCandidates.length;
  const clTotalValue = clCandidates.reduce((s, c) => s + (c.inventory_value || 0), 0);
  const clTotalCashLocked = clCandidates.reduce((s, c) => s + (c.cash_locked || 0), 0);
  const clTotalStock = clCandidates.reduce((s, c) => s + (c.current_stock || 0), 0);
  const clAvgRisk = clCount > 0 ? clCandidates.reduce((s, c) => s + (c.markdown_risk_score || 0), 0) / clCount : 0;

  const kpiCards = [
    { label: 'Tồn Kho Mạng Lưới', value: invStats?.totalUnits?.toLocaleString() || '0', icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
    { label: 'Giá Trị Tồn Kho', value: formatVNDCompact(invStats?.lockedCash || 0), icon: DollarSign, color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
    { label: 'Vốn Bị Khóa', value: formatVNDCompact(siSummary?.totalCashLocked || 0), icon: DollarSign, color: 'text-red-600', bgColor: 'bg-red-500/10' },
    { label: 'Chỉ Số Lệch Chuẩn', value: clampedDistortion !== null ? clampedDistortion.toFixed(1) : '—', icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
    { label: 'Vốn Đặt Sai Chỗ', value: capitalMisallocation > 0 ? formatVNDCompact(capitalMisallocation) : '—', icon: TrendingDown, color: 'text-rose-600', bgColor: 'bg-rose-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-orange-500/10">
          <Crosshair className="h-8 w-8 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trung Tâm Điều Hành</h1>
          <p className="text-sm text-muted-foreground">Vốn đúng chỗ — Tổng quan vận hành tồn kho</p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {kpiCards.map((kpi, idx) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: idx * 0.08, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>
            <Card className="premium-card card-glow-hover group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="metric-label">{kpi.label}</p>
                    <p className="metric-value text-foreground mt-2">{kpi.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${kpi.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                    <kpi.icon className={`h-5.5 w-5.5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Size Intelligence + Clearance Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Hàng Lệch Size */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="premium-card card-glow-hover h-full">
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10">
                  <BarChart3 className="h-5 w-5 text-amber-600" />
                </div>
                <CardTitle className="text-base font-semibold">Hàng Lệch Size</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Style Vỡ / Tổng</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {siSummary?.brokenCount?.toLocaleString() || '0'}
                    <span className="text-sm font-normal text-muted-foreground"> / {siSummary?.totalProducts?.toLocaleString() || '0'}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sức Khoẻ TB</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {siSummary?.avgHealthScore !== null ? Number(siSummary.avgHealthScore).toFixed(1) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tồn Kho Lệch Size</p>
                  <p className="text-lg font-bold text-orange-600 mt-1">{formatVNDCompact(siSummary?.totalInventoryValue || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vốn Khóa</p>
                  <p className="text-lg font-bold text-red-600 mt-1">{formatVNDCompact(siSummary?.totalCashLocked || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Doanh Thu Mất</p>
                  <p className="text-lg font-bold text-red-600 mt-1">{formatVNDCompact(siSummary?.totalLostRevenue || 0)}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground w-full justify-center" onClick={() => navigate('/command/assortment')}>
                Xem Chi Tiết <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 2: Thanh Lý */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="premium-card card-glow-hover h-full">
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10">
                  <Scissors className="h-5 w-5 text-rose-600" />
                </div>
                <CardTitle className="text-base font-semibold">Thanh Lý</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">FC Cần Thanh Lý</p>
                  <p className="text-lg font-bold text-foreground mt-1">{clCount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk TB</p>
                  <p className="text-lg font-bold text-foreground mt-1">{clAvgRisk.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tồn Kho Thanh Lý</p>
                  <p className="text-lg font-bold text-orange-600 mt-1">{clTotalStock.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">units</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Giá Trị Tồn Kho</p>
                  <p className="text-lg font-bold text-orange-600 mt-1">{formatVNDCompact(clTotalValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vốn Khóa</p>
                  <p className="text-lg font-bold text-red-600 mt-1">{formatVNDCompact(clTotalCashLocked)}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground w-full justify-center" onClick={() => navigate('/command/clearance')}>
                Xem Chi Tiết <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
