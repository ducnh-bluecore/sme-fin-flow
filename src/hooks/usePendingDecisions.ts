/**
 * usePendingDecisions - Decision Approval Workflow
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries.
 * decision_analyses is a tenant-specific table.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';

export interface PendingDecision {
  id: string;
  tenant_id: string;
  created_by: string | null;
  analysis_type: string;
  title: string;
  description: string | null;
  parameters: Record<string, any>;
  results: Record<string, any>;
  recommendation: string | null;
  ai_insights: string | null;
  status: string;
  priority: 'high' | 'medium' | 'low';
  deadline: string | null;
  impact: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function usePendingDecisions() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['pending-decisions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('decision_analyses', '*')
        .eq('status', 'pending_approval')
        .order('priority', { ascending: true }) // high first
        .order('deadline', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PendingDecision[];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useApproveDecision() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, client, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (decisionId: string) => {
      const { data: { user } } = await client.auth.getUser();

      const { data, error } = await buildUpdateQuery('decision_analyses', {
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
        .eq('id', decisionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-decisions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['decision-analyses', tenantId] });
      toast.success('Đã phê duyệt quyết định');
    },
    onError: (error) => {
      console.error('Error approving decision:', error);
      toast.error('Không thể phê duyệt quyết định');
    },
  });
}

export function useRejectDecision() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, client, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ decisionId, reason }: { decisionId: string; reason?: string }) => {
      const { data: { user } } = await client.auth.getUser();

      const { data, error } = await buildUpdateQuery('decision_analyses', {
        status: 'rejected',
        rejected_by: user?.id,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
        .eq('id', decisionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-decisions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['decision-analyses', tenantId] });
      toast.success('Đã từ chối quyết định');
    },
    onError: (error) => {
      console.error('Error rejecting decision:', error);
      toast.error('Không thể từ chối quyết định');
    },
  });
}

export function useSubmitForApproval() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ 
      decisionId, 
      priority, 
      deadline, 
      impact 
    }: { 
      decisionId: string; 
      priority: 'high' | 'medium' | 'low';
      deadline?: string;
      impact?: string;
    }) => {
      const { data, error } = await buildUpdateQuery('decision_analyses', {
        status: 'pending_approval',
        priority,
        deadline,
        impact,
      })
        .eq('id', decisionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-decisions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['decision-analyses', tenantId] });
      toast.success('Đã gửi yêu cầu phê duyệt');
    },
    onError: (error) => {
      console.error('Error submitting for approval:', error);
      toast.error('Không thể gửi yêu cầu phê duyệt');
    },
  });
}
