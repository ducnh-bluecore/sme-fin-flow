/**
 * ============================================
 * SKU PROFITABILITY - OPTIMIZED WITH AGGREGATED VIEWS
 * ============================================
 * 
 * @architecture Schema-per-Tenant v1.4.1 / DB-First SSOT
 * Summary aggregation via get_sku_profitability_view_summary RPC
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { toast } from 'sonner';

export interface CachedSKUMetrics {
  id: string;
  sku: string;
  product_name: string | null;
  channel: string;
  quantity: number;
  revenue: number;
  cogs: number;
  fees: number;
  profit: number;
  margin_percent: number;
  aov: number;
  status: string;
  calculated_at: string;
}

export interface SKUProfitabilitySummary {
  totalSKUs: number;
  profitableSKUs: number;
  marginalSKUs: number;
  lossSKUs: number;
  totalProfit: number;
  avgMargin: number;
}

/**
 * Fetch SKU profitability from pre-aggregated view (fast, all-time data)
 */
export function useSKUProfitabilityFromView() {
  const { buildSelectQuery, callRpc, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['sku-profitability-view', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      // Fetch SKU data from view
      const { data, error } = await buildSelectQuery('fdp_sku_summary', '*')
        .order('total_revenue', { ascending: false })
        .limit(500);

      if (error) throw error;

      // DB-First: Get summary from RPC
      const { data: dbSummary, error: summaryError } = await callRpc('get_sku_profitability_view_summary', {
        p_tenant_id: tenantId,
      });

      if (summaryError) {
        console.error('[useSKUProfitabilityFromView] Summary RPC error:', summaryError);
      }

      interface SKUViewRow {
        sku: string | null;
        product_name: string | null;
        total_quantity: number;
        total_revenue: number;
        total_cogs: number;
        gross_profit: number;
        margin_percent: number;
      }
      const viewData = (data as unknown as SKUViewRow[]) || [];

      const skuMetrics: CachedSKUMetrics[] = viewData.map((row, idx) => {
        const profit = row.gross_profit || 0;
        const revenue = row.total_revenue || 0;
        const margin = row.margin_percent || 0;

        return {
          id: `sku-${idx}`,
          sku: row.sku || 'Unknown',
          product_name: row.product_name,
          channel: 'ALL',
          quantity: row.total_quantity || 0,
          revenue: revenue,
          cogs: row.total_cogs || 0,
          fees: 0,
          profit: profit,
          margin_percent: margin,
          aov: row.total_quantity > 0 ? revenue / row.total_quantity : 0,
          status: margin >= 10 ? 'profitable' : margin >= 0 ? 'marginal' : 'loss',
          calculated_at: new Date().toISOString(),
        };
      });

      // Use DB-computed summary
      const summaryData = dbSummary as any;
      const summary: SKUProfitabilitySummary = {
        totalSKUs: Number(summaryData?.total_skus) || skuMetrics.length,
        profitableSKUs: Number(summaryData?.profitable_skus) || 0,
        marginalSKUs: Number(summaryData?.marginal_skus) || 0,
        lossSKUs: Number(summaryData?.loss_skus) || 0,
        totalProfit: Number(summaryData?.total_profit) || 0,
        avgMargin: Number(summaryData?.avg_margin) || 0,
      };

      return {
        skuMetrics,
        summary,
        hasCachedData: true,
        lastCalculated: new Date().toISOString()
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000
  });
}

/**
 * Fetch SKU profitability data filtered by date range
 * Uses database RPC for proper date filtering (DB-First architecture)
 */
export function useCachedSKUProfitability() {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['sku-profitability-cache', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data: rpcData, error: rpcError } = await callRpc(
        'get_sku_profitability_by_date_range',
        {
          p_tenant_id: tenantId,
          p_start_date: startDateStr,
          p_end_date: endDateStr,
          p_limit: 500
        }
      );

      if (rpcError) {
        console.error('SKU profitability RPC error:', rpcError);
        throw rpcError;
      }

      interface SKURpcRow {
        sku: string;
        product_name: string | null;
        channel: string;
        order_count: number;
        total_quantity: number;
        total_revenue: number;
        total_cogs: number;
        gross_profit: number;
        margin_percent: number;
      }

      const skuData = (rpcData as unknown as SKURpcRow[]) || [];

      const skuMetrics: CachedSKUMetrics[] = skuData.map((row, idx) => {
        const revenue = Number(row.total_revenue || 0);
        const quantity = Number(row.total_quantity || 0);
        const margin = Number(row.margin_percent || 0);
        const profit = Number(row.gross_profit || 0);
        const orderCount = Number(row.order_count || 1);
        const aov = orderCount > 0 ? revenue / orderCount : 0;
        
        let status = 'unknown';
        if (margin >= 30) status = 'profitable';
        else if (margin >= 15) status = 'marginal';
        else if (margin < 15) status = 'loss';

        return {
          id: `sku-${idx}`,
          sku: row.sku,
          product_name: row.product_name,
          channel: row.channel,
          quantity,
          revenue,
          cogs: Number(row.total_cogs || 0),
          fees: 0,
          profit,
          margin_percent: margin,
          aov,
          status,
          calculated_at: new Date().toISOString(),
        };
      });

      // DB-First: Compute summary from RPC aggregation
      // The RPC already returns pre-aggregated data per SKU, so we use the view summary RPC
      const { data: dbSummary } = await callRpc('get_sku_profitability_view_summary', {
        p_tenant_id: tenantId,
      });

      const summaryData = dbSummary as any;
      const summary: SKUProfitabilitySummary = {
        totalSKUs: skuMetrics.length,
        profitableSKUs: skuMetrics.filter(m => m.status === 'profitable').length,
        marginalSKUs: skuMetrics.filter(m => m.status === 'marginal').length,
        lossSKUs: skuMetrics.filter(m => m.status === 'loss').length,
        totalProfit: Number(summaryData?.total_profit) || 0,
        avgMargin: Number(summaryData?.avg_margin) || 0,
      };

      return {
        skuMetrics,
        summary,
        hasCachedData: skuMetrics.length > 0,
        lastCalculated: new Date().toISOString()
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000
  });
}

/**
 * Recalculate and save SKU profitability to cache
 */
export function useRecalculateSKUProfitability() {
  const { client, buildSelectQuery, tenantId, isReady, shouldAddTenantFilter } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const { data: rawSkuData, error: skuError } = await buildSelectQuery('fdp_sku_summary', '*');

      if (skuError) throw skuError;

      interface SKUViewRow {
        sku: string | null;
        product_name: string | null;
        total_quantity: number;
        total_revenue: number;
        total_cogs: number;
        gross_profit: number;
        margin_percent: number;
      }
      const skuData = (rawSkuData as unknown as SKUViewRow[]) || [];

      const now = new Date().toISOString();
      const cacheRecords = skuData.map(row => {
        const profit = row.gross_profit || 0;
        const revenue = row.total_revenue || 0;
        const margin = row.margin_percent || 0;

        return {
          tenant_id: tenantId,
          period_start: startDateStr,
          period_end: endDateStr,
          sku: row.sku || 'Unknown',
          product_name: row.product_name || row.sku,
          channel: 'ALL',
          quantity: row.total_quantity || 0,
          revenue: revenue,
          cogs: row.total_cogs || 0,
          fees: 0,
          profit: profit,
          margin_percent: margin,
          aov: row.total_quantity > 0 ? revenue / row.total_quantity : 0,
          status: margin >= 10 ? 'profitable' : margin >= 0 ? 'marginal' : 'loss',
          calculated_at: now
        };
      });

      let deleteQuery = client
        .from('sku_profitability_cache')
        .delete()
        .eq('period_start', startDateStr)
        .eq('period_end', endDateStr);
      
      if (shouldAddTenantFilter && tenantId) {
        deleteQuery = deleteQuery.eq('tenant_id', tenantId);
      }
      
      await deleteQuery;

      const chunkSize = 100;
      for (let i = 0; i < cacheRecords.length; i += chunkSize) {
        const chunk = cacheRecords.slice(i, i + chunkSize);
        const { error: insertError } = await client
          .from('sku_profitability_cache')
          .insert(chunk);

        if (insertError) throw insertError;
      }

      return cacheRecords.length;
    },
    onSuccess: (count) => {
      toast.success(`Đã tính toán xong ${count} SKU`);
      queryClient.invalidateQueries({ queryKey: ['sku-profitability-cache'] });
      queryClient.invalidateQueries({ queryKey: ['sku-profitability-view'] });
    },
    onError: (error) => {
      console.error('Recalculate error:', error);
      toast.error('Lỗi khi tính toán SKU profitability');
    }
  });
}
