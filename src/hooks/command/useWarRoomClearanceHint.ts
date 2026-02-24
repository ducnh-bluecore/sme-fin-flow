import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import type { MarkdownLadderStep } from '@/types/inventory';

export interface ClearanceHint {
  channel: string;
  discountStep: number;
  clearability: number;
  unitsCleared: number;
  verdict: 'fast_clear' | 'margin_dead' | 'balanced';
}

function getVerdict(discountStep: number, clearability: number): ClearanceHint['verdict'] {
  if (discountStep >= 50) return 'margin_dead';
  if (clearability >= 35) return 'fast_clear';
  return 'balanced';
}

export function useWarRoomClearanceHint() {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['war-room-clearance-hint', tenantId],
    queryFn: async () => {
      const { data, error } = await client.rpc('fn_markdown_ladder_summary', {
        p_tenant_id: tenantId,
      });
      if (error) throw error;

      const steps = (data || []) as unknown as MarkdownLadderStep[];

      // Aggregate by channel + discount_step
      const agg = new Map<string, { channel: string; discountStep: number; totalUnits: number; weightedSum: number }>();
      steps.forEach((s) => {
        const key = `${s.channel}::${s.discount_step}`;
        const existing = agg.get(key);
        if (existing) {
          existing.weightedSum += s.clearability_score * s.total_units_cleared;
          existing.totalUnits += s.total_units_cleared;
        } else {
          agg.set(key, {
            channel: s.channel,
            discountStep: s.discount_step,
            totalUnits: s.total_units_cleared,
            weightedSum: s.clearability_score * s.total_units_cleared,
          });
        }
      });

      const hints: ClearanceHint[] = Array.from(agg.values())
        .filter((a) => a.totalUnits > 0)
        .map((a) => {
          const clearability = Math.round((a.weightedSum / a.totalUnits) * 100) / 100;
          return {
            channel: a.channel,
            discountStep: a.discountStep,
            clearability,
            unitsCleared: a.totalUnits,
            verdict: getVerdict(a.discountStep, clearability),
          };
        })
        .sort((a, b) => b.clearability - a.clearability)
        .slice(0, 3);

      return hints;
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}
