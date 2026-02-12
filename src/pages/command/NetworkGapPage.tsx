import { motion } from 'framer-motion';
import { Network, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

function formatVND(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '₫0';
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `₫${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `₫${(value / 1e6).toFixed(0)}M`;
  return `₫${value?.toFixed(0) || 0}`;
}

export default function NetworkGapPage() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  const { data: gapData } = useQuery({
    queryKey: ['command-network-gap', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('kpi_network_gap' as any)
        .order('as_of_date', { ascending: false })
        .limit(100);
      if (error || !data) return { totalShortage: 0, revenueAtRisk: 0, styles: 0 };
      const rows = data as any[];
      return {
        totalShortage: rows.reduce((s: number, r: any) => s + (r.true_shortage_units || 0), 0),
        revenueAtRisk: rows.reduce((s: number, r: any) => s + (r.revenue_at_risk || 0), 0),
        styles: rows.length,
      };
    },
    enabled: !!tenantId && isReady,
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Network Gap Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">True shortage after allocation + rebalance</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">True Shortage</p>
            <p className="text-2xl font-bold mt-1">{gapData?.totalShortage?.toLocaleString() || 0} units</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Revenue at Risk</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{formatVND(gapData?.revenueAtRisk)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Affected Styles</p>
            <p className="text-2xl font-bold mt-1">{gapData?.styles || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-4 w-4" /> Gap Drilldown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Run allocation engine to compute network gaps</p>
            <p className="text-xs mt-1">Network demand − reallocatable units = true shortage</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
