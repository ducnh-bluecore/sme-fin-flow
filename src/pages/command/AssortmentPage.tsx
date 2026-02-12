import { motion } from 'framer-motion';
import { Layers3, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export default function AssortmentPage() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  const { data: scsData } = useQuery({
    queryKey: ['command-scs', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('kpi_size_completeness' as any)
        .order('as_of_date', { ascending: false })
        .limit(100);
      if (error || !data) return { total: 0, broken: 0, atRisk: 0, healthy: 0 };
      const rows = data as any[];
      return {
        total: rows.length,
        broken: rows.filter((r: any) => r.status === 'BROKEN').length,
        atRisk: rows.filter((r: any) => r.status === 'AT_RISK').length,
        healthy: rows.filter((r: any) => r.status === 'HEALTHY').length,
      };
    },
    enabled: !!tenantId && isReady,
  });

  const { data: chiData } = useQuery({
    queryKey: ['command-chi', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('kpi_curve_health' as any)
        .order('as_of_date', { ascending: false })
        .limit(50);
      if (error || !data) return { avgCHI: 0, highRisk: 0 };
      const rows = data as any[];
      const avgCHI = rows.length > 0 
        ? rows.reduce((s: number, r: any) => s + (r.curve_health_index || 0), 0) / rows.length 
        : 0;
      return {
        avgCHI,
        highRisk: rows.filter((r: any) => r.markdown_risk_band === 'HIGH').length,
      };
    },
    enabled: !!tenantId && isReady,
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Assortment Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">Size Curve Health & Completeness Score</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Avg Curve Health</p>
            <p className="text-2xl font-bold mt-1">{chiData?.avgCHI ? (chiData.avgCHI * 100).toFixed(1) + '%' : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Healthy Styles</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{scsData?.healthy || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">At Risk</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{scsData?.atRisk || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Broken Size Runs</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{scsData?.broken || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers3 className="h-4 w-4" /> Size Completeness Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Run the KPI Engine to compute size completeness scores</p>
            <p className="text-xs mt-1">Data will populate from inv_state_positions + inv_sku_fc_mapping</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
