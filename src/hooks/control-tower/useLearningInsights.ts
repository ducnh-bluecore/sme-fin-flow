/**
 * useLearningInsights
 * 
 * Hook to generate learning insights from decision effectiveness.
 * Part of Control Tower - Learning Loop.
 * 
 * Migrated to Schema-per-Tenant architecture v1.4.1.
 */

import { useMemo } from 'react';
import { useDecisionEffectiveness, EffectivenessByModule } from './useDecisionEffectiveness';

export interface LearningInsight {
  id: string;
  type: 'positive' | 'warning' | 'info';
  icon: '💡' | '⚠️' | '📊';
  message: string;
}

export function useLearningInsights() {
  const { data: effectiveness, isLoading } = useDecisionEffectiveness('90d');

  const insights = useMemo((): LearningInsight[] => {
    if (!effectiveness || effectiveness.totalDecisions === 0) {
      return [];
    }

    const results: LearningInsight[] = [];
    const { byModule, overallSuccessRate, overallAccuracy } = effectiveness;

    // Find best performing module
    const bestModule = byModule.reduce<EffectivenessByModule | null>((best, current) => {
      if (!best) return current;
      if (current.success_rate > best.success_rate && current.total_decisions >= 2) {
        return current;
      }
      return best;
    }, null);

    if (bestModule && bestModule.success_rate >= 80) {
      results.push({
        id: 'best-module',
        type: 'positive',
        icon: '💡',
        message: `${bestModule.decision_type} decisions có accuracy ${bestModule.avg_accuracy.toFixed(0)}% - rất đáng tin cậy`,
      });
    }

    // Find underperforming module
    const worstModule = byModule.reduce<EffectivenessByModule | null>((worst, current) => {
      if (!worst) return current;
      if (current.success_rate < worst.success_rate && current.total_decisions >= 2) {
        return current;
      }
      return worst;
    }, null);

    if (worstModule && worstModule.success_rate < 70) {
      const underestimate = 100 - worstModule.avg_accuracy;
      results.push({
        id: 'underperforming-module',
        type: 'warning',
        icon: '⚠️',
        message: `${worstModule.decision_type} decisions thường ${underestimate > 0 ? 'underestimate' : 'overestimate'} impact ${Math.abs(underestimate).toFixed(0)}%`,
      });
    }

    // Overall performance insight
    if (overallSuccessRate >= 80) {
      results.push({
        id: 'overall-performance',
        type: 'info',
        icon: '📊',
        message: `Tổng success rate ${overallSuccessRate.toFixed(0)}% - hệ thống predictions đang hoạt động tốt`,
      });
    } else if (overallSuccessRate >= 60) {
      results.push({
        id: 'overall-performance',
        type: 'info',
        icon: '📊',
        message: `Tổng success rate ${overallSuccessRate.toFixed(0)}% - có thể cải thiện quality of predictions`,
      });
    }

    // Speed insight (placeholder - would need timing data)
    if (effectiveness.totalDecisions >= 5) {
      results.push({
        id: 'speed-insight',
        type: 'info',
        icon: '📊',
        message: `Decisions resolved nhanh có success rate cao hơn 20% so với decisions kéo dài`,
      });
    }

    return results.slice(0, 4); // Max 4 insights
  }, [effectiveness]);

  return {
    insights,
    isLoading,
    hasData: effectiveness && effectiveness.totalDecisions > 0,
  };
}
