/**
 * Hook for managing SKU Profitability Cache
 * Uses a pre-calculated cache table for faster loading
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
 * Fetch cached SKU profitability data
 */
export function useCachedSKUProfitability() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['sku-profitability-cache', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return null;

      // First try exact match
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
        status: row.status || 'profitable',
        calculated_at: row.calculated_at
      }));

      // Calculate summary
      const profitable = skuMetrics.filter(m => m.status === 'profitable');
      const marginal = skuMetrics.filter(m => m.status === 'marginal');
      const loss = skuMetrics.filter(m => m.status === 'loss');

      const summary: SKUProfitabilitySummary = {
        totalSKUs: new Set(skuMetrics.map(m => m.sku)).size,
        profitableSKUs: new Set(profitable.map(m => m.sku)).size,
        marginalSKUs: new Set(marginal.map(m => m.sku)).size,
        lossSKUs: new Set(loss.map(m => m.sku)).size,
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
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
}

/**
 * Recalculate and save SKU profitability to cache
 */
export function useRecalculateSKUProfitability() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      // Fetch orders (paginate to avoid the 1000 row default limit)
      const pageSize = 1000;
      const orders: Array<{
        id: string;
        channel: string | null;
        total_amount: number | null;
        cost_of_goods: number | null;
        platform_fee: number | null;
        commission_fee: number | null;
        payment_fee: number | null;
        shipping_fee: number | null;
      }> = [];

      for (let from = 0; ; from += pageSize) {
        const to = from + pageSize - 1;
        const { data: page, error: pageError } = await supabase
          .from('external_orders')
          .select('id,channel,total_amount,cost_of_goods,platform_fee,commission_fee,payment_fee,shipping_fee,status')
          .eq('tenant_id', tenantId)
          .gte('order_date', startDateStr)
          .lte('order_date', endDateStr)
          .in('status', ['pending', 'delivered'])
          .range(from, to);

        if (pageError) throw pageError;
        orders.push(...(page || []));
        if (!page || page.length < pageSize) break;
      }

      // Fetch order items separately
      const orderIds = new Set((orders || []).map(o => o.id));

      const { data: orderItems, error: itemsError } = await supabase
        .from('external_order_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(100000);

      if (itemsError) throw itemsError;

      const items = (orderItems || []).filter(i => orderIds.has(i.external_order_id));

      // Map items to orders
      const itemsByOrderId = items.reduce((acc, item) => {
        if (!acc[item.external_order_id]) acc[item.external_order_id] = [];
        acc[item.external_order_id].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate SKU-level metrics
      const skuMap = new Map<string, {
        sku: string;
        name: string;
        channels: Map<string, { qty: number; revenue: number; cogs: number; fees: number }>;
      }>();

      orders?.forEach(order => {
        const channel = (order.channel || 'unknown').toUpperCase();
        const orderFees = (order.platform_fee || 0) + (order.commission_fee || 0) +
          (order.payment_fee || 0) + (order.shipping_fee || 0);

        const orderItems = itemsByOrderId[order.id] || [];

        // Compute item-level revenue
        const itemRows = orderItems.map((item: any) => {
          const qty = Number(item.quantity ?? 1);
          const totalAmount = item.total_amount != null ? Number(item.total_amount) : null;
          const unitPrice = item.unit_price != null ? Number(item.unit_price) : 0;

          const itemRevenue = totalAmount != null && totalAmount > 0
            ? totalAmount
            : (unitPrice * qty);

          return { item, qty, itemRevenue };
        });

        const totalItemRevenue = itemRows.reduce((s, r) => s + (r.itemRevenue || 0), 0);
        const fallbackShare = itemRows.length > 0 ? 1 / itemRows.length : 0;

        itemRows.forEach(({ item, qty, itemRevenue }) => {
          const sku = item.sku || item.product_name || 'Unknown';
          const name = item.product_name || sku;

          const share = totalItemRevenue > 0 ? (itemRevenue || 0) / totalItemRevenue : fallbackShare;
          const feeAllocated = orderFees * share;

          // Calculate COGS
          const unitCogs = item.unit_cogs != null ? Number(item.unit_cogs) : 0;
          const totalCogs = item.total_cogs != null ? Number(item.total_cogs) : 0;
          const grossProfit = item.gross_profit != null ? Number(item.gross_profit) : 0;
          const orderCogs = Number(order.cost_of_goods ?? 0);

          let itemCogs = 0;
          if (unitCogs > 0) {
            itemCogs = unitCogs * qty;
          } else if (totalCogs > 0) {
            itemCogs = totalCogs;
          } else if (grossProfit !== 0 && (itemRevenue || 0) > 0) {
            itemCogs = Math.max((itemRevenue || 0) - grossProfit, 0);
          } else if (orderCogs > 0) {
            itemCogs = orderCogs * share;
          }

          if (!skuMap.has(sku)) {
            skuMap.set(sku, { sku, name, channels: new Map() });
          }

          const skuData = skuMap.get(sku)!;
          if (!skuData.channels.has(channel)) {
            skuData.channels.set(channel, { qty: 0, revenue: 0, cogs: 0, fees: 0 });
          }

          const chData = skuData.channels.get(channel)!;
          chData.qty += qty;
          chData.revenue += itemRevenue || 0;
          chData.cogs += itemCogs || 0;
          chData.fees += feeAllocated;
        });
      });

      // Convert to cache records
      const cacheRecords: Array<{
        tenant_id: string;
        period_start: string;
        period_end: string;
        sku: string;
        product_name: string;
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
      }> = [];

      const now = new Date().toISOString();

      skuMap.forEach((data, sku) => {
        data.channels.forEach((chData, channel) => {
          const profit = chData.revenue - chData.cogs - chData.fees;
          const margin = chData.revenue > 0 ? (profit / chData.revenue) * 100 : 0;
          const aov = chData.qty > 0 ? chData.revenue / chData.qty : 0;

          cacheRecords.push({
            tenant_id: tenantId,
            period_start: startDateStr,
            period_end: endDateStr,
            sku,
            product_name: data.name,
            channel,
            quantity: chData.qty,
            revenue: chData.revenue,
            cogs: chData.cogs,
            fees: chData.fees,
            profit,
            margin_percent: margin,
            aov,
            status: margin >= 10 ? 'profitable' : margin >= 0 ? 'marginal' : 'loss',
            calculated_at: now
          });
        });
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
    },
    onError: (error) => {
      console.error('Recalculate error:', error);
      toast.error('Lỗi khi tính toán SKU profitability');
    }
  });
}
