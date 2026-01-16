/**
 * ============================================
 * FDP AGGREGATED METRICS - OPTIMIZED LOADING
 * ============================================
 * 
 * Uses pre-aggregated database views instead of fetching
 * 50,000+ raw rows. Reduces data transfer by 99%+.
 * 
 * Views used:
 * - fdp_daily_metrics: Daily aggregated order metrics
 * - fdp_monthly_metrics: Monthly aggregated order metrics  
 * - fdp_channel_summary: Channel-level summary
 * - fdp_sku_summary: SKU-level profitability
 * - fdp_expense_summary: Expense by category/month
 * - fdp_invoice_summary: Invoice collection summary
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import {
  calculateROAS,
  calculateCAC,
  calculateLTV,
  calculateLTVCACRatio,
  FDP_THRESHOLDS
} from '@/lib/fdp-formulas';

// Types for aggregated views
interface DailyMetric {
  metric_date: string;
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

interface ExpenseSummary {
  expense_month: string;
  category: string;
  total_amount: number;
  transaction_count: number;
}

interface InvoiceSummary {
  invoice_month: string;
  status: string;
  invoice_count: number;
  total_amount: number;
  total_paid: number;
  outstanding_amount: number;
}

export interface AggregatedFDPMetrics {
  // Summary metrics
  totalOrders: number;
  totalRevenue: number;
  totalCogs: number;
  totalPlatformFees: number;
  totalShippingFees: number;
  contributionMargin: number;
  contributionMarginPercent: number;
  avgOrderValue: number;
  cmPerOrder: number;
  
  // Unique customers
  uniqueCustomers: number;
  
  // Marketing metrics
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
  
  // Breakdowns
  channelBreakdown: ChannelSummary[];
  skuBreakdown: SKUSummary[];
  dailyTrend: DailyMetric[];
  expenseBreakdown: ExpenseSummary[];
  
  // Health indicators
  health: {
    marginHealthy: boolean;
    cacHealthy: boolean;
    ltvCacHealthy: boolean;
    collectionHealthy: boolean;
  };
}

export function useFDPAggregatedMetrics() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['fdp-aggregated-metrics', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<AggregatedFDPMetrics | null> => {
      if (!tenantId) return null;

      // Fetch from pre-aggregated views in parallel
      const [
        dailyRes,
        channelRes,
        skuRes,
        expenseRes,
        invoiceRes,
        marketingRes
      ] = await Promise.all([
        // Daily metrics for the date range
        supabase
          .from('fdp_daily_metrics')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('metric_date', startDateStr)
          .lte('metric_date', endDateStr),
        
        // Channel summary (all-time, we'll filter in memory if needed)
        supabase
          .from('fdp_channel_summary')
          .select('*')
          .eq('tenant_id', tenantId),
        
        // SKU summary
        supabase
          .from('fdp_sku_summary')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('total_revenue', { ascending: false })
          .limit(100),
        
        // Expense summary
        supabase
          .from('fdp_expense_summary')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('expense_month', startDateStr)
          .lte('expense_month', endDateStr),
        
        // Invoice summary
        supabase
          .from('fdp_invoice_summary')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('invoice_month', startDateStr)
          .lte('invoice_month', endDateStr),
        
        // Marketing expenses for ROAS/CAC
        supabase
          .from('expenses')
          .select('amount')
          .eq('tenant_id', tenantId)
          .eq('category', 'marketing')
          .gte('expense_date', startDateStr)
          .lte('expense_date', endDateStr)
      ]);

      const dailyMetrics = (dailyRes.data || []) as DailyMetric[];
      const channelSummary = (channelRes.data || []) as ChannelSummary[];
      const skuSummary = (skuRes.data || []) as SKUSummary[];
      const expenseSummary = (expenseRes.data || []) as ExpenseSummary[];
      const invoiceSummary = (invoiceRes.data || []) as InvoiceSummary[];
      const marketingExpenses = marketingRes.data || [];

      // Aggregate daily metrics for the period
      const totalOrders = dailyMetrics.reduce((sum, d) => sum + (d.order_count || 0), 0);
      const totalRevenue = dailyMetrics.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
      const totalCogs = dailyMetrics.reduce((sum, d) => sum + (d.total_cogs || 0), 0);
      const totalPlatformFees = dailyMetrics.reduce((sum, d) => 
        sum + (d.total_platform_fee || 0) + (d.total_commission_fee || 0) + (d.total_payment_fee || 0), 0);
      const totalShippingFees = dailyMetrics.reduce((sum, d) => sum + (d.total_shipping_fee || 0), 0);
      const contributionMargin = dailyMetrics.reduce((sum, d) => sum + (d.contribution_margin || 0), 0);
      
      // Unique customers (sum from daily - may have duplicates across days)
      const uniqueCustomers = channelSummary.reduce((sum, c) => sum + (c.unique_customers || 0), 0);

      // Calculate derived metrics
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const cmPerOrder = totalOrders > 0 ? contributionMargin / totalOrders : 0;
      const contributionMarginPercent = totalRevenue > 0 ? (contributionMargin / totalRevenue) * 100 : 0;

      // Marketing metrics
      const totalMarketingSpend = marketingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const roas = calculateROAS(totalRevenue, totalMarketingSpend).value;
      const cac = calculateCAC(totalMarketingSpend, uniqueCustomers).value;
      
      // LTV calculation (simplified)
      const avgOrdersPerCustomer = uniqueCustomers > 0 ? totalOrders / uniqueCustomers : 1;
      const cmPercent = contributionMarginPercent / 100;
      const ltv = calculateLTV(avgOrderValue, avgOrdersPerCustomer, cmPercent).value;
      const ltvCacRatio = calculateLTVCACRatio(ltv, cac).value;

      // Invoice metrics
      const totalInvoiced = invoiceSummary.reduce((sum, i) => sum + (i.total_amount || 0), 0);
      const totalCollected = invoiceSummary.reduce((sum, i) => sum + (i.total_paid || 0), 0);
      const totalOutstanding = invoiceSummary.reduce((sum, i) => sum + (i.outstanding_amount || 0), 0);
      const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

      // Health indicators
      const health = {
        marginHealthy: contributionMarginPercent >= FDP_THRESHOLDS.CM_GOOD_PERCENT,
        cacHealthy: cac <= 500000, // 500k VND max CAC
        ltvCacHealthy: ltvCacRatio >= 3, // LTV/CAC >= 3 is healthy
        collectionHealthy: collectionRate >= 80
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
        dailyTrend: dailyMetrics,
        expenseBreakdown: expenseSummary,
        health
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Quick hook for just the summary metrics (even faster)
export function useFDPQuickMetrics() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['fdp-quick-metrics', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return null;

      // Just fetch daily aggregates - typically < 365 rows per year
      const { data, error } = await supabase
        .from('fdp_daily_metrics')
        .select('order_count, total_revenue, total_cogs, total_platform_fee, total_commission_fee, total_payment_fee, total_shipping_fee, contribution_margin')
        .eq('tenant_id', tenantId)
        .gte('metric_date', startDateStr)
        .lte('metric_date', endDateStr);

      if (error) throw error;

      const metrics = data || [];
      const totalOrders = metrics.reduce((sum, d) => sum + (d.order_count || 0), 0);
      const totalRevenue = metrics.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
      const contributionMargin = metrics.reduce((sum, d) => sum + (d.contribution_margin || 0), 0);

      return {
        totalOrders,
        totalRevenue,
        contributionMargin,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        cmPerOrder: totalOrders > 0 ? contributionMargin / totalOrders : 0,
        cmPercent: totalRevenue > 0 ? (contributionMargin / totalRevenue) * 100 : 0
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}
