/**
 * ============================================
 * CHANNEL P&L HOOK - Refactored for SSOT Compliance
 * ============================================
 * 
 * This hook provides channel-specific P&L analysis.
 * 
 * SSOT Notes:
 * - Channel-level calculations are necessary because central metrics are aggregated
 * - Margin thresholds use INDUSTRY_BENCHMARKS from financial-constants.ts
 * - For total revenue/margin comparisons, use useCentralFinancialMetrics
 * 
 * Data Source: external_orders (per-channel) + expenses (marketing)
 */

import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, subMonths, format, parseISO, eachMonthOfInterval } from 'date-fns';
import { INDUSTRY_BENCHMARKS, getMetricStatus, MetricStatus } from '@/lib/financial-constants';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';

export interface ChannelPLData {
  channel: string;
  period: string;
  grossRevenue: number;
  platformFee: number;
  commissionFee: number;
  paymentFee: number;
  shippingFee: number;
  totalFees: number;
  cogs: number;
  grossProfit: number;
  netRevenue: number; // seller_income
  adsCost: number;
  operatingProfit: number;
  orderCount: number;
  avgOrderValue: number;
  returnRate: number;
  marginPercent: number;
}

export interface ChannelPLSummary {
  channel: string;
  totalRevenue: number;
  totalFees: number;
  totalCogs: number;
  totalAds: number;
  grossProfit: number;
  operatingProfit: number;
  orderCount: number;
  avgOrderValue: number;
  returnRate: number;
  grossMargin: number;
  operatingMargin: number;
  monthlyData: ChannelPLData[];
  feeBreakdown: {
    platform: number;      // legacy - service fee
    commission: number;    // hoa hồng
    payment: number;       // phí thanh toán
    shipping: number;      // phí vận chuyển
    shippingSubsidy: number;  // hỗ trợ vận chuyển
    couponSubsidy: number;    // hỗ trợ voucher/coupon
    platformAds: number;      // quảng cáo nội sàn
  };
  // SSOT: Health indicators based on centralized thresholds
  health: {
    marginStatus: MetricStatus;
    marginBenchmark: number;
    isAboveBenchmark: boolean;
  };
}

export function useChannelPL(channelName: string, months: number = 12) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['channel-pl', tenantId, channelName, months],
    queryFn: async (): Promise<ChannelPLSummary | null> => {
      if (!tenantId || !channelName) return null;

      const endDate = endOfMonth(new Date());
      const startDate = startOfMonth(subMonths(endDate, months - 1));

      // Normalize channel name for query
      const normalizedChannel = channelName.toLowerCase();

      // Fetch orders for this channel from cdp_orders (SSOT)
      let ordersQuery = client
        .from('cdp_orders')
        .select('id, channel, order_at, gross_revenue, net_revenue, cogs, gross_margin')
        .ilike('channel', `%${normalizedChannel}%`)
        .gte('order_at', startDate.toISOString())
        .lte('order_at', endDate.toISOString());
      
      if (shouldAddTenantFilter) {
        ordersQuery = ordersQuery.eq('tenant_id', tenantId);
      }

      const { data: orders, error: ordersError } = await ordersQuery;

      if (ordersError) {
        console.error('Error fetching channel orders:', ordersError);
        return null;
      }

      // Fetch ads expenses for this channel
      let expQuery = client
        .from('expenses')
        .select('*')
        .eq('category', 'marketing')
        .gte('expense_date', startDate.toISOString())
        .lte('expense_date', endDate.toISOString());
      
      if (shouldAddTenantFilter) {
        expQuery = expQuery.eq('tenant_id', tenantId);
      }
      
      const { data: expenses } = await expQuery;

      // Filter ads related to this channel
      const channelAds = (expenses || []).filter(exp => {
        const desc = (exp.description || exp.subcategory || '').toLowerCase();
        return desc.includes(normalizedChannel) || 
               desc.includes(`${normalizedChannel} ads`) ||
               desc.includes(`${normalizedChannel}ads`);
      });

      // Generate monthly intervals
      const monthIntervals = eachMonthOfInterval({ start: startDate, end: endDate });

      // Aggregate by month
      const monthlyData: ChannelPLData[] = monthIntervals.map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        const period = format(monthStart, 'yyyy-MM');

        // Filter orders for this month
        const monthOrders = (orders || []).filter(o => {
          const orderDate = parseISO(o.order_at);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });

        // cdp_orders only contains completed orders (no status filter needed)
        const completedOrders = monthOrders;
        const cancelledOrders: typeof monthOrders = []; // cdp_orders doesn't have cancelled orders

        // Map to cdp_orders column names
        const grossRevenue = completedOrders.reduce((sum, o) => sum + (o.gross_revenue || 0), 0);
        const platformFee = 0; // cdp_orders doesn't have fee columns
        const commissionFee = 0;
        const paymentFee = 0;
        const shippingFee = 0;
        const cogs = completedOrders.reduce((sum, o) => sum + (o.cogs || 0), 0);
        const netRevenue = completedOrders.reduce((sum, o) => sum + (o.net_revenue || 0), 0);

        const totalFees = platformFee + commissionFee + paymentFee + shippingFee;
        const grossProfit = grossRevenue - totalFees - cogs;

        // Calculate ads for this month
        const monthAds = channelAds.filter(e => {
          const expDate = parseISO(e.expense_date);
          return expDate >= monthStart && expDate <= monthEnd;
        });
        const adsCost = monthAds.reduce((sum, e) => sum + (e.amount || 0), 0);

        const operatingProfit = grossProfit - adsCost;
        const orderCount = completedOrders.length;
        const avgOrderValue = orderCount > 0 ? grossRevenue / orderCount : 0;
        const returnRate = 0; // cdp_orders doesn't track cancelled orders
        const marginPercent = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

        return {
          channel: channelName,
          period,
          grossRevenue,
          platformFee,
          commissionFee,
          paymentFee,
          shippingFee,
          totalFees,
          cogs,
          grossProfit,
          netRevenue,
          adsCost,
          operatingProfit,
          orderCount,
          avgOrderValue,
          returnRate,
          marginPercent,
        };
      });

      // Calculate totals
      const totals = monthlyData.reduce((acc, m) => ({
        totalRevenue: acc.totalRevenue + m.grossRevenue,
        totalFees: acc.totalFees + m.totalFees,
        totalCogs: acc.totalCogs + m.cogs,
        totalAds: acc.totalAds + m.adsCost,
        grossProfit: acc.grossProfit + m.grossProfit,
        operatingProfit: acc.operatingProfit + m.operatingProfit,
        orderCount: acc.orderCount + m.orderCount,
        platformFee: acc.platformFee + m.platformFee,
        commissionFee: acc.commissionFee + m.commissionFee,
        paymentFee: acc.paymentFee + m.paymentFee,
        shippingFee: acc.shippingFee + m.shippingFee,
        returnedCount: acc.returnedCount + (m.returnRate > 0 ? Math.round(m.orderCount * m.returnRate / 100) : 0),
        totalOrdersIncludingReturns: acc.totalOrdersIncludingReturns + m.orderCount + Math.round(m.orderCount * m.returnRate / 100),
      }), {
        totalRevenue: 0,
        totalFees: 0,
        totalCogs: 0,
        totalAds: 0,
        grossProfit: 0,
        operatingProfit: 0,
        orderCount: 0,
        platformFee: 0,
        commissionFee: 0,
        paymentFee: 0,
        shippingFee: 0,
        returnedCount: 0,
        totalOrdersIncludingReturns: 0,
      });

      // Calculate margins
      const grossMargin = totals.totalRevenue > 0 ? (totals.grossProfit / totals.totalRevenue) * 100 : 0;
      const operatingMargin = totals.totalRevenue > 0 ? (totals.operatingProfit / totals.totalRevenue) * 100 : 0;

      // SSOT: Use centralized thresholds for health indicators
      const marginStatus = getMetricStatus('grossMargin', grossMargin, true);
      const marginBenchmark = INDUSTRY_BENCHMARKS.grossMargin;

      return {
        channel: channelName,
        totalRevenue: totals.totalRevenue,
        totalFees: totals.totalFees,
        totalCogs: totals.totalCogs,
        totalAds: totals.totalAds,
        grossProfit: totals.grossProfit,
        operatingProfit: totals.operatingProfit,
        orderCount: totals.orderCount,
        avgOrderValue: totals.orderCount > 0 ? totals.totalRevenue / totals.orderCount : 0,
        returnRate: totals.totalOrdersIncludingReturns > 0 
          ? (totals.returnedCount / totals.totalOrdersIncludingReturns) * 100 
          : 0,
        grossMargin,
        operatingMargin,
        monthlyData,
        feeBreakdown: {
          platform: totals.platformFee,
          commission: totals.commissionFee,
          payment: totals.paymentFee,
          shipping: totals.shippingFee,
          shippingSubsidy: 0,
          couponSubsidy: 0,
          platformAds: 0,
        },
        // SSOT: Health indicators using centralized benchmarks
        health: {
          marginStatus,
          marginBenchmark,
          isAboveBenchmark: grossMargin >= marginBenchmark,
        },
      };
    },
    enabled: !!tenantId && isReady && !!channelName,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAvailableChannels() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['available-channels', tenantId],
    queryFn: async (): Promise<string[]> => {
      if (!tenantId) return [];

      // Use cdp_orders (SSOT) for channel discovery
      let query = client
        .from('cdp_orders')
        .select('channel')
        .not('channel', 'is', null);
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching channels:', error);
        return [];
      }

      // Get unique channels
      const channels = [...new Set(data.map(d => d.channel?.toUpperCase()).filter(Boolean))];
      return channels.sort();
    },
    enabled: !!tenantId && isReady,
    staleTime: 10 * 60 * 1000,
  });
}
