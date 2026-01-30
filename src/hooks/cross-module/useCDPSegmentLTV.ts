/**
 * useCDPSegmentLTV
 * 
 * Hook to manage segment LTV data from CDP for MDP budget allocation.
 * Part of Case 3: CDP → MDP flow.
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

interface SegmentLTV {
  segmentName: string;
  segmentType: string;
  customerCount: number;
  avgLtv: number;
  totalEquity: number;
  recommendedCacCeiling: number;
  priorityScore: number;
}

interface SegmentLTVRPC {
  segment_name: string;
  segment_type: string;
  customer_count: number;
  avg_ltv: number;
  total_equity: number;
  recommended_cac_ceiling: number;
  priority_score: number;
  confidence_level: string;
  data_source: string;
  is_cross_module: boolean;
}

interface UseMDPSegmentLTVOptions {
  segmentType?: 'tier' | 'rfm' | 'custom' | 'cohort';
}

/**
 * Get segment LTV for MDP budget allocation
 */
export function useMDPSegmentLTV(options: UseMDPSegmentLTVOptions = {}) {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();
  const { segmentType } = options;

  return useQuery<CrossModuleData<SegmentLTV[]>>({
    queryKey: ['mdp-segment-ltv', tenantId, segmentType],
    queryFn: async () => {
      if (!tenantId) {
        return createCrossModuleData<SegmentLTV[]>(
          [],
          'ESTIMATED',
          'no_tenant',
          false
        );
      }

      const { data, error } = await client.rpc('mdp_get_segment_ltv' as any, {
        p_tenant_id: tenantId,
        p_segment_type: segmentType ?? null,
      });

      if (error) {
        console.error('Error fetching segment LTV:', error);
        return createCrossModuleData<SegmentLTV[]>(
          [],
          'ESTIMATED',
          'error_fallback',
          false
        );
      }

      const results = (data ?? []) as SegmentLTVRPC[];

      if (results.length === 0) {
        return createCrossModuleData<SegmentLTV[]>(
          [],
          'ESTIMATED',
          'no_data',
          false
        );
      }

      const segments = results.map((r) => ({
        segmentName: r.segment_name,
        segmentType: r.segment_type,
        customerCount: r.customer_count ?? 0,
        avgLtv: r.avg_ltv ?? 0,
        totalEquity: r.total_equity ?? 0,
        recommendedCacCeiling: r.recommended_cac_ceiling ?? 0,
        priorityScore: r.priority_score ?? 50,
      }));

      const confidenceLevel = results.some((r) => r.confidence_level === 'LOCKED')
        ? 'LOCKED'
        : results.some((r) => r.confidence_level === 'OBSERVED')
        ? 'OBSERVED'
        : 'ESTIMATED';

      return createCrossModuleData<SegmentLTV[]>(
        segments,
        confidenceLevel as ConfidenceLevel,
        results[0]?.data_source ?? 'unknown',
        results[0]?.is_cross_module ?? false,
        results[0]?.is_cross_module ? 'CDP' : undefined
      );
    },
    enabled: !!tenantId && isReady,
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Push segment LTV from CDP to MDP
 */
export function usePushSegmentLTVToMDP() {
  const { client, tenantId } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await client.rpc('cdp_push_segment_ltv_to_mdp' as any, {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['mdp-segment-ltv'] });
      toast.success(`Đã đồng bộ ${count} phân khúc LTV sang MDP`);
    },
    onError: (error) => {
      console.error('Failed to push segment LTV:', error);
      toast.error('Lỗi khi đồng bộ LTV phân khúc');
    },
  });
}

/**
 * Get all segment LTV records for management
 */
export function useCDPAllSegmentLTV() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-all-segment-ltv', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('cdp_segment_ltv_for_mdp' as any)
        .select('*')
        .order('priority_score', { ascending: false });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching all segment LTV:', error);
        return [];
      }

      return (data ?? []) as unknown as Array<{
        id: string;
        segment_name: string;
        segment_type: string;
        customer_count: number;
        avg_ltv: number;
        total_equity: number;
        recommended_cac_ceiling: number;
        priority_score: number;
        valid_from: string;
        synced_at: string;
      }>;
    },
    enabled: !!tenantId && isReady,
  });
}
