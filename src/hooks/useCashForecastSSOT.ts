/**
 * useCashForecastSSOT - Thin wrapper for DB-First Cash Forecast
 * 
 * Phase 3: Migrated to useTenantSupabaseCompat for Schema-per-Tenant support
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';

export type ForecastMethod = 'rule-based' | 'simple';

export interface ForecastRow {
  forecast_date: string;
  display_date: string;
  balance: number;
  inflow: number;
  outflow: number;
  net_flow: number;
  upper_bound: number;
  lower_bound: number;
  is_actual: boolean;
}

export interface ForecastInputsSummary {
  bankBalance: number;
  bankAccountCount: number;
  arTotal: number;
  arDueWithin30: number;
  arDueWithin60: number;
  arDueWithin90: number;
  arOverdue: number;
  invoiceCount: number;
  apTotal: number;
  apDueWithin30: number;
  apDueWithin60: number;
  apDueWithin90: number;
  billCount: number;
  recurringExpensesMonthly: number;
  expenseCount: number;
  pendingSettlements: number;
  orderCount: number;
  avgDailyInflow: number;
  avgDailyOutflow: number;
  historicalDays: number;
  dataStatus: {
    hasBankData: boolean;
    hasInvoiceData: boolean;
    hasBillData: boolean;
    hasExpenseData: boolean;
    hasOrderData: boolean;
    hasHistoricalData: boolean;
    historicalDaysAvailable: number;
    missingData: string[];
    dataQualityScore: number;
  };
}

/**
 * Generate cash forecast using database RPC (100% DB-First)
 */
export function useCashForecastSSOT(days: number = 90, method: ForecastMethod = 'rule-based') {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  const { data: forecast, isLoading: forecastLoading, error } = useQuery({
    queryKey: ['cash-forecast-ssot', tenantId, days, method],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await client.rpc('generate_cash_forecast', {
        p_tenant_id: tenantId,
        p_days: days,
        p_method: method
      });

      if (error) {
        console.error('[useCashForecastSSOT] RPC error:', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        date: row.forecast_date,
        displayDate: row.display_date,
        balance: Number(row.balance),
        inflow: Number(row.inflow),
        outflow: Number(row.outflow),
        netFlow: Number(row.net_flow),
        upperBound: Number(row.upper_bound),
        lowerBound: Number(row.lower_bound),
        isActual: row.is_actual,
      }));
    },
    enabled: isReady,
    staleTime: 60000,
  });

  return {
    forecast: forecast || [],
    isLoading: !isReady || forecastLoading,
    error,
  };
}

/**
 * Get forecast inputs summary
 */
export function useForecastInputsSSOT() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  const { data: inputs, isLoading: inputsLoading, error } = useQuery({
    queryKey: ['forecast-inputs-ssot', tenantId],
    queryFn: async (): Promise<ForecastInputsSummary | null> => {
      if (!tenantId) return null;

      const { data, error } = await client.rpc('get_forecast_inputs_summary', {
        p_tenant_id: tenantId
      });

      if (error) {
        console.error('[useForecastInputsSSOT] RPC error:', error);
        throw error;
      }

      if (!data) return null;
      
      const jsonData = data as Record<string, any>;
      const dataStatus = jsonData.dataStatus as Record<string, any> | undefined;

      return {
        bankBalance: Number(jsonData.bankBalance) || 0,
        bankAccountCount: Number(jsonData.bankAccountCount) || 0,
        arTotal: Number(jsonData.arTotal) || 0,
        arDueWithin30: Number(jsonData.arDueWithin30) || 0,
        arDueWithin60: Number(jsonData.arDueWithin60) || 0,
        arDueWithin90: Number(jsonData.arDueWithin90) || 0,
        arOverdue: Number(jsonData.arOverdue) || 0,
        invoiceCount: Number(jsonData.invoiceCount) || 0,
        apTotal: Number(jsonData.apTotal) || 0,
        apDueWithin30: Number(jsonData.apDueWithin30) || 0,
        apDueWithin60: Number(jsonData.apDueWithin60) || 0,
        apDueWithin90: Number(jsonData.apDueWithin90) || 0,
        billCount: Number(jsonData.billCount) || 0,
        recurringExpensesMonthly: Number(jsonData.recurringExpensesMonthly) || 0,
        expenseCount: Number(jsonData.expenseCount) || 0,
        pendingSettlements: Number(jsonData.pendingSettlements) || 0,
        orderCount: Number(jsonData.orderCount) || 0,
        avgDailyInflow: Number(jsonData.avgDailyInflow) || 0,
        avgDailyOutflow: Number(jsonData.avgDailyOutflow) || 0,
        historicalDays: Number(jsonData.historicalDays) || 0,
        dataStatus: {
          hasBankData: Boolean(dataStatus?.hasBankData),
          hasInvoiceData: Boolean(dataStatus?.hasInvoiceData),
          hasBillData: Boolean(dataStatus?.hasBillData),
          hasExpenseData: Boolean(dataStatus?.hasExpenseData),
          hasOrderData: Boolean(dataStatus?.hasOrderData),
          hasHistoricalData: Boolean(dataStatus?.hasHistoricalData),
          historicalDaysAvailable: Number(dataStatus?.historicalDaysAvailable) || 0,
          missingData: (dataStatus?.missingData as string[]) || [],
          dataQualityScore: Number(dataStatus?.dataQualityScore) || 0,
        },
      };
    },
    enabled: isReady,
    staleTime: 60000,
  });

  return {
    inputs: inputs,
    isLoading: !isReady || inputsLoading,
    error,
  };
}
