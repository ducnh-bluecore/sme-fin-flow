/**
 * useStoreKpiTargets - CRUD for store_kpi_targets table
 * Compare actual KPIs (from useStoreCustomerKpis) vs targets
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { format } from 'date-fns';

export interface StoreKpiTarget {
  id: string;
  tenant_id: string;
  store_id: string;
  period_type: string;
  period_value: string;
  revenue_target: number;
  orders_target: number;
  customers_target: number;
  aov_target: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreKpiComparison {
  target: StoreKpiTarget | null;
  actual: {
    revenue: number;
    orders: number;
    customers: number;
    aov: number;
  };
  variance: {
    revenue: number | null;
    orders: number | null;
    customers: number | null;
    aov: number | null;
  };
  status: 'on_track' | 'at_risk' | 'behind' | 'exceeded' | 'no_target';
}

function getStatus(pct: number | null): StoreKpiComparison['status'] {
  if (pct === null) return 'no_target';
  if (pct >= 100) return 'exceeded';
  if (pct >= 80) return 'on_track';
  if (pct >= 60) return 'at_risk';
  return 'behind';
}

export function getCurrentPeriodValue(): string {
  return format(new Date(), 'yyyy-MM');
}

/**
 * Fetch KPI target for a specific store + period
 */
export function useStoreKpiTarget(storeId: string | null, periodValue?: string) {
  const { tenantId, isReady } = useTenantQueryBuilder();
  const period = periodValue || getCurrentPeriodValue();

  return useQuery({
    queryKey: ['store-kpi-target', tenantId, storeId, period],
    queryFn: async () => {
      if (!tenantId || !storeId) return null;

      const { data, error } = await supabase
        .from('store_kpi_targets' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('store_id', storeId)
        .eq('period_type', 'monthly')
        .eq('period_value', period)
        .maybeSingle();

      if (error) {
        console.error('[useStoreKpiTarget]', error);
        return null;
      }
      return data as unknown as StoreKpiTarget | null;
    },
    enabled: isReady && !!tenantId && !!storeId,
    staleTime: 60000,
  });
}

/**
 * Fetch all targets for a store (all periods)
 */
export function useStoreKpiTargetHistory(storeId: string | null) {
  const { tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['store-kpi-target-history', tenantId, storeId],
    queryFn: async () => {
      if (!tenantId || !storeId) return [];

      const { data, error } = await supabase
        .from('store_kpi_targets' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('store_id', storeId)
        .order('period_value', { ascending: false })
        .limit(12);

      if (error) {
        console.error('[useStoreKpiTargetHistory]', error);
        return [];
      }
      return (data as unknown) as StoreKpiTarget[];
    },
    enabled: isReady && !!tenantId && !!storeId,
    staleTime: 60000,
  });
}

/**
 * Upsert a KPI target for a store + period
 */
export function useUpsertStoreKpiTarget() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (input: {
      store_id: string;
      period_value?: string;
      revenue_target: number;
      orders_target: number;
      customers_target: number;
      aov_target: number;
      notes?: string;
    }) => {
      if (!tenantId) throw new Error('No tenant');

      const period = input.period_value || getCurrentPeriodValue();
      const { data, error } = await supabase
        .from('store_kpi_targets' as any)
        .upsert({
          tenant_id: tenantId,
          store_id: input.store_id,
          period_type: 'monthly',
          period_value: period,
          revenue_target: input.revenue_target,
          orders_target: input.orders_target,
          customers_target: input.customers_target,
          aov_target: input.aov_target,
          notes: input.notes || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,store_id,period_type,period_value' })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as StoreKpiTarget;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['store-kpi-target', tenantId, variables.store_id] });
      queryClient.invalidateQueries({ queryKey: ['store-kpi-target-history', tenantId, variables.store_id] });
    },
  });
}

/**
 * Compare actual KPIs vs target → variance + status
 */
export function computeKpiComparison(
  target: StoreKpiTarget | null | undefined,
  actual: { revenue: number; orders: number; customers: number; aov: number }
): StoreKpiComparison {
  if (!target) {
    return { target: null, actual, variance: { revenue: null, orders: null, customers: null, aov: null }, status: 'no_target' };
  }

  const revPct = target.revenue_target > 0 ? (actual.revenue / target.revenue_target) * 100 : null;
  const ordPct = target.orders_target > 0 ? (actual.orders / target.orders_target) * 100 : null;
  const custPct = target.customers_target > 0 ? (actual.customers / target.customers_target) * 100 : null;
  const aovPct = target.aov_target > 0 ? (actual.aov / target.aov_target) * 100 : null;

  // Overall status based on revenue (primary KPI)
  const status = getStatus(revPct);

  return {
    target,
    actual,
    variance: { revenue: revPct, orders: ordPct, customers: custPct, aov: aovPct },
    status,
  };
}
