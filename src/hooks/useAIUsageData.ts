import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenantId } from "./useActiveTenantId";

interface AIUsageLog {
  id: string;
  tenant_id: string;
  user_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  function_name: string;
  created_at: string;
}

interface UsageStats {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  avgTokensPerRequest: number;
  byModel: Record<string, { tokens: number; cost: number; count: number }>;
  byDay: { date: string; tokens: number; cost: number; count: number }[];
}

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

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const logs = (data || []) as AIUsageLog[];

      // Calculate stats
      const totalTokens = logs.reduce((sum, l) => sum + l.total_tokens, 0);
      const totalCost = logs.reduce((sum, l) => sum + Number(l.estimated_cost), 0);
      const requestCount = logs.length;
      const avgTokensPerRequest = requestCount > 0 ? Math.round(totalTokens / requestCount) : 0;

      // Group by model
      const byModel: Record<string, { tokens: number; cost: number; count: number }> = {};
      logs.forEach(log => {
        if (!byModel[log.model]) {
          byModel[log.model] = { tokens: 0, cost: 0, count: 0 };
        }
        byModel[log.model].tokens += log.total_tokens;
        byModel[log.model].cost += Number(log.estimated_cost);
        byModel[log.model].count += 1;
      });

      // Group by day
      const dayMap: Record<string, { tokens: number; cost: number; count: number }> = {};
      logs.forEach(log => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        if (!dayMap[date]) {
          dayMap[date] = { tokens: 0, cost: 0, count: 0 };
        }
        dayMap[date].tokens += log.total_tokens;
        dayMap[date].cost += Number(log.estimated_cost);
        dayMap[date].count += 1;
      });

      const byDay = Object.entries(dayMap)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalTokens,
        totalCost,
        requestCount,
        avgTokensPerRequest,
        byModel,
        byDay
      };
    },
    enabled: !!tenantId,
  });
}
