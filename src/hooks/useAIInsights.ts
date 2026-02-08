/**
 * useAIInsights - Hook for AI financial analysis
 * 
 * @architecture Schema-per-Tenant Ready
 * Uses useTenantQueryBuilder for tenant-aware queries.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';

interface FinancialSummary {
  netRevenue: number;
  orderCount: number;
  aov: number;
  grossMarginPct: number;
  cogs: number;
  totalExpenses: number;
  customerCount: number;
}

interface AIInsightsResponse {
  analysis: string;
  summary: FinancialSummary;
  generatedAt: string;
}

export function useAIInsights(enabled: boolean = true) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();
  
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
  const { client, tenantId } = useTenantQueryBuilder();

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
