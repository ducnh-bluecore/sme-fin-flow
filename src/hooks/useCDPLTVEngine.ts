/**
 * CDP LTV Engine Hooks - SSOT Compliant
 * 
 * Thin wrappers around database views and functions.
 * No client-side calculations - all logic in Postgres.
 * 
 * Refactored to Schema-per-Tenant architecture.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';

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
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp', 'ltv-models', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('cdp_ltv_model_assumptions')
        .select('*')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false });
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as LTVModelAssumption[];
    },
    enabled: !!tenantId && isReady,
  });
}

/**
 * Get the active LTV model
 */
export function useActiveLTVModel() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp', 'ltv-model-active', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      let query = client
        .from('cdp_ltv_model_assumptions')
        .select('*')
        .eq('is_active', true);
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as LTVModelAssumption | null;
    },
    enabled: !!tenantId && isReady,
  });
}

/**
 * Calculate LTV for all customers using the specified model
 */
export function useLTVCalculation(modelId?: string) {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp', 'ltv-calculation', tenantId, modelId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await client.rpc('cdp_calculate_customer_ltv', {
        p_tenant_id: tenantId,
        p_model_id: modelId || null,
        p_horizon_months: 24,
      });

      if (error) throw error;
      return (data || []) as LTVCalculation[];
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes - expensive calculation
  });
}

/**
 * Fetch LTV by cohort analysis
 */
export function useLTVByCohort() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp', 'ltv-by-cohort', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('v_cdp_ltv_by_cohort')
        .select('*')
        .order('cohort_month', { ascending: false })
        .limit(24);
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as LTVByCohort[];
    },
    enabled: !!tenantId && isReady,
  });
}

/**
 * Fetch LTV by acquisition source
 */
export function useLTVBySource() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp', 'ltv-by-source', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('v_cdp_ltv_by_source')
        .select('*')
        .order('avg_ltv_24m', { ascending: false });
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as LTVBySource[];
    },
    enabled: !!tenantId && isReady,
  });
}

/**
 * Fetch LTV summary for dashboard
 */
export function useLTVSummary() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp', 'ltv-summary', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      let query = client.from('v_cdp_ltv_summary').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as LTVSummary | null;
    },
    enabled: !!tenantId && isReady,
  });
}

/**
 * Fetch actual realized revenue (via View)
 * ARCHITECTURE: Hook → View → Table (v_cdp_orders_stats → cdp_orders)
 */
export function useRealizedRevenue() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp', 'realized-revenue', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      let query = client.from('v_cdp_orders_stats' as any).select('total_net_revenue, order_count');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      
      return {
        realized_revenue: Number((data as any)?.total_net_revenue) || 0,
        order_count: Number((data as any)?.order_count) || 0,
      };
    },
    enabled: !!tenantId && isReady,
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
  const { client, tenantId, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (input: CreateLTVModelInput) => {
      if (!tenantId) throw new Error('No tenant selected');

      // If setting as active, deactivate others first
      if (input.is_active) {
        let deactivateQuery = client
          .from('cdp_ltv_model_assumptions')
          .update({ is_active: false });
        if (shouldAddTenantFilter) {
          deactivateQuery = deactivateQuery.eq('tenant_id', tenantId);
        }
        await deactivateQuery;
      }

      const { data, error } = await client
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
  const { client, tenantId, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateLTVModelInput) => {
      if (!tenantId) throw new Error('No tenant selected');

      // If setting as active, deactivate others first
      if (input.is_active) {
        let deactivateQuery = client
          .from('cdp_ltv_model_assumptions')
          .update({ is_active: false })
          .neq('id', id);
        if (shouldAddTenantFilter) {
          deactivateQuery = deactivateQuery.eq('tenant_id', tenantId);
        }
        await deactivateQuery;
      }

      let updateQuery = client
        .from('cdp_ltv_model_assumptions')
        .update(input)
        .eq('id', id);
      if (shouldAddTenantFilter) {
        updateQuery = updateQuery.eq('tenant_id', tenantId);
      }
      const { data, error } = await updateQuery.select().single();

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
  const { client, tenantId, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant selected');

      let query = client
        .from('cdp_ltv_model_assumptions')
        .delete()
        .eq('id', id);
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { error } = await query;

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
  const { client, tenantId, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (modelId: string) => {
      if (!tenantId) throw new Error('No tenant selected');

      // Deactivate all models
      let deactivateQuery = client
        .from('cdp_ltv_model_assumptions')
        .update({ is_active: false });
      if (shouldAddTenantFilter) {
        deactivateQuery = deactivateQuery.eq('tenant_id', tenantId);
      }
      await deactivateQuery;

      // Activate the selected model
      let activateQuery = client
        .from('cdp_ltv_model_assumptions')
        .update({ is_active: true })
        .eq('id', modelId);
      if (shouldAddTenantFilter) {
        activateQuery = activateQuery.eq('tenant_id', tenantId);
      }
      const { data, error } = await activateQuery.select().single();

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
