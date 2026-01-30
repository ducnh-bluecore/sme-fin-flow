/**
 * useAIInsights - Hook for AI financial analysis
 * 
 * Schema-per-Tenant Ready
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';

interface FinancialSummary {
  totalCash: number;
  totalAR: number;
  totalOverdue: number;
  overdueCount: number;
  totalInvoices: number;
  totalCustomers: number;
  unmatchedTransactionsCount: number;
  matchRate: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

interface AIInsightsResponse {
  analysis: string;
  summary: FinancialSummary;
  generatedAt: string;
}

export function useAIInsights(enabled: boolean = true) {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();
  
  return useQuery({
    queryKey: ['ai-insights', tenantId],
    queryFn: async (): Promise<AIInsightsResponse | null> => {
      if (!tenantId) return null;

      const { data, error } = await client.functions.invoke('analyze-financial-data');

      if (error) {
        console.error('AI insights error:', error);
        throw error;
      }

      return data;
    },
    enabled: !!tenantId && isReady && enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes - increased for better caching
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    refetchInterval: false, // Disable auto-refresh to reduce API calls
    retry: 1,
  });
}

export function useRefreshAIInsights() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (): Promise<AIInsightsResponse> => {
      const { data, error } = await client.functions.invoke('analyze-financial-data');

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights', tenantId] });
    }
  });
}
