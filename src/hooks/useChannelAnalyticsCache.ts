/**
 * Channel Analytics Cache Hook
 * 
 * Uses pre-computed cache table for fast channel analytics.
 * 
 * Refactored to Schema-per-Tenant architecture.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/hooks/useTenantSupabase';
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
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['channel-analytics-cache', tenantId],
    queryFn: async (): Promise<ChannelAnalyticsCache | null> => {
      if (!tenantId) return null;

      let dbQuery = client
        .from('channel_analytics_cache')
        .select('*');
      
      if (shouldAddTenantFilter) {
        dbQuery = dbQuery.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await dbQuery.maybeSingle();

      if (error) {
        console.error('Error fetching channel analytics cache:', error);
        return null;
      }

      // Check if cache is stale and needs refresh
      if (data) {
        const cacheAge = Date.now() - new Date(data.calculated_at).getTime();
        if (cacheAge > CACHE_MAX_AGE_MS) {
          // Trigger background refresh using tenant-aware client
          client.rpc('refresh_channel_analytics_cache', { 
            p_tenant_id: tenantId 
          }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['channel-analytics-cache', tenantId] });
          });
        }
      } else {
        // No cache exists, create it
        client.rpc('refresh_channel_analytics_cache', { 
          p_tenant_id: tenantId 
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['channel-analytics-cache', tenantId] });
        });
      }

      // Parse JSON fields
      if (data) {
        return {
          ...data,
          channel_metrics: (data.channel_metrics || {}) as ChannelAnalyticsCache['channel_metrics'],
          fee_breakdown: (data.fee_breakdown || {}) as Record<string, number>,
          status_breakdown: (data.status_breakdown || {}) as Record<string, { count: number; amount: number }>,
        } as ChannelAnalyticsCache;
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
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const { error } = await client.rpc('refresh_channel_analytics_cache', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-analytics-cache', tenantId] });
    },
  });
}
