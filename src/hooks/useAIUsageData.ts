import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenantId } from "./useActiveTenantId";

interface UsageStats {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  avgTokensPerRequest: number;
  byModel: Record<string, { tokens: number; cost: number; count: number }>;
  byDay: { date: string; tokens: number; cost: number; count: number }[];
}

/**
 * useAIUsageData - Fetches AI usage statistics from DB RPC
 * 
 * DB-First Architecture: All aggregations done in database via get_ai_usage_stats()
 * Frontend is a thin wrapper - no computation here
 */
export function useAIUsageData(days: number = 30) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['ai-usage', tenantId, days],
    queryFn: async (): Promise<UsageStats> => {
      if (!tenantId) {
        return {
          totalTokens: 0,
          totalCost: 0,
          requestCount: 0,
          avgTokensPerRequest: 0,
          byModel: {},
          byDay: []
        };
      }

      // Call DB RPC instead of fetching + computing in frontend
      const { data, error } = await supabase.rpc('get_ai_usage_stats', {
        p_tenant_id: tenantId,
        p_days: days
      });

      if (error) throw error;

      // Type assertion for RPC response
      const result = data as Record<string, unknown> | null;

      // Map DB response to frontend types with safe access
      return {
        totalTokens: (result?.total_tokens as number) ?? 0,
        totalCost: (result?.total_cost as number) ?? 0,
        requestCount: (result?.request_count as number) ?? 0,
        avgTokensPerRequest: (result?.avg_tokens_per_request as number) ?? 0,
        byModel: (result?.by_model as Record<string, { tokens: number; cost: number; count: number }>) ?? {},
        byDay: (result?.by_day as { date: string; tokens: number; cost: number; count: number }[]) ?? []
      };
    },
    enabled: !!tenantId,
  });
}
