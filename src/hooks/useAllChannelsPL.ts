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

      // Use pre-aggregated channel summary view
      const { data: channelSummary, error } = await supabase
        .from('fdp_channel_summary')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching channel summary:', error);
        return null;
      }

      if (!channelSummary || channelSummary.length === 0) {
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

      // Calculate totals from aggregated data
      const grandTotalRevenue = channelSummary.reduce((sum, ch) => sum + (ch.total_revenue || 0), 0);

      // Transform aggregated data to ChannelPLSummaryItem format
      const channelData: ChannelPLSummaryItem[] = channelSummary.map(ch => {
        const totalRevenue = ch.total_revenue || 0;
        const totalCogs = ch.total_cogs || 0;
        const totalFees = (ch.total_platform_fee || 0) + (ch.total_commission_fee || 0) + (ch.total_payment_fee || 0);
        const shippingFees = ch.total_shipping_fee || 0;
        const orderCount = ch.order_count || 0;

        // Gross Profit = Revenue - COGS
        const grossProfit = totalRevenue - totalCogs;
        
        // Operating Profit = Gross Profit - Fees - Shipping (same as contribution_margin)
        const operatingProfit = ch.contribution_margin || (grossProfit - totalFees - shippingFees);

        return {
          channel: (ch.channel || 'Unknown').toUpperCase(),
          totalRevenue,
          totalFees: totalFees + shippingFees,
          totalCogs,
          grossProfit,
          operatingProfit,
          orderCount,
          avgOrderValue: ch.avg_order_value || 0,
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
