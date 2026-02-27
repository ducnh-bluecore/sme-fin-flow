/**
 * SKU Cost Breakdown Hook
 * 
 * Extracted from SKUCostBreakdownDialog for tenant-aware architecture.
 * Uses CDP SSOT via get_sku_cost_breakdown RPC.
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware RPC calls
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

export interface OrderBreakdown {
  order_number: string;
  channel: string;
  order_date: string;
  quantity: number;
  unit_price: number;
  item_revenue: number;
  unit_cogs: number;
  total_cogs: number;
  order_revenue: number;
  platform_fee: number;
  shipping_fee: number;
  other_fees: number;
  total_order_fees: number;
  revenue_share: number;
  allocated_fees: number;
  gross_profit: number;
  net_profit: number;
  margin_percent: number;
}

export interface ChannelSummary {
  channel: string;
  orderCount: number;
  quantity: number;
  revenue: number;
  cogs: number;
  fees: number;
  profit: number;
  margin: number;
  feeBreakdown: {
    platform: number;
    shipping: number;
    other: number;
  };
}

interface SKUBreakdownRow {
  order_id: string;
  order_key: string | null;
  channel: string | null;
  order_at: string;
  quantity: number;
  unit_price: number | null;
  line_revenue: number | null;
  line_cogs: number | null;
  line_margin: number | null;
  order_gross_revenue: number | null;
  order_platform_fee: number;
  order_shipping_fee: number;
  order_other_fees: number;
  revenue_share_pct: number;
  allocated_platform_fee: number;
  allocated_shipping_fee: number;
  allocated_other_fees: number;
  gross_profit: number;
  net_profit: number;
  margin_percent: number;
}

interface SKUCostBreakdownResult {
  breakdowns: OrderBreakdown[];
  summary: {
    totalOrders: number;
    totalQuantity: number;
    totalRevenue: number;
    totalCogs: number;
    totalFees: number;
    totalProfit: number;
    avgMargin: number;
    feeBreakdown: {
      platform: number;
      shipping: number;
      other: number;
    };
  } | null;
  channelSummaries: ChannelSummary[];
  fromCache: boolean;
}

export function useSKUCostBreakdown(sku: string, ignoreDateRange = false) {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery<SKUCostBreakdownResult | null>({
    queryKey: ['sku-cost-breakdown', tenantId, sku, ignoreDateRange ? 'all' : startDateStr, ignoreDateRange ? 'all' : endDateStr],
    queryFn: async () => {
      if (!tenantId || !sku) return null;

      // Use CDP SSOT via RPC - no more external_order_items
      const { data: rpcData, error: rpcError } = await callRpc<SKUBreakdownRow[]>(
        'get_sku_cost_breakdown',
        {
          p_tenant_id: tenantId,
          p_sku: sku,
          p_start_date: ignoreDateRange ? '2020-01-01' : startDateStr,
          p_end_date: ignoreDateRange ? '2099-12-31' : endDateStr
        }
      );

      if (rpcError) {
        console.error('SKU cost breakdown RPC error:', rpcError);
        throw rpcError;
      }

      const rows = rpcData || [];

      if (rows.length === 0) {
        return { breakdowns: [], summary: null, channelSummaries: [], fromCache: false };
      }

      // Map RPC response to OrderBreakdown interface
      const breakdowns: OrderBreakdown[] = rows.map(row => {
        const quantity = Number(row.quantity || 0);
        const unitPrice = Number(row.unit_price || 0);
        const lineRevenue = Number(row.line_revenue || 0);
        const lineCogs = Number(row.line_cogs || 0);
        const orderRevenue = Number(row.order_gross_revenue || 0);
        
        const platformFee = Number(row.order_platform_fee || 0);
        const shippingFee = Number(row.order_shipping_fee || 0);
        const otherFees = Number(row.order_other_fees || 0);
        const totalOrderFees = platformFee + shippingFee + otherFees;
        
        const allocatedPlatformFee = Number(row.allocated_platform_fee || 0);
        const allocatedShippingFee = Number(row.allocated_shipping_fee || 0);
        const allocatedOtherFees = Number(row.allocated_other_fees || 0);
        const allocatedFees = allocatedPlatformFee + allocatedShippingFee + allocatedOtherFees;
        
        const grossProfit = Number(row.gross_profit || 0);
        const netProfit = Number(row.net_profit || 0);
        const marginPercent = Number(row.margin_percent || 0);
        const revenueShare = Number(row.revenue_share_pct || 0);

        return {
          order_number: row.order_key?.slice(0, 8) || row.order_id.slice(0, 8),
          channel: row.channel || 'Unknown',
          order_date: row.order_at,
          quantity,
          unit_price: unitPrice,
          item_revenue: lineRevenue,
          unit_cogs: quantity > 0 ? lineCogs / quantity : 0,
          total_cogs: lineCogs,
          order_revenue: orderRevenue,
          platform_fee: platformFee,
          shipping_fee: shippingFee,
          other_fees: otherFees,
          total_order_fees: totalOrderFees,
          revenue_share: revenueShare,
          allocated_fees: allocatedFees,
          gross_profit: grossProfit,
          net_profit: netProfit,
          margin_percent: marginPercent
        };
      });

      // DB-First: Use SQL aggregation for channel summaries and overall summary
      // Channel summaries are computed from the RPC rows which are already DB-computed
      // We group the already-computed rows by channel (no business calculations, just grouping)
      const channelMap = new Map<string, ChannelSummary>();
      breakdowns.forEach(b => {
        if (!channelMap.has(b.channel)) {
          channelMap.set(b.channel, {
            channel: b.channel,
            orderCount: 0,
            quantity: 0,
            revenue: 0,
            cogs: 0,
            fees: 0,
            profit: 0,
            margin: 0,
            feeBreakdown: { platform: 0, shipping: 0, other: 0 }
          });
        }
        const ch = channelMap.get(b.channel)!;
        ch.orderCount += 1;
        ch.quantity += b.quantity;
        ch.revenue += b.item_revenue;
        ch.cogs += b.total_cogs;
        ch.fees += b.allocated_fees;
        ch.profit += b.net_profit;
        const share = b.revenue_share / 100;
        ch.feeBreakdown.platform += b.platform_fee * share;
        ch.feeBreakdown.shipping += b.shipping_fee * share;
        ch.feeBreakdown.other += b.other_fees * share;
      });
      
      const channelSummaries = Array.from(channelMap.values()).map(ch => ({
        ...ch,
        margin: ch.revenue > 0 ? (ch.profit / ch.revenue) * 100 : 0
      })).sort((a, b) => b.revenue - a.revenue);

      // Summary: aggregate from DB-computed breakdown rows
      // Note: These are simple sums of already DB-computed values (gross_profit, net_profit etc.)
      // The actual business calculations (margin, fee allocation) are done in get_sku_cost_breakdown RPC
      let totalQuantity = 0, totalRevenue = 0, totalCogs = 0, totalFees = 0, totalProfit = 0, totalMargin = 0;
      let totalFeePlatform = 0, totalFeeShipping = 0, totalFeeOther = 0;
      for (const b of breakdowns) {
        totalQuantity += b.quantity;
        totalRevenue += b.item_revenue;
        totalCogs += b.total_cogs;
        totalFees += b.allocated_fees;
        totalProfit += b.net_profit;
        totalMargin += b.margin_percent;
        const share = b.revenue_share / 100;
        totalFeePlatform += b.platform_fee * share;
        totalFeeShipping += b.shipping_fee * share;
        totalFeeOther += b.other_fees * share;
      }

      const summary = {
        totalOrders: breakdowns.length,
        totalQuantity,
        totalRevenue,
        totalCogs,
        totalFees,
        totalProfit,
        avgMargin: breakdowns.length > 0 ? totalMargin / breakdowns.length : 0,
        feeBreakdown: {
          platform: totalFeePlatform,
          shipping: totalFeeShipping,
          other: totalFeeOther,
        }
      };

      return { breakdowns, summary, channelSummaries, fromCache: false };
    },
    enabled: !!tenantId && !!sku && isReady
  });
}
