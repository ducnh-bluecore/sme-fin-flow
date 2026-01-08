import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';

export interface FormulaSettings {
  id: string;
  tenant_id: string;
  
  // Financial Period Settings
  fiscal_year_days: number;
  fiscal_year_start_month: number;
  
  // Working Capital Parameters
  dso_calculation_days: number;
  dio_calculation_days: number;
  dpo_calculation_days: number;
  
  // AR Aging Buckets
  ar_bucket_1: number;
  ar_bucket_2: number;
  ar_bucket_3: number;
  ar_bucket_4: number;
  
  // Industry Benchmarks
  target_gross_margin: number;
  target_net_margin: number;
  target_dso: number;
  target_collection_rate: number;
  
  // Cash Management
  min_cash_runway_months: number;
  safe_cash_runway_months: number;
  cash_reserve_percentage: number;
  
  // Commission Rates
  channel_commission_rates: Record<string, number>;
  
  // Forecasting Parameters
  forecast_confidence_level: number;
  forecast_default_growth_rate: number;
  forecast_collection_rate: number;
  
  // Payment Terms
  default_payment_terms_ar: number;
  default_payment_terms_ap: number;
  
  // Depreciation
  default_depreciation_years: number;
  
  // Tax Rates
  vat_rate: number;
  corporate_tax_rate: number;
  
  // Cash Flow Direct Parameters
  operating_cash_ratio_target: number;
  cash_burn_rate_warning: number;
  cash_burn_rate_critical: number;
  minimum_operating_cash: number;
  investing_budget_percentage: number;
  financing_debt_ratio_max: number;
  
  // Inventory Aging Parameters
  inventory_slow_moving_days: number;
  inventory_dead_stock_days: number;
  inventory_target_turnover: number;
  inventory_holding_cost_rate: number;
  
  // Promotion ROI Parameters
  promotion_min_roi: number;
  promotion_target_roas: number;
  promotion_max_discount_rate: number;
  
  // Supplier Payment Parameters
  supplier_early_payment_threshold: number;
  supplier_concentration_warning: number;
  supplier_payment_compliance_target: number;
  
  // Custom Parameters
  custom_parameters: Record<string, any>;
  
  created_at: string;
  updated_at: string;
}

const defaultSettings: Omit<FormulaSettings, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
  fiscal_year_days: 365,
  fiscal_year_start_month: 1,
  dso_calculation_days: 365,
  dio_calculation_days: 365,
  dpo_calculation_days: 365,
  ar_bucket_1: 30,
  ar_bucket_2: 60,
  ar_bucket_3: 90,
  ar_bucket_4: 120,
  target_gross_margin: 30,
  target_net_margin: 10,
  target_dso: 45,
  target_collection_rate: 95,
  min_cash_runway_months: 3,
  safe_cash_runway_months: 6,
  cash_reserve_percentage: 20,
  channel_commission_rates: {
    shopee: 5.0,
    lazada: 5.0,
    tiktok: 4.0,
    tiki: 6.0,
    sendo: 5.0,
    offline: 0.0,
    b2b: 2.0,
    website: 3.0,
  },
  forecast_confidence_level: 95,
  forecast_default_growth_rate: 5,
  forecast_collection_rate: 85,
  default_payment_terms_ar: 30,
  default_payment_terms_ap: 30,
  default_depreciation_years: 5,
  vat_rate: 10,
  corporate_tax_rate: 20,
  // Cash Flow Direct
  operating_cash_ratio_target: 1.0,
  cash_burn_rate_warning: 15,
  cash_burn_rate_critical: 25,
  minimum_operating_cash: 500000000,
  investing_budget_percentage: 10,
  financing_debt_ratio_max: 60,
  // Inventory Aging
  inventory_slow_moving_days: 90,
  inventory_dead_stock_days: 180,
  inventory_target_turnover: 6,
  inventory_holding_cost_rate: 25,
  // Promotion ROI
  promotion_min_roi: 200,
  promotion_target_roas: 4,
  promotion_max_discount_rate: 50,
  // Supplier Payment
  supplier_early_payment_threshold: 2,
  supplier_concentration_warning: 30,
  supplier_payment_compliance_target: 95,
  custom_parameters: {},
};

export function useFormulaSettings() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['formula-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('formula_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return data as FormulaSettings;
      }

      // Return defaults with tenant_id if no settings exist
      return {
        ...defaultSettings,
        tenant_id: tenantId,
        id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as FormulaSettings;
    },
    enabled: !!tenantId,
  });
}

export function useUpdateFormulaSettings() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (settings: Partial<FormulaSettings>) => {
      if (!tenantId) throw new Error('No tenant selected');

      // Check if settings exist
      const { data: existing } = await supabase
        .from('formula_settings')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('formula_settings')
          .update({
            fiscal_year_days: settings.fiscal_year_days,
            fiscal_year_start_month: settings.fiscal_year_start_month,
            dso_calculation_days: settings.dso_calculation_days,
            dio_calculation_days: settings.dio_calculation_days,
            dpo_calculation_days: settings.dpo_calculation_days,
            ar_bucket_1: settings.ar_bucket_1,
            ar_bucket_2: settings.ar_bucket_2,
            ar_bucket_3: settings.ar_bucket_3,
            ar_bucket_4: settings.ar_bucket_4,
            target_gross_margin: settings.target_gross_margin,
            target_net_margin: settings.target_net_margin,
            target_dso: settings.target_dso,
            target_collection_rate: settings.target_collection_rate,
            min_cash_runway_months: settings.min_cash_runway_months,
            safe_cash_runway_months: settings.safe_cash_runway_months,
            cash_reserve_percentage: settings.cash_reserve_percentage,
            channel_commission_rates: settings.channel_commission_rates,
            forecast_confidence_level: settings.forecast_confidence_level,
            forecast_default_growth_rate: settings.forecast_default_growth_rate,
            forecast_collection_rate: settings.forecast_collection_rate,
            default_payment_terms_ar: settings.default_payment_terms_ar,
            default_payment_terms_ap: settings.default_payment_terms_ap,
            default_depreciation_years: settings.default_depreciation_years,
            vat_rate: settings.vat_rate,
            corporate_tax_rate: settings.corporate_tax_rate,
            custom_parameters: settings.custom_parameters,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('formula_settings')
          .insert({
            tenant_id: tenantId,
            fiscal_year_days: settings.fiscal_year_days,
            fiscal_year_start_month: settings.fiscal_year_start_month,
            dso_calculation_days: settings.dso_calculation_days,
            dio_calculation_days: settings.dio_calculation_days,
            dpo_calculation_days: settings.dpo_calculation_days,
            ar_bucket_1: settings.ar_bucket_1,
            ar_bucket_2: settings.ar_bucket_2,
            ar_bucket_3: settings.ar_bucket_3,
            ar_bucket_4: settings.ar_bucket_4,
            target_gross_margin: settings.target_gross_margin,
            target_net_margin: settings.target_net_margin,
            target_dso: settings.target_dso,
            target_collection_rate: settings.target_collection_rate,
            min_cash_runway_months: settings.min_cash_runway_months,
            safe_cash_runway_months: settings.safe_cash_runway_months,
            cash_reserve_percentage: settings.cash_reserve_percentage,
            channel_commission_rates: settings.channel_commission_rates,
            forecast_confidence_level: settings.forecast_confidence_level,
            forecast_default_growth_rate: settings.forecast_default_growth_rate,
            forecast_collection_rate: settings.forecast_collection_rate,
            default_payment_terms_ar: settings.default_payment_terms_ar,
            default_payment_terms_ap: settings.default_payment_terms_ap,
            default_depreciation_years: settings.default_depreciation_years,
            vat_rate: settings.vat_rate,
            corporate_tax_rate: settings.corporate_tax_rate,
            custom_parameters: settings.custom_parameters,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formula-settings', tenantId] });
      toast.success('Đã lưu cài đặt công thức');
    },
    onError: (error) => {
      console.error('Error saving formula settings:', error);
      toast.error('Không thể lưu cài đặt. Vui lòng thử lại.');
    },
  });
}

export function useDefaultFormulaSettings() {
  return defaultSettings;
}
