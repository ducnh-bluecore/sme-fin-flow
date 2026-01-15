import { useMemo } from 'react';
import { useChannelBudgets } from './useChannelBudgets';
import { useMDPData } from './useMDPData';

/**
 * UNIFIED CHANNEL METRICS - Single Source of Truth
 * ================================================
 * Hook này là nguồn dữ liệu duy nhất cho tất cả metrics theo kênh.
 * Mọi component đều PHẢI dùng hook này để đảm bảo consistency.
 * 
 * Data sources (all from useMDPData - SINGLE SOURCE):
 * - budgetPacingData: actualSpend = campaign actual_cost + marketing_expenses
 * - marketingPerformance: revenue, orders, clicks, impressions
 * - profitAttribution: COGS, fees, CM (using same formula as CMO Mode)
 * 
 * + channel_budgets: plannedBudget (only when is_active = true)
 */

export interface UnifiedChannelMetric {
  channel: string;
  displayName: string;
  // Spend & Budget (Single source: budgetPacingData + channel_budgets)
  actualSpend: number;
  plannedBudget: number;
  hasBudget: boolean;
  isConfigured: boolean;
  // Pacing (Calculated from above)
  pacing: number | null; // null if no budget configured
  expectedPacing: number;
  variance: number;
  variancePercent: number;
  status: 'on-track' | 'underspend' | 'overspend' | 'critical' | 'no-budget';
  // Revenue & Orders
  revenue: number;
  orders: number;
  clicks: number;
  impressions: number;
  // Calculated metrics
  roas: number;
  cpa: number;
  ctr: number;
  cvr: number;
  spendShare: number;
  revenueShare: number;
  // Targets (from channel_budgets)
  targetROAS: number;
  maxCPA: number;
  targetCTR: number;
  targetCVR: number;
  targetCM: number;
  budgetAmount: number;
  revenueTarget: number;
  // KPI Achievement
  roasAchieved: boolean;
  cpaAchieved: boolean;
  ctrAchieved: boolean;
  cvrAchieved: boolean;
  cmAchieved: boolean;
  budgetUtilization: number;
  contributionMargin: number;
  cmPercent: number;
}

export interface UnifiedSummary {
  totalActualSpend: number;
  totalPlannedBudget: number;
  totalRevenue: number;
  totalOrders: number;
  overallPacing: number;
  expectedPacing: number;
  daysElapsed: number;
  daysRemaining: number;
  variance: number;
  variancePercent: number;
  dailyAvgSpend: number;
  projectedTotal: number;
  projectedOverspend: number;
  status: 'on-track' | 'underspend' | 'overspend' | 'critical';
}

// Normalize channel name for consistent grouping
const normalizeChannel = (channel: string): string => {
  const lower = channel?.toLowerCase() || 'unknown';
  if (lower.includes('facebook') || lower.includes('fb') || lower.includes('meta')) return 'facebook';
  if (lower.includes('google') || lower.includes('gg')) return 'google';
  if (lower.includes('shopee')) return 'shopee';
  if (lower.includes('lazada')) return 'lazada';
  if (lower.includes('tiktok') || lower.includes('tik')) return 'tiktok';
  if (lower.includes('sendo')) return 'sendo';
  if (lower.includes('website') || lower.includes('direct')) return 'website';
  if (lower.includes('offline') || lower.includes('retail')) return 'offline';
  if (lower === 'all' || lower.includes('multi')) return 'multi-channel';
  return lower;
};

// Display name mapping
const getChannelDisplayName = (channel: string): string => {
  const names: Record<string, string> = {
    'facebook': 'Facebook',
    'google': 'Google',
    'shopee': 'Shopee',
    'lazada': 'Lazada',
    'tiktok': 'TikTok',
    'sendo': 'Sendo',
    'website': 'Website',
    'offline': 'Offline/Retail',
    'multi-channel': 'Đa kênh',
  };
  return names[channel] || channel.charAt(0).toUpperCase() + channel.slice(1);
};

export function useUnifiedChannelMetrics() {
  const { budgets, budgetsMap, isLoading: budgetsLoading } = useChannelBudgets();
  const { 
    budgetPacingData, 
    marketingPerformance,
    profitAttribution,
    cmoModeSummary,
    dataQuality,
    isLoading: mdpLoading 
  } = useMDPData();

  const hasConfiguredBudgets = useMemo(() => {
    return budgets.some(b => b.is_active && (b.budget_amount || 0) > 0);
  }, [budgets]);

  // Build unified channel metrics
  const channelMetrics = useMemo<UnifiedChannelMetric[]>(() => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = 30;
    const expectedPacing = (dayOfMonth / daysInMonth) * 100;

    // Aggregate campaign performance by channel
    const perfMap = new Map<string, { revenue: number; orders: number; clicks: number; impressions: number }>();
    marketingPerformance.forEach(c => {
      const ch = normalizeChannel(c.channel);
      const existing = perfMap.get(ch) || { revenue: 0, orders: 0, clicks: 0, impressions: 0 };
      perfMap.set(ch, {
        revenue: existing.revenue + c.revenue,
        orders: existing.orders + c.orders,
        clicks: existing.clicks + c.clicks,
        impressions: existing.impressions + c.impressions,
      });
    });

    // Aggregate profit attribution by channel (SINGLE SOURCE OF TRUTH for CM)
    const cmMap = new Map<string, { cm: number; netRevenue: number }>();
    profitAttribution.forEach(p => {
      const ch = normalizeChannel(p.channel);
      const existing = cmMap.get(ch) || { cm: 0, netRevenue: 0 };
      cmMap.set(ch, {
        cm: existing.cm + p.contribution_margin,
        netRevenue: existing.netRevenue + p.net_revenue,
      });
    });

    // Build spend map from budgetPacingData (SINGLE SOURCE OF TRUTH for spend)
    const spendMap = new Map<string, number>();
    budgetPacingData.forEach(p => {
      const ch = normalizeChannel(p.channel);
      spendMap.set(ch, (spendMap.get(ch) || 0) + (p.actualSpend || 0));
    });

    // Get all unique channels
    const allChannels = new Set<string>();
    budgetPacingData.forEach(p => allChannels.add(normalizeChannel(p.channel)));
    marketingPerformance.forEach(c => allChannels.add(normalizeChannel(c.channel)));

    // Calculate totals for share calculations
    let totalSpend = 0;
    let totalRevenue = 0;
    
    allChannels.forEach(ch => {
      const configured = budgetsMap.get(ch);
      const isActive = hasConfiguredBudgets ? !!configured?.is_active : true;
      if (isActive || !hasConfiguredBudgets) {
        totalSpend += spendMap.get(ch) || 0;
      }
      totalRevenue += perfMap.get(ch)?.revenue || 0;
    });

    return Array.from(allChannels).map(channel => {
      const configured = budgetsMap.get(channel);
      const isActiveBudget = !!configured?.is_active;
      
      // SPEND: from budgetPacingData (campaign actual_cost + marketing_expenses)
      const actualSpend = spendMap.get(channel) || 0;
      
      // PLANNED BUDGET: from channel_budgets (only if active)
      const plannedBudget = hasConfiguredBudgets
        ? (isActiveBudget ? (configured?.budget_amount || 0) : 0)
        : (budgetPacingData.find(p => normalizeChannel(p.channel) === channel)?.plannedBudget || 0);
      
      const hasBudget = plannedBudget > 0;
      
      // PACING calculation
      const pacing = hasBudget ? (actualSpend / plannedBudget) * 100 : null;
      const variance = hasBudget ? actualSpend - (plannedBudget * dayOfMonth / daysInMonth) : 0;
      const variancePercent = hasBudget && plannedBudget > 0 
        ? ((actualSpend / (plannedBudget * dayOfMonth / daysInMonth)) - 1) * 100 
        : 0;
      
      // STATUS
      let status: 'on-track' | 'underspend' | 'overspend' | 'critical' | 'no-budget';
      if (!hasBudget) {
        status = 'no-budget';
      } else if (Math.abs(variancePercent) <= 10) {
        status = 'on-track';
      } else if (variancePercent < -10) {
        status = 'underspend';
      } else if (variancePercent > 20) {
        status = 'critical';
      } else {
        status = 'overspend';
      }

      // Performance metrics
      const perf = perfMap.get(channel) || { revenue: 0, orders: 0, clicks: 0, impressions: 0 };
      const revenue = perf.revenue;
      const orders = perf.orders;
      const clicks = perf.clicks;
      const impressions = perf.impressions;

      // Calculated metrics (using unified spend)
      const roas = actualSpend > 0 ? revenue / actualSpend : 0;
      const cpa = orders > 0 ? actualSpend / orders : 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cvr = clicks > 0 ? (orders / clicks) * 100 : 0;

      // CONTRIBUTION MARGIN - Use from profitAttribution (SINGLE SOURCE OF TRUTH)
      // This ensures consistency with CMO Mode and Channel Analysis pages
      const cmData = cmMap.get(channel);
      const contributionMargin = cmData?.cm ?? 0;
      const netRevenue = cmData?.netRevenue ?? revenue;
      const cmPercent = netRevenue > 0 ? (contributionMargin / netRevenue) * 100 : 0;

      // Targets from channel_budgets
      const targetROAS = isActiveBudget ? (configured?.target_roas || 3) : 3;
      const maxCPA = isActiveBudget ? (configured?.max_cpa || 100000) : 100000;
      const targetCTR = isActiveBudget ? (configured?.target_ctr || 1.5) : 1.5;
      const targetCVR = isActiveBudget ? (configured?.target_cvr || 2) : 2;
      const targetCM = isActiveBudget ? (configured?.min_contribution_margin || 15) : 15;
      const budgetAmount = isActiveBudget ? (configured?.budget_amount || 0) : 0;
      const revenueTarget = isActiveBudget ? (configured?.revenue_target || 0) : 0;

      return {
        channel,
        displayName: getChannelDisplayName(channel),
        actualSpend,
        plannedBudget,
        hasBudget,
        isConfigured: isActiveBudget,
        pacing,
        expectedPacing,
        variance,
        variancePercent,
        status,
        revenue,
        orders,
        clicks,
        impressions,
        roas,
        cpa,
        ctr,
        cvr,
        spendShare: totalSpend > 0 ? (actualSpend / totalSpend) * 100 : 0,
        revenueShare: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
        targetROAS,
        maxCPA,
        targetCTR,
        targetCVR,
        targetCM,
        budgetAmount,
        revenueTarget,
        roasAchieved: roas >= targetROAS,
        cpaAchieved: cpa <= maxCPA || cpa === 0,
        ctrAchieved: ctr >= targetCTR,
        cvrAchieved: cvr >= targetCVR,
        cmAchieved: cmPercent >= targetCM,
        budgetUtilization: budgetAmount > 0 ? (actualSpend / budgetAmount) * 100 : 0,
        contributionMargin,
        cmPercent,
      };
    }).sort((a, b) => b.actualSpend - a.actualSpend);
  }, [budgets, budgetsMap, budgetPacingData, marketingPerformance, profitAttribution, hasConfiguredBudgets]);

  // Summary metrics
  const summary = useMemo<UnifiedSummary>(() => {
    const daysInMonth = 30;
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysElapsed = dayOfMonth;
    const daysRemaining = daysInMonth - daysElapsed;
    
    // Only include configured channels if any are configured
    const activeChannels = hasConfiguredBudgets 
      ? channelMetrics.filter(ch => ch.isConfigured)
      : channelMetrics;

    const totalActualSpend = activeChannels.reduce((sum, ch) => sum + ch.actualSpend, 0);
    const totalPlannedBudget = activeChannels.reduce((sum, ch) => sum + ch.plannedBudget, 0);
    const totalRevenue = activeChannels.reduce((sum, ch) => sum + ch.revenue, 0);
    const totalOrders = activeChannels.reduce((sum, ch) => sum + ch.orders, 0);

    const expectedSpend = (totalPlannedBudget / daysInMonth) * daysElapsed;
    const overallPacing = totalPlannedBudget > 0 ? (totalActualSpend / totalPlannedBudget) * 100 : 0;
    const expectedPacing = (daysElapsed / daysInMonth) * 100;
    
    const variance = totalActualSpend - expectedSpend;
    const variancePercent = expectedSpend > 0 ? (variance / expectedSpend) * 100 : 0;
    
    const dailyAvgSpend = daysElapsed > 0 ? totalActualSpend / daysElapsed : 0;
    const projectedTotal = dailyAvgSpend * daysInMonth;
    const projectedOverspend = projectedTotal - totalPlannedBudget;

    let status: 'on-track' | 'underspend' | 'overspend' | 'critical';
    if (Math.abs(variancePercent) <= 10) {
      status = 'on-track';
    } else if (variancePercent < -10) {
      status = 'underspend';
    } else if (variancePercent > 20) {
      status = 'critical';
    } else {
      status = 'overspend';
    }

    return {
      totalActualSpend,
      totalPlannedBudget,
      totalRevenue,
      totalOrders,
      overallPacing,
      expectedPacing,
      daysElapsed,
      daysRemaining,
      variance,
      variancePercent,
      dailyAvgSpend,
      projectedTotal,
      projectedOverspend,
      status,
    };
  }, [channelMetrics, hasConfiguredBudgets]);

  // Lookup by channel name
  const getChannelMetric = (channel: string): UnifiedChannelMetric | undefined => {
    const normalized = normalizeChannel(channel);
    return channelMetrics.find(ch => ch.channel === normalized);
  };

  return {
    channelMetrics,
    summary,
    getChannelMetric,
    hasConfiguredBudgets,
    isLoading: budgetsLoading || mdpLoading,
  };
}
