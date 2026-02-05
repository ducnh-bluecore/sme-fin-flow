/**
 * useKPIDefinitions - Manage KPI metadata and definitions
 * 
 * Part of Architecture v1.4.1 - Layer 3 (KPI)
 * 
 * @architecture Schema-per-Tenant Ready
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '../useTenantQueryBuilder';

// =====================================================
// Types
// =====================================================

export interface KPIDefinition {
  id: string;
  tenant_id: string;
  kpi_code: string;
  kpi_name: string;
  description: string | null;
  category: string;
  domain: 'fdp' | 'mdp' | 'cdp' | 'ops' | 'control_tower';
  calculation_type: 'sum' | 'average' | 'ratio' | 'count' | 'custom';
  formula: string | null;
  source_table: string | null;
  source_column: string | null;
  unit: string;
  precision: number;
  direction: 'higher_better' | 'lower_better' | 'target';
  is_enabled: boolean;
  display_order: number;
  thresholds: KPIThresholds | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface KPIThresholds {
  warning_low?: number;
  warning_high?: number;
  critical_low?: number;
  critical_high?: number;
  target?: number;
}

export interface KPICategory {
  category: string;
  domain: string;
  kpi_count: number;
}

// =====================================================
// Hooks
// =====================================================

/**
 * Fetch all KPI definitions for current tenant
 */
export function useKPIDefinitions(options?: {
  domain?: KPIDefinition['domain'];
  category?: string;
  isEnabled?: boolean;
}) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { domain, category, isEnabled } = options ?? {};

  return useQuery({
    queryKey: ['kpi-definitions', tenantId, domain, category, isEnabled],
    queryFn: async () => {
      let query = buildSelectQuery('kpi_definitions', '*')
        .order('display_order', { ascending: true })
        .order('kpi_name', { ascending: true });

      if (domain) {
        query = query.eq('domain', domain);
      }
      if (category) {
        query = query.eq('category', category);
      }
      if (isEnabled !== undefined) {
        query = query.eq('is_enabled', isEnabled);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return (data as unknown) as KPIDefinition[];
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes - definitions don't change often
  });
}

/**
 * Get KPI definition by code
 */
export function useKPIDefinitionByCode(kpiCode?: string) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['kpi-definition', kpiCode, tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('kpi_definitions', '*')
        .eq('kpi_code', kpiCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return (data as unknown) as KPIDefinition;
    },
    enabled: isReady && !!tenantId && !!kpiCode,
  });
}

/**
 * Get available KPI categories
 */
export function useKPICategories() {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['kpi-categories', tenantId],
    queryFn: async () => {
      const { data, error } = await callRpc<KPICategory[]>(
        'get_kpi_categories',
        { p_tenant_id: tenantId }
      );

      if (error) {
        console.warn('[useKPICategories] RPC not available');
        return [];
      }

      return data ?? [];
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new KPI definition
 */
export function useCreateKPIDefinition() {
  const queryClient = useQueryClient();
  const { buildInsertQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (input: Omit<KPIDefinition, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await buildInsertQuery('kpi_definitions', {
        kpi_code: input.kpi_code,
        kpi_name: input.kpi_name,
        description: input.description,
        category: input.category,
        domain: input.domain,
        calculation_type: input.calculation_type,
        formula: input.formula,
        source_table: input.source_table,
        source_column: input.source_column,
        unit: input.unit,
        precision: input.precision,
        direction: input.direction,
        is_enabled: input.is_enabled ?? true,
        display_order: input.display_order ?? 0,
        thresholds: input.thresholds,
        metadata: input.metadata,
      })
        .select()
        .single();

      if (error) throw error;
      return (data as unknown) as KPIDefinition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-definitions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-categories', tenantId] });
    },
  });
}

/**
 * Update a KPI definition
 */
export function useUpdateKPIDefinition() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KPIDefinition> & { id: string }) => {
      const { data, error } = await buildUpdateQuery('kpi_definitions', {
        ...updates,
        updated_at: new Date().toISOString(),
      })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return (data as unknown) as KPIDefinition;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-definitions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-definition', data.kpi_code, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-categories', tenantId] });
    },
  });
}

/**
 * Toggle KPI enabled status
 */
export function useToggleKPIDefinition() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, buildSelectQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get current status
      const { data: current } = await buildSelectQuery('kpi_definitions', 'is_enabled')
        .eq('id', id)
        .single();
      
      const newStatus = !(current as any)?.is_enabled;

      const { data, error } = await buildUpdateQuery('kpi_definitions', {
        is_enabled: newStatus,
        updated_at: new Date().toISOString(),
      })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return (data as unknown) as KPIDefinition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-definitions', tenantId] });
    },
  });
}

/**
 * Delete a KPI definition
 */
export function useDeleteKPIDefinition() {
  const queryClient = useQueryClient();
  const { buildDeleteQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await buildDeleteQuery('kpi_definitions')
        .eq('id', id);

      if (error) throw error;
      return { success: true, id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-definitions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-categories', tenantId] });
    },
  });
}
