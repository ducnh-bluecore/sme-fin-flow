/**
 * CDP LTV Engine Hooks - SSOT Compliant
 * 
 * Thin wrappers around database views and functions.
 * No client-side calculations - all logic in Postgres.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

// ============ TYPES ============

export interface LTVModelAssumption {
  id: string;
  tenant_id: string;
  model_name: string;
  description: string | null;
  is_active: boolean;
  retention_year_1: number;
  retention_year_2: number;
  retention_year_3: number;
  retention_decay_rate: number;
  aov_growth_rate: number;
  discount_rate: number;
  risk_multiplier: number;
  margin_proxy: number;
  category_adjustments: Record<string, number>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface LTVCalculation {
  customer_id: string;
  customer_name: string;
  ltv_12m: number;
  ltv_24m: number;
  ltv_36m: number;
  base_value: number;
  retention_factor: number;
  aov_factor: number;
  discount_factor: number;
  risk_factor: number;
  confidence_score: number;
  calculation_method: string;
  order_count: number;
  first_order_date: string | null;
  last_order_date: string | null;
}

export interface LTVByCohort {
  tenant_id: string;
  cohort_month: string;
  cohort_size: number;
  avg_revenue: number;
  avg_profit: number;
  avg_orders: number;
  estimated_ltv_12m: number;
  estimated_ltv_24m: number;
  retention_rate_3m: number;
  retention_rate_6m: number;
  retention_rate_12m: number;
  ltv_trend_vs_prev: number;
  quality_score: 'high' | 'medium' | 'low';
}

export interface LTVBySource {
  tenant_id: string;
  acquisition_source: string;
  customer_count: number;
  avg_revenue: number;
  avg_profit: number;
  avg_orders: number;
  avg_ltv_12m: number;
  avg_ltv_24m: number;
  estimated_cac: number;
  ltv_cac_ratio: number | null;
  payback_months: number | null;
}

export interface LTVSummary {
  tenant_id: string;
  total_customers: number;
  total_equity_12m: number;
  total_equity_24m: number;
  avg_ltv_12m: number;
  avg_ltv_24m: number;
  median_ltv_12m: number;
  median_ltv_24m: number;
  at_risk_equity: number;
  at_risk_count: number;
  platinum_count: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
}

// ============ HOOKS ============

/**
 * Fetch all LTV models for the tenant
 */
export function useLTVModels() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp', 'ltv-models', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('cdp_ltv_model_assumptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as LTVModelAssumption[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Get the active LTV model
 */
export function useActiveLTVModel() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp', 'ltv-model-active', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('cdp_ltv_model_assumptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as LTVModelAssumption | null;
    },
    enabled: !!tenantId,
  });
}

/**
 * Calculate LTV for all customers using the specified model
 */
export function useLTVCalculation(modelId?: string) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp', 'ltv-calculation', tenantId, modelId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase.rpc('cdp_calculate_customer_ltv', {
        p_tenant_id: tenantId,
        p_model_id: modelId || null,
        p_horizon_months: 24,
      });

      if (error) throw error;
      return (data || []) as LTVCalculation[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes - expensive calculation
  });
}

/**
 * Fetch LTV by cohort analysis
 */
export function useLTVByCohort() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp', 'ltv-by-cohort', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_cdp_ltv_by_cohort')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('cohort_month', { ascending: false })
        .limit(24); // Last 24 months

      if (error) throw error;
      return (data || []) as LTVByCohort[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Fetch LTV by acquisition source
 */
export function useLTVBySource() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp', 'ltv-by-source', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_cdp_ltv_by_source')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('avg_ltv_24m', { ascending: false });

      if (error) throw error;
      return (data || []) as LTVBySource[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Fetch LTV summary for dashboard
 */
export function useLTVSummary() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp', 'ltv-summary', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('v_cdp_ltv_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as LTVSummary | null;
    },
    enabled: !!tenantId,
  });
}

/**
 * Fetch actual realized revenue from cdp_orders (ALL TIME - not just 12 months)
 * This is the REAL revenue already collected from customers, not projected
 * Used to calculate: Còn lại = Equity - Đã thu
 */
export function useRealizedRevenue() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp', 'realized-revenue', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      // Get ALL actual revenue from orders (total collected from these customers)
      // Use order_at (correct column name, not order_date)
      const { data, error } = await supabase
        .from('cdp_orders')
        .select('net_revenue')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      const totalRealized = (data || []).reduce((sum, order) => 
        sum + (order.net_revenue || 0), 0
      );
      
      return {
        realized_revenue: totalRealized,
        order_count: data?.length || 0
      };
    },
    enabled: !!tenantId,
  });
}

// ============ MUTATIONS ============

export interface CreateLTVModelInput {
  model_name: string;
  description?: string;
  is_active?: boolean;
  retention_year_1?: number;
  retention_year_2?: number;
  retention_year_3?: number;
  aov_growth_rate?: number;
  discount_rate?: number;
  risk_multiplier?: number;
  margin_proxy?: number;
}

export interface UpdateLTVModelInput extends Partial<CreateLTVModelInput> {
  id: string;
}

/**
 * Create a new LTV model
 */
export function useCreateLTVModel() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (input: CreateLTVModelInput) => {
      if (!tenantId) throw new Error('No tenant selected');

      // If setting as active, deactivate others first
      if (input.is_active) {
        await supabase
          .from('cdp_ltv_model_assumptions')
          .update({ is_active: false })
          .eq('tenant_id', tenantId);
      }

      const { data, error } = await supabase
        .from('cdp_ltv_model_assumptions')
        .insert({
          ...input,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LTVModelAssumption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp', 'ltv-models'] });
      queryClient.invalidateQueries({ queryKey: ['cdp', 'ltv-model-active'] });
      queryClient.invalidateQueries({ queryKey: ['cdp', 'ltv-calculation'] });
    },
  });
}

/**
 * Update an existing LTV model
 */
export function useUpdateLTVModel() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateLTVModelInput) => {
      if (!tenantId) throw new Error('No tenant selected');

      // If setting as active, deactivate others first
      if (input.is_active) {
        await supabase
          .from('cdp_ltv_model_assumptions')
          .update({ is_active: false })
          .eq('tenant_id', tenantId)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('cdp_ltv_model_assumptions')
        .update(input)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as LTVModelAssumption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp', 'ltv-models'] });
      queryClient.invalidateQueries({ queryKey: ['cdp', 'ltv-model-active'] });
      queryClient.invalidateQueries({ queryKey: ['cdp', 'ltv-calculation'] });
    },
  });
}

/**
 * Delete an LTV model
 */
export function useDeleteLTVModel() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { error } = await supabase
        .from('cdp_ltv_model_assumptions')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp', 'ltv-models'] });
      queryClient.invalidateQueries({ queryKey: ['cdp', 'ltv-model-active'] });
    },
  });
}

/**
 * Set a model as active
 */
export function useSetActiveModel() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (modelId: string) => {
      if (!tenantId) throw new Error('No tenant selected');

      // Deactivate all models
      await supabase
        .from('cdp_ltv_model_assumptions')
        .update({ is_active: false })
        .eq('tenant_id', tenantId);

      // Activate the selected model
      const { data, error } = await supabase
        .from('cdp_ltv_model_assumptions')
        .update({ is_active: true })
        .eq('id', modelId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as LTVModelAssumption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp', 'ltv-models'] });
      queryClient.invalidateQueries({ queryKey: ['cdp', 'ltv-model-active'] });
      queryClient.invalidateQueries({ queryKey: ['cdp', 'ltv-calculation'] });
    },
  });
}
