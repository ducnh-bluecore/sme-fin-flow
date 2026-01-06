import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';

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
  revenueShare: number; // % of total revenue
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
}

export function useAllChannelsPL(months: number = 12) {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();

  return useQuery({
    queryKey: ['all-channels-pl', tenantId, months],
    queryFn: async (): Promise<AllChannelsPLData | null> => {
      if (!tenantId) return null;

      const endDate = endOfMonth(new Date());
      const startDate = startOfMonth(subMonths(endDate, months - 1));

      // Fetch all orders
      const { data: orders, error: ordersError } = await supabase
        .from('external_orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('order_date', startDate.toISOString())
        .lte('order_date', endDate.toISOString());

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        return null;
      }

      if (!orders || orders.length === 0) {
        return {
          channels: [],
          totals: {
            totalRevenue: 0,
            totalFees: 0,
            totalCogs: 0,
            grossProfit: 0,
            operatingProfit: 0,
            orderCount: 0,
            avgOrderValue: 0,
            grossMargin: 0,
            operatingMargin: 0,
          },
          topChannel: null,
          mostProfitableChannel: null,
        };
      }

      // Group orders by channel
      const channelMap = new Map<string, typeof orders>();
      
      orders.forEach(order => {
        const channel = (order.channel || 'Unknown').toUpperCase();
        if (!channelMap.has(channel)) {
          channelMap.set(channel, []);
        }
        channelMap.get(channel)!.push(order);
      });

      // Calculate P&L for each channel
      const channelData: ChannelPLSummaryItem[] = [];
      let grandTotalRevenue = 0;

      channelMap.forEach((channelOrders, channelName) => {
        const completedOrders = channelOrders.filter(o => 
          o.status === 'delivered' || o.status === 'confirmed'
        );

        const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const platformFee = completedOrders.reduce((sum, o) => sum + (o.platform_fee || 0), 0);
        const commissionFee = completedOrders.reduce((sum, o) => sum + (o.commission_fee || 0), 0);
        const paymentFee = completedOrders.reduce((sum, o) => sum + (o.payment_fee || 0), 0);
        const shippingFee = completedOrders.reduce((sum, o) => sum + (o.shipping_fee || 0), 0);
        const cogs = completedOrders.reduce((sum, o) => sum + (o.cost_of_goods || 0), 0);

        const totalFees = platformFee + commissionFee + paymentFee + shippingFee;
        const grossProfit = totalRevenue - totalFees - cogs;
        const operatingProfit = grossProfit; // Simplified - no ads data per channel for now
        const orderCount = completedOrders.length;
        const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;

        grandTotalRevenue += totalRevenue;

        channelData.push({
          channel: channelName,
          totalRevenue,
          totalFees,
          totalCogs: cogs,
          grossProfit,
          operatingProfit,
          orderCount,
          avgOrderValue,
          grossMargin,
          operatingMargin,
          revenueShare: 0, // Will be calculated after
        });
      });

      // Calculate revenue share
      channelData.forEach(ch => {
        ch.revenueShare = grandTotalRevenue > 0 ? (ch.totalRevenue / grandTotalRevenue) * 100 : 0;
      });

      // Sort by revenue descending
      channelData.sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Calculate totals
      const totals = channelData.reduce((acc, ch) => ({
        totalRevenue: acc.totalRevenue + ch.totalRevenue,
        totalFees: acc.totalFees + ch.totalFees,
        totalCogs: acc.totalCogs + ch.totalCogs,
        grossProfit: acc.grossProfit + ch.grossProfit,
        operatingProfit: acc.operatingProfit + ch.operatingProfit,
        orderCount: acc.orderCount + ch.orderCount,
        avgOrderValue: 0,
        grossMargin: 0,
        operatingMargin: 0,
      }), {
        totalRevenue: 0,
        totalFees: 0,
        totalCogs: 0,
        grossProfit: 0,
        operatingProfit: 0,
        orderCount: 0,
        avgOrderValue: 0,
        grossMargin: 0,
        operatingMargin: 0,
      });

      totals.avgOrderValue = totals.orderCount > 0 ? totals.totalRevenue / totals.orderCount : 0;
      totals.grossMargin = totals.totalRevenue > 0 ? (totals.grossProfit / totals.totalRevenue) * 100 : 0;
      totals.operatingMargin = totals.totalRevenue > 0 ? (totals.operatingProfit / totals.totalRevenue) * 100 : 0;

      // Find top and most profitable channels
      const topChannel = channelData.length > 0 ? channelData[0].channel : null;
      const mostProfitable = [...channelData].sort((a, b) => b.grossMargin - a.grossMargin);
      const mostProfitableChannel = mostProfitable.length > 0 ? mostProfitable[0].channel : null;

      return {
        channels: channelData,
        totals,
        topChannel,
        mostProfitableChannel,
      };
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 5 * 60 * 1000,
  });
}
