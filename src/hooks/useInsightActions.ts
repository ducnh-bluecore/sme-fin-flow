/**
 * Insight Actions Hook - SSOT
 * 
 * Handles dismiss/snooze/reactivate actions for CDP insights.
 * All logic delegated to database RPCs.
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware RPC calls
 * @domain CDP/Insights
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

interface DismissInsightParams {
  insightEventId: string;
  reason?: string;
}

interface SnoozeInsightParams {
  insightEventId: string;
  snoozeDays?: number;
  reason?: string;
}

interface ReactivateInsightParams {
  insightEventId: string;
}

export function useDismissInsight() {
  const queryClient = useQueryClient();
  const { callRpc, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ insightEventId, reason }: DismissInsightParams) => {
      if (!tenantId) throw new Error('No tenant');
      
      const { data, error } = await callRpc('dismiss_insight', {
        p_tenant_id: tenantId,
        p_insight_event_id: insightEventId,
        p_reason: reason || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp-insights'] });
      queryClient.invalidateQueries({ queryKey: ['cdp-insight-detail'] });
      toast.success('Đã bỏ qua insight', {
        description: 'Insight sẽ không hiển thị trong danh sách chờ xử lý',
      });
    },
    onError: (error) => {
      console.error('Error dismissing insight:', error);
      toast.error('Không thể bỏ qua insight');
    },
  });
}

export function useSnoozeInsight() {
  const queryClient = useQueryClient();
  const { callRpc, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ insightEventId, snoozeDays = 7, reason }: SnoozeInsightParams) => {
      if (!tenantId) throw new Error('No tenant');
      
      const { data, error } = await callRpc('snooze_insight', {
        p_tenant_id: tenantId,
        p_insight_event_id: insightEventId,
        p_snooze_days: snoozeDays,
        p_reason: reason || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cdp-insights'] });
      queryClient.invalidateQueries({ queryKey: ['cdp-insight-detail'] });
      toast.success('Đã tạm ẩn insight', {
        description: `Insight sẽ hiển thị lại sau ${variables.snoozeDays || 7} ngày`,
      });
    },
    onError: (error) => {
      console.error('Error snoozing insight:', error);
      toast.error('Không thể tạm ẩn insight');
    },
  });
}

export function useReactivateInsight() {
  const queryClient = useQueryClient();
  const { callRpc, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ insightEventId }: ReactivateInsightParams) => {
      if (!tenantId) throw new Error('No tenant');
      
      const { data, error } = await callRpc('reactivate_insight', {
        p_tenant_id: tenantId,
        p_insight_event_id: insightEventId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp-insights'] });
      queryClient.invalidateQueries({ queryKey: ['cdp-insight-detail'] });
      toast.success('Đã kích hoạt lại insight', {
        description: 'Insight đã được đưa trở lại danh sách chờ xử lý',
      });
    },
    onError: (error) => {
      console.error('Error reactivating insight:', error);
      toast.error('Không thể kích hoạt lại insight');
    },
  });
}
