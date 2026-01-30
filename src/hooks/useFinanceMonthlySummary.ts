/**
 * useFinanceMonthlySummary - CANONICAL HOOK for Monthly Finance Series
 * 
 * Phase 3: Migrated to useTenantSupabaseCompat for Schema-per-Tenant support
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';

// =============================================================
// TYPES
// =============================================================

export interface MonthlySummary {
  id: string;
  tenant_id: string;
  year_month: string;
  month_start: string;
  month_end: string;
  net_revenue: number;
  gross_profit: number;
  gross_margin_percent: number;
  contribution_margin: number;
  ebitda: number;
  cogs: number;
  marketing_spend: number;
  operating_expenses: number;
  cash_inflows: number;
  cash_outflows: number;
  net_cash_flow: number;
  closing_cash: number;
  ar_balance: number;
  ap_balance: number;
  inventory_balance: number;
  dso: number;
  dpo: number;
  dio: number;
  ccc: number;
  order_count: number;
  customer_count: number;
  avg_order_value: number;
  roas: number;
  cac: number;
  revenue_mom_change: number | null;
  revenue_yoy_change: number | null;
  computed_at: string;
  created_at: string;
}

export interface FormattedMonthlySummary {
  yearMonth: string;
  monthStart: string;
  monthEnd: string;
  netRevenue: number;
  grossProfit: number;
  grossMarginPercent: number;
  contributionMargin: number;
  ebitda: number;
  cogs: number;
  marketingSpend: number;
  operatingExpenses: number;
  cashInflows: number;
  cashOutflows: number;
  netCashFlow: number;
  closingCash: number;
  arBalance: number;
  apBalance: number;
  inventoryBalance: number;
  dso: number;
  dpo: number;
  dio: number;
  ccc: number;
  orderCount: number;
  customerCount: number;
  avgOrderValue: number;
  roas: number;
  cac: number;
  revenueMomChange: number | null;
  revenueYoyChange: number | null;
}

// =============================================================
// MAIN HOOK
// =============================================================

interface UseMonthlySummaryOptions {
  months?: number;
}

export function useFinanceMonthlySummary(options: UseMonthlySummaryOptions = {}) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  const { months = 12 } = options;
  
  return useQuery({
    queryKey: ['finance-monthly-summary', tenantId, months],
    queryFn: async (): Promise<FormattedMonthlySummary[]> => {
      if (!tenantId) return [];
      
      let query = client
        .from('finance_monthly_summary')
        .select('*')
        .order('year_month', { ascending: false })
        .limit(months);
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useFinanceMonthlySummary] Fetch error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) return [];
      
      return data.map(mapToFormatted).reverse();
    },
    enabled: isReady,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// =============================================================
// SPECIALIZED HOOKS
// =============================================================

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

export function useYoYComparison() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  
  return useQuery({
    queryKey: ['finance-yoy-comparison', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      let query = client
        .from('finance_monthly_summary')
        .select('*')
        .order('year_month', { ascending: false })
        .limit(24);
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      
      if (error || !data) return null;
      
      const currentYear = data.slice(0, 12).map(mapToFormatted);
      const previousYear = data.slice(12, 24).map(mapToFormatted);
      
      return {
        currentYear,
        previousYear,
        yoyChanges: currentYear.map(m => ({
          month: m.yearMonth,
          revenueChange: m.revenueYoyChange,
        })),
      };
    },
    enabled: isReady,
    staleTime: 30 * 60 * 1000,
  });
}

// =============================================================
// HELPER
// =============================================================

function mapToFormatted(raw: MonthlySummary): FormattedMonthlySummary {
  return {
    yearMonth: raw.year_month,
    monthStart: raw.month_start,
    monthEnd: raw.month_end,
    netRevenue: Number(raw.net_revenue) || 0,
    grossProfit: Number(raw.gross_profit) || 0,
    grossMarginPercent: Number(raw.gross_margin_percent) || 0,
    contributionMargin: Number(raw.contribution_margin) || 0,
    ebitda: Number(raw.ebitda) || 0,
    cogs: Number(raw.cogs) || 0,
    marketingSpend: Number(raw.marketing_spend) || 0,
    operatingExpenses: Number(raw.operating_expenses) || 0,
    cashInflows: Number(raw.cash_inflows) || 0,
    cashOutflows: Number(raw.cash_outflows) || 0,
    netCashFlow: Number(raw.net_cash_flow) || 0,
    closingCash: Number(raw.closing_cash) || 0,
    arBalance: Number(raw.ar_balance) || 0,
    apBalance: Number(raw.ap_balance) || 0,
    inventoryBalance: Number(raw.inventory_balance) || 0,
    dso: Number(raw.dso) || 0,
    dpo: Number(raw.dpo) || 0,
    dio: Number(raw.dio) || 0,
    ccc: Number(raw.ccc) || 0,
    orderCount: Number(raw.order_count) || 0,
    customerCount: Number(raw.customer_count) || 0,
    avgOrderValue: Number(raw.avg_order_value) || 0,
    roas: Number(raw.roas) || 0,
    cac: Number(raw.cac) || 0,
    revenueMomChange: raw.revenue_mom_change,
    revenueYoyChange: raw.revenue_yoy_change,
  };
}
