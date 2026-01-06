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
      
      // Build query - if no tenantId, fetch all for demo purposes
      const buildOrderQuery = () => {
        let query = supabase
          .from('external_orders')
          .select(`
            id, channel, order_date, status,
            subtotal, total_amount, net_revenue, net_profit,
            cost_of_goods, commission_fee, platform_fee, payment_fee,
            shipping_fee, shipping_fee_paid, voucher_seller, voucher_platform,
            province_code, province_name, total_quantity
          `)
          .gte('order_date', fromDate)
          .lte('order_date', toDate)
          .neq('status', 'cancelled');
        
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

      const buildHistoricalQuery = () => {
        let query = supabase
          .from('external_orders')
          .select('order_date, net_revenue, net_profit, cost_of_goods, commission_fee, platform_fee, payment_fee, status')
          .gte('order_date', format(subMonths(new Date(fromDate), 6), 'yyyy-MM-dd'))
          .lte('order_date', toDate)
          .neq('status', 'cancelled');
        
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

      if (orders.length === 0) {
        return getEmptyData(fromDate, toDate);
      }

      // Calculate overall metrics
      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.net_revenue || o.total_amount || 0), 0);
      const totalCogs = orders.reduce((sum, o) => sum + Number(o.cost_of_goods || 0), 0);
      const totalFees = orders.reduce((sum, o) => 
        sum + Number(o.commission_fee || 0) + Number(o.platform_fee || 0) + Number(o.payment_fee || 0), 0);
      const totalNetProfit = orders.reduce((sum, o) => sum + Number(o.net_profit || 0), 0);
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate by channel
      const channelMap = new Map<string, any>();
      orders.forEach(order => {
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
        data.commissionFee += Number(order.commission_fee || 0);
        data.platformFee += Number(order.platform_fee || 0);
        data.paymentFee += Number(order.payment_fee || 0);
        data.shippingFee += Number(order.shipping_fee || 0);
        data.netProfit += Number(order.net_profit || 0);
        data.orders += 1;
        data.totalQuantity += Number(order.total_quantity || 1);
        if (order.status === 'returned') data.returnedOrders += 1;
      });

      // Calculate previous period for growth rate
      const prevFromDate = format(subMonths(new Date(fromDate), 3), 'yyyy-MM-dd');
      const prevToDate = format(subMonths(new Date(toDate), 3), 'yyyy-MM-dd');
      const prevOrders = historicalOrders.filter(o => 
        o.order_date >= prevFromDate && o.order_date <= prevToDate
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

      // Calculate by geography
      const geoMap = new Map<string, any>();
      orders.forEach(order => {
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
        data.shippingCost += Number(order.shipping_fee_paid || order.shipping_fee || 0);
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

      // Calculate by month (historical)
      const monthMap = new Map<string, any>();
      historicalOrders.forEach(order => {
        const month = format(new Date(order.order_date), 'yyyy-MM');
        if (!monthMap.has(month)) {
          monthMap.set(month, {
            month,
            revenue: 0, cogs: 0, fees: 0, netProfit: 0, orders: 0,
          });
        }
        const data = monthMap.get(month);
        data.revenue += Number(order.net_revenue || 0);
        data.cogs += Number(order.cost_of_goods || 0);
        data.fees += Number(order.commission_fee || 0) + Number(order.platform_fee || 0) + Number(order.payment_fee || 0);
        data.netProfit += Number(order.net_profit || 0);
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
