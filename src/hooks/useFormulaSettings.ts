/**
 * useFormulaSettings - Hook to fetch configurable formula parameters from formula_settings table
 * 
 * This hook provides access to tenant-specific financial calculation parameters
 * including growth rates, benchmarks, and forecasting settings.
 * 
 * Architecture v1.4.1: Uses useTenantQueryBuilder for tenant-aware queries
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';

export interface FormulaSettings {
  // Forecasting Parameters
  forecastDefaultGrowthRate: number;
  forecastCollectionRate: number;
  forecastConfidenceLevel: number;
  
  // Cash Management
  minCashRunwayMonths: number;
  safeCashRunwayMonths: number;
  cashReservePercentage: number;
  
  // Working Capital
  targetDso: number;
  targetGrossMargin: number;
  targetNetMargin: number;
  
  // Payment Terms
  defaultPaymentTermsAr: number;
  defaultPaymentTermsAp: number;
  
  // Tax Rates
  vatRate: number;
  corporateTaxRate: number;
  
  // Custom Parameters
  customParameters: Record<string, unknown>;
  
  // Metadata
  source: 'db' | 'default';
}

const DEFAULT_SETTINGS: FormulaSettings = {
  forecastDefaultGrowthRate: 5.00,
  forecastCollectionRate: 85.00,
  forecastConfidenceLevel: 95.00,
  minCashRunwayMonths: 3,
  safeCashRunwayMonths: 6,
  cashReservePercentage: 20.00,
  targetDso: 45,
  targetGrossMargin: 30.00,
  targetNetMargin: 10.00,
  defaultPaymentTermsAr: 30,
  defaultPaymentTermsAp: 30,
  vatRate: 10.00,
  corporateTaxRate: 20.00,
  customParameters: {},
  source: 'default',
};

export function useFormulaSettings() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  const query = useQuery({
    queryKey: ['formula-settings', tenantId],
    queryFn: async (): Promise<FormulaSettings> => {
      if (!tenantId) {
        return DEFAULT_SETTINGS;
      }

      const { data, error } = await buildSelectQuery('formula_settings', `
        forecast_default_growth_rate,
        forecast_collection_rate,
        forecast_confidence_level,
        min_cash_runway_months,
        safe_cash_runway_months,
        cash_reserve_percentage,
        target_dso,
        target_gross_margin,
        target_net_margin,
        default_payment_terms_ar,
        default_payment_terms_ap,
        vat_rate,
        corporate_tax_rate,
        custom_parameters
      `)
        .maybeSingle();

      if (error) {
        console.error('[useFormulaSettings] Error:', error);
        return DEFAULT_SETTINGS;
      }

      if (!data) {
        return DEFAULT_SETTINGS;
      }

      const row = data as any;
      return {
        forecastDefaultGrowthRate: row.forecast_default_growth_rate ?? DEFAULT_SETTINGS.forecastDefaultGrowthRate,
        forecastCollectionRate: row.forecast_collection_rate ?? DEFAULT_SETTINGS.forecastCollectionRate,
        forecastConfidenceLevel: row.forecast_confidence_level ?? DEFAULT_SETTINGS.forecastConfidenceLevel,
        minCashRunwayMonths: row.min_cash_runway_months ?? DEFAULT_SETTINGS.minCashRunwayMonths,
        safeCashRunwayMonths: row.safe_cash_runway_months ?? DEFAULT_SETTINGS.safeCashRunwayMonths,
        cashReservePercentage: row.cash_reserve_percentage ?? DEFAULT_SETTINGS.cashReservePercentage,
        targetDso: row.target_dso ?? DEFAULT_SETTINGS.targetDso,
        targetGrossMargin: row.target_gross_margin ?? DEFAULT_SETTINGS.targetGrossMargin,
        targetNetMargin: row.target_net_margin ?? DEFAULT_SETTINGS.targetNetMargin,
        defaultPaymentTermsAr: row.default_payment_terms_ar ?? DEFAULT_SETTINGS.defaultPaymentTermsAr,
        defaultPaymentTermsAp: row.default_payment_terms_ap ?? DEFAULT_SETTINGS.defaultPaymentTermsAp,
        vatRate: row.vat_rate ?? DEFAULT_SETTINGS.vatRate,
        corporateTaxRate: row.corporate_tax_rate ?? DEFAULT_SETTINGS.corporateTaxRate,
        customParameters: (row.custom_parameters as Record<string, unknown>) ?? {},
        source: 'db',
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 10 * 60 * 1000,
  });

  return {
    settings: query.data ?? DEFAULT_SETTINGS,
    isLoading: query.isLoading,
    error: query.error,
  };
}
