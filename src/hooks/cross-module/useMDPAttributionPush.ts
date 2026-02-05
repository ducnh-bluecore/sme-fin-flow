/**
 * useMDPAttributionPush
 * 
 * Hook to push MDP attribution data to CDP for CAC calculation.
 * Part of Case 5: MDP → CDP flow.
 * 
 * @architecture Schema-per-Tenant v1.4.1
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

interface AttributionData {
  cohortMonth: string; // Format: YYYY-MM
  sourceChannel: string;
  totalSpend: number;
  newCustomers: number;
}

export function usePushAttributionToCDP() {
  const { callRpc, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AttributionData) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: result, error } = await callRpc('mdp_push_attribution_to_cdp', {
        p_tenant_id: tenantId,
        p_cohort_month: data.cohortMonth,
        p_source_channel: data.sourceChannel,
        p_total_spend: data.totalSpend,
        p_new_customers: data.newCustomers,
      });

      if (error) throw error;
      return result as unknown as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp-cohort-cac'] });
      queryClient.invalidateQueries({ queryKey: ['cdp-ltv-cac-ratio'] });
      toast.success('Đã đồng bộ dữ liệu attribution sang CDP');
    },
    onError: (error) => {
      console.error('Failed to push attribution:', error);
      toast.error('Lỗi khi đồng bộ dữ liệu');
    },
  });
}

/**
 * Batch push multiple attribution records
 */
export function useBatchPushAttributionToCDP() {
  const { callRpc, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: AttributionData[]) => {
      if (!tenantId) throw new Error('No tenant selected');

      const results = await Promise.all(
        records.map((data) =>
          callRpc('mdp_push_attribution_to_cdp', {
            p_tenant_id: tenantId,
            p_cohort_month: data.cohortMonth,
            p_source_channel: data.sourceChannel,
            p_total_spend: data.totalSpend,
            p_new_customers: data.newCustomers,
          })
        )
      );

      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(`${errors.length} records failed to sync`);
      }

      return results.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['cdp-cohort-cac'] });
      queryClient.invalidateQueries({ queryKey: ['cdp-ltv-cac-ratio'] });
      toast.success(`Đã đồng bộ ${count} bản ghi attribution`);
    },
    onError: (error) => {
      console.error('Failed to batch push attribution:', error);
      toast.error('Lỗi khi đồng bộ dữ liệu hàng loạt');
    },
  });
}
