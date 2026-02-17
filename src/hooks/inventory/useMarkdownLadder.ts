import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import type { MarkdownLadderStep } from '@/types/inventory';

export interface ChannelComparison {
  channel: string;
  avgClearability: number;
  totalUnitsCleared: number;
  totalRevenue: number;
  bestStep: number;
}

export interface NextStepRecommendation {
  channel: string;
  currentStep: number;
  nextStep: number;
  expectedClearability: number;
  expectedDays: number | null;
}

/**
 * Fetch markdown ladder data via fn_markdown_ladder_summary RPC.
 * Returns ladder steps, channel comparison, and next-step recommendations.
 */
export function useMarkdownLadder(fcId?: string) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['markdown-ladder', tenantId, fcId],
    queryFn: async () => {
      const { data, error } = await client.rpc('fn_markdown_ladder_summary', {
        p_tenant_id: tenantId,
        ...(fcId ? { p_fc_id: fcId } : {}),
      });
      if (error) throw error;

      const steps = (data || []) as unknown as MarkdownLadderStep[];

      // Channel comparison: aggregate across discount steps
      const channelMap = new Map<string, ChannelComparison>();
      steps.forEach(s => {
        const existing = channelMap.get(s.channel);
        if (existing) {
          existing.totalUnitsCleared += s.total_units_cleared;
          existing.totalRevenue += s.total_revenue;
          if (s.clearability_score > existing.avgClearability) {
            existing.avgClearability = s.clearability_score;
            existing.bestStep = s.discount_step;
          }
        } else {
          channelMap.set(s.channel, {
            channel: s.channel,
            avgClearability: s.clearability_score,
            totalUnitsCleared: s.total_units_cleared,
            totalRevenue: s.total_revenue,
            bestStep: s.discount_step,
          });
        }
      });
      const channels = Array.from(channelMap.values()).sort((a, b) => b.avgClearability - a.avgClearability);

      // Next step recommendations per channel
      const recommendations: NextStepRecommendation[] = [];
      const channelSteps = new Map<string, MarkdownLadderStep[]>();
      steps.forEach(s => {
        const arr = channelSteps.get(s.channel) || [];
        arr.push(s);
        channelSteps.set(s.channel, arr);
      });
      channelSteps.forEach((ladderSteps, channel) => {
        const sorted = ladderSteps.sort((a, b) => a.discount_step - b.discount_step);
        // Find the current best performing step
        const best = sorted.reduce((a, b) => a.clearability_score > b.clearability_score ? a : b);
        // Recommend next step up if clearability is low
        const nextIdx = sorted.findIndex(s => s.discount_step > best.discount_step);
        if (nextIdx >= 0 && best.clearability_score < 70) {
          const next = sorted[nextIdx];
          recommendations.push({
            channel,
            currentStep: best.discount_step,
            nextStep: next.discount_step,
            expectedClearability: next.clearability_score,
            expectedDays: next.avg_days_to_clear,
          });
        }
      });

      return { steps, channels, recommendations };
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 min for state data
  });
}
