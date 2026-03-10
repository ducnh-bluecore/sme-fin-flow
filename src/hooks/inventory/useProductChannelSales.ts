/**
 * useProductChannelSales - Fetch channel sales & discount breakdown for a product family code
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

      // Query channel breakdown using SKU prefix matching (fc_code -> SKU variants)
      const { data, error } = await supabase.rpc('fn_product_channel_sales', {
        p_tenant_id: tenantId,
        p_fc_code: fcCode,
      });

      if (error) {
        // Fallback: direct query if RPC doesn't exist
        console.warn('fn_product_channel_sales RPC not found, using direct query');
        return await directQuery(tenantId, fcCode);
      }

      return data as unknown as ProductChannelSalesData;
    },
    enabled: enabled && !!tenantId && !!fcCode,
    staleTime: 60_000,
  });
}

async function directQuery(tenantId: string, fcCode: string): Promise<ProductChannelSalesData> {
  // Use raw query through order_items + orders join
  const { data: rows, error } = await supabase
    .from('cdp_order_items')
    .select(`
      sku,
      qty,
      line_revenue,
      discount_amount,
      original_price,
      unit_price,
      order_id,
      cdp_orders!inner(channel, status)
    `)
    .eq('tenant_id', tenantId)
    .like('sku', `${fcCode}%`)
    .not('cdp_orders.status', 'in', '("cancelled","returned")');

  if (error) throw error;

  // Aggregate by channel
  const channelMap = new Map<string, { orders: Set<string>; qty: number; revenue: number; discount: number }>();

  for (const row of (rows || [])) {
    const order = row.cdp_orders as any;
    const ch = order?.channel || 'unknown';
    if (!channelMap.has(ch)) {
      channelMap.set(ch, { orders: new Set(), qty: 0, revenue: 0, discount: 0 });
    }
    const agg = channelMap.get(ch)!;
    agg.orders.add(row.order_id);
    agg.qty += row.qty || 0;
    agg.revenue += row.line_revenue || 0;
    agg.discount += row.discount_amount || 0;
  }

  const channels: ChannelSalesRow[] = Array.from(channelMap.entries())
    .map(([channel, agg]) => ({
      channel,
      order_count: agg.orders.size,
      qty_sold: agg.qty,
      revenue: agg.revenue,
      discount_amount: agg.discount,
      avg_discount_pct: agg.revenue > 0 ? (agg.discount / (agg.revenue + agg.discount)) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const total_revenue = channels.reduce((s, c) => s + c.revenue, 0);
  const total_discount = channels.reduce((s, c) => s + c.discount, 0);
  const total_qty = channels.reduce((s, c) => s + c.qty_sold, 0);
  const total_orders = channels.reduce((s, c) => s + c.order_count, 0);

  return {
    channels,
    total_revenue,
    total_discount,
    total_qty,
    total_orders,
    avg_discount_pct: total_revenue > 0 ? (total_discount / (total_revenue + total_discount)) * 100 : 0,
  };
}
