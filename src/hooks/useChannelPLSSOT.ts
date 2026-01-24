/**
 * ============================================
 * CHANNEL P&L SSOT HOOK
 * ============================================
 * 
 * ⚠️ DB-FIRST: This hook ONLY fetches from v_channel_pl_summary
 * NO client-side calculations allowed.
 * 
 * Replaces: useChannelPL (deprecated)
 * Source: v_channel_pl_summary view
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { INDUSTRY_BENCHMARKS, getMetricStatus, MetricStatus } from '@/lib/financial-constants';

export interface ChannelPLMonthly {
  channel: string;
  period: string;
  orderCount: number;
  cancelledCount: number;
  grossRevenue: number;
  platformFee: number;
  commissionFee: number;
  paymentFee: number;
  shippingFee: number;
  totalFees: number;
  cogs: number;
  netRevenue: number;
  grossProfit: number;
  marginPercent: number;
  avgOrderValue: number;
  returnRate: number;
}

export interface ChannelPLSummary {
  channel: string;
  totalRevenue: number;
  totalFees: number;
  totalCogs: number;
  grossProfit: number;
  orderCount: number;
  avgOrderValue: number;
  returnRate: number;
  grossMargin: number;
  monthlyData: ChannelPLMonthly[];
  feeBreakdown: {
    platform: number;
    commission: number;
    payment: number;
    shipping: number;
  };
  health: {
    marginStatus: MetricStatus;
    marginBenchmark: number;
    isAboveBenchmark: boolean;
  };
}

/**
 * SSOT Hook for Channel P&L
 * 
 * ✅ Fetches from precomputed v_channel_pl_summary view
 * ✅ NO client-side calculations
 * ✅ Uses centralized INDUSTRY_BENCHMARKS for health indicators
 */
export function useChannelPLSSOT(channelName: string) {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();

  return useQuery({
    queryKey: ['channel-pl-ssot', tenantId, channelName],
    queryFn: async (): Promise<ChannelPLSummary | null> => {
      if (!tenantId || !channelName) return null;

      const normalizedChannel = channelName.toUpperCase();

      // Fetch from precomputed view - NO CALCULATIONS
      const { data, error } = await supabase
        .from('v_channel_pl_summary' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('channel', normalizedChannel)
        .order('period', { ascending: true });

      if (error) {
        console.error('[useChannelPLSSOT] Error:', error);
        return null;
      }

      if (!data || data.length === 0) return null;

      // Map monthly data - NO CALCULATIONS
      const monthlyData: ChannelPLMonthly[] = data.map((row: any) => ({
        channel: row.channel,
        period: row.period,
        orderCount: Number(row.order_count) || 0,
        cancelledCount: Number(row.cancelled_count) || 0,
        grossRevenue: Number(row.gross_revenue) || 0,
        platformFee: Number(row.platform_fee) || 0,
        commissionFee: Number(row.commission_fee) || 0,
        paymentFee: Number(row.payment_fee) || 0,
        shippingFee: Number(row.shipping_fee) || 0,
        totalFees: Number(row.total_fees) || 0,
        cogs: Number(row.cogs) || 0,
        netRevenue: Number(row.net_revenue) || 0,
        grossProfit: Number(row.gross_profit) || 0,
        marginPercent: Number(row.margin_percent) || 0,
        avgOrderValue: Number(row.avg_order_value) || 0,
        returnRate: Number(row.return_rate) || 0,
      }));

      // Aggregate totals from monthly data - simple sum, no complex calculations
      const totals = monthlyData.reduce((acc, m) => ({
        totalRevenue: acc.totalRevenue + m.grossRevenue,
        totalFees: acc.totalFees + m.totalFees,
        totalCogs: acc.totalCogs + m.cogs,
        grossProfit: acc.grossProfit + m.grossProfit,
        orderCount: acc.orderCount + m.orderCount,
        platformFee: acc.platformFee + m.platformFee,
        commissionFee: acc.commissionFee + m.commissionFee,
        paymentFee: acc.paymentFee + m.paymentFee,
        shippingFee: acc.shippingFee + m.shippingFee,
      }), {
        totalRevenue: 0,
        totalFees: 0,
        totalCogs: 0,
        grossProfit: 0,
        orderCount: 0,
        platformFee: 0,
        commissionFee: 0,
        paymentFee: 0,
        shippingFee: 0,
      });

      // Simple derived metrics
      const grossMargin = totals.totalRevenue > 0 
        ? (totals.grossProfit / totals.totalRevenue) * 100 
        : 0;
      const avgOrderValue = totals.orderCount > 0 
        ? totals.totalRevenue / totals.orderCount 
        : 0;

      // Use centralized thresholds
      const marginStatus = getMetricStatus('grossMargin', grossMargin, true);
      const marginBenchmark = INDUSTRY_BENCHMARKS.grossMargin;

      return {
        channel: channelName,
        totalRevenue: totals.totalRevenue,
        totalFees: totals.totalFees,
        totalCogs: totals.totalCogs,
        grossProfit: totals.grossProfit,
        orderCount: totals.orderCount,
        avgOrderValue,
        returnRate: 0, // Would need to aggregate differently
        grossMargin,
        monthlyData,
        feeBreakdown: {
          platform: totals.platformFee,
          commission: totals.commissionFee,
          payment: totals.paymentFee,
          shipping: totals.shippingFee,
        },
        health: {
          marginStatus,
          marginBenchmark,
          isAboveBenchmark: grossMargin >= marginBenchmark,
        },
      };
    },
    enabled: !!tenantId && !tenantLoading && !!channelName,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * SSOT Hook for Available Channels
 * Uses v_channel_pl_summary to get unique channels
 */
export function useAvailableChannelsSSOT() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();

  return useQuery({
    queryKey: ['available-channels-ssot', tenantId],
    queryFn: async (): Promise<string[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_channel_pl_summary' as any)
        .select('channel')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[useAvailableChannelsSSOT] Error:', error);
        return [];
      }

      // Get unique channels
      const channels = [...new Set((data || []).map((d: any) => d.channel))];
      return channels.sort();
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 10 * 60 * 1000,
  });
}
