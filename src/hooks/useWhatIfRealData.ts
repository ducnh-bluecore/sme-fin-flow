import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
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
  // Fee breakdown
  commissionFee: number;
  platformFee: number;
  paymentFee: number;
  shippingFee: number;
  // Growth
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
  contribution: number; // % of total revenue
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
  // Overall metrics
  totalRevenue: number;
  totalCogs: number;
  totalFees: number;
  totalNetProfit: number;
  totalOrders: number;
  avgOrderValue: number;
  overallMargin: number;
  
  // By dimension
  byChannel: ChannelMetrics[];
  bySKU: SKUMetrics[];
  byGeography: GeographicMetrics[];
  byMonth: HistoricalMetrics[];
  
  // Computed rates
  avgCogsRate: number;
  avgFeeRate: number;
  avgReturnRate: number;
  monthlyGrowthRate: number;
  
  hasData: boolean;
  dataRange: { from: string; to: string };
}

export function useWhatIfRealData() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['whatif-real-data', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<WhatIfRealData> => {
      const fromDate = startDateStr || format(subMonths(new Date(), 6), 'yyyy-MM-dd');
      const toDate = endDateStr || format(new Date(), 'yyyy-MM-dd');
      
      // SSOT: Query cdp_orders instead of external_orders
      // cdp_orders contains validated financial data (delivered orders only)
      const buildOrderQuery = () => {
        let query = supabase
          .from('cdp_orders')
          .select(`
            id, channel, order_at,
            gross_revenue, net_revenue, cogs, gross_margin
          `)
          .gte('order_at', fromDate)
          .lte('order_at', toDate);
        
        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }
        return query;
      };

      const buildItemsQuery = () => {
        let query = supabase
          .from('external_order_items')
          .select(`
            sku, product_name, category, quantity,
            unit_price, total_amount, unit_cogs, total_cogs,
            gross_profit, margin_percent, is_returned, return_quantity,
            external_orders!inner(channel, order_date, status, tenant_id)
          `)
          .gte('external_orders.order_date', fromDate)
          .lte('external_orders.order_date', toDate)
          .neq('external_orders.status', 'cancelled');
        
        if (tenantId) {
          query = query.eq('external_orders.tenant_id', tenantId);
        }
        return query;
      };

      // SSOT: Query cdp_orders for historical data
      const buildHistoricalQuery = () => {
        let query = supabase
          .from('cdp_orders')
          .select('order_at, net_revenue, gross_margin, cogs')
          .gte('order_at', format(subMonths(new Date(fromDate), 6), 'yyyy-MM-dd'))
          .lte('order_at', toDate);
        
        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }
        return query;
      };
      
      // Fetch all required data in parallel
      const [ordersResult, itemsResult, historicalResult] = await Promise.all([
        buildOrderQuery(),
          
        buildItemsQuery(),
        buildHistoricalQuery(),
      ]);

      const orders = ordersResult.data || [];
      const items = itemsResult.data || [];
      const historicalOrders = historicalResult.data || [];

      // Map cdp_orders to legacy format for compatibility
      const mappedOrders = (orders as any[]).map(o => ({
        id: o.id,
        channel: o.channel,
        order_date: o.order_at,
        status: 'delivered',
        total_amount: Number(o.gross_revenue) || 0,
        net_revenue: Number(o.net_revenue) || 0,
        net_profit: Number(o.gross_margin) || 0,
        cost_of_goods: Number(o.cogs) || 0,
        commission_fee: 0,
        platform_fee: 0,
        payment_fee: 0,
        shipping_fee: 0,
        province_code: null,
        province_name: null,
        total_quantity: 1
      }));

      if (mappedOrders.length === 0) {
        return getEmptyData(fromDate, toDate);
      }

      // Calculate overall metrics using mapped data
      const totalRevenue = mappedOrders.reduce((sum, o) => sum + Number(o.net_revenue || o.total_amount || 0), 0);
      const totalCogs = mappedOrders.reduce((sum, o) => sum + Number(o.cost_of_goods || 0), 0);
      const totalFees = 0; // cdp_orders doesn't have fee breakdown
      const totalNetProfit = mappedOrders.reduce((sum, o) => sum + Number(o.net_profit || 0), 0);
      const totalOrders = mappedOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate by channel using mapped orders
      const channelMap = new Map<string, any>();
      mappedOrders.forEach(order => {
        const ch = normalizeChannel(order.channel);
        if (!channelMap.has(ch)) {
          channelMap.set(ch, {
            channel: ch,
            revenue: 0, cogs: 0, fees: 0, netProfit: 0, orders: 0,
            commissionFee: 0, platformFee: 0, paymentFee: 0, shippingFee: 0,
            returnedOrders: 0, totalQuantity: 0,
          });
        }
        const data = channelMap.get(ch);
        data.revenue += Number(order.net_revenue || order.total_amount || 0);
        data.cogs += Number(order.cost_of_goods || 0);
        data.netProfit += Number(order.net_profit || 0);
        data.orders += 1;
        data.totalQuantity += Number(order.total_quantity || 1);
      });

      // Calculate previous period for growth rate
      const prevFromDate = format(subMonths(new Date(fromDate), 3), 'yyyy-MM-dd');
      const prevToDate = format(subMonths(new Date(toDate), 3), 'yyyy-MM-dd');
      // Map historicalOrders: order_at -> order_date for compatibility
      const prevOrders = (historicalOrders as any[]).filter(o => 
        o.order_at >= prevFromDate && o.order_at <= prevToDate
      );
      const prevRevenueByChannel = new Map<string, number>();
      prevOrders.forEach(o => {
        // We don't have channel in historical query, so skip growth for now
      });

      const byChannel: ChannelMetrics[] = Array.from(channelMap.values()).map(data => ({
        channel: data.channel,
        revenue: data.revenue,
        cogs: data.cogs,
        fees: data.commissionFee + data.platformFee + data.paymentFee,
        netProfit: data.netProfit,
        orders: data.orders,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
        returnRate: data.orders > 0 ? (data.returnedOrders / data.orders) * 100 : 0,
        margin: data.revenue > 0 ? (data.netProfit / data.revenue) * 100 : 0,
        commissionFee: data.commissionFee,
        platformFee: data.platformFee,
        paymentFee: data.paymentFee,
        shippingFee: data.shippingFee,
        growthRate: 0, // Would need channel-specific historical data
        prevRevenue: 0,
      }));

      // Calculate by SKU
      const skuMap = new Map<string, any>();
      items.forEach((item: any) => {
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
        const data = skuMap.get(sku);
        data.quantity += Number(item.quantity || 0);
        data.revenue += Number(item.total_amount || 0);
        data.cogs += Number(item.total_cogs || 0);
        data.profit += Number(item.gross_profit || 0);
        if (item.external_orders?.channel) {
          data.channels.add(normalizeChannel(item.external_orders.channel));
        }
        if (item.is_returned) {
          data.returnedQty += Number(item.return_quantity || item.quantity || 0);
        }
      });

      const bySKU: SKUMetrics[] = Array.from(skuMap.values())
        .map(data => ({
          sku: data.sku as string,
          productName: data.productName as string,
          category: data.category as string,
          quantity: data.quantity as number,
          revenue: data.revenue as number,
          cogs: data.cogs as number,
          profit: data.profit,
          margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
          avgPrice: data.quantity > 0 ? data.revenue / data.quantity : 0,
          costPrice: data.quantity > 0 ? data.cogs / data.quantity : 0,
          channels: Array.from(data.channels) as string[],
          returnRate: data.quantity > 0 ? (data.returnedQty / data.quantity) * 100 : 0,
          contribution: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 100); // Top 100 SKUs

      // Calculate by geography using mappedOrders
      const geoMap = new Map<string, any>();
      mappedOrders.forEach(order => {
        const province = order.province_code || 'UNKNOWN';
        if (!geoMap.has(province)) {
          geoMap.set(province, {
            provinceCode: province,
            provinceName: order.province_name || province,
            orders: 0, revenue: 0, shippingCost: 0, netProfit: 0,
            channels: new Set<string>(),
          });
        }
        const data = geoMap.get(province);
        data.orders += 1;
        data.revenue += Number(order.net_revenue || order.total_amount || 0);
        data.shippingCost += Number(order.shipping_fee || 0);
        data.netProfit += Number(order.net_profit || 0);
        if (order.channel) data.channels.add(normalizeChannel(order.channel));
      });

      const byGeography: GeographicMetrics[] = Array.from(geoMap.values())
        .map(data => ({
          provinceCode: data.provinceCode,
          provinceName: data.provinceName,
          orders: data.orders,
          revenue: data.revenue,
          avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
          shippingCost: data.shippingCost,
          netProfit: data.netProfit,
          margin: data.revenue > 0 ? (data.netProfit / data.revenue) * 100 : 0,
          topChannels: Array.from(data.channels).slice(0, 3) as string[],
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Calculate by month (historical) - map cdp_orders columns
      const monthMap = new Map<string, any>();
      (historicalOrders as any[]).forEach(order => {
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
        data.fees += 0; // cdp_orders doesn't have fee breakdown
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

      // Calculate growth rate from historical
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
        byGeography,
        byMonth,
        avgCogsRate: totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0,
        avgFeeRate: totalRevenue > 0 ? (totalFees / totalRevenue) * 100 : 0,
        avgReturnRate: 0, // Would need more data
        monthlyGrowthRate,
        hasData: true,
        dataRange: { from: fromDate, to: toDate },
      };
    },
    enabled: true, // Allow fetching even without tenantId for demo
    staleTime: 300000, // 5 minutes
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
