/**
 * ============================================
 * ALL CHANNELS P&L - OPTIMIZED WITH AGGREGATED VIEWS
 * ============================================
 * 
 * SSOT: Uses fdp_channel_summary view for pre-aggregated channel metrics
 * instead of fetching 50,000+ raw orders.
 * 
 * Performance: ~99% reduction in data transfer
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export interface ChannelPLSummaryItem {
  channel: string;
  totalRevenue: number;
  totalFees: number;
  totalCogs: number;
  grossProfit: number;
  operatingProfit: number;
  orderCount: number;
  avgOrderValue: number;
  grossMargin: number;
  operatingMargin: number;
  revenueShare: number; // % of total revenue
}

export interface AllChannelsPLData {
  channels: ChannelPLSummaryItem[];
  totals: {
    totalRevenue: number;
    totalFees: number;
    totalCogs: number;
    grossProfit: number;
    operatingProfit: number;
    orderCount: number;
    avgOrderValue: number;
    grossMargin: number;
    operatingMargin: number;
  };
  topChannel: string | null;
  mostProfitableChannel: string | null;
}

export function useAllChannelsPL(months: number = 12) {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();

  return useQuery({
    queryKey: ['all-channels-pl', tenantId, months],
    queryFn: async (): Promise<AllChannelsPLData | null> => {
      if (!tenantId) return null;

      // Use pre-aggregated channel summary view (cast to any since views not in types)
      const { data: rawData, error } = await supabase
        .from('fdp_channel_summary' as any)
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching channel summary:', error);
        return null;
      }

      interface ChannelViewRow {
        channel: string | null;
        order_count: number;
        total_revenue: number;
        total_cogs: number;
        total_platform_fee: number;
        total_commission_fee: number;
        total_payment_fee: number;
        total_shipping_fee: number;
        contribution_margin: number;
        avg_order_value: number;
      }
      const channelSummary = (rawData as unknown as ChannelViewRow[]) || [];

      if (channelSummary.length === 0) {
        return {
          channels: [],
          totals: {
            totalRevenue: 0,
            totalFees: 0,
            totalCogs: 0,
            grossProfit: 0,
            operatingProfit: 0,
            orderCount: 0,
            avgOrderValue: 0,
            grossMargin: 0,
            operatingMargin: 0,
          },
          topChannel: null,
          mostProfitableChannel: null,
        };
      }

      // Merge channels with same name (case-insensitive) to avoid duplicates like "Shopee" and "shopee"
      const channelMap = new Map<string, {
        totalRevenue: number;
        totalCogs: number;
        totalFees: number;
        shippingFees: number;
        orderCount: number;
        contributionMargin: number;
      }>();

      channelSummary.forEach(ch => {
        const normalizedChannel = (ch.channel || 'Unknown').toUpperCase().trim();
        const existing = channelMap.get(normalizedChannel) || {
          totalRevenue: 0,
          totalCogs: 0,
          totalFees: 0,
          shippingFees: 0,
          orderCount: 0,
          contributionMargin: 0,
        };

        existing.totalRevenue += ch.total_revenue || 0;
        existing.totalCogs += ch.total_cogs || 0;
        existing.totalFees += (ch.total_platform_fee || 0) + (ch.total_commission_fee || 0) + (ch.total_payment_fee || 0);
        existing.shippingFees += ch.total_shipping_fee || 0;
        existing.orderCount += ch.order_count || 0;
        existing.contributionMargin += ch.contribution_margin || 0;

        channelMap.set(normalizedChannel, existing);
      });

      // Calculate totals from merged data
      let grandTotalRevenue = 0;
      channelMap.forEach(ch => {
        grandTotalRevenue += ch.totalRevenue;
      });

      // Transform merged data to ChannelPLSummaryItem format
      const channelData: ChannelPLSummaryItem[] = Array.from(channelMap.entries()).map(([channelName, ch]) => {
        const totalRevenue = ch.totalRevenue;
        const totalCogs = ch.totalCogs;
        const totalFees = ch.totalFees + ch.shippingFees;
        const orderCount = ch.orderCount;

        // Gross Profit = Revenue - COGS
        const grossProfit = totalRevenue - totalCogs;
        
        // Operating Profit = Gross Profit - Fees - Shipping (same as contribution_margin)
        const operatingProfit = ch.contributionMargin || (grossProfit - totalFees);

        return {
          channel: channelName,
          totalRevenue,
          totalFees,
          totalCogs,
          grossProfit,
          operatingProfit,
          orderCount,
          avgOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
          grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
          operatingMargin: totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0,
          revenueShare: grandTotalRevenue > 0 ? (totalRevenue / grandTotalRevenue) * 100 : 0,
        };
      });

      // Sort by revenue descending
      channelData.sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Calculate totals
      const totals = channelData.reduce(
        (acc, ch) => ({
          totalRevenue: acc.totalRevenue + ch.totalRevenue,
          totalFees: acc.totalFees + ch.totalFees,
          totalCogs: acc.totalCogs + ch.totalCogs,
          grossProfit: acc.grossProfit + ch.grossProfit,
          operatingProfit: acc.operatingProfit + ch.operatingProfit,
          orderCount: acc.orderCount + ch.orderCount,
          avgOrderValue: 0, // Will calculate after
          grossMargin: 0,   // Will calculate after
          operatingMargin: 0, // Will calculate after
        }),
        {
          totalRevenue: 0,
          totalFees: 0,
          totalCogs: 0,
          grossProfit: 0,
          operatingProfit: 0,
          orderCount: 0,
          avgOrderValue: 0,
          grossMargin: 0,
          operatingMargin: 0,
        }
      );

      // Calculate derived totals
      totals.avgOrderValue = totals.orderCount > 0 ? totals.totalRevenue / totals.orderCount : 0;
      totals.grossMargin = totals.totalRevenue > 0 ? (totals.grossProfit / totals.totalRevenue) * 100 : 0;
      totals.operatingMargin = totals.totalRevenue > 0 ? (totals.operatingProfit / totals.totalRevenue) * 100 : 0;

      // Find top channel by revenue and most profitable by margin
      const topChannel = channelData.length > 0 ? channelData[0].channel : null;
      const mostProfitableChannel = channelData.length > 0
        ? [...channelData].sort((a, b) => b.operatingMargin - a.operatingMargin)[0].channel
        : null;

      return {
        channels: channelData,
        totals,
        topChannel,
        mostProfitableChannel,
      };
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
