import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
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
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['pending-decisions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('decision_analyses')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending_approval')
        .order('priority', { ascending: true }) // high first
        .order('deadline', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PendingDecision[];
    },
    enabled: !!tenantId,
  });
}

export function useApproveDecision() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (decisionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('decision_analyses')
        .update({
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
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async ({ decisionId, reason }: { decisionId: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('decision_analyses')
        .update({
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
  const { data: tenantId } = useActiveTenantId();

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
      const { data, error } = await supabase
        .from('decision_analyses')
        .update({
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
