/**
 * Hook to fetch ALL problematic SKUs (margin < 10%) regardless of date range
 * Used for Today's Decision Summary on CFO Dashboard
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

      // Fetch SKUs with margin < 10% (problematic) and revenue > 0 (has actual sales)
      const { data, error } = await supabase
        .from('sku_profitability_cache')
        .select('sku, product_name, channel, profit, margin_percent, revenue, cogs, fees, quantity')
        .eq('tenant_id', tenantId)
        .lt('margin_percent', 10) // Margin < 10% needs attention
        .gt('revenue', 0) // Only SKUs with actual sales
        .order('margin_percent', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching problematic SKUs:', error);
        return [];
      }

      return (data || []).map(row => {
        const quantity = Number(row.quantity || 0);
        const profit = Number(row.profit || 0);
        const lossPerUnit = quantity > 0 && profit < 0 ? profit / quantity : 0;
        
        return {
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
        };
      });
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}
