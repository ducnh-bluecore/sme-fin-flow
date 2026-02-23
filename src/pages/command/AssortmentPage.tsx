import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useSizeIntelligence } from '@/hooks/inventory/useSizeIntelligence';
import { useSizeControlTower } from '@/hooks/inventory/useSizeControlTower';
import TransferSuggestionsCard from '@/components/command/TransferSuggestionsCard';
import HealthStrip from '@/components/command/SizeControlTower/HealthStrip';
import StoreHeatmap from '@/components/command/SizeControlTower/StoreHeatmap';
import ActionImpactPanel from '@/components/command/SizeControlTower/ActionImpactPanel';
import DecisionFeed from '@/components/command/SizeControlTower/DecisionFeed';
import EvidenceDrawer from '@/components/command/EvidenceDrawer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AssortmentPage() {
  const { buildQuery, buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const [evidenceProductId, setEvidenceProductId] = useState<string | null>(null);

  const {
    summary, transferByDest, heatmap,
    groups, detailCache, loadingStates, loadGroupDetails, PAGE_SIZE,
    projectedRecovery, projectedHealth, projectedHealthDelta,
    healthStatus, transferUnits, transferStyles, recoverableStyles,
    effortLevel, totalTransfers, isLoading,
  } = useSizeControlTower();

  const { evidencePackMap, sizeTransfers } = useSizeIntelligence();

  const { data: fcNames } = useQuery({
    queryKey: ['command-fc-names', tenantId],
    queryFn: async () => {
      const map = new Map<string, string>();
      const PAGE = 1000;
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await buildSelectQuery('inv_family_codes' as any, 'id,fc_name,fc_code')
          .range(offset, offset + PAGE - 1);
        if (error) throw error;
        const rows = (data || []) as any[];
        for (const fc of rows) {
          map.set(String(fc.id), fc.fc_name || fc.fc_code || String(fc.id));
        }
        hasMore = rows.length === PAGE;
        offset += PAGE;
      }
      return map;
    },
    enabled: !!tenantId && isReady,
  });

  const { data: storeNames } = useQuery({
    queryKey: ['command-store-names', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_stores' as any, 'id,store_name,store_code')
        .limit(500);
      if (error) throw error;
      const map = new Map<string, string>();
      for (const s of (data || []) as any[]) {
        map.set(String(s.id), s.store_name || s.store_code || String(s.id));
      }
      return map;
    },
    enabled: !!tenantId && isReady,
  });

  const transfersByDest = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const t of (sizeTransfers.data || []) as any[]) {
      const key = t.dest_store_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [sizeTransfers.data]);

  const runKpiEngine = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('inventory-kpi-engine', { body: { tenant_id: tenantId } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Engine: ${data.size_health_rows} Health, ${data.cash_lock_rows || 0} Cash Lock, ${data.margin_leak_rows || 0} Margin Leak`);
      ['si-health-summary', 'si-lost-rev-summary', 'si-md-risk-summary', 'si-transfer-by-dest', 'si-cash-lock-summary', 'si-margin-leak-summary',
       'si-health-by-state', 'store-heatmap', 'size-health', 'store-size-health', 'lost-revenue', 'markdown-risk', 'size-transfers', 'cash-lock', 'margin-leak', 'evidence-packs'].forEach(k =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );
    },
    onError: (err: any) => toast.error(`Engine failed: ${err.message}`),
  });

  const brokenDetails = detailCache['broken'] || [];
  const evidencePack = evidenceProductId ? evidencePackMap.get(evidenceProductId) : null;
  const evidenceRow = evidenceProductId ? brokenDetails.find(r => r.product_id === evidenceProductId) : null;

  // Evidence Drawer data via single RPC
  const { data: drawerPackData } = useQuery({
    queryKey: ['drawer-evidence-pack', tenantId, evidenceProductId],
    queryFn: async () => {
      if (!evidenceProductId) return null;
      const { data, error } = await supabase.rpc('fn_evidence_pack_by_fc' as any, { p_tenant_id: tenantId, p_fc_id: evidenceProductId });
      if (error) throw error;
      return data as any;
    },
    enabled: !!tenantId && isReady && !!evidenceProductId,
  });

  const drawerSizeData = drawerPackData ? {
    missing: drawerPackData.missing || [],
    partial: drawerPackData.partial || [],
    present: drawerPackData.present || [],
  } : null;
  const surplusStores = drawerPackData?.surplus_stores || [];

  const enrichedTransferByDest = useMemo(() => {
    return transferByDest.map((d: any) => ({
      ...d,
      dest_store_name: storeNames?.get(d.dest_store_id) || d.dest_store_id?.slice(0, 12),
    }));
  }, [transferByDest, storeNames]);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">SIZE CONTROL TOWER</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">Revenue Protection Center</p>
        </div>
        <Button onClick={() => runKpiEngine.mutate()} disabled={runKpiEngine.isPending} size="sm" variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${runKpiEngine.isPending ? 'animate-spin' : ''}`} />
          {runKpiEngine.isPending ? 'Đang tính...' : 'Chạy Engine'}
        </Button>
      </motion.div>

      <HealthStrip
        avgHealthScore={summary.avgHealthScore}
        healthStatus={healthStatus}
        brokenCount={summary.brokenCount}
        riskCount={summary.riskCount}
        totalLostRevenue={summary.totalLostRevenue}
        totalCashLocked={summary.totalCashLocked}
        totalMarginLeak={summary.totalMarginLeak}
        projectedHealth={projectedHealth}
        projectedRecovery={projectedRecovery}
        transferUnits={transferUnits}
        recoverableStyles={recoverableStyles}
        effortLevel={effortLevel}
      />

      <DecisionFeed brokenDetails={brokenDetails} onViewEvidence={(pid) => setEvidenceProductId(pid)} />

      <Tabs defaultValue="transfers" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="transfers">🔄 Đề Xuất Điều Chuyển</TabsTrigger>
          <TabsTrigger value="heatmap">🗺️ Heatmap & Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="transfers">
          {transferByDest.length > 0 ? (
            fcNames ? (
              <TransferSuggestionsCard
                transferByDest={transferByDest}
                detailRows={transfersByDest}
                storeNames={storeNames}
                fcNames={fcNames}
                totalOpportunities={summary.transferOpportunities}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">Đang tải tên sản phẩm...</div>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">Chưa có đề xuất điều chuyển</div>
          )}
        </TabsContent>

        <TabsContent value="heatmap">
          <div className="flex gap-4">
            <StoreHeatmap data={heatmap.data || []} isLoading={heatmap.isLoading} />
            <ActionImpactPanel
              projectedRecovery={projectedRecovery}
              transferUnits={transferUnits}
              recoverableStyles={recoverableStyles}
              effortLevel={effortLevel}
              totalTransfers={totalTransfers}
              transferByDest={enrichedTransferByDest}
            />
          </div>
        </TabsContent>
      </Tabs>

      <EvidenceDrawer
        evidenceProductId={evidenceProductId}
        onClose={() => setEvidenceProductId(null)}
        evidenceRow={evidenceRow}
        evidencePack={evidencePack || null}
        drawerSizeData={drawerSizeData}
        surplusStores={surplusStores}
        productName={evidenceRow?.product_name || (evidenceProductId && (fcNames?.get(evidenceProductId) || evidenceProductId)) || ''}
      />
    </div>
  );
}
