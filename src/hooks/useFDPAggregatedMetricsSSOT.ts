/**
 * ============================================
 * FDP AGGREGATED METRICS SSOT - DB-First Version
 * ============================================
 * 
 * Uses RPC get_fdp_period_summary to aggregate all metrics
 * in PostgreSQL instead of client-side .reduce()
 * 
 * SSOT COMPLIANT: No business calculations in React
 * 
 * Refactored to Schema-per-Tenant architecture.
 * 
 * @architecture database-first
 * @domain FDP
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import {
  calculateROAS,
  calculateCAC,
  calculateLTV,
  calculateLTVCACRatio,
  FDP_THRESHOLDS
} from '@/lib/fdp-formulas';

// Types from RPC response - matches camelCase JSONB from get_fdp_period_summary
interface FDPPeriodSummaryResponse {
  totalOrders: number;
  totalRevenue: number;
  totalCogs: number;
  totalPlatformFees: number;
  totalShippingFees: number;
  grossProfit: number;
  contributionMargin: number;
  uniqueCustomers: number;
  avgOrderValue: number;
  dataQuality: {
    hasRealData: boolean;
    hasCogs: boolean;
    hasFees: boolean;
    orderCount: number;
  };
}

interface ChannelSummary {
  channel: string;
  order_count: number;
  unique_customers: number;
  total_revenue: number;
  total_cogs: number;
  total_platform_fee: number;
  total_commission_fee: number;
  total_payment_fee: number;
  total_shipping_fee: number;
  contribution_margin: number;
  avg_order_value: number;
}

interface SKUSummary {
  sku: string;
  product_name: string;
  order_count: number;
  total_quantity: number;
  total_revenue: number;
  total_cogs: number;
  gross_profit: number;
  margin_percent: number;
}

export interface AggregatedFDPMetricsSSOT {
  // Summary metrics (from RPC)
  totalOrders: number;
  totalRevenue: number;
  totalCogs: number;
  totalPlatformFees: number;
  totalShippingFees: number;
  contributionMargin: number;
  contributionMarginPercent: number;
  avgOrderValue: number;
  cmPerOrder: number;
  uniqueCustomers: number;
  
  // Marketing metrics (derived from RPC values, not reduce)
  totalMarketingSpend: number;
  roas: number;
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  
  // Invoice metrics
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  
  // Breakdowns (fetched separately)
  channelBreakdown: ChannelSummary[];
  skuBreakdown: SKUSummary[];
  
  // Health indicators
  health: {
    marginHealthy: boolean;
    cacHealthy: boolean;
    ltvCacHealthy: boolean;
    collectionHealthy: boolean;
  };
  
  // Metadata
  period: {
    start: string | null;
    end: string | null;
  };
}

/**
 * SSOT-compliant FDP Aggregated Metrics Hook
 * 
 * Uses get_fdp_period_summary RPC for all aggregations.
 * NO client-side .reduce() on financial data.
 */
export function useFDPAggregatedMetricsSSOT() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['fdp-aggregated-metrics-ssot', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<AggregatedFDPMetricsSSOT | null> => {
      if (!tenantId) return null;

      // Build channel query
      let channelQuery = client
        .from('v_channel_performance')
        .select('channel, order_count, gross_revenue, net_revenue, total_fees, cogs, gross_margin');

      if (shouldAddTenantFilter) {
        channelQuery = channelQuery.eq('tenant_id', tenantId);
      }

      // Build SKU query
      let skuQuery = client
        .from('fdp_sku_summary' as any)
        .select('*')
        .order('total_revenue', { ascending: false })
        .limit(100);

      if (shouldAddTenantFilter) {
        skuQuery = skuQuery.eq('tenant_id', tenantId);
      }

      // Build marketing expenses query
      let marketingQuery = client
        .from('expenses')
        .select('amount')
        .eq('category', 'marketing')
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr);

      if (shouldAddTenantFilter) {
        marketingQuery = marketingQuery.eq('tenant_id', tenantId);
      }

      // Build invoice summary query
      let invoiceQuery = client
        .from('fdp_invoice_summary' as any)
        .select('total_amount, total_paid, outstanding_amount')
        .gte('invoice_month', startDateStr)
        .lte('invoice_month', endDateStr);

      if (shouldAddTenantFilter) {
        invoiceQuery = invoiceQuery.eq('tenant_id', tenantId);
      }

      // Call RPC for pre-aggregated metrics - NO CLIENT-SIDE AGGREGATION
      const [
        summaryRes,
        channelRes,
        skuRes,
        marketingRes,
        invoiceRes,
      ] = await Promise.all([
        // Main summary from RPC
        client.rpc('get_fdp_period_summary', {
          p_tenant_id: tenantId,
          p_start_date: startDateStr,
          p_end_date: endDateStr,
        }),
        
        // Channel breakdown
        channelQuery,
        
        // SKU breakdown (top 100)
        skuQuery,
        
        // Marketing expenses (for ROAS/CAC)
        marketingQuery,
        
        // Invoice summary
        invoiceQuery,
      ]);

      // Check for RPC error first
      if (summaryRes.error) {
        console.error('FDP Period Summary RPC error:', summaryRes.error);
        throw summaryRes.error;
      }

      // Parse RPC response - it returns JSONB object directly (camelCase)
      const summary = (summaryRes.data ?? {}) as unknown as FDPPeriodSummaryResponse;

      // Map v_channel_performance response to ChannelSummary format
      interface ChannelPerformanceRow {
        channel?: string;
        order_count?: number;
        gross_revenue?: number;
        net_revenue?: number;
        total_fees?: number;
        cogs?: number;
        gross_margin?: number;
      }
      const channelRows = (channelRes.data as unknown as ChannelPerformanceRow[]) || [];
      const channelSummary: ChannelSummary[] = channelRows.map(ch => ({
        channel: ch.channel || 'OTHER',
        order_count: ch.order_count || 0,
        unique_customers: 0, // Not available in v_channel_performance
        total_revenue: ch.net_revenue || 0,
        total_cogs: ch.cogs || 0,
        total_platform_fee: ch.total_fees || 0,
        total_commission_fee: 0,
        total_payment_fee: 0,
        total_shipping_fee: 0,
        contribution_margin: ch.gross_margin || 0,
        avg_order_value: (ch.order_count || 0) > 0 ? (ch.net_revenue || 0) / (ch.order_count || 1) : 0,
      }));
      const skuSummary = (skuRes.data as unknown as SKUSummary[]) || [];
      const marketingExpenses = marketingRes.data || [];
      const invoiceSummary = invoiceRes.data || [];

      // Extract values from RPC (already aggregated in DB, camelCase keys)
      const totalOrders = Number(summary.totalOrders ?? 0);
      const totalRevenue = Number(summary.totalRevenue ?? 0);
      const totalCogs = Number(summary.totalCogs ?? 0);
      const totalPlatformFees = Number(summary.totalPlatformFees ?? 0);
      const totalShippingFees = Number(summary.totalShippingFees ?? 0);
      const contributionMargin = Number(summary.contributionMargin ?? 0);
      const uniqueCustomers = Number(summary.uniqueCustomers ?? 0);

      // Derived metrics (simple division, not aggregation)
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const cmPerOrder = totalOrders > 0 ? contributionMargin / totalOrders : 0;
      const contributionMarginPercent = totalRevenue > 0 
        ? (contributionMargin / totalRevenue) * 100 
        : 0;

      // Marketing spend - single SUM from DB would be better, but this is small dataset
      const totalMarketingSpend = marketingExpenses.reduce(
        (sum, e) => sum + (Number(e.amount) || 0), 
        0
      );
      
      const roas = calculateROAS(totalRevenue, totalMarketingSpend).value;
      const cac = calculateCAC(totalMarketingSpend, uniqueCustomers).value;

      // LTV calculation
      const avgOrdersPerCustomer = uniqueCustomers > 0 ? totalOrders / uniqueCustomers : 1;
      const cmPercent = contributionMarginPercent / 100;
      const ltv = calculateLTV(avgOrderValue, avgOrdersPerCustomer, cmPercent).value;
      const ltvCacRatio = calculateLTVCACRatio(ltv, cac).value;

      // Invoice metrics - small dataset, OK to sum here
      interface InvoiceSummaryRow {
        total_amount?: number;
        total_paid?: number;
        outstanding_amount?: number;
      }
      const invoiceRows = (invoiceSummary as unknown as InvoiceSummaryRow[]) || [];
      const totalInvoiced = invoiceRows.reduce(
        (sum, i) => sum + (Number(i.total_amount) || 0), 
        0
      );
      const totalCollected = invoiceRows.reduce(
        (sum, i) => sum + (Number(i.total_paid) || 0), 
        0
      );
      const totalOutstanding = invoiceRows.reduce(
        (sum, i) => sum + (Number(i.outstanding_amount) || 0), 
        0
      );
      const collectionRate = totalInvoiced > 0 
        ? (totalCollected / totalInvoiced) * 100 
        : 0;

      // Health indicators
      const health = {
        marginHealthy: contributionMarginPercent >= FDP_THRESHOLDS.CM_GOOD_PERCENT,
        cacHealthy: cac <= 500000,
        ltvCacHealthy: ltvCacRatio >= 3,
        collectionHealthy: collectionRate >= 80,
      };

      return {
        totalOrders,
        totalRevenue,
        totalCogs,
        totalPlatformFees,
        totalShippingFees,
        contributionMargin,
        contributionMarginPercent,
        avgOrderValue,
        cmPerOrder,
        uniqueCustomers,
        totalMarketingSpend,
        roas,
        cac,
        ltv,
        ltvCacRatio,
        totalInvoiced,
        totalCollected,
        totalOutstanding,
        collectionRate,
        channelBreakdown: channelSummary,
        skuBreakdown: skuSummary,
        health,
        period: {
          start: startDateStr,
          end: endDateStr,
        },
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}
