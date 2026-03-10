/**
 * Consolidated data hook for AssortmentPage.
 * Merges useSizeControlTower + lazy transfer details + evidence packs.
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useSizeControlTower } from './useSizeControlTower';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EvidencePackRow } from './useSizeIntelligence';

export function useAssortmentData() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const [evidenceProductId, setEvidenceProductId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('transfers');

  const controlTower = useSizeControlTower();
  const {
    summary, transferByDest, heatmap,
    groups, detailCache, loadingStates, loadGroupDetails, PAGE_SIZE,
    projectedRecovery, projectedHealth, projectedHealthDelta,
    healthStatus, transferUnits, transferStyles, recoverableStyles,
    effortLevel, totalTransfers, isLoading,
  } = controlTower;

  // ── FC names (always needed for display) ──
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

  // ── Store names ──
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

  // ── LAZY: Transfer detail rows — only when transfers tab active ──
  const { data: sizeTransfersData } = useQuery({
    queryKey: ['size-transfers', tenantId],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      const allRows: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await buildSelectQuery('state_size_transfer_daily' as any, '*')
          .order('transfer_score', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const rows = (data || []) as any[];
        allRows.push(...rows);
        if (rows.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return allRows;
    },
    enabled: !!tenantId && isReady && activeTab === 'transfers',
    staleTime: 5 * 60 * 1000,
  });

  const transfersByDest = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const t of (sizeTransfersData || [])) {
      const key = t.dest_store_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [sizeTransfersData]);

  // ── LAZY: Evidence packs — only when needed ──
  const { data: evidencePacksData } = useQuery({
    queryKey: ['evidence-packs', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('si_evidence_packs' as any, '*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as EvidencePackRow[];
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });

  const evidencePackMap = useMemo(() => {
    const map = new Map<string, EvidencePackRow>();
    for (const r of (evidencePacksData || [])) map.set(r.product_id, r);
    return map;
  }, [evidencePacksData]);

  // ── Run KPI Engine ──
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

  // ── Auto-load broken & risk details for products tab ──
  useEffect(() => {
    if (isReady && tenantId && activeTab === 'products') {
      loadGroupDetails('broken');
      loadGroupDetails('risk');
    }
  }, [isReady, tenantId, activeTab]);

  const brokenDetails = detailCache['broken'] || [];
  const riskDetails = detailCache['risk'] || [];
  const allProductDetails = useMemo(() => [...brokenDetails, ...riskDetails], [brokenDetails, riskDetails]);

  // ── Evidence drawer ──
  const evidencePack = evidenceProductId ? evidencePackMap.get(evidenceProductId) : null;
  const evidenceRow = evidenceProductId ? brokenDetails.find(r => r.product_id === evidenceProductId) : null;

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

  return {
    // Control tower data
    summary, transferByDest, heatmap, groups,
    detailCache, loadingStates, loadGroupDetails, PAGE_SIZE,
    projectedRecovery, projectedHealth, projectedHealthDelta,
    healthStatus, transferUnits, transferStyles, recoverableStyles,
    effortLevel, totalTransfers, isLoading,
    // Lookups
    fcNames, storeNames,
    // Transfer details (lazy)
    transfersByDest,
    // Products
    brokenDetails, riskDetails, allProductDetails,
    // Evidence
    evidenceProductId, setEvidenceProductId,
    evidencePack, evidenceRow, drawerSizeData, surplusStores,
    evidencePackMap,
    // Engine
    runKpiEngine,
    // Enriched
    enrichedTransferByDest,
    // Tab management
    activeTab, setActiveTab,
  };
}
