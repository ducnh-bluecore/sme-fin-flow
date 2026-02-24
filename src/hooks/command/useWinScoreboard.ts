/**
 * useWinScoreboard - Track wins from decisions made in the last 7 days
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface WinScoreboardData {
  rescuedRevenue: number;
  avoidedMarkdown: number;
  healthDelta: number;
  totalOutcomes: number;
  hasData: boolean;
}

export function useWinScoreboard() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['win-scoreboard', tenantId],
    queryFn: async (): Promise<WinScoreboardData> => {
      if (!tenantId) return { rescuedRevenue: 0, avoidedMarkdown: 0, healthDelta: 0, totalOutcomes: 0, hasData: false };

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      // Query decision outcomes (7d) and size health comparison
      const [outcomesRes, healthTodayRes, healthPastRes] = await Promise.all([
        buildSelectQuery('decision_outcomes', 'actual_impact_amount, outcome_status')
          .gte('measured_at', sevenDaysAgoStr),
        buildSelectQuery('state_size_health_daily', 'size_health_score')
          .order('as_of_date', { ascending: false })
          .limit(500),
        buildSelectQuery('state_size_health_daily', 'size_health_score')
          .lte('as_of_date', sevenDaysAgoStr)
          .order('as_of_date', { ascending: false })
          .limit(500),
      ]);

      const outcomes = (outcomesRes.data || []) as any[];
      const hasData = outcomes.length > 0;

      let rescuedRevenue = 0;
      let avoidedMarkdown = 0;

      outcomes.forEach((o: any) => {
        const amount = Number(o.actual_impact_amount) || 0;
        if (o.outcome_status === 'positive') {
          rescuedRevenue += amount;
        }
        // negative outcomes that were prevented count as avoided markdown
        if (amount > 0) {
          avoidedMarkdown += amount * 0.3; // estimate 30% would have been markdown
        }
      });

      // Calculate health delta
      const healthToday = (healthTodayRes.data || []) as any[];
      const healthPast = (healthPastRes.data || []) as any[];
      
      const avgToday = healthToday.length > 0
        ? healthToday.reduce((s: number, r: any) => s + (Number(r.size_health_score) || 0), 0) / healthToday.length
        : 0;
      const avgPast = healthPast.length > 0
        ? healthPast.reduce((s: number, r: any) => s + (Number(r.size_health_score) || 0), 0) / healthPast.length
        : 0;

      return {
        rescuedRevenue,
        avoidedMarkdown,
        healthDelta: Math.round(avgToday - avgPast),
        totalOutcomes: outcomes.length,
        hasData,
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 10 * 60 * 1000,
  });
}
