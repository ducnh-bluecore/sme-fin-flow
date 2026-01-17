/**
 * Hook to fetch ALL problematic SKUs (margin < 10%) regardless of date range
 * Used for Today's Decision Summary on CFO Dashboard
 * 
 * SSOT: Reads from product_metrics table which is calculated from:
 * - Master products table (pricing)
 * - external_orders (sales data)
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

      // SSOT: Read from product_metrics table
      // Fetch products with margin < 10% (problematic) and has actual sales
      const { data, error } = await supabase
        .from('product_metrics')
        .select(`
          sku, product_name, 
          gross_profit_30d, gross_margin_percent,
          total_revenue_30d, total_cost_30d, total_quantity_30d,
          profit_per_unit, profit_status
        `)
        .eq('tenant_id', tenantId)
        .or('profit_status.eq.critical,profit_status.eq.marginal')
        .gt('total_quantity_30d', 0) // Only products with actual sales
        .order('gross_margin_percent', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching problematic SKUs from product_metrics:', error);
        return [];
      }

      return (data || []).map(row => {
        const quantity = Number(row.total_quantity_30d || 0);
        const profit = Number(row.gross_profit_30d || 0);
        const profitPerUnit = Number(row.profit_per_unit || 0);
        
        return {
          sku: row.sku,
          product_name: row.product_name || row.sku,
          channel: 'ALL', // product_metrics aggregates across channels
          profit,
          margin_percent: Number(row.gross_margin_percent || 0),
          revenue: Number(row.total_revenue_30d || 0),
          cogs: Number(row.total_cost_30d || 0),
          fees: 0, // Not tracked at product level
          quantity,
          loss_per_unit: profitPerUnit < 0 ? profitPerUnit : 0,
        };
      });
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000 // 2 minutes - more responsive to recalculations
  });
}
