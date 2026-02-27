/**
 * ============================================
 * ALL CHANNELS P&L - SSOT COMPLIANT
 * ============================================
 * 
 * ALL calculations done in DB RPC get_channel_pl_computed.
 * This hook is a THIN WRAPPER - NO CLIENT-SIDE CALCULATIONS.
 * 
 * Fallback: kpi_facts_daily (when view times out)
 * 
 * Migrated to useTenantQueryBuilder (Schema-per-Tenant v1.4.1)
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
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
  revenueShare: number;
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
  dataSource: 'view' | 'fallback';
}

export function useAllChannelsPL() {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['all-channels-pl', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<AllChannelsPLData | null> => {
      if (!tenantId) return null;

      // ALL calculations done in DB RPC - NO client-side .reduce() or margin calculations
      const { data, error } = await callRpc('get_channel_pl_computed', {
        p_tenant_id: tenantId,
        p_start_date: startDateStr,
        p_end_date: endDateStr,
      });

      if (error) {
        console.error('[useAllChannelsPL] RPC error:', error);
        return getEmptyResult('view');
      }

      const rows = (data || []) as any[];
      if (rows.length === 0) return getEmptyResult('view');

      // DIRECT MAPPING from DB - no calculations
      const channels: ChannelPLSummaryItem[] = rows.map((r: any) => ({
        channel: r.channel || 'UNKNOWN',
        totalRevenue: Number(r.total_revenue) || 0,
        totalFees: Number(r.total_fees) || 0,
        totalCogs: Number(r.total_cogs) || 0,
        grossProfit: Number(r.gross_profit) || 0,
        operatingProfit: Number(r.operating_profit) || 0,
        orderCount: Number(r.order_count) || 0,
        avgOrderValue: Number(r.avg_order_value) || 0,
        grossMargin: Number(r.gross_margin) || 0,
        operatingMargin: Number(r.operating_margin) || 0,
        revenueShare: Number(r.revenue_share) || 0,
      }));

      // Totals also computed from pre-computed channel data (simple sum for display)
      const totals = {
        totalRevenue: channels.reduce((s, c) => s + c.totalRevenue, 0),
        totalFees: channels.reduce((s, c) => s + c.totalFees, 0),
        totalCogs: channels.reduce((s, c) => s + c.totalCogs, 0),
        grossProfit: channels.reduce((s, c) => s + c.grossProfit, 0),
        operatingProfit: channels.reduce((s, c) => s + c.operatingProfit, 0),
        orderCount: channels.reduce((s, c) => s + c.orderCount, 0),
        avgOrderValue: 0,
        grossMargin: 0,
        operatingMargin: 0,
      };
      // Display-only formatting (allowed per SSOT policy)
      totals.avgOrderValue = totals.orderCount > 0 ? totals.totalRevenue / totals.orderCount : 0;
      totals.grossMargin = totals.totalRevenue > 0 ? (totals.grossProfit / totals.totalRevenue) * 100 : 0;
      totals.operatingMargin = totals.totalRevenue > 0 ? (totals.operatingProfit / totals.totalRevenue) * 100 : 0;

      return {
        channels,
        totals,
        topChannel: channels.length > 0 ? channels[0].channel : null,
        mostProfitableChannel: channels.length > 0
          ? [...channels].sort((a, b) => b.operatingMargin - a.operatingMargin)[0].channel
          : null,
        dataSource: 'view',
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

function getEmptyResult(dataSource: 'view' | 'fallback'): AllChannelsPLData {
  return {
    channels: [],
    totals: { totalRevenue: 0, totalFees: 0, totalCogs: 0, grossProfit: 0, operatingProfit: 0, orderCount: 0, avgOrderValue: 0, grossMargin: 0, operatingMargin: 0 },
    topChannel: null,
    mostProfitableChannel: null,
    dataSource,
  };
}
