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

      // Channel comparison: weighted average clearability by units cleared
      const channelAgg = new Map<string, {
        channel: string;
        totalUnitsCleared: number;
        totalRevenue: number;
        weightedClearabilitySum: number; // sum(clearability * units)
        stepMap: Map<number, { clearability: number; units: number; revenue: number }>;
      }>();
      steps.forEach(s => {
        const existing = channelAgg.get(s.channel);
        if (existing) {
          existing.totalUnitsCleared += s.total_units_cleared;
          existing.totalRevenue += s.total_revenue;
          existing.weightedClearabilitySum += s.clearability_score * s.total_units_cleared;
          const stepData = existing.stepMap.get(s.discount_step);
          if (stepData) {
            stepData.units += s.total_units_cleared;
            stepData.revenue += s.total_revenue;
            // weighted avg for step
            stepData.clearability = (stepData.clearability * (stepData.units - s.total_units_cleared) + s.clearability_score * s.total_units_cleared) / stepData.units;
          } else {
            existing.stepMap.set(s.discount_step, { clearability: s.clearability_score, units: s.total_units_cleared, revenue: s.total_revenue });
          }
        } else {
          const stepMap = new Map<number, { clearability: number; units: number; revenue: number }>();
          stepMap.set(s.discount_step, { clearability: s.clearability_score, units: s.total_units_cleared, revenue: s.total_revenue });
          channelAgg.set(s.channel, {
            channel: s.channel,
            totalUnitsCleared: s.total_units_cleared,
            totalRevenue: s.total_revenue,
            weightedClearabilitySum: s.clearability_score * s.total_units_cleared,
            stepMap,
          });
        }
      });
      const channels: ChannelComparison[] = Array.from(channelAgg.values()).map(ch => {
        // Best step = step with highest weighted clearability
        let bestStep = 0;
        let bestClearability = 0;
        ch.stepMap.forEach((data, step) => {
          if (data.clearability > bestClearability) {
            bestClearability = data.clearability;
            bestStep = step;
          }
        });
        return {
          channel: ch.channel,
          avgClearability: ch.totalUnitsCleared > 0
            ? Math.round((ch.weightedClearabilitySum / ch.totalUnitsCleared) * 100) / 100
            : 0,
          totalUnitsCleared: ch.totalUnitsCleared,
          totalRevenue: ch.totalRevenue,
          bestStep,
        };
      }).sort((a, b) => b.avgClearability - a.avgClearability);

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
        let best = sorted[0]; for (let i = 1; i < sorted.length; i++) { if (sorted[i].clearability_score > best.clearability_score) best = sorted[i]; }
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
