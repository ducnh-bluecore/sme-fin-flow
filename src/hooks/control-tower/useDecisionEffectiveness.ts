/**
 * useDecisionEffectiveness
 * 
 * Hook to fetch decision effectiveness metrics.
 * Part of Control Tower - Learning Loop.
 * 
 * Migrated to Schema-per-Tenant architecture v1.4.1.
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface EffectivenessByModule {
  decision_type: string;
  total_decisions: number;
  successful_count: number;
  failed_count: number;
  pending_count: number;
  success_rate: number;
  avg_accuracy: number;
  total_actual_value: number;
  total_predicted_value: number;
}

export interface EffectivenessSummary {
  totalDecisions: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  overallSuccessRate: number;
  overallAccuracy: number;
  totalROI: number;
  byModule: EffectivenessByModule[];
}

export function useDecisionEffectiveness(period: '7d' | '30d' | '90d' = '30d') {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['decision-effectiveness', tenantId, period],
    queryFn: async (): Promise<EffectivenessSummary> => {
      if (!tenantId) {
        return getEmptySummary();
      }

      // Fetch from effectiveness view using buildSelectQuery (auto-translates table, auto-filters)
      const { data, error } = await buildSelectQuery('v_decision_effectiveness', '*');

      if (error) {
        console.error('Error fetching effectiveness:', error);
        return getEmptySummary();
      }

      if (!data || data.length === 0) {
        return getEmptySummary();
      }

      // Aggregate across modules
      const byModule: EffectivenessByModule[] = data.map((row: any) => ({
        decision_type: row.decision_type,
        total_decisions: Number(row.total_decisions) || 0,
        successful_count: Number(row.successful_count) || 0,
        failed_count: Number(row.failed_count) || 0,
        pending_count: Number(row.pending_count) || 0,
        success_rate: Number(row.success_rate) || 0,
        avg_accuracy: Number(row.avg_accuracy) || 0,
        total_actual_value: Number(row.total_actual_value) || 0,
        total_predicted_value: Number(row.total_predicted_value) || 0,
      }));

      let totalDecisions = 0, successfulCount = 0, failedCount = 0, pendingCount = 0, totalROI = 0, accuracySum = 0;
      for (const m of byModule) {
        totalDecisions += m.total_decisions;
        successfulCount += m.successful_count;
        failedCount += m.failed_count;
        pendingCount += m.pending_count;
        totalROI += m.total_actual_value;
        accuracySum += m.avg_accuracy;
      }

      const overallSuccessRate = totalDecisions > 0 
        ? (successfulCount / totalDecisions) * 100 
        : 0;
      
      const overallAccuracy = byModule.length > 0
        ? accuracySum / byModule.length
        : 0;

      return {
        totalDecisions,
        successfulCount,
        failedCount,
        pendingCount,
        overallSuccessRate,
        overallAccuracy,
        totalROI,
        byModule,
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000, // 1 minute
  });
}

function getEmptySummary(): EffectivenessSummary {
  return {
    totalDecisions: 0,
    successfulCount: 0,
    failedCount: 0,
    pendingCount: 0,
    overallSuccessRate: 0,
    overallAccuracy: 0,
    totalROI: 0,
    byModule: [],
  };
}
