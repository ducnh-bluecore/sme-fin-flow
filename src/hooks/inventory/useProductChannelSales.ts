/**
 * useProductChannelSales - Fetch channel sales & discount breakdown for a product family code
 * Uses database function fn_product_channel_sales for performance (avoids statement timeout on large tables)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChannelSalesRow {
  channel: string;
  order_count: number;
  qty_sold: number;
  revenue: number;
  discount_amount: number;
  avg_discount_pct: number;
}

export interface ProductChannelSalesData {
  channels: ChannelSalesRow[];
  total_revenue: number;
  total_discount: number;
  total_qty: number;
  total_orders: number;
  avg_discount_pct: number;
}

export function useProductChannelSales(tenantId: string | null, fcCode: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['product-channel-sales', tenantId, fcCode],
    queryFn: async (): Promise<ProductChannelSalesData> => {
      if (!tenantId || !fcCode) throw new Error('Missing params');

      const { data, error } = await supabase.rpc('fn_product_channel_sales' as any, {
        p_tenant_id: tenantId,
        p_fc_code: fcCode,
      });

      if (error) throw error;

      const result = data as any;
      return {
        channels: (result.channels || []).map((c: any) => ({
          channel: c.channel,
          order_count: Number(c.order_count) || 0,
          qty_sold: Number(c.qty_sold) || 0,
          revenue: Number(c.revenue) || 0,
          discount_amount: Number(c.discount_amount) || 0,
          avg_discount_pct: Number(c.avg_discount_pct) || 0,
        })),
        total_revenue: Number(result.total_revenue) || 0,
        total_discount: Number(result.total_discount) || 0,
        total_qty: Number(result.total_qty) || 0,
        total_orders: Number(result.total_orders) || 0,
        avg_discount_pct: Number(result.avg_discount_pct) || 0,
      };
    },
    enabled: enabled && !!tenantId && !!fcCode,
    staleTime: 60_000,
  });
}
