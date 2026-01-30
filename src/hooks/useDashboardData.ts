/**
 * useDashboardData - REFACTORED to use canonical hooks only
 * 
 * ⚠️ DEPRECATED HOOKS NOW USE PRECOMPUTED DATA
 * 
 * - useDashboardKPIs: Now thin wrapper over useFinanceTruthSnapshot
 * - useARAgingData: Uses precomputed AR aging from snapshot
 * - useOverdueInvoices: Kept for UI list but should migrate to precomputed
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { useFinanceTruthSnapshot } from './useFinanceTruthSnapshot';

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
  dateRangeStart: string;
  dateRangeEnd: string;
}

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
 * @deprecated Use useFinanceTruthSnapshot instead
 * 
 * This is now a thin wrapper - NO raw queries, NO calculations.
 */
export function useDashboardKPIs() {
  const { startDateStr, endDateStr } = useDateRangeForQuery();
  const { data: snapshot, isLoading, error, refetch } = useFinanceTruthSnapshot();
  
  // Map snapshot to legacy DashboardKPIs shape - NO CALCULATIONS
  const data: DashboardKPIs = snapshot ? {
    cashToday: snapshot.cashToday,
    cash7d: snapshot.cash7dForecast,
    totalAR: snapshot.totalAR,
    overdueAR: snapshot.overdueAR,
    dso: snapshot.dso,
    dpo: snapshot.dpo,
    dio: snapshot.dio,
    ccc: snapshot.ccc,
    grossMargin: snapshot.grossMarginPercent,
    ebitda: snapshot.ebitda,
    autoMatchRate: 85, // Static estimate - would need precompute
    dateRangeStart: startDateStr,
    dateRangeEnd: endDateStr,
  } : EMPTY_KPIS;
  
  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

// Fetch Cash Forecasts - Still uses direct query (acceptable for operational data)
export function useCashForecasts() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cash-forecasts', tenantId],
    queryFn: async (): Promise<CashForecast[]> => {
      if (!tenantId) return [];

      let query = client
        .from('cash_forecasts')
        .select('*')
        .order('forecast_date', { ascending: true });
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
    enabled: !!tenantId && isReady,
  });
}

// DEPRECATED: useAlerts moved to useNotificationCenter
export { useActiveAlertsCount as useAlerts } from './useNotificationCenter';

/**
 * Fetch Overdue Invoices - Kept for UI list display
 * Note: This still uses direct query but is for operational list, not metrics
 */
export function useOverdueInvoices(limit?: number) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['overdue-invoices', tenantId, limit, today],
    queryFn: async (): Promise<InvoiceWithCustomer[]> => {
      if (!tenantId) return [];

      let query = client
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
        .neq('status', 'paid')
        .or(`status.eq.overdue,due_date.lt.${today}`)
        .order('due_date', { ascending: true });
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
    enabled: !!tenantId && isReady,
  });
}

/**
 * AR Aging Data - REFACTORED to use precomputed snapshot
 * NO raw invoice queries for bucket calculation
 */
export function useARAgingData() {
  const { data: snapshot, isLoading } = useFinanceTruthSnapshot();

  const data: ARAgingBucket[] = snapshot ? [
    { bucket: 'Chưa đến hạn', value: snapshot.arAgingCurrent, color: 'hsl(var(--chart-2))' },
    { bucket: 'Quá hạn 1-30 ngày', value: snapshot.arAging30d, color: 'hsl(var(--chart-3))' },
    { bucket: 'Quá hạn 31-60 ngày', value: snapshot.arAging60d, color: 'hsl(var(--warning))' },
    { bucket: 'Quá hạn 61-90 ngày', value: snapshot.arAging90d, color: 'hsl(var(--chart-4))' },
    { bucket: 'Nợ xấu (>90 ngày)', value: Math.max(0, snapshot.overdueAR - snapshot.arAging30d - snapshot.arAging60d - snapshot.arAging90d), color: 'hsl(var(--destructive))' },
  ] : [];

  return {
    data,
    isLoading,
    error: null,
  };
}

// Fetch Scenarios - Kept as-is (not a metrics hook)
export function useScenarios() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['scenarios', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('scenarios')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
    enabled: !!tenantId && isReady,
  });
}
