/**
 * ============================================
 * ALL CHANNELS P&L - OPTIMIZED WITH AGGREGATED VIEWS
 * ============================================
 * 
 * SSOT: Uses v_channel_pl_summary view for pre-aggregated channel metrics
 * instead of fetching 50,000+ raw orders.
 * 
 * Performance: ~99% reduction in data transfer
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

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

export function useAllChannelsPL() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['all-channels-pl', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<AllChannelsPLData | null> => {
      if (!tenantId) return null;

      // Use pre-aggregated channel summary view with date filtering
      const { data: rawData, error } = await supabase
        .from('v_channel_pl_summary' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('period', startDateStr)
        .lte('period', endDateStr);

      if (error) {
        console.error('Error fetching channel summary:', error);
        return null;
      }

      // Match actual v_channel_pl_summary columns
      interface ChannelViewRow {
        channel: string | null;
        period: string;
        order_count: number;
        gross_revenue: number;
        net_revenue: number;
        cogs: number;
        contribution_margin: number;
        cm_percent: number;
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
        orderCount: number;
        contributionMargin: number;
      }>();

      channelSummary.forEach(ch => {
        let normalizedChannel = (ch.channel || 'Unknown').toUpperCase().trim();
        
        // Normalize channel aliases (e.g., TIKTOK and TIKTOKSHOP are the same)
        if (normalizedChannel === 'TIKTOKSHOP' || normalizedChannel === 'TIKTOK SHOP') {
          normalizedChannel = 'TIKTOK';
        }
        const existing = channelMap.get(normalizedChannel) || {
          totalRevenue: 0,
          totalCogs: 0,
          totalFees: 0,
          orderCount: 0,
          contributionMargin: 0,
        };

        // Use actual column names from v_channel_pl_summary
        existing.totalRevenue += ch.gross_revenue || 0;
        existing.totalCogs += ch.cogs || 0;
        
        // Fees = gross_revenue - net_revenue (platform fees, commissions, etc.)
        const periodFees = (ch.gross_revenue || 0) - (ch.net_revenue || 0);
        existing.totalFees += periodFees;
        
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
        const totalFees = ch.totalFees;
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
