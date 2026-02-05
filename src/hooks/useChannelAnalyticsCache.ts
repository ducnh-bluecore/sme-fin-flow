/**
 * Channel Analytics Cache Hook
 * 
 * Uses pre-computed cache table for fast channel analytics.
 * 
 * @architecture Schema-per-Tenant v1.4.1
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { ChannelPerformance, OrderStatusSummary, FeeSummary } from './useChannelAnalytics';

export interface ChannelAnalyticsCache {
  id: string;
  tenant_id: string;
  total_orders: number;
  gross_revenue: number;
  net_revenue: number;
  total_fees: number;
  total_cogs: number;
  gross_profit: number;
  avg_order_value: number;
  cancelled_orders: number;
  returned_orders: number;
  channel_metrics: Record<string, {
    orders: number;
    revenue: number;
    fees: number;
    cogs: number;
    profit: number;
    aov: number;
  }>;
  fee_breakdown: Record<string, number>;
  status_breakdown: Record<string, { count: number; amount: number }>;
  data_start_date: string | null;
  data_end_date: string | null;
  calculated_at: string;
}

// Max age for cache before refresh (1 hour)
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;

export function useChannelAnalyticsCache() {
  const { client, buildSelectQuery, callRpc, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['channel-analytics-cache', tenantId],
    queryFn: async (): Promise<ChannelAnalyticsCache | null> => {
      if (!tenantId) return null;

      const { data, error } = await buildSelectQuery('channel_analytics_cache', '*')
        .maybeSingle();

      if (error) {
        console.error('Error fetching channel analytics cache:', error);
        return null;
      }

      // Check if cache is stale and needs refresh
      if (data) {
        const typedData = data as unknown as Record<string, unknown>;
        const cacheAge = Date.now() - new Date(typedData.calculated_at as string).getTime();
        if (cacheAge > CACHE_MAX_AGE_MS) {
          // Trigger background refresh using tenant-aware client
          callRpc('refresh_channel_analytics_cache', { 
            p_tenant_id: tenantId 
          }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['channel-analytics-cache', tenantId] });
          });
        }
      } else {
        // No cache exists, create it
        callRpc('refresh_channel_analytics_cache', { 
          p_tenant_id: tenantId 
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['channel-analytics-cache', tenantId] });
        });
      }

      // Parse JSON fields
      if (data) {
        const typedData = data as unknown as Record<string, unknown>;
        return {
          id: typedData.id as string,
          tenant_id: typedData.tenant_id as string,
          total_orders: typedData.total_orders as number,
          gross_revenue: typedData.gross_revenue as number,
          net_revenue: typedData.net_revenue as number,
          total_fees: typedData.total_fees as number,
          total_cogs: typedData.total_cogs as number,
          gross_profit: typedData.gross_profit as number,
          avg_order_value: typedData.avg_order_value as number,
          cancelled_orders: typedData.cancelled_orders as number,
          returned_orders: typedData.returned_orders as number,
          channel_metrics: (typedData.channel_metrics || {}) as ChannelAnalyticsCache['channel_metrics'],
          fee_breakdown: (typedData.fee_breakdown || {}) as Record<string, number>,
          status_breakdown: (typedData.status_breakdown || {}) as Record<string, { count: number; amount: number }>,
          data_start_date: typedData.data_start_date as string | null,
          data_end_date: typedData.data_end_date as string | null,
          calculated_at: typedData.calculated_at as string,
        };
      }
      return null;
    },
    enabled: !!tenantId && isReady,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Convert channel_metrics to ChannelPerformance array
  const channelPerformance: ChannelPerformance[] = query.data?.channel_metrics
    ? Object.entries(query.data.channel_metrics).map(([channel, metrics]) => ({
        connector_name: channel,
        connector_type: channel.toLowerCase(),
        shop_name: null,
        integration_id: channel,
        total_orders: metrics.orders || 0,
        gross_revenue: metrics.revenue || 0,
        net_revenue: metrics.revenue - (metrics.fees || 0),
        total_fees: metrics.fees || 0,
        total_cogs: metrics.cogs || 0,
        gross_profit: metrics.profit || 0,
        avg_order_value: metrics.aov || 0,
        cancelled_orders: 0,
        returned_orders: 0,
        source: 'ecommerce' as const,
      }))
    : [];

  // Convert status_breakdown to OrderStatusSummary array
  const orderStatus: OrderStatusSummary[] = query.data?.status_breakdown
    ? Object.entries(query.data.status_breakdown).map(([status, data]) => ({
        status,
        count: data.count || 0,
        total_amount: data.amount || 0,
      }))
    : [];

  // Convert fee_breakdown to FeeSummary array
  const feesSummary: FeeSummary[] = query.data?.fee_breakdown
    ? Object.entries(query.data.fee_breakdown).map(([type, amount]) => ({
        fee_type: type,
        amount: amount || 0,
      }))
    : [];

  return {
    ...query,
    channelPerformance,
    orderStatus,
    feesSummary,
    cacheData: query.data,
    summary: query.data ? {
      totalOrders: query.data.total_orders,
      grossRevenue: query.data.gross_revenue,
      netRevenue: query.data.net_revenue,
      totalFees: query.data.total_fees,
      totalCogs: query.data.total_cogs,
      grossProfit: query.data.gross_profit,
      avgOrderValue: query.data.avg_order_value,
      cancelledOrders: query.data.cancelled_orders,
      returnedOrders: query.data.returned_orders,
    } : null,
  };
}

export function useRefreshChannelAnalyticsCache() {
  const queryClient = useQueryClient();
  const { callRpc, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const { error } = await callRpc('refresh_channel_analytics_cache', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-analytics-cache', tenantId] });
    },
  });
}
