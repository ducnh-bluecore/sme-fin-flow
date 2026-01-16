import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { useCentralFinancialMetrics } from './useCentralFinancialMetrics';

/**
 * Dashboard Data Hooks - REFACTORED FOR SSOT
 * 
 * Uses useCentralFinancialMetrics for all financial metrics.
 * Only calculates dashboard-specific data that isn't covered by central metrics.
 */

// Types
export interface DashboardKPIs {
  cashToday: number;
  cash7d: number;
  totalAR: number;
  overdueAR: number;
  dso: number;
  dpo: number;
  dio: number;
  ccc: number;
  grossMargin: number;
  ebitda: number;
  autoMatchRate: number;
  // Metadata for transparency
  dateRangeStart: string;
  dateRangeEnd: string;
}

// Empty KPI state for fallback
export const EMPTY_KPIS: DashboardKPIs = {
  cashToday: 0,
  cash7d: 0,
  totalAR: 0,
  overdueAR: 0,
  dso: 0,
  dpo: 0,
  dio: 0,
  ccc: 0,
  grossMargin: 0,
  ebitda: 0,
  autoMatchRate: 0,
  dateRangeStart: '',
  dateRangeEnd: '',
};

export interface CashForecast {
  id: string;
  forecast_date: string;
  opening_balance: number;
  inflows: number | null;
  outflows: number | null;
  closing_balance: number;
  forecast_type: string | null;
}

// Alert interface moved to useNotificationCenter.ts - use AlertInstance instead

export interface InvoiceWithCustomer {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  issue_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number | null;
  status: string | null;
  customers: {
    name: string;
  } | null;
}

export interface ARAgingBucket {
  bucket: string;
  value: number;
  color: string;
}

/**
 * Dashboard KPIs Hook - REFACTORED FOR SSOT
 * 
 * Uses useCentralFinancialMetrics as the SINGLE SOURCE OF TRUTH for:
 * - DSO, DPO, DIO, CCC (Cash Conversion Cycle)
 * - Gross Margin, EBITDA
 * - AR, AP totals
 * - Cash on hand
 * 
 * Only calculates dashboard-specific metrics not in central metrics:
 * - Cash 7d forecast
 * - Auto match rate
 * - Overdue AR details
 */
export function useDashboardKPIs() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const { startDateStr, endDateStr, dateRange } = useDateRangeForQuery();
  
  // Use centralized financial metrics (SINGLE SOURCE OF TRUTH)
  const { data: centralMetrics, isLoading: metricsLoading } = useCentralFinancialMetrics();

  return useQuery({
    queryKey: ['dashboard-kpis', tenantId, dateRange, startDateStr, endDateStr],
    queryFn: async (): Promise<DashboardKPIs> => {
      if (!tenantId) {
        return EMPTY_KPIS;
      }

      // Fetch data that is NOT covered by useFinancialMetrics
      const [
        bankAccountsRes,
        invoicesRes,
        forecastsRes,
        transactionsRes,
        revenuesRes,
        expensesRes,
        settlementsRes
      ] = await Promise.all([
        supabase
          .from('bank_accounts')
          .select('current_balance')
          .eq('tenant_id', tenantId)
          .eq('status', 'active'),
        supabase
          .from('invoices')
          .select('total_amount, paid_amount, due_date, status, issue_date')
          .eq('tenant_id', tenantId)
          .gte('issue_date', startDateStr)
          .lte('issue_date', endDateStr),
        supabase
          .from('cash_forecasts')
          .select('closing_balance, forecast_date')
          .eq('tenant_id', tenantId)
          .gte('forecast_date', new Date().toISOString().split('T')[0])
          .order('forecast_date', { ascending: true })
          .limit(7),
        supabase
          .from('bank_transactions')
          .select('match_status')
          .eq('tenant_id', tenantId)
          .gte('transaction_date', startDateStr)
          .lte('transaction_date', endDateStr),
        supabase
          .from('revenues')
          .select('amount')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .gte('start_date', startDateStr)
          .lte('start_date', endDateStr),
        supabase
          .from('expenses')
          .select('amount, category')
          .eq('tenant_id', tenantId)
          .gte('expense_date', startDateStr)
          .lte('expense_date', endDateStr),
        // Removed external_orders query - use centralMetrics SSOT instead
        supabase
          .from('channel_settlements')
          .select('net_amount, payout_date, is_reconciled')
          .eq('tenant_id', tenantId)
          .gte('payout_date', startDateStr)
          .lte('payout_date', endDateStr)
      ]);

      const bankAccounts = bankAccountsRes.data || [];
      const invoices = invoicesRes.data || [];
      const forecasts = forecastsRes.data || [];
      const allTransactions = transactionsRes.data || [];
      const revenues = revenuesRes.data || [];
      const expenses = expensesRes.data || [];
      const settlements = settlementsRes.data || [];
      
      // Calculate cash today from bank accounts
      const cashToday = bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
      
      // Calculate AR from invoices and settlements
      const today = new Date();
      let totalAR = 0;
      let overdueAR = 0;
      
      // Traditional invoice AR
      invoices.forEach(inv => {
        const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
        if (remaining > 0 && inv.status !== 'paid') {
          totalAR += remaining;
          
          try {
            const dueDate = new Date(inv.due_date);
            if (!isNaN(dueDate.getTime()) && dueDate < today) {
              overdueAR += remaining;
            }
          } catch {
            // Skip invalid dates
          }
        }
      });
      
      // Pending eCommerce revenue as AR
      const pendingSettlements = settlements.filter(s => !s.is_reconciled);
      const ecommerceAR = pendingSettlements.reduce((sum, s) => sum + (s.net_amount || 0), 0);
      totalAR += ecommerceAR;
      
      // Overdue from settlements > 7 days old
      pendingSettlements.forEach(s => {
        try {
          const payoutDate = new Date(s.payout_date || '');
          if (!isNaN(payoutDate.getTime())) {
            const daysSincePayout = Math.floor((today.getTime() - payoutDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSincePayout > 7) {
              overdueAR += s.net_amount || 0;
            }
          }
        } catch {
          // Skip invalid dates
        }
      });
      
      // Cash 7d from forecasts
      let cash7d = forecasts.length ? forecasts[forecasts.length - 1]?.closing_balance : cashToday;
      if (!forecasts.length && pendingSettlements.length > 0) {
        cash7d = cashToday + ecommerceAR * 0.7;
      }
      
      // Auto match rate
      const matchedCount = allTransactions.filter(t => t.match_status === 'matched').length;
      const reconciledSettlements = settlements.filter(s => s.is_reconciled).length;
      const totalMatchable = (allTransactions.length || 0) + (settlements.length || 0);
      const autoMatchRate = totalMatchable > 0 
        ? Math.round(((matchedCount + reconciledSettlements) / totalMatchable) * 100)
        : 0;
      
      // USE CENTRAL METRICS for DSO, DPO, DIO, CCC, Gross Margin, EBITDA - Single Source of Truth!
      // This eliminates duplicate calculations and ensures consistency
      const dso = centralMetrics?.dso ?? 0;
      const dpo = centralMetrics?.dpo ?? 0;
      const dio = centralMetrics?.dio ?? 0;
      const ccc = centralMetrics?.ccc ?? 0;
      const grossMargin = centralMetrics?.grossMargin ?? 0;
      const ebitda = centralMetrics?.ebitda ?? 0;
      
      return {
        cashToday: centralMetrics?.cashOnHand ?? cashToday,
        cash7d: cash7d || centralMetrics?.cashOnHand || cashToday,
        totalAR: centralMetrics?.totalAR ?? totalAR,
        overdueAR: centralMetrics?.overdueAR ?? overdueAR,
        dso,
        dpo,
        dio,
        ccc,
        grossMargin: grossMargin > 0 ? grossMargin : 0,
        ebitda,
        autoMatchRate,
        dateRangeStart: startDateStr,
        dateRangeEnd: endDateStr,
      };
    },
    staleTime: 30000,
    enabled: !tenantLoading && !!tenantId && !metricsLoading,
  });
}

// Fetch Cash Forecasts
export function useCashForecasts() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cash-forecasts', tenantId],
    queryFn: async (): Promise<CashForecast[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('cash_forecasts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('forecast_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
    enabled: !!tenantId,
  });
}

// DEPRECATED: useAlerts moved to useNotificationCenter
// Use useNotificationCenter or useActiveAlertsCount instead
// This re-export is kept for backward compatibility but will be removed
export { useActiveAlertsCount as useAlerts } from './useNotificationCenter';

// Fetch Overdue Invoices - Note: No date range filter as overdue invoices may have old issue dates
export function useOverdueInvoices(limit?: number) {
  const { data: tenantId } = useActiveTenantId();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['overdue-invoices', tenantId, limit, today],
    queryFn: async (): Promise<InvoiceWithCustomer[]> => {
      if (!tenantId) return [];

      // Query invoices where status is overdue OR due_date is in the past AND not paid
      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          customer_id,
          issue_date,
          due_date,
          total_amount,
          paid_amount,
          status,
          customers (name)
        `)
        .eq('tenant_id', tenantId)
        .neq('status', 'paid')
        .or(`status.eq.overdue,due_date.lt.${today}`)
        .order('due_date', { ascending: true });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
    enabled: !!tenantId,
  });
}

// Fetch AR Aging Data
export function useARAgingData() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['ar-aging', tenantId],
    queryFn: async (): Promise<ARAgingBucket[]> => {
      if (!tenantId) return [];

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, paid_amount, due_date, status')
        .eq('tenant_id', tenantId)
        .neq('status', 'paid');
      
      const today = new Date();
      const buckets = {
        current: 0,
        '1-30': 0,
        '31-60': 0,
        '61-90': 0,
        '>90': 0,
      };
      
      invoices?.forEach(inv => {
        const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
        if (remaining <= 0) return;
        
        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue <= 0) {
          buckets.current += remaining;
        } else if (daysOverdue <= 30) {
          buckets['1-30'] += remaining;
        } else if (daysOverdue <= 60) {
          buckets['31-60'] += remaining;
        } else if (daysOverdue <= 90) {
          buckets['61-90'] += remaining;
        } else {
          buckets['>90'] += remaining;
        }
      });
      
      return [
        { bucket: 'Hiện hành', value: buckets.current, color: 'hsl(var(--chart-2))' },
        { bucket: '1-30 ngày', value: buckets['1-30'], color: 'hsl(var(--chart-3))' },
        { bucket: '31-60 ngày', value: buckets['31-60'], color: 'hsl(var(--warning))' },
        { bucket: '61-90 ngày', value: buckets['61-90'], color: 'hsl(var(--chart-4))' },
        { bucket: '>90 ngày', value: buckets['>90'], color: 'hsl(var(--destructive))' },
      ];
    },
    staleTime: 30000,
    enabled: !!tenantId,
  });
}

// Fetch Scenarios
export function useScenarios() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['scenarios', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
    enabled: !!tenantId,
  });
}
