import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import type { MarkdownLadderStep } from '@/types/inventory';

export interface ClearanceHint {
  channel: string;
  discountStep: number;
  clearability: number;
  avgDaysToClear: number | null;
  baselineClearability: number;
  baselineDays: number | null;
  uplift: number;
  speedChange: number | null;
  unitsCleared: number;
  baselineUnits: number;
  isActive: boolean;
  verdict: 'effective' | 'marginal' | 'not_worth' | 'dead_stock';
}

interface ChannelAgg {
  clearabilitySum: number;
  daysWeightedSum: number;
  daysWeightedCount: number;
  totalUnits: number;
}

function getVerdict(
  discountStep: number,
  uplift: number,
  speedChange: number | null,
  baselineDays: number | null,
  avgDays: number | null,
): ClearanceHint['verdict'] {
  // 1. Dead stock: baseline >= 120 days AND discount doesn't help
  if (baselineDays !== null && baselineDays >= 120) {
    const discountStillSlow = avgDays === null || avgDays > 90;
    const noSpeedGain = speedChange === null || speedChange <= 0;
    if (discountStillSlow && noSpeedGain) return 'dead_stock';
  }

  // 2. Not worth: margin dead, or discount makes things worse
  if (discountStep >= 50) return 'not_worth';
  if (uplift <= 0) return 'not_worth';
  if (speedChange !== null && speedChange < 0) return 'not_worth';

  // 3. Effective: meaningful uplift + speed gain
  if (uplift > 5 && (speedChange === null || speedChange > 0)) return 'effective';

  // 4. Marginal
  return 'marginal';
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
      const agg = new Map<string, ChannelAgg>();
      steps.forEach((s) => {
        const key = `${s.channel}::${s.discount_step}`;
        const existing = agg.get(key);
        if (existing) {
          existing.clearabilitySum += s.clearability_score * s.total_units_cleared;
          existing.totalUnits += s.total_units_cleared;
          if (s.avg_days_to_clear !== null) {
            existing.daysWeightedSum += s.avg_days_to_clear * s.total_units_cleared;
            existing.daysWeightedCount += s.total_units_cleared;
          }
        } else {
          agg.set(key, {
            clearabilitySum: s.clearability_score * s.total_units_cleared,
            totalUnits: s.total_units_cleared,
            daysWeightedSum: s.avg_days_to_clear !== null ? s.avg_days_to_clear * s.total_units_cleared : 0,
            daysWeightedCount: s.avg_days_to_clear !== null ? s.total_units_cleared : 0,
          });
        }
      });

      // Extract baselines (OFF 0%) per channel
      const baselines = new Map<string, { clearability: number; days: number | null; units: number }>();
      agg.forEach((val, key) => {
        const [channel, stepStr] = key.split('::');
        if (Number(stepStr) === 0 && val.totalUnits > 0) {
          baselines.set(channel, {
            clearability: Math.round((val.clearabilitySum / val.totalUnits) * 100) / 100,
            days: val.daysWeightedCount > 0 ? Math.round(val.daysWeightedSum / val.daysWeightedCount) : null,
            units: val.totalUnits,
          });
        }
      });

      // Build hints for discount_step > 0 only (best per channel)
      const bestPerChannel = new Map<string, ClearanceHint>();
      agg.forEach((val, key) => {
        const [channel, stepStr] = key.split('::');
        const discountStep = Number(stepStr);
        if (discountStep === 0 || val.totalUnits === 0) return;

        const clearability = Math.round((val.clearabilitySum / val.totalUnits) * 100) / 100;
        const avgDays = val.daysWeightedCount > 0 ? Math.round(val.daysWeightedSum / val.daysWeightedCount) : null;
        const baseline = baselines.get(channel) || { clearability: 0, days: null, units: 0 };
        const uplift = Math.round((clearability - baseline.clearability) * 100) / 100;
        const speedChange = (baseline.days !== null && avgDays !== null)
          ? baseline.days - avgDays
          : null;

        // Infer if discount is currently active: units at discount >> units at baseline
        const isActive = baseline.units > 0 ? (val.totalUnits / baseline.units) > 2 : val.totalUnits > 100;

        const verdict = getVerdict(discountStep, uplift, speedChange, baseline.days, avgDays);

        const hint: ClearanceHint = {
          channel,
          discountStep,
          clearability,
          avgDaysToClear: avgDays,
          baselineClearability: baseline.clearability,
          baselineDays: baseline.days,
          uplift,
          speedChange,
          unitsCleared: val.totalUnits,
          baselineUnits: baseline.units,
          isActive,
          verdict,
        };

        // Keep best per channel: prefer effective, then highest uplift
        const existing = bestPerChannel.get(channel);
        if (!existing || isBetterHint(hint, existing)) {
          bestPerChannel.set(channel, hint);
        }
      });

      // Also add dead_stock warnings for channels where baseline itself is dead
      baselines.forEach((bl, channel) => {
        if (bestPerChannel.has(channel)) return;
        if (bl.days !== null && bl.days >= 120) {
          bestPerChannel.set(channel, {
            channel,
            discountStep: 0,
            clearability: bl.clearability,
            avgDaysToClear: bl.days,
            baselineClearability: bl.clearability,
            baselineDays: bl.days,
            uplift: 0,
            speedChange: null,
            unitsCleared: 0,
            baselineUnits: bl.units,
            isActive: false,
            verdict: 'dead_stock',
          });
        }
      });

      // Sort: effective first, then dead_stock (warnings), then not_worth, then marginal
      const verdictOrder: Record<ClearanceHint['verdict'], number> = {
        effective: 0,
        dead_stock: 1,
        not_worth: 2,
        marginal: 3,
      };

      const hints = Array.from(bestPerChannel.values())
        .sort((a, b) => {
          const orderDiff = verdictOrder[a.verdict] - verdictOrder[b.verdict];
          if (orderDiff !== 0) return orderDiff;
          return b.uplift - a.uplift;
        })
        .slice(0, 4);

      return hints;
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

function isBetterHint(a: ClearanceHint, b: ClearanceHint): boolean {
  const verdictRank: Record<ClearanceHint['verdict'], number> = {
    effective: 0, marginal: 1, not_worth: 2, dead_stock: 3,
  };
  if (verdictRank[a.verdict] !== verdictRank[b.verdict]) {
    return verdictRank[a.verdict] < verdictRank[b.verdict];
  }
  return a.uplift > b.uplift;
}
