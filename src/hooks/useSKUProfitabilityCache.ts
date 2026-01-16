/**
 * ============================================
 * SKU PROFITABILITY - OPTIMIZED WITH AGGREGATED VIEWS
 * ============================================
 * 
 * Uses fdp_sku_summary database view for pre-aggregated SKU metrics.
 * Falls back to sku_profitability_cache for historical/period-specific data.
 * 
 * Performance: Uses pre-aggregated data instead of 100k+ order items
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
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
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['sku-profitability-view', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      // Use pre-aggregated SKU summary view
      const { data, error } = await supabase
        .from('fdp_sku_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('total_revenue', { ascending: false })
        .limit(500); // Top 500 SKUs

      if (error) throw error;

      const skuMetrics: CachedSKUMetrics[] = (data || []).map((row, idx) => {
        const profit = row.gross_profit || 0;
        const revenue = row.total_revenue || 0;
        const margin = row.margin_percent || 0;

        return {
          id: `sku-${idx}`,
          sku: row.sku || 'Unknown',
          product_name: row.product_name,
          channel: 'ALL', // View aggregates across all channels
          quantity: row.total_quantity || 0,
          revenue: revenue,
          cogs: row.total_cogs || 0,
          fees: 0, // Not available in basic view
          profit: profit,
          margin_percent: margin,
          aov: row.total_quantity > 0 ? revenue / row.total_quantity : 0,
          status: margin >= 10 ? 'profitable' : margin >= 0 ? 'marginal' : 'loss',
          calculated_at: new Date().toISOString(),
        };
      });

      const profitableSKUs = skuMetrics.filter(m => m.margin_percent >= 10);
      const marginalSKUs = skuMetrics.filter(m => m.margin_percent >= 0 && m.margin_percent < 10);
      const lossSKUs = skuMetrics.filter(m => m.margin_percent < 0);

      const summary: SKUProfitabilitySummary = {
        totalSKUs: skuMetrics.length,
        profitableSKUs: profitableSKUs.length,
        marginalSKUs: marginalSKUs.length,
        lossSKUs: lossSKUs.length,
        totalProfit: skuMetrics.reduce((s, m) => s + m.profit, 0),
        avgMargin: skuMetrics.length > 0 
          ? skuMetrics.reduce((s, m) => s + m.margin_percent, 0) / skuMetrics.length 
          : 0
      };

      return {
        skuMetrics,
        summary,
        hasCachedData: true,
        lastCalculated: new Date().toISOString()
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

/**
 * Fetch cached SKU profitability data (for historical/period-specific analysis)
 */
export function useCachedSKUProfitability() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['sku-profitability-cache', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return null;

      // First try pre-aggregated view for quick data
      const { data: viewData, error: viewError } = await supabase
        .from('fdp_sku_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('total_revenue', { ascending: false })
        .limit(500);

      // If view has data, use it
      if (!viewError && viewData && viewData.length > 0) {
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

        const profitableSKUs = skuMetrics.filter(m => m.margin_percent >= 10);
        const marginalSKUs = skuMetrics.filter(m => m.margin_percent >= 0 && m.margin_percent < 10);
        const lossSKUs = skuMetrics.filter(m => m.margin_percent < 0);

        return {
          skuMetrics,
          summary: {
            totalSKUs: skuMetrics.length,
            profitableSKUs: profitableSKUs.length,
            marginalSKUs: marginalSKUs.length,
            lossSKUs: lossSKUs.length,
            totalProfit: skuMetrics.reduce((s, m) => s + m.profit, 0),
            avgMargin: skuMetrics.length > 0 
              ? skuMetrics.reduce((s, m) => s + m.margin_percent, 0) / skuMetrics.length 
              : 0
          },
          hasCachedData: true,
          lastCalculated: new Date().toISOString()
        };
      }

      // Fallback to cache table for period-specific data
      let { data, error } = await supabase
        .from('sku_profitability_cache')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('period_start', startDateStr)
        .eq('period_end', endDateStr)
        .order('profit', { ascending: false });

      if (error) throw error;

      // If no exact match, get the most recent cached data for any period
      if (!data || data.length === 0) {
        const { data: latestData, error: latestError } = await supabase
          .from('sku_profitability_cache')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('calculated_at', { ascending: false })
          .order('profit', { ascending: false });

        if (latestError) throw latestError;
        data = latestData;
      }

      const skuMetrics: CachedSKUMetrics[] = (data || []).map(row => ({
        id: row.id,
        sku: row.sku,
        product_name: row.product_name,
        channel: row.channel,
        quantity: Number(row.quantity || 0),
        revenue: Number(row.revenue || 0),
        cogs: Number(row.cogs || 0),
        fees: Number(row.fees || 0),
        profit: Number(row.profit || 0),
        margin_percent: Number(row.margin_percent || 0),
        aov: Number(row.aov || 0),
        status: row.status || 'unknown',
        calculated_at: row.calculated_at
      }));

      const profitableSKUs = skuMetrics.filter(m => m.status === 'profitable');
      const marginalSKUs = skuMetrics.filter(m => m.status === 'marginal');
      const lossSKUs = skuMetrics.filter(m => m.status === 'loss');

      const summary: SKUProfitabilitySummary = {
        totalSKUs: skuMetrics.length,
        profitableSKUs: profitableSKUs.length,
        marginalSKUs: marginalSKUs.length,
        lossSKUs: lossSKUs.length,
        totalProfit: skuMetrics.reduce((s, m) => s + m.profit, 0),
        avgMargin: skuMetrics.length > 0 
          ? skuMetrics.reduce((s, m) => s + m.margin_percent, 0) / skuMetrics.length 
          : 0
      };

      return {
        skuMetrics,
        summary,
        hasCachedData: skuMetrics.length > 0,
        lastCalculated: skuMetrics.length > 0 ? skuMetrics[0].calculated_at : null
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000 // 5 minutes (reduced from 10)
  });
}

/**
 * Recalculate and save SKU profitability to cache
 * This is now only needed for historical period-specific analysis
 */
export function useRecalculateSKUProfitability() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      // Use fdp_sku_summary view data to populate cache
      const { data: skuData, error: skuError } = await supabase
        .from('fdp_sku_summary')
        .select('*')
        .eq('tenant_id', tenantId);

      if (skuError) throw skuError;

      const now = new Date().toISOString();
      const cacheRecords = (skuData || []).map(row => {
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

      // Delete old cache for this period
      await supabase
        .from('sku_profitability_cache')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('period_start', startDateStr)
        .eq('period_end', endDateStr);

      // Insert new cache (batch in chunks of 100)
      const chunkSize = 100;
      for (let i = 0; i < cacheRecords.length; i += chunkSize) {
        const chunk = cacheRecords.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
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
