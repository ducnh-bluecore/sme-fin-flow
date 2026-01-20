import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

// Hook: Fetch suggestions for an exception
export function useSuggestions(exceptionId: string | null) {
  return useQuery({
    queryKey: ['suggestions', exceptionId],
    queryFn: async (): Promise<ReconciliationSuggestion[]> => {
      if (!exceptionId) return [];

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reconciliation-suggestions/exception/${exceptionId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      return response.json();
    },
    enabled: !!exceptionId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Hook: Confirm a suggestion
export function useConfirmSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reconciliation-suggestions/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ suggestionId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to confirm suggestion');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['exception-stats'] });
      queryClient.invalidateQueries({ queryKey: ['exception-detail'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
    },
  });
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
