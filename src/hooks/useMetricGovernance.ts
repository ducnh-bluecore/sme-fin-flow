import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useTenant';

export interface MetricDefinition {
  metric_code: string;
  metric_name: string;
  metric_name_vi: string;
  category: string;
  module: string;
  formula: string;
  source_view: string;
  unit: string;
  time_window: string | null;
}

export interface UnifiedMetric {
  tenant_id: string;
  module: string;
  metric_date: string;
  metric_code: string;
  value: number;
}

export interface ConsistencyCheck {
  metric_pair: string;
  source_a: string;
  value_a: number;
  source_b: string;
  value_b: number;
  deviation_percent: number;
  status: 'OK' | 'MISMATCH' | 'NO_DATA';
}

export interface GovernanceSummary {
  module: string;
  category: string;
  total_metrics: number;
  deprecated_metrics: number;
  violations_7d: number;
  critical_unresolved: number;
}

// Fetch metric registry
export function useMetricRegistry() {
  return useQuery({
    queryKey: ['metric-registry'],
    queryFn: async (): Promise<MetricDefinition[]> => {
      const { data, error } = await supabase
        .from('metric_registry')
        .select('*')
        .is('deprecation_date', null)
        .order('module', { ascending: true });

      if (error) {
        console.error('Error fetching metric registry:', error);
        return [];
      }

      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - registry rarely changes
  });
}

// Fetch unified metrics for tenant
export function useUnifiedMetrics() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['unified-metrics', tenantId],
    queryFn: async (): Promise<UnifiedMetric[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_unified_metrics' as any)
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching unified metrics:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        tenant_id: row.tenant_id,
        module: row.module,
        metric_date: row.metric_date,
        metric_code: row.metric_code,
        value: Number(row.value) || 0,
      }));
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Check metric consistency
export function useMetricConsistency() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['metric-consistency', tenantId],
    queryFn: async (): Promise<ConsistencyCheck[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .rpc('check_metric_consistency', { p_tenant_id: tenantId });

      if (error) {
        console.error('Error checking metric consistency:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        metric_pair: row.metric_pair,
        source_a: row.source_a,
        value_a: Number(row.value_a) || 0,
        source_b: row.source_b,
        value_b: Number(row.value_b) || 0,
        deviation_percent: Number(row.deviation_percent) || 0,
        status: row.status as 'OK' | 'MISMATCH' | 'NO_DATA',
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

// Governance dashboard summary
export function useGovernanceDashboard() {
  return useQuery({
    queryKey: ['governance-dashboard'],
    queryFn: async (): Promise<GovernanceSummary[]> => {
      const { data, error } = await supabase
        .from('v_governance_dashboard' as any)
        .select('*');

      if (error) {
        console.error('Error fetching governance dashboard:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        module: row.module,
        category: row.category,
        total_metrics: Number(row.total_metrics) || 0,
        deprecated_metrics: Number(row.deprecated_metrics) || 0,
        violations_7d: Number(row.violations_7d) || 0,
        critical_unresolved: Number(row.critical_unresolved) || 0,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Get single metric value - thin wrapper, NO calculations
export function useMetricValue(metricCode: string) {
  const { data: metrics } = useUnifiedMetrics();
  
  const metric = metrics?.find(m => m.metric_code === metricCode);
  return metric?.value ?? null;
}

// Validate metric is registered before use
export function useValidateMetric(metricCode: string) {
  const { data: registry } = useMetricRegistry();
  
  const definition = registry?.find(m => m.metric_code === metricCode);
  
  return {
    isValid: !!definition,
    definition,
    sourceView: definition?.source_view,
  };
}
