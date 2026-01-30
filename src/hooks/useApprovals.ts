/**
 * useApprovals - Enterprise approval workflow management
 * 
 * Schema-per-Tenant Ready
 * Uses Edge Functions for approval operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantSupabaseCompat } from "@/integrations/supabase/tenantClient";
import { useToast } from "@/hooks/use-toast";

export interface EnterprisePolicy {
  id: string;
  tenant_id: string;
  policy_name: string;
  policy_type: string;
  condition: Record<string, unknown>;
  required_approvals: number;
  approver_roles: string[];
  priority: number;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequest {
  id: string;
  tenant_id: string;
  policy_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_data: Record<string, unknown> | null;
  required_approvals: number;
  current_approvals: number;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  expires_at: string | null;
  resolved_at: string | null;
  created_at: string;
  policy?: {
    policy_name: string;
    policy_type: string;
    approver_roles: string[];
  };
  decisions?: ApprovalDecision[];
}

export interface ApprovalDecision {
  id: string;
  approval_request_id: string;
  decided_by: string;
  decision: 'approve' | 'reject';
  comment: string | null;
  decided_at: string;
  decider?: { full_name: string };
}

export interface ApprovalStats {
  pendingCount: number;
  approvedCount30d: number;
  rejectedCount30d: number;
  totalPolicies: number;
  activePolicies: number;
}

export interface PolicyCheckResult {
  requiresApproval: boolean;
  policyId?: string;
  policyName?: string;
  requiredApprovals?: number;
  approverRoles?: string[];
}

export function usePolicies() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['enterprise-policies', tenantId],
    queryFn: async (): Promise<EnterprisePolicy[]> => {
      if (!tenantId) throw new Error('No active tenant');

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approvals/policies`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch policies');
      const data = await response.json();
      return data.policies;
    },
    enabled: !!tenantId && isReady,
  });
}

export function useCreatePolicy() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (policy: {
      policyName: string;
      policyType: string;
      condition: Record<string, unknown>;
      requiredApprovals?: number;
      approverRoles?: string[];
    }) => {
      if (!tenantId) throw new Error('No active tenant');

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approvals/policies`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(policy),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create policy');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-policies'] });
      toast({ title: "Policy Created", description: "New policy has been added." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Create Policy", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdatePolicy() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EnterprisePolicy> & { id: string }) => {
      if (!tenantId) throw new Error('No active tenant');

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approvals/policies/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) throw new Error('Failed to update policy');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-policies'] });
      toast({ title: "Policy Updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Update Policy", description: error.message, variant: "destructive" });
    },
  });
}

export function usePendingApprovals() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['pending-approvals', tenantId],
    queryFn: async (): Promise<{ requests: ApprovalRequest[]; canApprove: boolean }> => {
      if (!tenantId) throw new Error('No active tenant');

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approvals/pending`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch pending approvals');
      return response.json();
    },
    enabled: !!tenantId && isReady,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useApprovalHistory(limit = 50) {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['approval-history', tenantId, limit],
    queryFn: async (): Promise<ApprovalRequest[]> => {
      if (!tenantId) throw new Error('No active tenant');

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approvals/history?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch approval history');
      const data = await response.json();
      return data.requests;
    },
    enabled: !!tenantId && isReady,
  });
}

export function useApprovalStats() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['approval-stats', tenantId],
    queryFn: async (): Promise<ApprovalStats> => {
      if (!tenantId) throw new Error('No active tenant');

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approvals/stats`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch approval stats');
      return response.json();
    },
    enabled: !!tenantId && isReady,
  });
}

export function useCheckPolicy() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ policyType, context }: {
      policyType: string;
      context: Record<string, unknown>;
    }): Promise<PolicyCheckResult> => {
      if (!tenantId) throw new Error('No active tenant');

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approvals/check`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ policyType, context }),
        }
      );

      if (!response.ok) throw new Error('Failed to check policy');
      return response.json();
    },
  });
}

export function useCreateApprovalRequest() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: {
      policyId: string;
      action: string;
      resourceType: string;
      resourceId?: string;
      resourceData?: Record<string, unknown>;
    }) => {
      if (!tenantId) throw new Error('No active tenant');

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approvals/request`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create approval request');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      toast({ title: "Approval Requested", description: "Waiting for approval." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Request Approval", description: error.message, variant: "destructive" });
    },
  });
}

export function useDecideApproval() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ requestId, decision, comment }: {
      requestId: string;
      decision: 'approve' | 'reject';
      comment?: string;
    }) => {
      if (!tenantId) throw new Error('No active tenant');

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approvals/decide/${requestId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ decision, comment }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit decision');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-history'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
      
      toast({
        title: data.requestStatus === 'approved' ? "Approved" : 
               data.requestStatus === 'rejected' ? "Rejected" : "Decision Recorded",
        description: data.requestStatus === 'pending' 
          ? "Waiting for additional approvals."
          : `Request has been ${data.requestStatus}.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Decision Failed", description: error.message, variant: "destructive" });
    },
  });
}

// Helper functions
export function getPolicyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'AUTO_RECONCILIATION': 'Auto-Reconciliation',
    'MANUAL_RECONCILIATION': 'Manual Reconciliation',
    'VOID_RECONCILIATION': 'Void Reconciliation',
    'ML_ENABLEMENT': 'ML Enablement',
    'LARGE_PAYMENT': 'Large Payment',
    'EXCEPTION_RESOLUTION': 'Exception Resolution',
  };
  return labels[type] || type;
}

export function formatCondition(condition: Record<string, unknown>): string {
  const parts: string[] = [];
  
  if (condition.amount_gt) parts.push(`Amount > ${Number(condition.amount_gt).toLocaleString()}`);
  if (condition.amount_gte) parts.push(`Amount ≥ ${Number(condition.amount_gte).toLocaleString()}`);
  if (condition.always) parts.push('Always required');
  if (condition.confidence_lt) parts.push(`Confidence < ${condition.confidence_lt}%`);
  if (condition.risk_level) parts.push(`Risk level: ${condition.risk_level}`);
  
  return parts.join(', ') || 'Custom condition';
}
