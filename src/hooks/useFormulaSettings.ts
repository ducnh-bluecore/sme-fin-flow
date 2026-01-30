/**
 * useFormulaSettings - Hook to fetch configurable formula parameters from formula_settings table
 * 
 * This hook provides access to tenant-specific financial calculation parameters
 * including growth rates, benchmarks, and forecasting settings.
 * 
 * Architecture: DB-First - Returns pre-configured settings from database
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';

export interface FormulaSettings {
  // Forecasting Parameters
  forecastDefaultGrowthRate: number;        // Default monthly growth % for projections
  forecastCollectionRate: number;           // Expected AR collection %
  forecastConfidenceLevel: number;          // Confidence level for forecasts
  
  // Cash Management
  minCashRunwayMonths: number;              // Minimum safe runway
  safeCashRunwayMonths: number;             // Target safe runway
  cashReservePercentage: number;            // % of revenue to keep as reserve
  
  // Working Capital
  targetDso: number;                        // Target Days Sales Outstanding
  targetGrossMargin: number;                // Target gross margin %
  targetNetMargin: number;                  // Target net margin %
  
  // Payment Terms
  defaultPaymentTermsAr: number;            // Default AR terms (days)
  defaultPaymentTermsAp: number;            // Default AP terms (days)
  
  // Tax Rates
  vatRate: number;
  corporateTaxRate: number;
  
  // Custom Parameters
  customParameters: Record<string, unknown>;
  
  // Metadata
  source: 'db' | 'default';
}

// Default values matching DB defaults
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
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  const query = useQuery({
    queryKey: ['formula-settings', tenantId],
    queryFn: async (): Promise<FormulaSettings> => {
      if (!tenantId) {
        return DEFAULT_SETTINGS;
      }

      let dbQuery = client
        .from('formula_settings')
        .select(`
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
        `);

      if (shouldAddTenantFilter) {
        dbQuery = dbQuery.eq('tenant_id', tenantId);
      }

      const { data, error } = await dbQuery.maybeSingle();

      if (error) {
        console.error('[useFormulaSettings] Error:', error);
        return DEFAULT_SETTINGS;
      }

      if (!data) {
        return DEFAULT_SETTINGS;
      }

      return {
        forecastDefaultGrowthRate: data.forecast_default_growth_rate ?? DEFAULT_SETTINGS.forecastDefaultGrowthRate,
        forecastCollectionRate: data.forecast_collection_rate ?? DEFAULT_SETTINGS.forecastCollectionRate,
        forecastConfidenceLevel: data.forecast_confidence_level ?? DEFAULT_SETTINGS.forecastConfidenceLevel,
        minCashRunwayMonths: data.min_cash_runway_months ?? DEFAULT_SETTINGS.minCashRunwayMonths,
        safeCashRunwayMonths: data.safe_cash_runway_months ?? DEFAULT_SETTINGS.safeCashRunwayMonths,
        cashReservePercentage: data.cash_reserve_percentage ?? DEFAULT_SETTINGS.cashReservePercentage,
        targetDso: data.target_dso ?? DEFAULT_SETTINGS.targetDso,
        targetGrossMargin: data.target_gross_margin ?? DEFAULT_SETTINGS.targetGrossMargin,
        targetNetMargin: data.target_net_margin ?? DEFAULT_SETTINGS.targetNetMargin,
        defaultPaymentTermsAr: data.default_payment_terms_ar ?? DEFAULT_SETTINGS.defaultPaymentTermsAr,
        defaultPaymentTermsAp: data.default_payment_terms_ap ?? DEFAULT_SETTINGS.defaultPaymentTermsAp,
        vatRate: data.vat_rate ?? DEFAULT_SETTINGS.vatRate,
        corporateTaxRate: data.corporate_tax_rate ?? DEFAULT_SETTINGS.corporateTaxRate,
        customParameters: (data.custom_parameters as Record<string, unknown>) ?? {},
        source: 'db',
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  return {
    settings: query.data ?? DEFAULT_SETTINGS,
    isLoading: query.isLoading,
    error: query.error,
  };
}
