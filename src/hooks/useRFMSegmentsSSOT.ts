/**
 * useRFMSegmentsSSOT - SSOT Thin Wrapper for RFM Segments
 * 
 * Phase 7.3: Fetches pre-computed RFM segments from v_cdp_rfm_segment_summary
 * ALL business logic is in the database - this hook ONLY fetches.
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';

export interface RFMSegment {
  name: string;
  description: string;
  recommendedAction: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  count: number;
  percentage: number;
  avgRevenue: number;
  avgFrequency: number;
  avgRecency: number;
  totalValue: number;
  potentialValue: number;
  riskValue: number;
  color: string;
}

export function useRFMSegmentsSSOT() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  const { data: segments, isLoading, error } = useQuery({
    queryKey: ['cdp-rfm-segments-ssot', tenantId],
    queryFn: async (): Promise<RFMSegment[]> => {
      if (!tenantId) return getDefaultSegments();

      let query = client.from('v_cdp_rfm_segment_summary').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;

      if (error) {
        console.error('[useRFMSegmentsSSOT] Query error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return getDefaultSegments();
      }

      return data.map(row => ({
        name: row.segment_name || 'Unknown',
        description: row.description || '',
        recommendedAction: row.recommended_action || '',
        priority: (row.priority as 'critical' | 'high' | 'medium' | 'low') || 'low',
        count: Number(row.customer_count) || 0,
        percentage: Number(row.percentage) || 0,
        avgRevenue: Number(row.avg_revenue) || 0,
        avgFrequency: Number(row.avg_frequency) || 0,
        avgRecency: Number(row.avg_recency) || 0,
        totalValue: Number(row.total_value) || 0,
        potentialValue: Number(row.potential_value) || 0,
        riskValue: Number(row.risk_value) || 0,
        color: row.color || '#6b7280',
      }));
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate summary stats
  const totalCustomers = (segments || []).reduce((sum, s) => sum + s.count, 0);
  const totalValue = (segments || []).reduce((sum, s) => sum + s.totalValue, 0);
  const atRiskValue = (segments || []).reduce((sum, s) => sum + s.riskValue, 0);

  return {
    segments: segments || getDefaultSegments(),
    summary: {
      totalCustomers,
      totalValue,
      atRiskValue,
      segmentCount: (segments || []).length,
    },
    isLoading,
    error,
  };
}

function getDefaultSegments(): RFMSegment[] {
  return [
    { name: 'Champions', description: 'Mua gần đây, thường xuyên, chi tiêu nhiều', recommendedAction: 'Reward & retain', priority: 'high', count: 0, percentage: 0, avgRevenue: 0, avgFrequency: 0, avgRecency: 0, totalValue: 0, potentialValue: 0, riskValue: 0, color: '#8b5cf6' },
    { name: 'Loyal', description: 'Mua thường xuyên, phản hồi tốt', recommendedAction: 'Upsell & cross-sell', priority: 'high', count: 0, percentage: 0, avgRevenue: 0, avgFrequency: 0, avgRecency: 0, totalValue: 0, potentialValue: 0, riskValue: 0, color: '#3b82f6' },
    { name: 'Potential Loyalist', description: 'Khách mới với tiềm năng cao', recommendedAction: 'Engagement campaigns', priority: 'medium', count: 0, percentage: 0, avgRevenue: 0, avgFrequency: 0, avgRecency: 0, totalValue: 0, potentialValue: 0, riskValue: 0, color: '#10b981' },
    { name: 'At Risk', description: 'Từng mua nhiều, giờ không hoạt động', recommendedAction: 'Win-back campaigns', priority: 'critical', count: 0, percentage: 0, avgRevenue: 0, avgFrequency: 0, avgRecency: 0, totalValue: 0, potentialValue: 0, riskValue: 0, color: '#f59e0b' },
    { name: 'Hibernating', description: 'Không hoạt động lâu, LTV thấp', recommendedAction: 'Evaluate win-back ROI', priority: 'low', count: 0, percentage: 0, avgRevenue: 0, avgFrequency: 0, avgRecency: 0, totalValue: 0, potentialValue: 0, riskValue: 0, color: '#ef4444' },
  ];
}
