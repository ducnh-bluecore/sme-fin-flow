/**
 * Hook to fetch ALL problematic SKUs (margin < 10%) regardless of date range
 * Used for Today's Decision Summary on CFO Dashboard
 * 
 * SSOT Strategy:
 * 1. Primary: Read from product_metrics (calculated from products + orders)
 * 2. Fallback: Read from sku_profitability_cache (for SKUs not yet in product_metrics)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

export interface ProblematicSKU {
  sku: string;
  product_name: string;
  channel: string;
  profit: number;
  margin_percent: number;
  revenue: number;
  cogs: number;
  fees: number;
  quantity: number;
  loss_per_unit: number;
}

export function useAllProblematicSKUs() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['problematic-skus', tenantId],
    queryFn: async (): Promise<ProblematicSKU[]> => {
      if (!tenantId) return [];

      const results: ProblematicSKU[] = [];
      const seenSKUs = new Set<string>();

      // 1. SSOT: First try product_metrics (real-time calculated from orders + products)
      // profit_status values from DB: 'critical', 'warning', 'healthy'
      const { data: metricsData, error: metricsError } = await supabase
        .from('product_metrics')
        .select(`
          sku, product_name, 
          gross_profit_30d, gross_margin_percent,
          total_revenue_30d, total_cost_30d, total_quantity_30d,
          profit_per_unit, profit_status
        `)
        .eq('tenant_id', tenantId)
        .or('profit_status.eq.critical,profit_status.eq.warning')
        .gt('total_quantity_30d', 0)
        .order('gross_margin_percent', { ascending: true })
        .limit(50);

      if (!metricsError && metricsData) {
        metricsData.forEach(row => {
          seenSKUs.add(row.sku);
          results.push({
            sku: row.sku,
            product_name: row.product_name || row.sku,
            channel: 'ALL',
            profit: Number(row.gross_profit_30d || 0),
            margin_percent: Number(row.gross_margin_percent || 0),
            revenue: Number(row.total_revenue_30d || 0),
            cogs: Number(row.total_cost_30d || 0),
            fees: 0,
            quantity: Number(row.total_quantity_30d || 0),
            loss_per_unit: Number(row.profit_per_unit || 0) < 0 ? Number(row.profit_per_unit || 0) : 0,
          });
        });
      }

      // 2. Fallback: Also check sku_profitability_cache for SKUs not in product_metrics
      const { data: cacheData, error: cacheError } = await supabase
        .from('sku_profitability_cache')
        .select('sku, product_name, channel, profit, margin_percent, revenue, cogs, fees, quantity')
        .eq('tenant_id', tenantId)
        .lt('margin_percent', 10) // Margin < 10% needs attention
        .gt('revenue', 0) // Only SKUs with actual sales
        .order('margin_percent', { ascending: true })
        .limit(50);

      if (!cacheError && cacheData) {
        cacheData.forEach(row => {
          // Skip if already from product_metrics (SSOT takes precedence)
          if (seenSKUs.has(row.sku)) return;
          
          seenSKUs.add(row.sku);
          const quantity = Number(row.quantity || 0);
          const profit = Number(row.profit || 0);
          const lossPerUnit = quantity > 0 && profit < 0 ? profit / quantity : 0;
          
          results.push({
            sku: row.sku,
            product_name: row.product_name || row.sku,
            channel: row.channel,
            profit,
            margin_percent: Number(row.margin_percent || 0),
            revenue: Number(row.revenue || 0),
            cogs: Number(row.cogs || 0),
            fees: Number(row.fees || 0),
            quantity,
            loss_per_unit: lossPerUnit,
          });
        });
      }

      // Sort by margin (worst first)
      return results.sort((a, b) => a.margin_percent - b.margin_percent);
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });
}
