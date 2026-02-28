/**
 * ============================================
 * ⛔⛔⛔ DEPRECATED - DO NOT USE ⛔⛔⛔
 * ============================================
 * 
 * ⚠️ THIS HOOK VIOLATES FDP MANIFESTO PRINCIPLE #2: SSOT
 * ⚠️ THIS HOOK PERFORMS CLIENT-SIDE COMPUTATION - FORBIDDEN
 * 
 * REPLACEMENT: useFDPFinanceSSOT() from '@/hooks/useFDPFinanceSSOT'
 * 
 * This hook performs heavy client-side calculations which:
 * 1. Creates SSOT violations (multiple sources of truth)
 * 2. Can produce different results across components
 * 3. Violates the DATABASE-FIRST architecture
 * 
 * Identified violations:
 * - Lines 251-373: Client-side aggregations
 * - Calculates: Net Revenue, CM, ROAS, CAC, LTV in React
 * - Should fetch from: central_metrics_snapshots
 * 
 * @deprecated Use useFDPFinanceSSOT() instead
 * @see src/hooks/useFDPFinanceSSOT.ts
 * @see public/docs/BLUECORE-SYSTEM-AUDIT-AS-IS.md Section 3.1.3
 */

console.warn(
  '[DEPRECATED] useFDPMetrics is deprecated and will be removed.\n' +
  'Use useFDPFinanceSSOT() from @/hooks/useFDPFinanceSSOT instead.\n' +
  'This hook performs client-side computation which violates SSOT.'
);

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { useMemo } from 'react';

/**
 * @deprecated LEGACY HOOK - Kept for backward compatibility only
 * @architecture Control Plane exemption - Uses direct supabase client
 * This hook is DEPRECATED and should NOT be used in new code.
 * Use useFDPFinanceSSOT() instead which follows Schema-per-Tenant v1.4.1.
 */
import {
  calculateNetRevenue,
  calculateContributionMargin,
  calculateCAC,
  calculateLTV,
  calculateLTVCACRatio,
  calculateROAS,
  calculateAOV,
  calculateCMPerOrder,
  FDP_THRESHOLDS,
  FormulaResult
} from '@/lib/fdp-formulas';

// ============================================
// TYPES
// ============================================

export interface FDPRevenueMetrics {
  // Gross Revenue (before any deductions)
  grossRevenue: number;
  // Breakdown
  orderRevenue: number;       // From external_orders
  invoiceRevenue: number;     // From invoices
  contractRevenue: number;    // From revenues table
  // Deductions
  totalReturns: number;
  totalDiscounts: number;
  totalPlatformFees: number;
  // Net Revenue = Gross - Returns - Discounts - Platform Fees
  netRevenue: number;
}

export interface FDPCostMetrics {
  // COGS
  orderCogs: number;          // From external_orders.cost_of_goods
  expenseCogs: number;        // From expenses(category=cogs)
  totalCogs: number;
  // Platform Fees (already in revenue, but tracked separately)
  platformFees: number;
  commissionFees: number;
  paymentFees: number;
  // Shipping
  shippingCosts: number;
  // Marketing
  campaignSpend: number;      // From promotion_campaigns.actual_cost
  marketingExpenses: number;  // From marketing_expenses
  expenseMarketing: number;   // From expenses(category=marketing)
  totalMarketingSpend: number;
  // Operating Expenses
  totalOpex: number;
}

export interface FDPProfitMetrics {
  // Gross Profit = Net Revenue - COGS
  grossProfit: number;
  grossMarginPercent: number;
  // Contribution Margin = Gross Profit - Variable Costs (Shipping + Marketing)
  contributionMargin: number;
  contributionMarginPercent: number;
  // Per Order
  contributionMarginPerOrder: number;
}

export interface FDPMarketingMetrics {
  // Spend
  totalSpend: number;
  // Performance
  roas: number;                // Revenue / Marketing Spend
  profitRoas: number;          // CM / Marketing Spend
  // Customer Acquisition
  newCustomers: number;
  cac: number;                 // Marketing Spend / New Customers
  ltv: number;                 // AOV × Orders/Customer × CM%
  ltvCacRatio: number;
  // Efficiency
  costPerOrder: number;        // Marketing Spend / Orders
  marketingEfficiencyRatio: number; // Revenue / Marketing Spend (same as ROAS)
}

export interface FDPOrderMetrics {
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  aov: number;                 // Average Order Value
  cogsPerOrder: number;
  feesPerOrder: number;
  shippingPerOrder: number;
}

export interface FDPCustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  repeatRate: number;
  avgOrdersPerCustomer: number;
}

export interface FDPChannelMetrics {
  channel: string;
  revenue: number;
  cogs: number;
  fees: number;
  marketingSpend: number;
  orders: number;
  contributionMargin: number;
  contributionMarginPercent: number;
  roas: number;
  profitRoas: number;
}

export interface FDPMetrics {
  // Core Metrics Groups
  revenue: FDPRevenueMetrics;
  costs: FDPCostMetrics;
  profit: FDPProfitMetrics;
  marketing: FDPMarketingMetrics;
  orders: FDPOrderMetrics;
  customers: FDPCustomerMetrics;
  
  // By Channel
  channelMetrics: FDPChannelMetrics[];
  
  // Formula Results (with interpretation)
  formulas: {
    netRevenue: FormulaResult;
    contributionMargin: FormulaResult;
    aov: FormulaResult;
    cmPerOrder: FormulaResult;
    cac: FormulaResult;
    ltv: FormulaResult;
    ltvCacRatio: FormulaResult;
    roas: FormulaResult;
  };
  
  // Data Quality
  dataQuality: {
    hasRealCogs: boolean;
    hasRealFees: boolean;
    hasRealMarketing: boolean;
    estimatedFields: string[];
  };
  
  // Metadata
  dateRange: {
    start: string;
    end: string;
    daysInPeriod: number;
  };
}

// ============================================
// MAIN HOOK
// ============================================

export function useFDPMetrics() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['fdp-metrics', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<FDPMetrics | null> => {
      if (!tenantId) return null;

      // Fetch data - split into smaller groups to avoid TypeScript deep instantiation error
      // Use RPC or aggregate query to avoid row limits
      // For now, fetch with explicit large limit to get all orders
      // SSOT: Query cdp_orders instead of external_orders
      // cdp_orders has pre-computed metrics, default missing fee columns to 0
      const ordersRes = await supabase
        .from('cdp_orders')
        .select('id, channel, gross_revenue, cogs, net_revenue, gross_margin, customer_id, order_at')
        .eq('tenant_id', tenantId)
        .gte('order_at', startDateStr)
        .lte('order_at', endDateStr)
        .limit(50000); // Override default 1000 limit

      const invoicesRes = await supabase
        .from('invoices')
        .select('id, status, total_amount, subtotal, discount_amount, issue_date')
        .eq('tenant_id', tenantId)
        .gte('issue_date', startDateStr)
        .lte('issue_date', endDateStr);

      const revenuesRes = await supabase
        .from('revenues')
        .select('id, amount, start_date')
        .eq('tenant_id', tenantId)
        .gte('start_date', startDateStr)
        .lte('start_date', endDateStr);

      const campaignsRes = await supabase
        .from('promotion_campaigns')
        .select('id, channel, actual_cost, start_date, end_date')
        .eq('tenant_id', tenantId)
        .gte('start_date', startDateStr)
        .lte('end_date', endDateStr);

      const marketingExpensesRes = await supabase
        .from('marketing_expenses')
        .select('id, channel, amount, expense_date')
        .eq('tenant_id', tenantId)
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr);

      const expensesRes = await supabase
        .from('expenses')
        .select('id, category, amount, expense_date')
        .eq('tenant_id', tenantId)
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr);

      const customersRes = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', tenantId);

      // Map cdp_orders to legacy format for backward compatibility
      const rawOrders = ordersRes.data || [];
      const orders = rawOrders.map(o => ({
        id: o.id,
        channel: o.channel,
        status: 'delivered' as const,
        total_amount: Number(o.gross_revenue) || 0,
        cost_of_goods: Number(o.cogs) || 0,
        platform_fee: 0, // Not available in cdp_orders
        commission_fee: 0,
        payment_fee: 0,
        shipping_fee: 0,
        customer_name: o.customer_id,
        external_order_id: o.id,
        order_date: o.order_at
      }));
      const invoices = invoicesRes.data || [];
      const revenues = revenuesRes.data || [];
      const campaigns = campaignsRes.data || [];
      const marketingExpenses = marketingExpensesRes.data || [];
      const expenses = expensesRes.data || [];
      const customers = customersRes.data || [];

      // ========== ORDER METRICS ==========
      // NOTE: cdp_orders only contains delivered orders, so all orders are already filtered
      const deliveredOrders = orders; // All cdp_orders are delivered
      const cancelledOrders: typeof orders = []; // No cancelled orders in cdp_orders
      const returnedOrders: typeof orders = []; // No returned orders in cdp_orders
      
      const totalOrders = deliveredOrders.length;
      let orderRevenue = 0, orderCogs = 0, orderPlatformFees = 0;
      let orderCommissionFees = 0, orderPaymentFees = 0, orderShippingFees = 0, orderDiscounts = 0;
      for (const o of deliveredOrders) {
        orderRevenue += o.total_amount || 0;
        orderCogs += o.cost_of_goods || 0;
        orderPlatformFees += o.platform_fee || 0;
        orderCommissionFees += o.commission_fee || 0;
        orderPaymentFees += o.payment_fee || 0;
        orderShippingFees += o.shipping_fee || 0;
        orderDiscounts += (o as any).discount_amount || 0;
      }
      let orderReturns = 0;
      for (const o of returnedOrders) orderReturns += o.total_amount || 0;

      // ========== INVOICE METRICS ==========
      const paidInvoices = invoices.filter(i => i.status === 'paid');
      let invoiceRevenue = 0;
      for (const i of paidInvoices) invoiceRevenue += (i.subtotal || i.total_amount || 0) - (i.discount_amount || 0);

      // ========== CONTRACT REVENUE ==========
      let contractRevenue = 0;
      for (const r of revenues) contractRevenue += r.amount || 0;

      // ========== EXPENSE BREAKDOWN ==========
      let expenseCogs = 0, expenseMarketing = 0, totalOpex = 0;
      for (const e of expenses) {
        const cat = e.category || '';
        const amt = e.amount || 0;
        if (cat === 'cogs') expenseCogs += amt;
        else if (cat === 'marketing') expenseMarketing += amt;
        else totalOpex += amt;
      }

      // ========== MARKETING SPEND ==========
      let campaignSpend = 0;
      for (const c of campaigns) campaignSpend += c.actual_cost || 0;
      let marketingExpenseTotal = 0;
      for (const m of marketingExpenses) marketingExpenseTotal += m.amount || 0;
      const totalMarketingSpend = campaignSpend + marketingExpenseTotal + expenseMarketing;

      // ========== TOTAL FEES (from channel_fees table or orders) ==========
      // Priority: Use real fees from orders, fallback to channel_fees config
      const hasRealFees = orderPlatformFees > 0 || orderCommissionFees > 0 || orderPaymentFees > 0;
      const totalPlatformFees = orderPlatformFees + orderCommissionFees + orderPaymentFees;

      // ========== CALCULATE METRICS ==========
      const grossRevenue = orderRevenue + invoiceRevenue + contractRevenue;
      const totalReturns = orderReturns;
      const totalDiscounts = orderDiscounts;
      
      // Net Revenue using FDP formula
      const netRevenueResult = calculateNetRevenue(
        grossRevenue,
        totalPlatformFees,
        totalReturns,
        totalDiscounts
      );
      const netRevenue = netRevenueResult.value;

      // COGS
      const totalCogs = orderCogs + expenseCogs;
      const hasRealCogs = orderCogs > 0 || expenseCogs > 0;

      // Gross Profit
      const grossProfit = netRevenue - totalCogs;
      const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

      // Contribution Margin for TOTAL (includes marketing for P&L view)
      const cmResult = calculateContributionMargin(
        netRevenue,
        totalCogs,
        orderShippingFees,
        totalMarketingSpend
      );
      const totalContributionMargin = cmResult.value;
      const totalContributionMarginPercent = netRevenue > 0 ? (totalContributionMargin / netRevenue) * 100 : 0;

      // Contribution Margin PER ORDER - Tính từ GROSS revenue
      // Công thức Unit Economics: CM/Order = AOV - COGS/Order - Fees/Order - Shipping/Order
      // KHÔNG dùng Net Revenue vì UI hiển thị breakdown từ Gross
      const orderLevelCM = orderRevenue - totalCogs - totalPlatformFees - orderShippingFees;
      const orderLevelCMPercent = orderRevenue > 0 ? (orderLevelCM / orderRevenue) * 100 : 0;

      // Per Order
      const aovResult = calculateAOV(orderRevenue, totalOrders);
      const aov = aovResult.value;
      const cogsPerOrder = totalOrders > 0 ? totalCogs / totalOrders : 0;
      const feesPerOrder = totalOrders > 0 ? totalPlatformFees / totalOrders : 0;
      const shippingPerOrder = totalOrders > 0 ? orderShippingFees / totalOrders : 0;
      
      // CM per order = AOV - COGS/order - Fees/order - Shipping/order
      const contributionMarginPerOrder = totalOrders > 0 ? orderLevelCM / totalOrders : 0;

      // ========== CUSTOMER METRICS ==========
      const uniqueBuyers = new Set(deliveredOrders.map(o => o.customer_name || o.external_order_id)).size;
      const buyerOrderCount: Record<string, number> = {};
      deliveredOrders.forEach(o => {
        const buyer = o.customer_name || o.external_order_id;
        buyerOrderCount[buyer] = (buyerOrderCount[buyer] || 0) + 1;
      });
      const repeatBuyers = Object.values(buyerOrderCount).filter(count => count > 1).length;
      const repeatRate = uniqueBuyers > 0 ? (repeatBuyers / uniqueBuyers) * 100 : 0;
      const avgOrdersPerCustomer = uniqueBuyers > 0 ? totalOrders / uniqueBuyers : 0;

      // New customers (estimate: 60% of unique buyers this period)
      const newCustomers = Math.round(uniqueBuyers * 0.6);

      // ========== MARKETING METRICS ==========
      const cacResult = calculateCAC(totalMarketingSpend, newCustomers);
      const cac = cacResult.value;

      // LTV uses order-level CM% (without marketing) for accurate per-customer value
      const ltvResult = calculateLTV(aov, avgOrdersPerCustomer, orderLevelCMPercent);
      const ltv = ltvResult.value;

      const ltvCacResult = calculateLTVCACRatio(ltv, cac);
      const ltvCacRatio = ltvCacResult.value;

      const roasResult = calculateROAS(orderRevenue, totalMarketingSpend);
      const roas = roasResult.value;

      const profitRoas = totalMarketingSpend > 0 ? totalContributionMargin / totalMarketingSpend : 0;
      const costPerOrder = totalOrders > 0 ? totalMarketingSpend / totalOrders : 0;

      // ========== CHANNEL METRICS ==========
      const channelMap = new Map<string, FDPChannelMetrics>();
      
      deliveredOrders.forEach(order => {
        const ch = order.channel?.toLowerCase() || 'unknown';
        const existing = channelMap.get(ch) || {
          channel: ch,
          revenue: 0,
          cogs: 0,
          fees: 0,
          marketingSpend: 0,
          orders: 0,
          contributionMargin: 0,
          contributionMarginPercent: 0,
          roas: 0,
          profitRoas: 0,
        };
        
        existing.revenue += order.total_amount || 0;
        existing.cogs += order.cost_of_goods || 0;
        existing.fees += (order.platform_fee || 0) + (order.commission_fee || 0) + (order.payment_fee || 0);
        existing.orders += 1;
        
        channelMap.set(ch, existing);
      });

      // Add marketing spend by channel
      campaigns.forEach(c => {
        const ch = c.channel?.toLowerCase() || 'unknown';
        const existing = channelMap.get(ch);
        if (existing) {
          existing.marketingSpend += c.actual_cost || 0;
        }
      });

      marketingExpenses.forEach(m => {
        const ch = m.channel?.toLowerCase() || 'unknown';
        const existing = channelMap.get(ch);
        if (existing) {
          existing.marketingSpend += m.amount || 0;
        }
      });

      // Calculate channel-level CM and ROAS
      const channelMetrics = Array.from(channelMap.values()).map(ch => {
        const netRev = ch.revenue - ch.fees;
        const cm = netRev - ch.cogs - ch.marketingSpend;
        const cmPercent = netRev > 0 ? (cm / netRev) * 100 : 0;
        const channelRoas = ch.marketingSpend > 0 ? ch.revenue / ch.marketingSpend : 0;
        const channelProfitRoas = ch.marketingSpend > 0 ? cm / ch.marketingSpend : 0;

        return {
          ...ch,
          contributionMargin: cm,
          contributionMarginPercent: cmPercent,
          roas: channelRoas,
          profitRoas: channelProfitRoas,
        };
      }).sort((a, b) => b.revenue - a.revenue);

      // ========== DATA QUALITY ==========
      const estimatedFields: string[] = [];
      if (!hasRealCogs) estimatedFields.push('COGS');
      if (!hasRealFees) estimatedFields.push('Platform Fees');
      if (totalMarketingSpend === 0) estimatedFields.push('Marketing Spend');

      // ========== DATE RANGE ==========
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return {
        revenue: {
          grossRevenue,
          orderRevenue,
          invoiceRevenue,
          contractRevenue,
          totalReturns,
          totalDiscounts,
          totalPlatformFees,
          netRevenue,
        },
        costs: {
          orderCogs,
          expenseCogs,
          totalCogs,
          platformFees: orderPlatformFees,
          commissionFees: orderCommissionFees,
          paymentFees: orderPaymentFees,
          shippingCosts: orderShippingFees,
          campaignSpend,
          marketingExpenses: marketingExpenseTotal,
          expenseMarketing,
          totalMarketingSpend,
          totalOpex,
        },
        profit: {
          grossProfit,
          grossMarginPercent,
          contributionMargin: orderLevelCM, // For per-order display (without marketing)
          contributionMarginPercent: orderLevelCMPercent,
          contributionMarginPerOrder,
        },
        marketing: {
          totalSpend: totalMarketingSpend,
          roas,
          profitRoas,
          newCustomers,
          cac,
          ltv,
          ltvCacRatio,
          costPerOrder,
          marketingEfficiencyRatio: roas,
        },
        orders: {
          totalOrders,
          deliveredOrders: deliveredOrders.length,
          cancelledOrders: cancelledOrders.length,
          returnedOrders: returnedOrders.length,
          aov,
          cogsPerOrder,
          feesPerOrder,
          shippingPerOrder,
        },
        customers: {
          totalCustomers: customers.length,
          newCustomers,
          repeatCustomers: repeatBuyers,
          repeatRate,
          avgOrdersPerCustomer,
        },
        channelMetrics,
        formulas: {
          netRevenue: netRevenueResult,
          contributionMargin: cmResult, // Total CM formula (with marketing for P&L)
          aov: aovResult,
          cmPerOrder: {
            value: contributionMarginPerOrder,
            formula: 'CM/Order = (Net Revenue - COGS - Shipping) / Orders',
            interpretation: 'Lợi nhuận gộp trung bình mỗi đơn hàng (không trừ marketing)',
            status: contributionMarginPerOrder > 0 ? 'good' as const : 'critical' as const,
            action: contributionMarginPerOrder <= 0 ? 'Mỗi đơn hàng đang lỗ tiền!' : undefined
          },
          cac: cacResult,
          ltv: ltvResult,
          ltvCacRatio: ltvCacResult,
          roas: roasResult,
        },
        dataQuality: {
          hasRealCogs,
          hasRealFees,
          hasRealMarketing: totalMarketingSpend > 0,
          estimatedFields,
        },
        dateRange: {
          start: startDateStr,
          end: endDateStr,
          daysInPeriod,
        },
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Get only revenue metrics
 */
export function useFDPRevenue() {
  const { data: metrics, isLoading, error } = useFDPMetrics();
  return {
    data: metrics?.revenue,
    isLoading,
    error,
  };
}

/**
 * Get only marketing metrics
 */
export function useFDPMarketing() {
  const { data: metrics, isLoading, error } = useFDPMetrics();
  return {
    data: metrics ? {
      ...metrics.marketing,
      formulas: {
        cac: metrics.formulas.cac,
        ltv: metrics.formulas.ltv,
        ltvCacRatio: metrics.formulas.ltvCacRatio,
        roas: metrics.formulas.roas,
      },
    } : null,
    isLoading,
    error,
  };
}

/**
 * Get only channel-level metrics
 */
export function useFDPChannels() {
  const { data: metrics, isLoading, error } = useFDPMetrics();
  return {
    data: metrics?.channelMetrics || [],
    isLoading,
    error,
  };
}

/**
 * Get data quality info
 */
export function useFDPDataQuality() {
  const { data: metrics, isLoading, error } = useFDPMetrics();
  return {
    data: metrics?.dataQuality,
    isLoading,
    error,
  };
}
