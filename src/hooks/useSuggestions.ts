import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';

export interface ReconciliationSuggestion {
  id: string;
  tenant_id: string;
  exception_id: string;
  bank_transaction_id: string | null;
  invoice_id: string | null;
  suggestion_type: 'BANK_TO_INVOICE' | 'BANK_SPLIT_TO_INVOICES' | 'INVOICE_EXPECT_BANK';
  confidence: number;
  suggested_amount: number;
  currency: string;
  rationale: {
    amountMatch?: string;
    amountMatchScore?: number;
    descriptionMatch?: string;
    descriptionMatchScore?: number;
    dateProximityDays?: number;
    dateProximityScore?: number;
    bank_amount?: number;
    invoice_outstanding?: number;
    invoice_number?: string;
    customer_name?: string;
    bank_reference?: string;
    remaining_bank_amount?: number;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface CalibrationData {
  calibration_stats: Array<{
    suggestion_type: string;
    confidence_band: string;
    signal_signature: string;
    total_suggestions: number;
    confirmed_correct: number;
    rejected: number;
    empirical_success_rate: number;
  }>;
  recent_outcomes: {
    total: number;
    confirmed: number;
    rejected: number;
    timed_out: number;
  };
  empirical_success_rate: number;
  sample_size: number;
}

// Hook: Fetch suggestions for an exception
export function useSuggestions(exceptionId: string | null) {
  const { client, tenantId } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['suggestions', tenantId, exceptionId],
    queryFn: async (): Promise<ReconciliationSuggestion[]> => {
      if (!exceptionId) return [];

      const { data: session } = await client.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reconciliation-suggestions/exception/${exceptionId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'x-tenant-id': tenantId || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      return response.json();
    },
    enabled: !!exceptionId && !!tenantId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Hook: Get calibration data
export function useCalibrationData() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['calibration', tenantId],
    queryFn: async (): Promise<CalibrationData | null> => {
      if (!tenantId) return null;

      const { data: session } = await client.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reconciliation-suggestions/calibration?tenant_id=${tenantId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      return response.json();
    },
    enabled: !!tenantId && isReady,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook: Confirm a suggestion
export function useConfirmSuggestion() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { data: session } = await client.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reconciliation-suggestions/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'x-tenant-id': tenantId || '',
          },
          body: JSON.stringify({ suggestionId, tenantId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to confirm suggestion');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['exception-stats'] });
      queryClient.invalidateQueries({ queryKey: ['exception-detail'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['calibration'] });
    },
  });
}

// Hook: Reject a suggestion
export function useRejectSuggestion() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { data: session } = await client.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reconciliation-suggestions/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'x-tenant-id': tenantId || '',
          },
          body: JSON.stringify({ suggestionId, tenantId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject suggestion');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['calibration'] });
    },
  });
}

// Helper: Get calibrated confidence
export function getCalibratedConfidence(
  originalConfidence: number,
  empiricalSuccessRate: number | null,
  sampleSize: number
): number {
  // If we don't have enough samples, use original confidence
  if (!empiricalSuccessRate || sampleSize < 10) {
    return originalConfidence;
  }
  
  // Calibrate: use the lower of original and empirical rate
  // This is conservative - we don't inflate confidence
  return Math.min(originalConfidence, empiricalSuccessRate);
}

// Helper: Get confidence color
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return 'text-green-600 bg-green-100';
  if (confidence >= 50) return 'text-yellow-600 bg-yellow-100';
  return 'text-orange-600 bg-orange-100';
}

// Helper: Get confidence label
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 70) return 'High';
  if (confidence >= 50) return 'Medium';
  return 'Low';
}
