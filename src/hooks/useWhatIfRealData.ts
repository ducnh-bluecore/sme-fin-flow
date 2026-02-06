/**
 * useWhatIfRealData - Hook for What-If Scenario Analysis
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { startOfMonth, subMonths, format } from 'date-fns';

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
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['whatif-real-data', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<WhatIfRealData> => {
      const fromDate = startDateStr || format(subMonths(new Date(), 6), 'yyyy-MM-dd');
      const toDate = endDateStr || format(new Date(), 'yyyy-MM-dd');
      
      // Fetch orders from cdp_orders
      const { data: orders, error: ordersError } = await buildSelectQuery(
        'cdp_orders',
        'id, channel, order_at, gross_revenue, net_revenue, cogs, gross_margin'
      )
        .gte('order_at', fromDate)
        .lte('order_at', toDate);

      if (ordersError) {
        console.error('[useWhatIfRealData] Orders error:', ordersError);
      }

      // Fetch order items for SKU analysis from cdp_order_items (SSOT Layer 2)
      // Uses cdp_order_items which maps to master_order_items via tableMapping
      const { data: items, error: itemsError } = await buildSelectQuery(
        'cdp_order_items',
        `sku, product_name, category, quantity,
         unit_price, line_total, unit_cogs, line_cogs,
         line_margin, is_returned, return_quantity,
         cdp_orders!inner(channel, order_at, status)`
      )
        .gte('cdp_orders.order_at', fromDate)
        .lte('cdp_orders.order_at', toDate)
        .neq('cdp_orders.status', 'cancelled');

      if (itemsError) {
        console.error('[useWhatIfRealData] Items error:', itemsError);
      }

      // Fetch historical orders for trend analysis
      const { data: historicalOrders, error: histError } = await buildSelectQuery(
        'cdp_orders',
        'order_at, net_revenue, gross_margin, cogs'
      )
        .gte('order_at', format(subMonths(new Date(fromDate), 6), 'yyyy-MM-dd'))
        .lte('order_at', toDate);

      if (histError) {
        console.error('[useWhatIfRealData] Historical error:', histError);
      }

      const orderList = (orders || []) as any[];
      const itemList = (items || []) as any[];
      const historicalList = (historicalOrders || []) as any[];

      if (orderList.length === 0) {
        return getEmptyData(fromDate, toDate);
      }

      // Map orders to metrics
      const mappedOrders = orderList.map(o => ({
        id: o.id,
        channel: o.channel,
        order_date: o.order_at,
        total_amount: Number(o.gross_revenue) || 0,
        net_revenue: Number(o.net_revenue) || 0,
        net_profit: Number(o.gross_margin) || 0,
        cost_of_goods: Number(o.cogs) || 0,
      }));

      // Calculate totals
      const totalRevenue = mappedOrders.reduce((sum, o) => sum + (o.net_revenue || o.total_amount), 0);
      const totalCogs = mappedOrders.reduce((sum, o) => sum + o.cost_of_goods, 0);
      const totalFees = 0; // cdp_orders doesn't have fee breakdown
      const totalNetProfit = mappedOrders.reduce((sum, o) => sum + o.net_profit, 0);
      const totalOrders = mappedOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate by channel
      const channelMap = new Map<string, any>();
      mappedOrders.forEach(order => {
        const ch = normalizeChannel(order.channel);
        if (!channelMap.has(ch)) {
          channelMap.set(ch, {
            channel: ch,
            revenue: 0, cogs: 0, fees: 0, netProfit: 0, orders: 0,
            commissionFee: 0, platformFee: 0, paymentFee: 0, shippingFee: 0,
          });
        }
        const data = channelMap.get(ch);
        data.revenue += order.net_revenue || order.total_amount;
        data.cogs += order.cost_of_goods;
        data.netProfit += order.net_profit;
        data.orders += 1;
      });

      const byChannel: ChannelMetrics[] = Array.from(channelMap.values()).map(data => ({
        channel: data.channel,
        revenue: data.revenue,
        cogs: data.cogs,
        fees: data.commissionFee + data.platformFee + data.paymentFee,
        netProfit: data.netProfit,
        orders: data.orders,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
        returnRate: 0,
        margin: data.revenue > 0 ? (data.netProfit / data.revenue) * 100 : 0,
        commissionFee: data.commissionFee,
        platformFee: data.platformFee,
        paymentFee: data.paymentFee,
        shippingFee: data.shippingFee,
        growthRate: 0,
        prevRevenue: 0,
      }));

      // Calculate by SKU
      const skuMap = new Map<string, {
        sku: string;
        productName: string;
        category: string;
        quantity: number;
        revenue: number;
        cogs: number;
        profit: number;
        channels: Set<string>;
        returnedQty: number;
      }>();
      itemList.forEach((item: any) => {
        const sku = item.sku || 'UNKNOWN';
        if (!skuMap.has(sku)) {
          skuMap.set(sku, {
            sku,
            productName: item.product_name || '',
            category: item.category || '',
            quantity: 0, revenue: 0, cogs: 0, profit: 0,
            channels: new Set<string>(),
            returnedQty: 0,
          });
        }
        const data = skuMap.get(sku)!;
        data.quantity += Number(item.quantity || 0);
        // Updated column names: line_total, line_cogs, line_margin (SSOT)
        data.revenue += Number(item.line_total || item.total_amount || 0);
        data.cogs += Number(item.line_cogs || item.total_cogs || 0);
        data.profit += Number(item.line_margin || item.gross_profit || 0);
        // Updated relation: cdp_orders instead of external_orders
        if (item.cdp_orders?.channel) {
          data.channels.add(normalizeChannel(item.cdp_orders.channel));
        }
        if (item.is_returned) {
          data.returnedQty += Number(item.return_quantity || item.quantity || 0);
        }
      });

      const bySKU: SKUMetrics[] = Array.from(skuMap.values())
        .map(data => ({
          sku: data.sku,
          productName: data.productName,
          category: data.category,
          quantity: data.quantity,
          revenue: data.revenue,
          cogs: data.cogs,
          profit: data.profit,
          margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
          avgPrice: data.quantity > 0 ? data.revenue / data.quantity : 0,
          costPrice: data.quantity > 0 ? data.cogs / data.quantity : 0,
          channels: Array.from(data.channels) as string[],
          returnRate: data.quantity > 0 ? (data.returnedQty / data.quantity) * 100 : 0,
          contribution: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 100);

      // Calculate by month
      const monthMap = new Map<string, any>();
      historicalList.forEach((order: any) => {
        const month = format(new Date(order.order_at), 'yyyy-MM');
        if (!monthMap.has(month)) {
          monthMap.set(month, {
            month,
            revenue: 0, cogs: 0, fees: 0, netProfit: 0, orders: 0,
          });
        }
        const data = monthMap.get(month);
        data.revenue += Number(order.net_revenue || 0);
        data.cogs += Number(order.cogs || 0);
        data.netProfit += Number(order.gross_margin || 0);
        data.orders += 1;
      });

      const byMonth: HistoricalMetrics[] = Array.from(monthMap.values())
        .map(data => ({
          month: data.month,
          revenue: data.revenue,
          cogs: data.cogs,
          fees: data.fees,
          netProfit: data.netProfit,
          orders: data.orders,
          avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
          margin: data.revenue > 0 ? (data.netProfit / data.revenue) * 100 : 0,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      const monthlyGrowthRate = calculateGrowthRate(byMonth);

      return {
        totalRevenue,
        totalCogs,
        totalFees,
        totalNetProfit,
        totalOrders,
        avgOrderValue,
        overallMargin: totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0,
        byChannel,
        bySKU,
        byGeography: [], // Geography data not available in cdp_orders
        byMonth,
        avgCogsRate: totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0,
        avgFeeRate: totalRevenue > 0 ? (totalFees / totalRevenue) * 100 : 0,
        avgReturnRate: 0,
        monthlyGrowthRate,
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

function calculateGrowthRate(byMonth: HistoricalMetrics[]): number {
  if (byMonth.length < 2) return 0;
  const recent = byMonth.slice(-3);
  const older = byMonth.slice(0, 3);
  const recentAvg = recent.reduce((sum, m) => sum + m.revenue, 0) / recent.length;
  const olderAvg = older.reduce((sum, m) => sum + m.revenue, 0) / older.length;
  if (olderAvg === 0) return 0;
  return ((recentAvg - olderAvg) / olderAvg) * 100;
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
