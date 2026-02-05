/**
 * useKPITargets - Track KPI targets vs actual values
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

export interface KPITarget {
  id: string;
  tenant_id: string;
  kpi_code: string;
  kpi_name?: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period_value: string; // e.g., "2024-01", "2024-Q1", "2024"
  target_value: number;
  actual_value?: number;
  variance?: number;
  variance_percent?: number;
  status?: 'on_track' | 'at_risk' | 'behind' | 'exceeded';
  owner_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface KPITargetWithComparison extends KPITarget {
  actual_value: number;
  variance: number;
  variance_percent: number;
  status: 'on_track' | 'at_risk' | 'behind' | 'exceeded';
}

// =====================================================
// Hooks
// =====================================================

/**
 * Fetch KPI targets for current tenant
 */
export function useKPITargets(options?: {
  kpiCode?: string;
  periodType?: KPITarget['period_type'];
  periodValue?: string;
}) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { kpiCode, periodType, periodValue } = options ?? {};

  return useQuery({
    queryKey: ['kpi-targets', tenantId, kpiCode, periodType, periodValue],
    queryFn: async () => {
      let query = buildSelectQuery('kpi_targets', '*')
        .order('period_value', { ascending: false });

      if (kpiCode) {
        query = query.eq('kpi_code', kpiCode);
      }
      if (periodType) {
        query = query.eq('period_type', periodType);
      }
      if (periodValue) {
        query = query.eq('period_value', periodValue);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data as unknown) as KPITarget[];
    },
    enabled: isReady && !!tenantId,
    staleTime: 60000,
  });
}

/**
 * Get targets with actual values compared
 */
export function useKPITargetsWithActuals(periodType: KPITarget['period_type'] = 'monthly') {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['kpi-targets-with-actuals', tenantId, periodType],
    queryFn: async () => {
      const { data, error } = await callRpc<KPITargetWithComparison[]>(
        'get_kpi_targets_with_actuals',
        { 
          p_tenant_id: tenantId,
          p_period_type: periodType,
        }
      );

      if (error) {
        console.warn('[useKPITargetsWithActuals] RPC not available, returning empty');
        return [];
      }

      return data ?? [];
    },
    enabled: isReady && !!tenantId,
    staleTime: 60000,
  });
}

/**
 * Get a single KPI target
 */
export function useKPITarget(targetId?: string) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['kpi-target', targetId, tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('kpi_targets', '*')
        .eq('id', targetId)
        .single();

      if (error) throw error;
      return (data as unknown) as KPITarget;
    },
    enabled: isReady && !!tenantId && !!targetId,
  });
}

/**
 * Create a new KPI target
 */
export function useCreateKPITarget() {
  const queryClient = useQueryClient();
  const { buildInsertQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (input: {
      kpi_code: string;
      period_type: KPITarget['period_type'];
      period_value: string;
      target_value: number;
      owner_id?: string;
      notes?: string;
    }) => {
      const { data, error } = await buildInsertQuery('kpi_targets', {
        kpi_code: input.kpi_code,
        period_type: input.period_type,
        period_value: input.period_value,
        target_value: input.target_value,
        owner_id: input.owner_id ?? null,
        notes: input.notes ?? null,
      })
        .select()
        .single();

      if (error) throw error;
      return (data as unknown) as KPITarget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-targets-with-actuals', tenantId] });
    },
  });
}

/**
 * Update a KPI target
 */
export function useUpdateKPITarget() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KPITarget> & { id: string }) => {
      const { data, error } = await buildUpdateQuery('kpi_targets', {
        ...updates,
        updated_at: new Date().toISOString(),
      })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return (data as unknown) as KPITarget;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-target', data.id, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-targets-with-actuals', tenantId] });
    },
  });
}

/**
 * Delete a KPI target
 */
export function useDeleteKPITarget() {
  const queryClient = useQueryClient();
  const { buildDeleteQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await buildDeleteQuery('kpi_targets')
        .eq('id', id);

      if (error) throw error;
      return { success: true, id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-targets-with-actuals', tenantId] });
    },
  });
}

/**
 * Bulk upsert KPI targets
 */
export function useBulkUpsertKPITargets() {
  const queryClient = useQueryClient();
  const { client, tenantId, getActualTableName } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (targets: Array<{
      kpi_code: string;
      period_type: KPITarget['period_type'];
      period_value: string;
      target_value: number;
    }>) => {
      const actualTable = getActualTableName('kpi_targets');
      const now = new Date().toISOString();

      const rows = targets.map(t => ({
        tenant_id: tenantId,
        kpi_code: t.kpi_code,
        period_type: t.period_type,
        period_value: t.period_value,
        target_value: t.target_value,
        updated_at: now,
      }));

      const { data, error } = await client
        .from(actualTable as any)
        .upsert(rows, {
          onConflict: 'tenant_id,kpi_code,period_type,period_value',
        })
        .select();

      if (error) throw error;
      return (data as unknown) as KPITarget[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-targets-with-actuals', tenantId] });
    },
  });
}
