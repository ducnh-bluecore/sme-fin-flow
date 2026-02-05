/**
 * useMLReconciliation - ML Reconciliation hooks
 * 
 * Migrated to useTenantQueryBuilder (Schema-per-Tenant v1.4.1)
 * Note: Uses Edge Functions, only client accessor migrated
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useToast } from "@/hooks/use-toast";

export interface MLPrediction {
  mlEnabled: boolean;
  modelVersion?: string;
  predictedConfidence?: number;
  calibratedConfidence?: number | null;
  finalConfidence?: number;
  explanation?: Record<string, number>;
  sampleSize?: number;
  error?: string;
}

export interface MLSettings {
  mlEnabled: boolean;
  modelVersion: string;
  minConfidenceThreshold: number;
  enabledAt: string | null;
  sampleSizeLast30Days: number;
  accuracyLast30Days: number | null;
  guardrailOverrideRate: number;
}

export function useMLPrediction(suggestionId: string | null) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['ml-prediction', suggestionId, tenantId],
    queryFn: async (): Promise<MLPrediction> => {
      if (!suggestionId || !tenantId) {
        return { mlEnabled: false };
      }

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ml-reconciliation/predict`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ suggestionId }),
        }
      );

      // Handle kill-switch (403) gracefully - not an error, just disabled
      if (response.status === 403) {
        const data = await response.json();
        return { 
          mlEnabled: false, 
          error: data.error || 'ML is disabled (kill-switch active)' 
        };
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'ML prediction failed');
      }

      return response.json();
    },
    enabled: !!suggestionId && !!tenantId && isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMLSettings() {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['ml-settings', tenantId],
    queryFn: async (): Promise<MLSettings> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ml-reconciliation/settings`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch ML settings');
      }

      return response.json();
    },
    enabled: !!tenantId && isReady,
  });
}

export function useUpdateMLSettings() {
  const { client, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: { mlEnabled: boolean; minConfidenceThreshold?: number }) => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ml-reconciliation/settings`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update ML settings');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ml-settings'] });
      toast({
        title: data.mlEnabled ? "ML Enabled" : "ML Disabled",
        description: data.mlEnabled 
          ? `Model ${data.modelVersion} is now active`
          : "Falling back to rule-based calibration",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update ML settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Format explanation for display
export function formatExplanation(explanation: Record<string, number>): Array<{ factor: string; weight: number; label: string }> {
  const labelMap: Record<string, string> = {
    exact_amount_match: 'Exact Amount Match',
    amount_near_match: 'Near Amount Match',
    amount_partial_match: 'Partial Amount Match',
    invoice_number_match: 'Invoice Number Match',
    customer_name_match: 'Customer Name Match',
    reference_similarity: 'Reference Similarity',
    date_proximity: 'Date Proximity',
    historical_success_rate: 'Historical Success Rate',
    single_candidate: 'Single Candidate',
    multiple_candidates: 'Multiple Candidates',
  };

  return Object.entries(explanation)
    .map(([factor, weight]) => ({
      factor,
      weight: Math.round(weight * 100),
      label: labelMap[factor] || factor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}
