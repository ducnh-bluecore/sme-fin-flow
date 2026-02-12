/**
 * ============================================
 * ALL CHANNELS P&L - WITH TIMEOUT FALLBACK
 * ============================================
 * 
 * Primary: v_channel_pl_summary view
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

function normalizeChannel(ch: string | null): string {
  let name = (ch || 'Unknown').toUpperCase().trim();
  if (name === 'TIKTOKSHOP' || name === 'TIKTOK SHOP') name = 'TIKTOK';
  return name;
}

function buildChannelResult(channelMap: Map<string, { totalRevenue: number; totalCogs: number; totalFees: number; orderCount: number; contributionMargin: number }>, dataSource: 'view' | 'fallback'): AllChannelsPLData {
  let grandTotalRevenue = 0;
  channelMap.forEach(ch => { grandTotalRevenue += ch.totalRevenue; });

  const channelData: ChannelPLSummaryItem[] = Array.from(channelMap.entries()).map(([channelName, ch]) => {
    const grossProfit = ch.totalRevenue - ch.totalCogs;
    const operatingProfit = ch.contributionMargin || (grossProfit - ch.totalFees);
    return {
      channel: channelName,
      totalRevenue: ch.totalRevenue,
      totalFees: ch.totalFees,
      totalCogs: ch.totalCogs,
      grossProfit,
      operatingProfit,
      orderCount: ch.orderCount,
      avgOrderValue: ch.orderCount > 0 ? ch.totalRevenue / ch.orderCount : 0,
      grossMargin: ch.totalRevenue > 0 ? (grossProfit / ch.totalRevenue) * 100 : 0,
      operatingMargin: ch.totalRevenue > 0 ? (operatingProfit / ch.totalRevenue) * 100 : 0,
      revenueShare: grandTotalRevenue > 0 ? (ch.totalRevenue / grandTotalRevenue) * 100 : 0,
    };
  });

  channelData.sort((a, b) => b.totalRevenue - a.totalRevenue);

  const totals = channelData.reduce(
    (acc, ch) => ({
      totalRevenue: acc.totalRevenue + ch.totalRevenue,
      totalFees: acc.totalFees + ch.totalFees,
      totalCogs: acc.totalCogs + ch.totalCogs,
      grossProfit: acc.grossProfit + ch.grossProfit,
      operatingProfit: acc.operatingProfit + ch.operatingProfit,
      orderCount: acc.orderCount + ch.orderCount,
      avgOrderValue: 0,
      grossMargin: 0,
      operatingMargin: 0,
    }),
    { totalRevenue: 0, totalFees: 0, totalCogs: 0, grossProfit: 0, operatingProfit: 0, orderCount: 0, avgOrderValue: 0, grossMargin: 0, operatingMargin: 0 }
  );

  totals.avgOrderValue = totals.orderCount > 0 ? totals.totalRevenue / totals.orderCount : 0;
  totals.grossMargin = totals.totalRevenue > 0 ? (totals.grossProfit / totals.totalRevenue) * 100 : 0;
  totals.operatingMargin = totals.totalRevenue > 0 ? (totals.operatingProfit / totals.totalRevenue) * 100 : 0;

  return {
    channels: channelData,
    totals,
    topChannel: channelData.length > 0 ? channelData[0].channel : null,
    mostProfitableChannel: channelData.length > 0
      ? [...channelData].sort((a, b) => b.operatingMargin - a.operatingMargin)[0].channel
      : null,
    dataSource,
  };
}

export function useAllChannelsPL() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['all-channels-pl', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<AllChannelsPLData | null> => {
      if (!tenantId) return null;

      // Try primary view first
      const { data: rawData, error } = await buildSelectQuery('v_channel_pl_summary', '*')
        .gte('period', startDateStr)
        .lte('period', endDateStr)
        .limit(1000);

      // If timeout (57014) or other error, try fallback
      if (error) {
        console.warn('[useAllChannelsPL] View failed, trying kpi_facts_daily fallback:', error.code);
        
        if (error.code === '57014' || error.code === 'PGRST301') {
          return await fetchFromKpiFallback(buildSelectQuery, startDateStr, endDateStr);
        }
        // Non-timeout error
        console.error('Error fetching channel summary:', error);
        return null;
      }

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
        // Try fallback even when view returns empty
        return await fetchFromKpiFallback(buildSelectQuery, startDateStr, endDateStr);
      }

      const channelMap = new Map<string, { totalRevenue: number; totalCogs: number; totalFees: number; orderCount: number; contributionMargin: number }>();

      channelSummary.forEach(ch => {
        const name = normalizeChannel(ch.channel);
        const existing = channelMap.get(name) || { totalRevenue: 0, totalCogs: 0, totalFees: 0, orderCount: 0, contributionMargin: 0 };
        existing.totalRevenue += ch.gross_revenue || 0;
        existing.totalCogs += ch.cogs || 0;
        existing.totalFees += (ch.gross_revenue || 0) - (ch.net_revenue || 0);
        existing.orderCount += ch.order_count || 0;
        existing.contributionMargin += ch.contribution_margin || 0;
        channelMap.set(name, existing);
      });

      return buildChannelResult(channelMap, 'view');
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry timeouts
  });
}

/**
 * Fallback: query kpi_facts_daily with dimension_type='channel'
 * Uses pivot format: metric_code + metric_value (not flat columns)
 */
async function fetchFromKpiFallback(
  buildSelectQuery: any,
  startDateStr: string,
  endDateStr: string
): Promise<AllChannelsPLData | null> {
  try {
    const { data, error } = await buildSelectQuery('kpi_facts_daily', 'dimension_value,metric_code,metric_value')
      .eq('dimension_type', 'channel')
      .gte('grain_date', startDateStr)
      .lte('grain_date', endDateStr)
      .limit(5000);

    if (error || !data || data.length === 0) {
      console.warn('[useAllChannelsPL] Fallback also empty');
      return {
        channels: [],
        totals: { totalRevenue: 0, totalFees: 0, totalCogs: 0, grossProfit: 0, operatingProfit: 0, orderCount: 0, avgOrderValue: 0, grossMargin: 0, operatingMargin: 0 },
        topChannel: null,
        mostProfitableChannel: null,
        dataSource: 'fallback',
      };
    }

    // Pivot: group by channel, aggregate metric_code values
    const channelMap = new Map<string, { totalRevenue: number; totalCogs: number; totalFees: number; orderCount: number; contributionMargin: number }>();

    (data as any[]).forEach(row => {
      const name = normalizeChannel(row.dimension_value);
      const existing = channelMap.get(name) || { totalRevenue: 0, totalCogs: 0, totalFees: 0, orderCount: 0, contributionMargin: 0 };
      const val = Number(row.metric_value || 0);

      switch ((row.metric_code || '').toUpperCase()) {
        case 'NET_REVENUE':
          existing.totalRevenue += val;
          break;
        case 'ORDER_COUNT':
          existing.orderCount += val;
          break;
        case 'COGS':
          existing.totalCogs += val;
          break;
        case 'GROSS_MARGIN':
          // This is margin amount, use as contribution margin
          existing.contributionMargin += val;
          break;
        case 'CHANNEL_FEE':
        case 'PLATFORM_FEE':
          existing.totalFees += val;
          break;
      }

      channelMap.set(name, existing);
    });

    // Filter out channels with no revenue (e.g. SHOPEE_ADS)
    for (const [name, ch] of channelMap) {
      if (ch.totalRevenue <= 0) channelMap.delete(name);
    }

    return buildChannelResult(channelMap, 'fallback');
  } catch (e) {
    console.error('[useAllChannelsPL] Fallback error:', e);
    return null;
  }
}
