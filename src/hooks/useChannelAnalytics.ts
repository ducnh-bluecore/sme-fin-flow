/**
 * Channel Analytics Hooks - SSOT Compliant
 * 
 * ✅ SSOT: Queries cdp_orders (Layer 1) instead of external_orders (staging)
 * ✅ Refactored to use Schema-per-Tenant architecture with useTenantQueryBuilder
 * 
 * Note: This hook primarily handles channel-specific data aggregation.
 * Core financial metrics (total revenue, margins) should be sourced from
 * useCentralFinancialMetrics for cross-page consistency.
 * 
 * @architecture Schema-per-Tenant Ready
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
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

export interface AllRevenueSummaryRow {
  source: string;
  channel: string;
  total_orders: number;
  gross_revenue: number;
  net_revenue: number;
  cogs: number;
  gross_profit: number;
  avg_order_value: number;
}

export function useAllRevenueData() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['all-revenue-data', tenantId],
    queryFn: async () => {
      // DB-First: Query pre-aggregated view (~10-15 rows instead of 50k+)
      const { data, error } = await buildSelectQuery('v_all_revenue_summary', '*');
      if (error) throw error;

      const rows = (data || []) as unknown as AllRevenueSummaryRow[];
      const ecommerce = rows.filter(r => r.source === 'ecommerce');
      const invoices = rows.filter(r => r.source === 'invoice');
      const revenues = rows.filter(r => r.source === 'revenue');

      return { ecommerce, invoices, revenues, allRows: rows };
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });
}

// ==================== CHANNEL PERFORMANCE ====================

export function useChannelPerformance() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['channel-performance', tenantId],
    queryFn: async () => {
      // DB-First: Use pre-aggregated view only (no fallback to raw rows)
      const { data, error } = await buildSelectQuery('v_channel_performance', '*');
      if (error) throw error;

      return (data || []).map((item: any) => ({
        connector_name: item.channel || 'Unknown',
        connector_type: (item.channel || 'unknown').toLowerCase(),
        shop_name: null,
        integration_id: '',
        total_orders: Number(item.order_count) || 0,
        gross_revenue: Number(item.gross_revenue) || 0,
        net_revenue: Number(item.net_revenue) || 0,
        total_fees: Number(item.total_fees) || 0,
        total_cogs: Number(item.cogs) || 0,
        gross_profit: Number(item.gross_margin) || 0,
        avg_order_value: Number(item.order_count) > 0 
          ? Number(item.net_revenue) / Number(item.order_count) 
          : 0,
        cancelled_orders: 0,
        returned_orders: 0,
        source: 'ecommerce' as const,
      })) as ChannelPerformance[];
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });
}

// ==================== DAILY REVENUE ====================

export function useDailyChannelRevenue(days: number = 90) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['daily-channel-revenue', tenantId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // DB-First: Use pre-aggregated daily view (max ~450 rows instead of ALL raw orders)
      const { data, error } = await buildSelectQuery(
        'v_channel_daily_revenue',
        'channel, revenue_date, order_count, gross_revenue, net_revenue, cogs, gross_margin'
      )
        .gte('revenue_date', startDateStr)
        .order('revenue_date', { ascending: true });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        order_date: row.revenue_date,
        channel: row.channel || 'Unknown',
        order_count: Number(row.order_count) || 0,
        gross_revenue: Number(row.gross_revenue) || 0,
        net_revenue: Number(row.net_revenue) || 0,
        platform_fees: 0,
        profit: Number(row.gross_margin) || 0,
        source: 'ecommerce' as const,
      })) as DailyRevenue[];
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });
}

// ==================== ORDER STATUS SUMMARY ====================

export function useOrderStatusSummary() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['order-status-summary', tenantId],
    queryFn: async () => {
      // DB-First: Use pre-aggregated view (1-2 rows instead of 1.1M)
      const { data, error } = await buildSelectQuery('v_order_status_summary', '*');
      if (error) throw error;

      return (data || []).map((row: any) => ({
        status: row.status,
        count: Number(row.order_count) || 0,
        total_amount: Number(row.total_amount) || 0,
      })) as OrderStatusSummary[];
    },
    enabled: !!tenantId && isReady,
  });
}

// ==================== CHANNEL FEES SUMMARY ====================

export function useChannelFeesSummary() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['channel-fees-summary', tenantId],
    queryFn: async () => {
      // DB-First: Use pre-aggregated view (5-10 rows instead of ALL fees)
      const { data, error } = await buildSelectQuery('v_channel_fees_summary', '*');
      if (error) throw error;

      return (data || []).map((row: any) => ({
        fee_type: row.fee_type,
        amount: Number(row.total_amount) || 0,
      })) as FeeSummary[];
    },
    enabled: !!tenantId && isReady,
  });
}

// ==================== SETTLEMENTS ====================

export function useSettlementsSummary() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['settlements-summary', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('channel_settlements', `
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

      if (error) throw error;
      return (data as unknown as ChannelSettlement[]) || [];
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
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['external-orders', tenantId, options],
    queryFn: async () => {
      let query = buildSelectQuery(
        'cdp_orders', 
        'id, tenant_id, channel, order_at, customer_id, gross_revenue, net_revenue, cogs, gross_margin'
      )
        .order('order_at', { ascending: false });

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
      return (data || []).map((o: any) => ({
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
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['top-products', tenantId, limit],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery(
        'external_products', 
        'id, name, selling_price, cost_price, stock_quantity, category, integration_id'
      )
        .order('selling_price', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && isReady,
  });
}

// ==================== COMBINED ANALYTICS DATA (ALL SOURCES) ====================

export function useChannelAnalyticsData() {
  const { tenantId, isReady } = useTenantQueryBuilder();
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

  // Add Invoice channel (now from pre-aggregated view)
  if (allRevenue.data?.invoices && allRevenue.data.invoices.length > 0) {
    const invoiceRows = allRevenue.data.invoices;
    const totalRevenue = invoiceRows.reduce((sum: number, r) => sum + Number(r.gross_revenue || 0), 0);
    const paidAmount = invoiceRows.reduce((sum: number, r) => sum + Number(r.net_revenue || 0), 0);
    const totalOrders = invoiceRows.reduce((sum: number, r) => sum + Number(r.total_orders || 0), 0);
    
    combinedPerformance.push({
      connector_name: 'Hóa đơn B2B',
      connector_type: 'invoice',
      shop_name: null,
      integration_id: 'invoice',
      total_orders: totalOrders,
      gross_revenue: totalRevenue,
      net_revenue: paidAmount,
      total_fees: 0,
      total_cogs: 0,
      gross_profit: paidAmount,
      avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      cancelled_orders: 0,
      returned_orders: 0,
      source: 'invoice',
    });
  }

  // Add Other Revenue channel (now from pre-aggregated view)
  if (allRevenue.data?.revenues && allRevenue.data.revenues.length > 0) {
    const revenueRows = allRevenue.data.revenues;
    const totalRevenue = revenueRows.reduce((sum: number, r) => sum + Number(r.gross_revenue || 0), 0);
    const totalOrders = revenueRows.reduce((sum: number, r) => sum + Number(r.total_orders || 0), 0);
    
    combinedPerformance.push({
      connector_name: 'Doanh thu khác',
      connector_type: 'revenue',
      shop_name: null,
      integration_id: 'revenue',
      total_orders: totalOrders,
      gross_revenue: totalRevenue,
      net_revenue: totalRevenue,
      total_fees: 0,
      total_cogs: 0,
      gross_profit: totalRevenue,
      avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0,
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
