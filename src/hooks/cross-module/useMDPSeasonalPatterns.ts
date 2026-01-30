/**
 * useMDPSeasonalPatterns
 * 
 * Hook to manage seasonal patterns from MDP for FDP consumption.
 * Part of Case 9: MDP → FDP flow.
 * 
 * Refactored to Schema-per-Tenant architecture.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/hooks/useTenantSupabase';
import {
  CrossModuleData,
  ConfidenceLevel,
  createCrossModuleData,
} from '@/types/cross-module';
import { toast } from 'sonner';

interface SeasonalAdjustment {
  patternType: string;
  periodKey: string;
  revenueMultiplier: number;
  orderMultiplier: number;
  confidenceScore: number;
}

interface SeasonalAdjustmentRPC {
  pattern_type: string;
  period_key: string;
  revenue_multiplier: number;
  order_multiplier: number;
  confidence_score: number;
  confidence_level: string;
  data_source: string;
  is_cross_module: boolean;
}

/**
 * Get seasonal adjustments for FDP forecasting
 */
export function useFDPSeasonalAdjustments(targetMonth?: number) {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();
  const month = targetMonth ?? new Date().getMonth() + 1;

  return useQuery<CrossModuleData<SeasonalAdjustment[]>>({
    queryKey: ['fdp-seasonal-adjustments', tenantId, month],
    queryFn: async () => {
      if (!tenantId) {
        return createCrossModuleData<SeasonalAdjustment[]>(
          [{ patternType: 'default', periodKey: String(month).padStart(2, '0'), revenueMultiplier: 1.0, orderMultiplier: 1.0, confidenceScore: 0.3 }],
          'ESTIMATED',
          'no_tenant',
          false
        );
      }

      const { data, error } = await client.rpc('fdp_get_seasonal_adjustments' as any, {
        p_tenant_id: tenantId,
        p_target_month: month,
      });

      if (error) {
        console.error('Error fetching seasonal adjustments:', error);
        return createCrossModuleData<SeasonalAdjustment[]>(
          [{ patternType: 'default', periodKey: String(month).padStart(2, '0'), revenueMultiplier: 1.0, orderMultiplier: 1.0, confidenceScore: 0.3 }],
          'ESTIMATED',
          'error_fallback',
          false
        );
      }

      const results = (data ?? []) as SeasonalAdjustmentRPC[];

      if (results.length === 0) {
        return createCrossModuleData<SeasonalAdjustment[]>(
          [{ patternType: 'default', periodKey: String(month).padStart(2, '0'), revenueMultiplier: 1.0, orderMultiplier: 1.0, confidenceScore: 0.3 }],
          'ESTIMATED',
          'no_data',
          false
        );
      }

      const adjustments = results.map((r) => ({
        patternType: r.pattern_type,
        periodKey: r.period_key,
        revenueMultiplier: r.revenue_multiplier ?? 1.0,
        orderMultiplier: r.order_multiplier ?? 1.0,
        confidenceScore: r.confidence_score ?? 0.3,
      }));

      // Use the highest confidence level from all patterns
      const confidenceLevel = results.some((r) => r.confidence_level === 'LOCKED')
        ? 'LOCKED'
        : results.some((r) => r.confidence_level === 'OBSERVED')
        ? 'OBSERVED'
        : 'ESTIMATED';

      return createCrossModuleData<SeasonalAdjustment[]>(
        adjustments,
        confidenceLevel as ConfidenceLevel,
        results[0]?.data_source ?? 'unknown',
        results[0]?.is_cross_module ?? false,
        results[0]?.is_cross_module ? 'MDP' : undefined
      );
    },
    enabled: !!tenantId && isReady,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

interface PushPatternParams {
  patternType: 'monthly' | 'weekly' | 'event' | 'campaign';
  periodKey: string;
  revenueMultiplier: number;
  orderMultiplier?: number;
  confidenceScore?: number;
  sampleSize?: number;
}

/**
 * Push seasonal pattern from MDP to FDP
 */
export function usePushSeasonalToFDP() {
  const { client, tenantId } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PushPatternParams) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await client.rpc('mdp_push_seasonal_to_fdp' as any, {
        p_tenant_id: tenantId,
        p_pattern_type: params.patternType,
        p_period_key: params.periodKey,
        p_revenue_multiplier: params.revenueMultiplier,
        p_order_multiplier: params.orderMultiplier ?? 1.0,
        p_confidence_score: params.confidenceScore ?? 0.5,
        p_sample_size: params.sampleSize ?? 0,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdp-seasonal-adjustments'] });
      toast.success('Đã đồng bộ mẫu thời vụ sang FDP');
    },
    onError: (error) => {
      console.error('Failed to push seasonal pattern:', error);
      toast.error('Lỗi khi đồng bộ mẫu thời vụ');
    },
  });
}

/**
 * Get all seasonal patterns for management
 */
export function useMDPAllSeasonalPatterns() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['mdp-all-seasonal-patterns', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('mdp_seasonal_patterns' as any)
        .select('*')
        .eq('is_active', true)
        .order('pattern_type', { ascending: true })
        .order('period_key', { ascending: true });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching seasonal patterns:', error);
        return [];
      }

      return (data ?? []) as unknown as Array<{
        id: string;
        pattern_type: string;
        period_key: string;
        revenue_multiplier: number;
        order_multiplier: number;
        confidence_score: number;
        sample_size: number;
        created_at: string;
      }>;
    },
    enabled: !!tenantId && isReady,
  });
}
