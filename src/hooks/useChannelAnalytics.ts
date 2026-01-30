/**
 * Channel Analytics Hooks - SSOT Compliant
 * 
 * ✅ SSOT: Queries cdp_orders (Layer 1) instead of external_orders (staging)
 * ✅ Refactored to use Schema-per-Tenant architecture
 * 
 * Note: This hook primarily handles channel-specific data aggregation.
 * Core financial metrics (total revenue, margins) should be sourced from
 * useCentralFinancialMetrics for cross-page consistency.
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { Database } from '@/integrations/supabase/types';

// ✅ SSOT: Use cdp_orders type instead of external_orders
type CdpOrder = Database['public']['Tables']['cdp_orders']['Row'];
type ChannelSettlement = Database['public']['Tables']['channel_settlements']['Row'];

// ==================== INTERFACES ====================

export interface ChannelPerformance {
  connector_name: string;
  connector_type: string;
  shop_name: string | null;
  integration_id: string;
  total_orders: number;
  gross_revenue: number;
  net_revenue: number;
  total_fees: number;
  total_cogs: number;
  gross_profit: number;
  avg_order_value: number;
  cancelled_orders: number;
  returned_orders: number;
  source: 'ecommerce' | 'invoice' | 'revenue';
}

export interface DailyRevenue {
  order_date: string;
  channel: string;
  order_count: number;
  gross_revenue: number;
  net_revenue: number;
  platform_fees: number;
  profit: number;
  source: 'ecommerce' | 'invoice' | 'revenue';
}

export interface OrderStatusSummary {
  status: string;
  count: number;
  total_amount: number;
}

export interface FeeSummary {
  fee_type: string;
  amount: number;
}

// ==================== ALL REVENUE SOURCES ====================

export function useAllRevenueData() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['all-revenue-data', tenantId],
    queryFn: async () => {
      // Build queries with tenant filter
      let ordersQuery = client
        .from('cdp_orders')
        .select('id, channel, order_at, gross_revenue, net_revenue, cogs, gross_margin')
        .limit(50000);
      
      let invoicesQuery = client
        .from('invoices')
        .select('id, invoice_number, customer_id, issue_date, total_amount, paid_amount, status')
        .in('status', ['sent', 'paid', 'partial'])
        .limit(50000);
      
      let revenuesQuery = client
        .from('revenues')
        .select('id, description, source, amount, start_date, is_active')
        .eq('is_active', true);

      if (shouldAddTenantFilter) {
        ordersQuery = ordersQuery.eq('tenant_id', tenantId);
        invoicesQuery = invoicesQuery.eq('tenant_id', tenantId);
        revenuesQuery = revenuesQuery.eq('tenant_id', tenantId);
      }

      // Fetch all revenue sources in parallel
      const [externalOrdersRes, invoicesRes, revenuesRes] = await Promise.all([
        ordersQuery,
        invoicesQuery,
        revenuesQuery,
      ]);

      return {
        externalOrders: externalOrdersRes.data || [],
        invoices: invoicesRes.data || [],
        revenues: revenuesRes.data || [],
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });
}

// ==================== CHANNEL PERFORMANCE ====================

export function useChannelPerformance() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['channel-performance', tenantId],
    queryFn: async () => {
      // DB-First: Try the new aggregated view first (avoids 1000 row limit)
      let viewQuery = client
        .from('v_channel_performance')
        .select('*');
      
      if (shouldAddTenantFilter) {
        viewQuery = viewQuery.eq('tenant_id', tenantId);
      }
      
      const { data: viewData, error: viewError } = await viewQuery;

      if (!viewError && viewData && viewData.length > 0) {
        return viewData.map(item => ({
          connector_name: item.channel || 'Unknown',
          connector_type: item.channel || 'unknown',
          shop_name: null,
          integration_id: '',
          total_orders: Number(item.order_count) || 0,
          gross_revenue: Number(item.gross_revenue) || 0,
          net_revenue: Number(item.net_revenue) || 0,
          total_fees: Number(item.total_fees) || 0,
          total_cogs: Number(item.cogs) || 0,
          gross_profit: Number(item.gross_margin) || 0,
          avg_order_value: Number(item.order_count) > 0 ? Number(item.net_revenue) / Number(item.order_count) : 0,
          cancelled_orders: 0,
          returned_orders: 0,
          source: 'ecommerce' as const,
        })) as ChannelPerformance[];
      }

      // Fallback: Calculate from raw data
      let integrationsQuery = client
        .from('connector_integrations')
        .select('id, connector_name, connector_type, shop_name');
      
      let ordersQuery = client
        .from('cdp_orders')
        .select('channel, gross_revenue, cogs');
      
      let feesQuery = client
        .from('channel_fees')
        .select('integration_id, amount');

      if (shouldAddTenantFilter) {
        integrationsQuery = integrationsQuery.eq('tenant_id', tenantId);
        ordersQuery = ordersQuery.eq('tenant_id', tenantId);
        feesQuery = feesQuery.eq('tenant_id', tenantId);
      }

      const [integrationsRes, ordersRes, feesRes] = await Promise.all([
        integrationsQuery,
        ordersQuery,
        feesQuery,
      ]);

      const integrations = integrationsRes.data || [];
      const orders = ordersRes.data || [];
      const fees = feesRes.data || [];

      // Group data by integration
      const performanceMap = new Map<string, ChannelPerformance>();

      integrations.forEach(integration => {
        performanceMap.set(integration.id, {
          connector_name: integration.connector_name,
          connector_type: integration.connector_type,
          shop_name: integration.shop_name,
          integration_id: integration.id,
          total_orders: 0,
          gross_revenue: 0,
          net_revenue: 0,
          total_fees: 0,
          total_cogs: 0,
          gross_profit: 0,
          avg_order_value: 0,
          cancelled_orders: 0,
          returned_orders: 0,
          source: 'ecommerce' as const,
        });
      });

      // Aggregate orders by channel
      const channelPerfMap = new Map<string, ChannelPerformance>();
      
      orders.forEach(order => {
        const channel = order.channel || 'Unknown';
        const existing = channelPerfMap.get(channel) || {
          connector_name: channel,
          connector_type: channel.toLowerCase(),
          shop_name: null,
          integration_id: channel,
          total_orders: 0,
          gross_revenue: 0,
          net_revenue: 0,
          total_fees: 0,
          total_cogs: 0,
          gross_profit: 0,
          avg_order_value: 0,
          cancelled_orders: 0,
          returned_orders: 0,
          source: 'ecommerce' as const,
        };
        
        existing.total_orders++;
        existing.gross_revenue += Number(order.gross_revenue) || 0;
        existing.total_cogs += Number(order.cogs) || 0;
        
        channelPerfMap.set(channel, existing);
      });

      // Calculate net revenue and profit for each channel
      channelPerfMap.forEach(perf => {
        perf.net_revenue = perf.gross_revenue - perf.total_fees;
        perf.gross_profit = perf.net_revenue - perf.total_cogs;
        perf.avg_order_value = perf.total_orders > 0 ? perf.gross_revenue / perf.total_orders : 0;
      });

      // Merge with integration-based performance
      performanceMap.forEach((perf, key) => {
        if (!channelPerfMap.has(key)) {
          channelPerfMap.set(key, perf);
        }
      });

      return Array.from(channelPerfMap.values());
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });
}

// ==================== DAILY REVENUE ====================

export function useDailyChannelRevenue(days: number = 90) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['daily-channel-revenue', tenantId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Use cdp_orders (SSOT)
      let query = client
        .from('cdp_orders')
        .select('order_at, channel, gross_revenue, net_revenue, gross_margin')
        .gte('order_at', startDateStr)
        .order('order_at', { ascending: true });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Group by date and channel
      const dailyMap = new Map<string, DailyRevenue>();

      (orders || []).forEach(order => {
        const dateStr = order.order_at?.split('T')[0] || '';
        const channel = order.channel || 'Unknown';
        const key = `${dateStr}_${channel}`;

        const existing = dailyMap.get(key) || {
          order_date: dateStr,
          channel,
          order_count: 0,
          gross_revenue: 0,
          net_revenue: 0,
          platform_fees: 0,
          profit: 0,
          source: 'ecommerce' as const,
        };

        existing.order_count++;
        existing.gross_revenue += Number(order.gross_revenue) || 0;
        existing.net_revenue += Number(order.net_revenue) || 0;
        existing.platform_fees += 0;
        existing.profit += Number(order.gross_margin) || 0;

        dailyMap.set(key, existing);
      });

      return Array.from(dailyMap.values()).sort((a, b) => 
        a.order_date.localeCompare(b.order_date)
      );
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });
}

// ==================== ORDER STATUS SUMMARY ====================

export function useOrderStatusSummary() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['order-status-summary', tenantId],
    queryFn: async () => {
      let query = client
        .from('cdp_orders')
        .select('gross_revenue');

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // cdp_orders contains only delivered/confirmed orders
      const statusMap = new Map<string, { count: number; total_amount: number }>();
      const totalAmount = (data || []).reduce((sum, o) => sum + (Number(o.gross_revenue) || 0), 0);
      statusMap.set('delivered', {
        count: (data || []).length,
        total_amount: totalAmount,
      });

      return Array.from(statusMap.entries()).map(([status, data]) => ({
        status,
        ...data,
      })) as OrderStatusSummary[];
    },
    enabled: !!tenantId && isReady,
  });
}

// ==================== CHANNEL FEES SUMMARY ====================

export function useChannelFeesSummary() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['channel-fees-summary', tenantId],
    queryFn: async () => {
      let query = client
        .from('channel_fees')
        .select('fee_type, fee_category, amount');

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const feeMap = new Map<string, number>();
      (data || []).forEach((fee) => {
        const type = fee.fee_type || 'other';
        feeMap.set(type, (feeMap.get(type) || 0) + (fee.amount || 0));
      });

      return Array.from(feeMap.entries()).map(([type, amount]) => ({
        fee_type: type,
        amount,
      })) as FeeSummary[];
    },
    enabled: !!tenantId && isReady,
  });
}

// ==================== SETTLEMENTS ====================

export function useSettlementsSummary() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['settlements-summary', tenantId],
    queryFn: async () => {
      let query = client
        .from('channel_settlements')
        .select(`
          id,
          settlement_id,
          settlement_number,
          status,
          period_start,
          period_end,
          payout_date,
          gross_sales,
          total_fees,
          total_refunds,
          net_amount,
          total_orders,
          is_reconciled,
          integration_id
        `)
        .order('period_end', { ascending: false })
        .limit(50);

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ChannelSettlement[];
    },
    enabled: !!tenantId && isReady,
  });
}

// ==================== EXTERNAL ORDERS ====================

export function useExternalOrders(options?: {
  channel?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['external-orders', tenantId, options],
    queryFn: async () => {
      let query = client
        .from('cdp_orders')
        .select('id, tenant_id, channel, order_at, customer_id, gross_revenue, net_revenue, cogs, gross_margin')
        .order('order_at', { ascending: false });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      if (options?.channel && options.channel !== 'all') {
        query = query.eq('channel', options.channel);
      }
      if (options?.startDate) {
        query = query.gte('order_at', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('order_at', options.endDate);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Map to legacy ExternalOrder format for backward compatibility
      return (data || []).map(o => ({
        id: o.id,
        tenant_id: o.tenant_id,
        channel: o.channel,
        customer_id: o.customer_id,
        order_date: o.order_at,
        total_amount: o.gross_revenue,
        seller_income: o.net_revenue,
        cost_of_goods: o.cogs,
        gross_profit: o.gross_margin,
        status: 'delivered' as const,
        platform_fee: 0,
        commission_fee: 0,
        payment_fee: 0,
      })) as unknown as CdpOrder[];
    },
    enabled: !!tenantId && isReady,
  });
}

// ==================== TOP PRODUCTS ====================

export function useTopProducts(limit: number = 10) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['top-products', tenantId, limit],
    queryFn: async () => {
      let query = client
        .from('external_products')
        .select('id, name, selling_price, cost_price, stock_quantity, category, integration_id')
        .order('selling_price', { ascending: false })
        .limit(limit);

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && isReady,
  });
}

// ==================== COMBINED ANALYTICS DATA (ALL SOURCES) ====================

export function useChannelAnalyticsData() {
  const { tenantId, isReady } = useTenantSupabaseCompat();
  const channelPerformance = useChannelPerformance();
  const dailyRevenue = useDailyChannelRevenue(90);
  const orderStatus = useOrderStatusSummary();
  const feesSummary = useChannelFeesSummary();
  const settlements = useSettlementsSummary();
  const allRevenue = useAllRevenueData();

  const isLoading = 
    channelPerformance.isLoading || 
    dailyRevenue.isLoading || 
    orderStatus.isLoading ||
    feesSummary.isLoading ||
    settlements.isLoading ||
    allRevenue.isLoading;

  // Combine all channel performance data including invoices and revenues
  const combinedPerformance: ChannelPerformance[] = [...(channelPerformance.data || [])];

  // Add Invoice channel
  if (allRevenue.data?.invoices && allRevenue.data.invoices.length > 0) {
    const invoices = allRevenue.data.invoices;
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    
    combinedPerformance.push({
      connector_name: 'Hóa đơn B2B',
      connector_type: 'invoice',
      shop_name: null,
      integration_id: 'invoice',
      total_orders: invoices.length,
      gross_revenue: totalRevenue,
      net_revenue: paidAmount,
      total_fees: 0,
      total_cogs: 0,
      gross_profit: paidAmount,
      avg_order_value: invoices.length > 0 ? totalRevenue / invoices.length : 0,
      cancelled_orders: 0,
      returned_orders: 0,
      source: 'invoice',
    });
  }

  // Add Other Revenue channel
  if (allRevenue.data?.revenues && allRevenue.data.revenues.length > 0) {
    const revenues = allRevenue.data.revenues;
    const totalRevenue = revenues.reduce((sum, rev) => sum + (rev.amount || 0), 0);
    
    combinedPerformance.push({
      connector_name: 'Doanh thu khác',
      connector_type: 'revenue',
      shop_name: null,
      integration_id: 'revenue',
      total_orders: revenues.length,
      gross_revenue: totalRevenue,
      net_revenue: totalRevenue,
      total_fees: 0,
      total_cogs: 0,
      gross_profit: totalRevenue,
      avg_order_value: revenues.length > 0 ? totalRevenue / revenues.length : 0,
      cancelled_orders: 0,
      returned_orders: 0,
      source: 'revenue',
    });
  }

  return {
    channelPerformance: combinedPerformance,
    dailyRevenue: dailyRevenue.data || [],
    orderStatus: orderStatus.data || [],
    feesSummary: feesSummary.data || [],
    settlements: settlements.data || [],
    allRevenue: allRevenue.data,
    isLoading,
    error: channelPerformance.error || dailyRevenue.error || orderStatus.error || feesSummary.error || settlements.error,
  };
}
