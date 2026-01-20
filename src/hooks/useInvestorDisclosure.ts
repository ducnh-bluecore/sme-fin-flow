import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  };
}

export function useGenerateDisclosure(period: string) {
  return useQuery({
    queryKey: ['investor-disclosure', 'generate', period],
    queryFn: async (): Promise<GeneratedDisclosure> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/generate?period=${encodeURIComponent(period)}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate disclosure');
      }

      return response.json();
    },
    enabled: !!period,
  });
}

export function useDisclosureList(status?: string) {
  return useQuery({
    queryKey: ['investor-disclosure', 'list', status],
    queryFn: async (): Promise<{ disclosures: SavedDisclosure[] }> => {
      const headers = await getAuthHeaders();
      const url = status 
        ? `${FUNCTION_URL}/list?status=${status}` 
        : `${FUNCTION_URL}/list`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch disclosures');
      }

      return response.json();
    },
  });
}

export function useDisclosure(id: string) {
  return useQuery({
    queryKey: ['investor-disclosure', id],
    queryFn: async (): Promise<SavedDisclosure> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/${id}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch disclosure');
      }

      return response.json();
    },
    enabled: !!id,
  });
}

export function useSaveDisclosure() {
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
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/save`, {
        method: 'POST',
        headers,
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (disclosureId: string) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/approve`, {
        method: 'POST',
        headers,
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (disclosureId: string) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/publish`, {
        method: 'POST',
        headers,
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
