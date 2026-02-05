/**
 * useInvestorDisclosure - Investor disclosure management hooks
 * 
 * Refactored to use Schema-per-Tenant architecture.
 * All API calls use tenant-aware Supabase client for auth.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/investor-disclosure`;

interface RiskMetric {
  metric: string;
  value: string;
  withinAppetite: boolean;
  domain: string;
}

interface GeneratedDisclosure {
  period: string;
  riskAppetiteVersion: number;
  summary: string;
  keyRisks: RiskMetric[];
  mitigations: string[];
  complianceStatement: string;
  generatedAt: string;
  status: string;
}

interface SavedDisclosure {
  id: string;
  tenant_id: string;
  risk_appetite_version: number;
  disclosure_period_start: string;
  disclosure_period_end: string;
  summary: string;
  key_risks: RiskMetric[];
  mitigations: string[];
  compliance_statement: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_by: string;
  created_at: string;
}

export function useGenerateDisclosure(period: string) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['investor-disclosure', 'generate', period, tenantId],
    queryFn: async (): Promise<GeneratedDisclosure> => {
      const { data: { session } } = await client.auth.getSession();
      
      const response = await fetch(`${FUNCTION_URL}/generate?period=${encodeURIComponent(period)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId || '',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate disclosure');
      }

      return response.json();
    },
    enabled: !!period && !!tenantId && isReady,
  });
}

export function useDisclosureList(status?: string) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['investor-disclosure', 'list', status, tenantId],
    queryFn: async (): Promise<{ disclosures: SavedDisclosure[] }> => {
      const { data: { session } } = await client.auth.getSession();
      
      const url = status 
        ? `${FUNCTION_URL}/list?status=${status}` 
        : `${FUNCTION_URL}/list`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId || '',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch disclosures');
      }

      return response.json();
    },
    enabled: !!tenantId && isReady,
  });
}

export function useDisclosure(id: string) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['investor-disclosure', id, tenantId],
    queryFn: async (): Promise<SavedDisclosure> => {
      const { data: { session } } = await client.auth.getSession();
      
      const response = await fetch(`${FUNCTION_URL}/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId || '',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch disclosure');
      }

      return response.json();
    },
    enabled: !!id && !!tenantId && isReady,
  });
}

export function useSaveDisclosure() {
  const { client, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      riskAppetiteVersion: number;
      periodStart: string;
      periodEnd: string;
      summary: string;
      keyRisks: RiskMetric[];
      mitigations: string[];
      complianceStatement: string;
    }) => {
      const { data: { session } } = await client.auth.getSession();
      
      const response = await fetch(`${FUNCTION_URL}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId || '',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save disclosure');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investor-disclosure'] });
    },
  });
}

export function useApproveDisclosure() {
  const { client, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (disclosureId: string) => {
      const { data: { session } } = await client.auth.getSession();
      
      const response = await fetch(`${FUNCTION_URL}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId || '',
        },
        body: JSON.stringify({ disclosureId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve disclosure');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investor-disclosure'] });
    },
  });
}

export function usePublishDisclosure() {
  const { client, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (disclosureId: string) => {
      const { data: { session } } = await client.auth.getSession();
      
      const response = await fetch(`${FUNCTION_URL}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId || '',
        },
        body: JSON.stringify({ disclosureId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish disclosure');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investor-disclosure'] });
    },
  });
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'draft': return 'bg-muted text-muted-foreground';
    case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-blue-100 text-blue-800';
    case 'published': return 'bg-green-100 text-green-800';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  
  return `${startMonth} - ${endMonth}`;
}
