/**
 * useCDPChurnSignals
 * 
 * Hook to manage churn signals from CDP for MDP consumption.
 * Part of Case 4: CDP → MDP flow.
 * 
 * Migrated to Schema-per-Tenant architecture v1.4.1.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

interface ChurnSignal {
  signalId: string;
  customerId: string;
  customerSegment: string;
  churnProbability: number;
  daysInactive: number;
  ltvAtRisk: number;
  recommendedAction: 'WINBACK' | 'RETENTION' | 'VIP_SAVE';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface ChurnSignalRow {
  signal_id: string;
  customer_id: string;
  customer_segment: string;
  churn_probability: number;
  days_inactive: number;
  ltv_at_risk: number;
  recommended_action: string;
  urgency_level: string;
}

function mapRowToSignal(row: ChurnSignalRow): ChurnSignal {
  return {
    signalId: row.signal_id,
    customerId: row.customer_id,
    customerSegment: row.customer_segment ?? 'unknown',
    churnProbability: row.churn_probability ?? 0,
    daysInactive: row.days_inactive ?? 0,
    ltvAtRisk: row.ltv_at_risk ?? 0,
    recommendedAction: (row.recommended_action as ChurnSignal['recommendedAction']) ?? 'RETENTION',
    urgencyLevel: (row.urgency_level as ChurnSignal['urgencyLevel']) ?? 'medium',
  };
}

interface UseChurnSignalsOptions {
  minUrgency?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Get churn signals for MDP consumption
 */
export function useMDPChurnSignals(options: UseChurnSignalsOptions = {}) {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();
  const { minUrgency = 'low' } = options;

  return useQuery<ChurnSignal[]>({
    queryKey: ['mdp-churn-signals', tenantId, minUrgency],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await callRpc('mdp_get_churn_signals', {
        p_tenant_id: tenantId,
        p_min_urgency: minUrgency,
      });

      if (error) {
        console.error('Error fetching churn signals:', error);
        return [];
      }

      return ((data ?? []) as unknown as ChurnSignalRow[]).map(mapRowToSignal);
    },
    enabled: !!tenantId && isReady,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Generate new churn signals from CDP data
 */
export function useGenerateChurnSignals() {
  const { callRpc, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await callRpc('cdp_generate_churn_signals', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['mdp-churn-signals'] });
      if (count > 0) {
        toast.success(`Đã phát hiện ${count} tín hiệu churn mới`);
      }
    },
    onError: (error) => {
      console.error('Failed to generate churn signals:', error);
      toast.error('Lỗi khi phân tích churn');
    },
  });
}

/**
 * Get churn signal statistics
 */
export function useChurnSignalStats() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['churn-signal-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await buildSelectQuery('cdp_churn_signals', 'urgency_level, ltv_at_risk, consumed_by_mdp')
        .eq('consumed_by_mdp', false);

      if (error) {
        console.error('Error fetching churn stats:', error);
        return null;
      }

      const rows = (data ?? []) as unknown as Array<{
        urgency_level: string;
        ltv_at_risk: number | null;
        consumed_by_mdp: boolean;
      }>;

      return {
        totalSignals: rows.length,
        criticalCount: rows.filter((r) => r.urgency_level === 'critical').length,
        highCount: rows.filter((r) => r.urgency_level === 'high').length,
        totalLtvAtRisk: rows.reduce((sum, r) => sum + (r.ltv_at_risk ?? 0), 0),
      };
    },
    enabled: !!tenantId && isReady,
  });
}
