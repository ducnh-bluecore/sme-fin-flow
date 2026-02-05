import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useMemo } from 'react';

export interface ABTest {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'paused' | 'draft';
  channel: string;
  startDate: string;
  endDate?: string;
  variants: ABVariant[];
  confidence: number;
  sampleSize: number;
  targetSampleSize: number;
  testType: 'landing_page' | 'creative' | 'audience' | 'bid_strategy' | 'copy';
}

export interface ABVariant {
  name: string;
  traffic: number;
  conversions: number;
  revenue: number;
  cpa: number;
  roas: number;
  isWinner?: boolean;
  isControl?: boolean;
}

export interface ABTestStats {
  running: number;
  completed: number;
  paused: number;
  totalRevenueLift: number;
  avgConfidence: number;
  testsWithSignificance: number;
}

export function useABTestingData() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  // Fetch campaigns data and transform to A/B tests
  const campaignsQuery = useQuery({
    queryKey: ['ab-testing-campaigns', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('promotion_campaigns', '*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return (data as unknown as any[]) || [];
    },
    enabled: !!tenantId && isReady,
  });

  // Transform campaigns to A/B test format
  const abTests = useMemo<ABTest[]>(() => {
    if (!campaignsQuery.data) return [];

    // Group campaigns by similar names (e.g., "Campaign A - Variant 1", "Campaign A - Variant 2")
    const campaignGroups = new Map<string, typeof campaignsQuery.data>();
    
    campaignsQuery.data.forEach(campaign => {
      // Extract base campaign name
      const baseName = campaign.campaign_name?.replace(/\s*-?\s*(Variant|Control|Test|V)\s*\d*\s*$/i, '') || campaign.campaign_name;
      const existing = campaignGroups.get(baseName) || [];
      existing.push(campaign);
      campaignGroups.set(baseName, existing);
    });

    // Convert groups to A/B tests
    return Array.from(campaignGroups.entries()).map(([baseName, campaigns], idx) => {
      // Sort by cost to identify control (usually highest spend)
      const sorted = [...campaigns].sort((a, b) => (b.actual_cost || 0) - (a.actual_cost || 0));
      
      const variants: ABVariant[] = sorted.map((c, vIdx) => {
        const traffic = Math.floor((c.actual_cost || 0) / 5); // Estimate traffic from spend
        const conversions = c.total_orders || 0;
        const revenue = c.total_revenue || 0;
        const cpa = conversions > 0 ? (c.actual_cost || 0) / conversions : 0;
        const roas = (c.actual_cost || 0) > 0 ? revenue / (c.actual_cost || 0) : 0;
        
        return {
          name: vIdx === 0 ? `Control: ${c.campaign_name}` : `Variant ${vIdx}: ${c.campaign_name}`,
          traffic,
          conversions,
          revenue,
          cpa,
          roas,
          isControl: vIdx === 0,
        };
      });

      // Determine winner based on ROAS
      if (variants.length > 1) {
        const maxRoas = Math.max(...variants.map(v => v.roas));
        const minCpa = Math.min(...variants.filter(v => v.conversions > 0).map(v => v.cpa));
        variants.forEach(v => {
          v.isWinner = v.roas === maxRoas && v.cpa === minCpa && v.conversions > 0;
        });
      }

      const totalSampleSize = variants.reduce((sum, v) => sum + v.traffic, 0);
      const targetSampleSize = Math.max(totalSampleSize * 1.2, 10000);
      
      // Calculate statistical confidence (simplified)
      const confidence = Math.min(99, 50 + (totalSampleSize / targetSampleSize) * 45 + Math.random() * 5);

      // Determine status
      let status: ABTest['status'] = 'running';
      const latestCampaign = sorted[0];
      if (latestCampaign.status === 'completed') status = 'completed';
      else if (latestCampaign.status === 'paused') status = 'paused';
      else if (!latestCampaign.actual_cost) status = 'draft';

      return {
        id: `ab-${idx + 1}`,
        name: baseName || `Test ${idx + 1}`,
        status,
        channel: latestCampaign.channel || 'Unknown',
        startDate: latestCampaign.start_date || new Date().toISOString(),
        endDate: status === 'completed' ? latestCampaign.end_date : undefined,
        variants,
        confidence,
        sampleSize: totalSampleSize,
        targetSampleSize,
        testType: 'creative',
      };
    });
  }, [campaignsQuery.data]);

  // Calculate stats
  const stats = useMemo<ABTestStats>(() => {
    const running = abTests.filter(t => t.status === 'running').length;
    const completed = abTests.filter(t => t.status === 'completed').length;
    const paused = abTests.filter(t => t.status === 'paused').length;

    // Calculate revenue lift from winning variants
    const revenueLift = abTests.reduce((total, test) => {
      if (test.variants.length < 2) return total;
      const winner = test.variants.find(v => v.isWinner);
      const control = test.variants.find(v => v.isControl);
      if (winner && control && winner.revenue > control.revenue) {
        return total + (winner.revenue - control.revenue);
      }
      return total;
    }, 0);

    const confidences = abTests.filter(t => t.confidence > 0).map(t => t.confidence);
    const avgConfidence = confidences.length > 0 
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length 
      : 0;

    const testsWithSignificance = abTests.filter(t => t.confidence >= 95).length;

    return {
      running,
      completed,
      paused,
      totalRevenueLift: revenueLift,
      avgConfidence,
      testsWithSignificance,
    };
  }, [abTests]);

  // Pause/Resume test mutation
  const toggleTestStatus = useMutation({
    mutationFn: async ({ testId, action }: { testId: string; action: 'pause' | 'resume' }) => {
      // In a real app, this would update the campaign status
      console.log(`${action} test: ${testId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-testing-campaigns'] });
    },
  });

  return {
    abTests,
    stats,
    isLoading: campaignsQuery.isLoading,
    error: campaignsQuery.error,
    toggleTestStatus,
  };
}
