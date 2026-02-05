/**
 * useMDPAcquisitionSource
 * 
 * Hook to manage customer acquisition source data.
 * Part of Case 6: MDP → CDP flow.
 * 
 * Migrated to Schema-per-Tenant architecture v1.4.1.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import {
  CrossModuleData,
  ConfidenceLevel,
  createCrossModuleData,
} from '@/types/cross-module';
import { toast } from 'sonner';

interface AcquisitionSource {
  channel: string;
  campaignName?: string;
  acquisitionCost?: number;
  acquisitionDate?: string;
}

interface AcquisitionSourceRPC {
  acquisition_channel: string;
  campaign_name: string | null;
  acquisition_cost: number | null;
  acquisition_date: string | null;
  confidence_level: string;
  data_source: string;
  is_cross_module: boolean;
}

/**
 * Get acquisition source for a specific customer
 */
export function useCDPAcquisitionSource(customerId?: string) {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery<CrossModuleData<AcquisitionSource>>({
    queryKey: ['cdp-acquisition-source', tenantId, customerId],
    queryFn: async () => {
      if (!tenantId || !customerId) {
        return createCrossModuleData<AcquisitionSource>(
          { channel: 'unknown' },
          'ESTIMATED',
          'no_data',
          false
        );
      }

      const { data, error } = await callRpc('cdp_get_customer_acquisition_source', {
        p_tenant_id: tenantId,
        p_customer_id: customerId,
      });

      if (error) {
        console.error('Error fetching acquisition source:', error);
        return createCrossModuleData<AcquisitionSource>(
          { channel: 'unknown' },
          'ESTIMATED',
          'error_fallback',
          false
        );
      }

      const result = (data as AcquisitionSourceRPC[] | null)?.[0];

      if (!result) {
        return createCrossModuleData<AcquisitionSource>(
          { channel: 'unknown' },
          'ESTIMATED',
          'no_data',
          false
        );
      }

      return createCrossModuleData<AcquisitionSource>(
        {
          channel: result.acquisition_channel ?? 'unknown',
          campaignName: result.campaign_name ?? undefined,
          acquisitionCost: result.acquisition_cost ?? undefined,
          acquisitionDate: result.acquisition_date ?? undefined,
        },
        result.confidence_level as ConfidenceLevel,
        result.data_source ?? 'unknown',
        result.is_cross_module ?? false,
        result.is_cross_module ? 'MDP' : undefined
      );
    },
    enabled: !!tenantId && !!customerId && isReady,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

interface PushAcquisitionParams {
  customerId: string;
  channel: string;
  campaignId?: string;
  campaignName?: string;
  acquisitionCost?: number;
  acquisitionDate?: string;
}

/**
 * Push acquisition source from MDP to CDP
 */
export function usePushAcquisitionToCDP() {
  const { callRpc, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PushAcquisitionParams) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await callRpc('mdp_push_acquisition_to_cdp', {
        p_tenant_id: tenantId,
        p_customer_id: params.customerId,
        p_channel: params.channel,
        p_campaign_id: params.campaignId ?? null,
        p_campaign_name: params.campaignName ?? null,
        p_acquisition_cost: params.acquisitionCost ?? null,
        p_acquisition_date: params.acquisitionDate ?? null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({
        queryKey: ['cdp-acquisition-source', tenantId, params.customerId],
      });
      toast.success('Đã đồng bộ nguồn khách hàng sang CDP');
    },
    onError: (error) => {
      console.error('Failed to push acquisition source:', error);
      toast.error('Lỗi khi đồng bộ nguồn khách hàng');
    },
  });
}

/**
 * Batch push acquisition sources
 */
export function useBatchPushAcquisitionToCDP() {
  const { callRpc, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: PushAcquisitionParams[]) => {
      if (!tenantId) throw new Error('No tenant selected');

      const results = await Promise.all(
        records.map((params) =>
          callRpc('mdp_push_acquisition_to_cdp', {
            p_tenant_id: tenantId,
            p_customer_id: params.customerId,
            p_channel: params.channel,
            p_campaign_id: params.campaignId ?? null,
            p_campaign_name: params.campaignName ?? null,
            p_acquisition_cost: params.acquisitionCost ?? null,
            p_acquisition_date: params.acquisitionDate ?? null,
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
      queryClient.invalidateQueries({ queryKey: ['cdp-acquisition-source'] });
      toast.success(`Đã đồng bộ ${count} nguồn khách hàng`);
    },
    onError: (error) => {
      console.error('Failed to batch push acquisition:', error);
      toast.error('Lỗi khi đồng bộ hàng loạt');
    },
  });
}
