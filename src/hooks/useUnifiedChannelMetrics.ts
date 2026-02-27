/**
 * useUnifiedChannelMetrics - Unified channel metrics for MDP
 * 
 * @architecture Schema-per-Tenant v1.4.1 / DB-First SSOT
 * All aggregation via get_unified_channel_computed RPC
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
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
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  const { data, isLoading, error } = useQuery({
    queryKey: ['unified-channel-metrics', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return null;

      // DB-First: All aggregation in get_unified_channel_computed RPC
      const { data: rpcResult, error: rpcError } = await callRpc('get_unified_channel_computed', {
        p_tenant_id: tenantId,
      });

      if (rpcError) {
        console.error('[useUnifiedChannelMetrics] RPC error:', rpcError);
        return null;
      }

      const result = rpcResult as any;
      if (!result) return null;

      const totalRevenue = Number(result.total_revenue) || 0;
      const totalSpend = Number(result.total_spend) || 0;

      // Days elapsed calculation (display formatting, allowed on FE)
      const now = new Date();
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const expectedPacing = (dayOfMonth / daysInMonth) * 100;

      // Map DB-computed channel data to ChannelMetric (no business calculations)
      const channelMetrics: ChannelMetric[] = ((result.channels as any[]) || []).map((row: any) => {
        const revenue = Number(row.revenue) || 0;
        const spend = Number(row.spend) || 0;
        const orders = Number(row.orders) || 0;
        const roas = Number(row.roas) || 0;
        const cpa = Number(row.cpa) || 0;
        const cmPercent = Number(row.cm_percent) || 0;
        
        return {
          channel: row.channel as string,
          displayName: getChannelDisplayName(row.channel as string),
          actualSpend: spend,
          revenue,
          orders,
          roas,
          cpa,
          ctr: 0,
          cvr: 0,
          cmPercent,
          pacing: null,
          status: 'on-track' as const,
          isConfigured: false,
          hasBudget: false,
          budgetAmount: 0,
          budgetUtilization: 0,
          spendShare: Number(row.spend_share) || 0,
          revenueShare: Number(row.revenue_share) || 0,
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

      const summary: ChannelSummary = {
        totalActualSpend: totalSpend,
        totalPlannedBudget: totalSpend * 1.2,
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
    enabled: !!tenantId && isReady,
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
