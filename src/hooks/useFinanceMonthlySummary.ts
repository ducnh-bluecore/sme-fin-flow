/**
 * useFinanceMonthlySummary - CANONICAL HOOK for Monthly Finance Series
 * 
 * ⚠️ THIS IS THE SINGLE SOURCE OF TRUTH FOR ALL MONTHLY FINANCE DATA
 * 
 * This hook ONLY fetches precomputed data from finance_monthly_summary.
 * NO business calculations are performed in this hook.
 * 
 * Used by:
 * - Financial reports (monthly trends)
 * - P&L charts
 * - Cash flow series
 * - YoY/MoM comparisons
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

// =============================================================
// TYPES - Mirror the database schema exactly
// =============================================================

export interface MonthlySummary {
  id: string;
  tenant_id: string;
  year_month: string;
  month_start: string;
  month_end: string;
  
  // Revenue & Profit
  net_revenue: number;
  gross_profit: number;
  gross_margin_percent: number;
  contribution_margin: number;
  ebitda: number;
  
  // Costs
  cogs: number;
  marketing_spend: number;
  operating_expenses: number;
  
  // Cash flow
  cash_inflows: number;
  cash_outflows: number;
  net_cash_flow: number;
  closing_cash: number;
  
  // Working capital
  ar_balance: number;
  ap_balance: number;
  inventory_balance: number;
  dso: number;
  dpo: number;
  dio: number;
  ccc: number;
  
  // Volume
  order_count: number;
  customer_count: number;
  avg_order_value: number;
  
  // Marketing
  roas: number;
  cac: number;
  
  // Comparisons
  revenue_mom_change: number | null;
  revenue_yoy_change: number | null;
  
  // Metadata
  computed_at: string;
  created_at: string;
}

// Formatted for charts
export interface FormattedMonthlySummary {
  yearMonth: string;
  monthStart: string;
  monthEnd: string;
  
  // Revenue & Profit
  netRevenue: number;
  grossProfit: number;
  grossMarginPercent: number;
  contributionMargin: number;
  ebitda: number;
  
  // Costs
  cogs: number;
  marketingSpend: number;
  operatingExpenses: number;
  
  // Cash flow
  cashInflows: number;
  cashOutflows: number;
  netCashFlow: number;
  closingCash: number;
  
  // Working capital
  arBalance: number;
  apBalance: number;
  inventoryBalance: number;
  dso: number;
  dpo: number;
  dio: number;
  ccc: number;
  
  // Volume
  orderCount: number;
  customerCount: number;
  avgOrderValue: number;
  
  // Marketing
  roas: number;
  cac: number;
  
  // Comparisons (precomputed in DB)
  revenueMomChange: number | null;
  revenueYoyChange: number | null;
}

// =============================================================
// MAIN HOOK - Fetch monthly summaries (NO CALCULATIONS)
// =============================================================

interface UseMonthlySummaryOptions {
  months?: number; // How many months to fetch (default 12)
}

export function useFinanceMonthlySummary(options: UseMonthlySummaryOptions = {}) {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const { months = 12 } = options;
  
  return useQuery({
    queryKey: ['finance-monthly-summary', tenantId, months],
    queryFn: async (): Promise<FormattedMonthlySummary[]> => {
      if (!tenantId) return [];
      
      // Direct fetch - NO CALCULATIONS
      const { data, error } = await supabase
        .from('finance_monthly_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('year_month', { ascending: false })
        .limit(months);
      
      if (error) {
        console.error('[useFinanceMonthlySummary] Fetch error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) return [];
      
      // Map to formatted shape - NO CALCULATIONS
      // Reverse to get chronological order for charts
      return data.map(mapToFormatted).reverse();
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 10 * 60 * 1000, // 10 minutes (monthly data is less volatile)
    gcTime: 30 * 60 * 1000,
  });
}

// =============================================================
// SPECIALIZED HOOKS (thin wrappers, NO CALCULATIONS)
// =============================================================

/**
 * Get revenue trend for charts
 */
export function useRevenueTrend(months: number = 12) {
  const query = useFinanceMonthlySummary({ months });
  
  const trendData = query.data?.map(m => ({
    month: m.yearMonth,
    revenue: m.netRevenue,
    cost: m.cogs + m.marketingSpend + m.operatingExpenses,
    profit: m.grossProfit,
    ebitda: m.ebitda,
  })) || [];
  
  return { ...query, data: trendData };
}

/**
 * Get cash flow trend for charts
 */
export function useCashFlowTrend(months: number = 12) {
  const query = useFinanceMonthlySummary({ months });
  
  const trendData = query.data?.map(m => ({
    month: m.yearMonth,
    inflows: m.cashInflows,
    outflows: m.cashOutflows,
    netCashFlow: m.netCashFlow,
    closingCash: m.closingCash,
  })) || [];
  
  return { ...query, data: trendData };
}

/**
 * Get working capital trend for charts
 */
export function useWorkingCapitalTrend(months: number = 12) {
  const query = useFinanceMonthlySummary({ months });
  
  const trendData = query.data?.map(m => ({
    month: m.yearMonth,
    ar: m.arBalance,
    ap: m.apBalance,
    inventory: m.inventoryBalance,
    dso: m.dso,
    dpo: m.dpo,
    dio: m.dio,
    ccc: m.ccc,
  })) || [];
  
  return { ...query, data: trendData };
}

/**
 * Get YoY comparison
 */
export function useYoYComparison() {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['finance-yoy-comparison', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      // Fetch current year + previous year
      const { data, error } = await supabase
        .from('finance_monthly_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('year_month', { ascending: false })
        .limit(24);
      
      if (error || !data) return null;
      
      // Split by year - using precomputed revenue_yoy_change
      const currentYear = data.slice(0, 12).map(mapToFormatted);
      const previousYear = data.slice(12, 24).map(mapToFormatted);
      
      return {
        currentYear,
        previousYear,
        // YoY changes are precomputed in DB
        yoyChanges: currentYear.map(m => ({
          month: m.yearMonth,
          revenueChange: m.revenueYoyChange,
        })),
      };
    },
    enabled: !!tenantId,
    staleTime: 30 * 60 * 1000,
  });
}

// =============================================================
// HELPER - Map DB row to formatted UI object (NO CALCULATIONS)
// =============================================================

function mapToFormatted(raw: MonthlySummary): FormattedMonthlySummary {
  return {
    yearMonth: raw.year_month,
    monthStart: raw.month_start,
    monthEnd: raw.month_end,
    
    // Revenue & Profit
    netRevenue: Number(raw.net_revenue) || 0,
    grossProfit: Number(raw.gross_profit) || 0,
    grossMarginPercent: Number(raw.gross_margin_percent) || 0,
    contributionMargin: Number(raw.contribution_margin) || 0,
    ebitda: Number(raw.ebitda) || 0,
    
    // Costs
    cogs: Number(raw.cogs) || 0,
    marketingSpend: Number(raw.marketing_spend) || 0,
    operatingExpenses: Number(raw.operating_expenses) || 0,
    
    // Cash flow
    cashInflows: Number(raw.cash_inflows) || 0,
    cashOutflows: Number(raw.cash_outflows) || 0,
    netCashFlow: Number(raw.net_cash_flow) || 0,
    closingCash: Number(raw.closing_cash) || 0,
    
    // Working capital
    arBalance: Number(raw.ar_balance) || 0,
    apBalance: Number(raw.ap_balance) || 0,
    inventoryBalance: Number(raw.inventory_balance) || 0,
    dso: Number(raw.dso) || 0,
    dpo: Number(raw.dpo) || 0,
    dio: Number(raw.dio) || 0,
    ccc: Number(raw.ccc) || 0,
    
    // Volume
    orderCount: Number(raw.order_count) || 0,
    customerCount: Number(raw.customer_count) || 0,
    avgOrderValue: Number(raw.avg_order_value) || 0,
    
    // Marketing
    roas: Number(raw.roas) || 0,
    cac: Number(raw.cac) || 0,
    
    // Comparisons (precomputed)
    revenueMomChange: raw.revenue_mom_change,
    revenueYoyChange: raw.revenue_yoy_change,
  };
}
