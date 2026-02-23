import { motion } from 'framer-motion';
import { Crosshair, Package, DollarSign, AlertTriangle, Clock, ArrowRight, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';
import { formatVNDCompact } from '@/lib/formatters';
import { useSizeIntelligenceSummary } from '@/hooks/inventory/useSizeIntelligenceSummary';

export default function CommandOverviewPage() {
  const navigate = useNavigate();
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { summary: siSummary } = useSizeIntelligenceSummary();

  // Aggregate inventory stats via RPC (no row limit)
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

  // Fetch pending decision packages
  const { data: pendingPackages } = useQuery({
    queryKey: ['command-pending-packages', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('dec_decision_packages' as any)
        .eq('status', 'PROPOSED')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantId && isReady,
    staleTime: 30 * 1000,
  });

  // Fetch distortion summary
  const { data: distortionData } = useQuery({
    queryKey: ['command-distortion', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('kpi_inventory_distortion' as any)
        .order('as_of_date', { ascending: false })
        .limit(50);
      if (error || !data || (data as any[]).length === 0) return { avgScore: 0, totalLockedCash: 0 };
      const rows = data as any[];
      const avgScore = rows.reduce((s: number, r: any) => s + (r.distortion_score || 0), 0) / rows.length;
      const totalLockedCash = rows.reduce((s: number, r: any) => s + (r.locked_cash_estimate || 0), 0);
      return { avgScore, totalLockedCash };
    },
    enabled: !!tenantId && isReady,
    staleTime: 2 * 60 * 1000,
  });

  // Capital Misallocation = Lost Revenue + Cash Locked + Margin Leak
  const capitalMisallocation = (siSummary?.totalLostRevenue || 0) + (siSummary?.totalCashLocked || 0) + (siSummary?.totalMarginLeak || 0);

  // Distortion score clamped to [0, 100]
  const clampedDistortion = distortionData?.avgScore ? Math.min(100, Math.max(0, distortionData.avgScore)) : null;

  const kpiCards = [
    { 
      label: 'Tồn Kho Mạng Lưới', 
      value: invStats?.totalUnits?.toLocaleString() || '0', 
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    { 
      label: 'Giá Trị Tồn Kho', 
      value: formatVNDCompact(invStats?.lockedCash || 0), 
      icon: DollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
    },
    { 
      label: 'Vốn Bị Khóa', 
      value: formatVNDCompact(siSummary?.totalCashLocked || 0), 
      icon: DollarSign,
      color: 'text-red-600',
      bgColor: 'bg-red-500/10',
    },
    { 
      label: 'Chỉ Số Lệch Chuẩn', 
      value: clampedDistortion !== null ? clampedDistortion.toFixed(1) : '—',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    { 
      label: 'Chờ Quyết Định', 
      value: String(pendingPackages?.length || 0),
      icon: Clock,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
    },
    { 
      label: 'Vốn Đặt Sai Chỗ', 
      value: capitalMisallocation > 0 ? formatVNDCompact(capitalMisallocation) : '—',
      icon: TrendingDown,
      color: 'text-rose-600',
      bgColor: 'bg-rose-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="p-3 rounded-xl bg-orange-500/10">
          <Crosshair className="h-8 w-8 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trung Tâm Điều Hành</h1>
          <p className="text-sm text-muted-foreground">
            Vốn đúng chỗ — Tổng quan vận hành tồn kho
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {kpiCards.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: idx * 0.08, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
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

      {/* Decision Feed */}
      <Card className="premium-card overflow-hidden">
        <CardHeader className="pb-3 px-6 pt-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Gói Quyết Định Chờ Duyệt</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigate('/command/decisions')}>
              Xem Tất Cả <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {(!pendingPackages || pendingPackages.length === 0) ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Không có gói quyết định nào</p>
              <p className="text-xs mt-1.5 text-muted-foreground/70">Chạy engine phân bổ để tạo gói quyết định</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(pendingPackages as any[]).map((pkg: any, idx: number) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/30 hover:border-border cursor-pointer transition-all duration-300 group"
                  onClick={() => navigate('/command/decisions')}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={pkg.risk_level === 'HIGH' ? 'destructive' : 'secondary'}>
                      {pkg.package_type}
                    </Badge>
                    <div>
                      <p className="text-sm font-semibold group-hover:text-foreground transition-colors">
                        {(pkg.scope_summary as any)?.description || pkg.package_type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(pkg.scope_summary as any)?.units?.toLocaleString() || '—'} đơn vị · {(pkg.scope_summary as any)?.skus || '—'} SKU
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">
                      {formatVNDCompact((pkg.impact_summary as any)?.revenue_protected || 0)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">bảo vệ được</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
