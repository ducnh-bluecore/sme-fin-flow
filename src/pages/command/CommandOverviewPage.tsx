import { motion } from 'framer-motion';
import { Crosshair, Package, DollarSign, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

function formatVND(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '₫0';
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `₫${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `₫${(value / 1e6).toFixed(0)}M`;
  if (absValue >= 1e3) return `₫${(value / 1e3).toFixed(0)}K`;
  return `₫${value.toFixed(0)}`;
}

export default function CommandOverviewPage() {
  const navigate = useNavigate();
  const { buildQuery, buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  // Aggregate inventory stats from inv_state_positions
  const { data: invStats } = useQuery({
    queryKey: ['command-inv-stats', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_state_positions' as any, 'on_hand, unit_cost')
        .limit(1000);
      if (error || !data) return { totalUnits: 0, lockedCash: 0 };
      const totalUnits = (data as any[]).reduce((sum: number, r: any) => sum + (r.on_hand || 0), 0);
      const lockedCash = (data as any[]).reduce((sum: number, r: any) => sum + ((r.on_hand || 0) * (r.unit_cost || 0)), 0);
      return { totalUnits, lockedCash };
    },
    enabled: !!tenantId && isReady,
    staleTime: 60_000,
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
    staleTime: 30_000,
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
    staleTime: 60_000,
  });

  const kpiCards = [
    { 
      label: 'Tồn Kho Mạng Lưới', 
      value: invStats?.totalUnits?.toLocaleString() || '0', 
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    { 
      label: 'Vốn Bị Khóa', 
      value: formatVND(invStats?.lockedCash || distortionData?.totalLockedCash), 
      icon: DollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
    },
    { 
      label: 'Chỉ Số Lệch Chuẩn', 
      value: distortionData?.avgScore ? distortionData.avgScore.toFixed(2) : '—',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-500/10',
    },
    { 
      label: 'Chờ Quyết Định', 
      value: String(pendingPackages?.length || 0),
      icon: Clock,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${kpi.bgColor}`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Decision Feed */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Gói Quyết Định Chờ Duyệt</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/command/decisions')}>
              Xem Tất Cả <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(!pendingPackages || pendingPackages.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListChecksIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Không có gói quyết định nào</p>
              <p className="text-xs mt-1">Chạy engine phân bổ để tạo gói quyết định</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(pendingPackages as any[]).map((pkg: any) => (
                <div 
                  key={pkg.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate('/command/decisions')}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={pkg.risk_level === 'HIGH' ? 'destructive' : 'secondary'}>
                      {pkg.package_type}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {(pkg.scope_summary as any)?.description || pkg.package_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(pkg.scope_summary as any)?.units?.toLocaleString() || '—'} đơn vị · {(pkg.scope_summary as any)?.skus || '—'} SKU
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatVND((pkg.impact_summary as any)?.revenue_protected)}
                    </p>
                    <p className="text-xs text-muted-foreground">bảo vệ được</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Simple placeholder icon
function ListChecksIcon({ className }: { className?: string }) {
  return <Package className={className} />;
}
