/**
 * useWhatIfRealData - Hook for What-If Scenario Analysis
 * 
 * @architecture Schema-per-Tenant v1.4.1 / DB-First SSOT
 * All aggregation done in get_whatif_summary RPC
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { subMonths, format } from 'date-fns';

export interface ChannelMetrics {
  channel: string;
  revenue: number;
  cogs: number;
  fees: number;
  netProfit: number;
  orders: number;
  avgOrderValue: number;
  returnRate: number;
  margin: number;
  commissionFee: number;
  platformFee: number;
  paymentFee: number;
  shippingFee: number;
  growthRate: number;
  prevRevenue: number;
}

export interface SKUMetrics {
  sku: string;
  productName: string;
  category: string;
  quantity: number;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
  avgPrice: number;
  costPrice: number;
  channels: string[];
  returnRate: number;
  contribution: number;
}

export interface GeographicMetrics {
  provinceCode: string;
  provinceName: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
  shippingCost: number;
  netProfit: number;
  margin: number;
  topChannels: string[];
}

export interface HistoricalMetrics {
  month: string;
  revenue: number;
  cogs: number;
  fees: number;
  netProfit: number;
  orders: number;
  avgOrderValue: number;
  margin: number;
}

export interface WhatIfRealData {
  totalRevenue: number;
  totalCogs: number;
  totalFees: number;
  totalNetProfit: number;
  totalOrders: number;
  avgOrderValue: number;
  overallMargin: number;
  byChannel: ChannelMetrics[];
  bySKU: SKUMetrics[];
  byGeography: GeographicMetrics[];
  byMonth: HistoricalMetrics[];
  avgCogsRate: number;
  avgFeeRate: number;
  avgReturnRate: number;
  monthlyGrowthRate: number;
  hasData: boolean;
  dataRange: { from: string; to: string };
}

export function useWhatIfRealData() {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['whatif-real-data', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<WhatIfRealData> => {
      const fromDate = startDateStr || format(subMonths(new Date(), 6), 'yyyy-MM-dd');
      const toDate = endDateStr || format(new Date(), 'yyyy-MM-dd');
      const histStartDate = format(subMonths(new Date(fromDate), 6), 'yyyy-MM-dd');

      const { data: rpcResult, error } = await callRpc('get_whatif_summary', {
        p_tenant_id: tenantId,
        p_start_date: fromDate,
        p_end_date: toDate,
        p_hist_start_date: histStartDate,
      });

      if (error) {
        console.error('[useWhatIfRealData] RPC error:', error);
        return getEmptyData(fromDate, toDate);
      }

      const result = rpcResult as any;
      if (!result?.totals || Number(result.totals.total_orders) === 0) {
        return getEmptyData(fromDate, toDate);
      }

      const totals = result.totals;
      const totalRevenue = Number(totals.total_revenue) || 0;

      // Map DB channel data to ChannelMetrics (no calculations, just mapping)
      const byChannel: ChannelMetrics[] = (result.byChannel || []).map((ch: any) => ({
        channel: normalizeChannel(ch.channel),
        revenue: Number(ch.revenue) || 0,
        cogs: Number(ch.cogs) || 0,
        fees: 0,
        netProfit: Number(ch.net_profit) || 0,
        orders: Number(ch.orders) || 0,
        avgOrderValue: Number(ch.avg_order_value) || 0,
        returnRate: 0,
        margin: Number(ch.margin) || 0,
        commissionFee: 0,
        platformFee: 0,
        paymentFee: 0,
        shippingFee: 0,
        growthRate: 0,
        prevRevenue: 0,
      }));

      // Map DB SKU data to SKUMetrics (no calculations)
      const bySKU: SKUMetrics[] = (result.bySKU || []).map((sk: any) => ({
        sku: sk.sku || 'UNKNOWN',
        productName: sk.product_name || '',
        category: sk.category || '',
        quantity: Number(sk.quantity) || 0,
        revenue: Number(sk.revenue) || 0,
        cogs: Number(sk.cogs) || 0,
        profit: Number(sk.profit) || 0,
        margin: Number(sk.margin) || 0,
        avgPrice: Number(sk.avg_price) || 0,
        costPrice: Number(sk.cost_price) || 0,
        channels: Array.isArray(sk.channels) ? sk.channels.filter(Boolean) : [],
        returnRate: Number(sk.return_rate) || 0,
        contribution: Number(sk.contribution) || 0,
      }));

      // Map DB month data to HistoricalMetrics (no calculations)
      const byMonth: HistoricalMetrics[] = (result.byMonth || []).map((m: any) => ({
        month: m.month,
        revenue: Number(m.revenue) || 0,
        cogs: Number(m.cogs) || 0,
        fees: 0,
        netProfit: Number(m.net_profit) || 0,
        orders: Number(m.orders) || 0,
        avgOrderValue: Number(m.avg_order_value) || 0,
        margin: Number(m.margin) || 0,
      }));

      return {
        totalRevenue,
        totalCogs: Number(totals.total_cogs) || 0,
        totalFees: 0,
        totalNetProfit: Number(totals.total_net_profit) || 0,
        totalOrders: Number(totals.total_orders) || 0,
        avgOrderValue: Number(totals.avg_order_value) || 0,
        overallMargin: Number(totals.overall_margin) || 0,
        byChannel,
        bySKU,
        byGeography: [],
        byMonth,
        avgCogsRate: Number(totals.avg_cogs_rate) || 0,
        avgFeeRate: 0,
        avgReturnRate: 0,
        monthlyGrowthRate: 0, // Computed in DB via byMonth trend
        hasData: true,
        dataRange: { from: fromDate, to: toDate },
      };
    },
    enabled: isReady,
    staleTime: 300000,
  });
}

function normalizeChannel(channel: string | null): string {
  if (!channel) return 'other';
  const ch = channel.toLowerCase().trim();
  if (ch.includes('shopee')) return 'shopee';
  if (ch.includes('lazada')) return 'lazada';
  if (ch.includes('tiki')) return 'tiki';
  if (ch.includes('tiktok') || ch.includes('tik tok')) return 'tiktok';
  if (ch.includes('haravan')) return 'haravan';
  if (ch.includes('sapo')) return 'sapo';
  if (ch.includes('nhanh')) return 'nhanh';
  return ch || 'other';
}

function getEmptyData(from: string, to: string): WhatIfRealData {
  return {
    totalRevenue: 0,
    totalCogs: 0,
    totalFees: 0,
    totalNetProfit: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    overallMargin: 0,
    byChannel: [],
    bySKU: [],
    byGeography: [],
    byMonth: [],
    avgCogsRate: 0,
    avgFeeRate: 0,
    avgReturnRate: 0,
    monthlyGrowthRate: 0,
    hasData: false,
    dataRange: { from, to },
  };
}
