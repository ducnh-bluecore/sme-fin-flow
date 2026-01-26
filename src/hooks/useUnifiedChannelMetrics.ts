/**
 * useUnifiedChannelMetrics - Unified channel metrics for MDP
 * 
 * Consolidates channel performance data for Budget Pacing and Channel Breakdown
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

export interface ChannelMetric {
  channel: string;
  displayName: string;
  actualSpend: number;
  revenue: number;
  orders: number;
  roas: number;
  cpa: number;
  ctr: number;
  cvr: number;
  cmPercent: number;
  pacing: number | null;
  status: 'on-track' | 'underspend' | 'overspend' | 'critical';
  isConfigured: boolean;
  hasBudget: boolean;
  budgetAmount: number;
  budgetUtilization: number;
  spendShare: number;
  revenueShare: number;
  targetROAS: number;
  maxCPA: number;
  targetCM: number;
  targetCTR: number;
  targetCVR: number;
  revenueTarget: number;
  roasAchieved: boolean;
  cpaAchieved: boolean;
  cmAchieved: boolean;
  ctrAchieved: boolean;
  cvrAchieved: boolean;
}

export interface ChannelSummary {
  totalActualSpend: number;
  totalPlannedBudget: number;
  overallPacing: number;
  expectedPacing: number;
  variance: number;
  variancePercent: number;
  projectedTotal: number;
  projectedOverspend: number;
  daysElapsed: number;
  daysRemaining: number;
  dailyAvgSpend: number;
  status: 'on-track' | 'underspend' | 'overspend' | 'critical';
}

const getChannelDisplayName = (channel: string): string => {
  const names: Record<string, string> = {
    'SHOPEE': 'Shopee',
    'LAZADA': 'Lazada',
    'TIKTOK': 'TikTok Shop',
    'META': 'Meta Ads',
    'GOOGLE': 'Google Ads',
    'WEBSITE': 'Website',
    'OFFLINE': 'Offline',
  };
  return names[channel.toUpperCase()] || channel;
};

export function useUnifiedChannelMetrics() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  const { data, isLoading, error } = useQuery({
    queryKey: ['unified-channel-metrics', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return null;

      // Fetch channel performance from v_channel_pl_summary
      const { data: channelData, error: channelError } = await supabase
        .from('v_channel_pl_summary' as any)
        .select('*')
        .eq('tenant_id', tenantId);

      if (channelError) {
        console.error('[useUnifiedChannelMetrics] Error:', channelError);
        return null;
      }

      // Aggregate totals
      const totalRevenue = (channelData || []).reduce((sum: number, c: any) => 
        sum + (Number(c.gross_revenue) || 0), 0);
      const totalSpend = (channelData || []).reduce((sum: number, c: any) => 
        sum + (Number(c.total_fees) || 0), 0);

      // Calculate days elapsed in period
      const now = new Date();
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const expectedPacing = (dayOfMonth / daysInMonth) * 100;

      // Map to channel metrics
      const channelMetrics: ChannelMetric[] = (channelData || []).map((row: any) => {
        const revenue = Number(row.gross_revenue) || 0;
        const spend = Number(row.total_fees) || 0;
        const orders = Number(row.order_count) || 0;
        const roas = spend > 0 ? revenue / spend : 0;
        const cpa = orders > 0 ? spend / orders : 0;
        const cmPercent = revenue > 0 ? ((Number(row.gross_profit) || 0) / revenue) * 100 : 0;
        
        return {
          channel: row.channel,
          displayName: getChannelDisplayName(row.channel),
          actualSpend: spend,
          revenue,
          orders,
          roas,
          cpa,
          ctr: 0, // Not available from this view
          cvr: orders > 0 ? (orders / Math.max(orders * 50, 1)) * 100 : 0, // Estimate
          cmPercent,
          pacing: null, // Would need budget config
          status: 'on-track' as const,
          isConfigured: false,
          hasBudget: false,
          budgetAmount: 0,
          budgetUtilization: 0,
          spendShare: totalSpend > 0 ? (spend / totalSpend) * 100 : 0,
          revenueShare: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
          targetROAS: 2.5,
          maxCPA: 500000,
          targetCM: 15,
          targetCTR: 2,
          targetCVR: 3,
          revenueTarget: 0,
          roasAchieved: roas >= 2.5,
          cpaAchieved: cpa <= 500000,
          cmAchieved: cmPercent >= 15,
          ctrAchieved: false,
          cvrAchieved: false,
        };
      });

      // Build summary
      const summary: ChannelSummary = {
        totalActualSpend: totalSpend,
        totalPlannedBudget: totalSpend * 1.2, // Estimate 
        overallPacing: 0,
        expectedPacing,
        variance: 0,
        variancePercent: 0,
        projectedTotal: totalSpend,
        projectedOverspend: 0,
        daysElapsed: dayOfMonth,
        daysRemaining: daysInMonth - dayOfMonth,
        dailyAvgSpend: dayOfMonth > 0 ? totalSpend / dayOfMonth : 0,
        status: 'on-track',
      };

      return {
        channelMetrics,
        summary,
        hasConfiguredBudgets: false,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    channelMetrics: data?.channelMetrics || [],
    summary: data?.summary || {
      totalActualSpend: 0,
      totalPlannedBudget: 0,
      overallPacing: 0,
      expectedPacing: 0,
      variance: 0,
      variancePercent: 0,
      projectedTotal: 0,
      projectedOverspend: 0,
      daysElapsed: 0,
      daysRemaining: 30,
      dailyAvgSpend: 0,
      status: 'on-track' as const,
    },
    hasConfiguredBudgets: data?.hasConfiguredBudgets || false,
    isLoading,
    error,
  };
}
