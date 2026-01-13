import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { useMemo } from 'react';

export interface CampaignProfit {
  campaign_id: string;
  campaign_name: string;
  channel: string;
  campaign_type: string;
  budget: number;
  actual_cost: number;
  total_orders: number;
  total_revenue: number;
  total_discount_given: number;
  // Calculated fields - Profit Attribution
  estimated_cogs: number;
  estimated_fees: number;
  contribution_margin: number;
  contribution_margin_percent: number;
  roas: number;
  profit_roas: number; // CM / Ad Spend
  cac: number;
  status: 'profitable' | 'marginal' | 'loss' | 'critical';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface MarketingCashImpact {
  channel: string;
  total_spend: number;
  revenue_generated: number;
  cash_received: number; // Thực thu
  pending_cash: number; // Chờ về
  refund_amount: number;
  cash_conversion_rate: number; // % tiền thực về / revenue
  avg_days_to_cash: number;
}

export interface MarketingRiskAlert {
  type: 'burning_cash' | 'negative_margin' | 'low_roas' | 'high_cac' | 'fake_growth';
  severity: 'warning' | 'critical';
  campaign_name: string;
  channel: string;
  metric_value: number;
  threshold: number;
  impact_amount: number;
  message: string;
}

export interface MDPSummary {
  total_marketing_spend: number;
  total_revenue_from_marketing: number;
  total_contribution_margin: number;
  overall_roas: number;
  overall_profit_roas: number;
  profitable_campaigns: number;
  loss_campaigns: number;
  total_cash_locked: number; // Tiền bị khóa trong ads
}

// FDP-compliant thresholds
const MDP_THRESHOLDS = {
  MIN_CM_PERCENT: 10, // Margin tối thiểu
  MIN_ROAS: 2.0,
  MAX_CAC_TO_AOV: 0.3, // CAC không quá 30% AOV
  MIN_CASH_CONVERSION: 0.7, // Ít nhất 70% tiền về
};

export function useMarketingProfitability() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  // Fetch campaigns
  const campaignsQuery = useQuery({
    queryKey: ['mdp-campaigns', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('promotion_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('start_date', startDateStr)
        .lte('end_date', endDateStr)
        .order('actual_cost', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch marketing expenses by channel
  const expensesQuery = useQuery({
    queryKey: ['mdp-expenses', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('marketing_expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch channel analytics for cash impact
  const channelQuery = useQuery({
    queryKey: ['mdp-channel-analytics', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('channel_analytics')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('analytics_date', startDateStr)
        .lte('analytics_date', endDateStr);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch orders for cash tracking
  const ordersQuery = useQuery({
    queryKey: ['mdp-orders', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('external_orders')
        .select('id, channel, status, total_amount, payment_status, order_date')
        .eq('tenant_id', tenantId)
        .gte('order_date', startDateStr)
        .lte('order_date', endDateStr);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Process campaign profitability
  const campaignProfits = useMemo<CampaignProfit[]>(() => {
    if (!campaignsQuery.data) return [];

    return campaignsQuery.data.map(campaign => {
      const revenue = campaign.total_revenue || 0;
      const cost = campaign.actual_cost || 0;
      const orders = campaign.total_orders || 0;
      const discount = campaign.total_discount_given || 0;

      // Estimate COGS at 60% of net revenue (after discount)
      const netRevenue = revenue - discount;
      const estimatedCogs = netRevenue * 0.6;
      
      // Estimate platform fees at 15%
      const estimatedFees = netRevenue * 0.15;
      
      // Contribution Margin = Net Revenue - COGS - Fees - Marketing Cost
      const contributionMargin = netRevenue - estimatedCogs - estimatedFees - cost;
      const contributionMarginPercent = netRevenue > 0 ? (contributionMargin / netRevenue) * 100 : 0;
      
      // ROAS = Revenue / Ad Spend
      const roas = cost > 0 ? revenue / cost : 0;
      
      // Profit ROAS = CM / Ad Spend
      const profitRoas = cost > 0 ? contributionMargin / cost : 0;
      
      // CAC = Ad Spend / Orders
      const cac = orders > 0 ? cost / orders : 0;

      // Determine status based on FDP thresholds
      let status: CampaignProfit['status'];
      let riskLevel: CampaignProfit['risk_level'];

      if (contributionMarginPercent < 0) {
        status = 'critical';
        riskLevel = 'critical';
      } else if (contributionMarginPercent < MDP_THRESHOLDS.MIN_CM_PERCENT) {
        status = 'loss';
        riskLevel = 'high';
      } else if (roas < MDP_THRESHOLDS.MIN_ROAS) {
        status = 'marginal';
        riskLevel = 'medium';
      } else {
        status = 'profitable';
        riskLevel = 'low';
      }

      return {
        campaign_id: campaign.id,
        campaign_name: campaign.campaign_name || 'Unknown',
        channel: campaign.channel || 'Unknown',
        campaign_type: campaign.campaign_type || 'general',
        budget: campaign.budget || 0,
        actual_cost: cost,
        total_orders: orders,
        total_revenue: revenue,
        total_discount_given: discount,
        estimated_cogs: estimatedCogs,
        estimated_fees: estimatedFees,
        contribution_margin: contributionMargin,
        contribution_margin_percent: contributionMarginPercent,
        roas,
        profit_roas: profitRoas,
        cac,
        status,
        risk_level: riskLevel,
      };
    });
  }, [campaignsQuery.data]);

  // Process cash impact by channel
  const cashImpact = useMemo<MarketingCashImpact[]>(() => {
    if (!expensesQuery.data || !ordersQuery.data) return [];

    const channelMap = new Map<string, MarketingCashImpact>();

    // Aggregate expenses by channel
    expensesQuery.data.forEach(expense => {
      const channel = expense.channel || 'Other';
      const existing = channelMap.get(channel) || {
        channel,
        total_spend: 0,
        revenue_generated: 0,
        cash_received: 0,
        pending_cash: 0,
        refund_amount: 0,
        cash_conversion_rate: 0,
        avg_days_to_cash: 14, // Default estimate
      };
      existing.total_spend += expense.amount || 0;
      channelMap.set(channel, existing);
    });

    // Aggregate orders by channel
    ordersQuery.data.forEach(order => {
      const channel = order.channel || 'Other';
      const existing = channelMap.get(channel);
      if (!existing) return;

      const amount = order.total_amount || 0;
      existing.revenue_generated += amount;

      if (order.payment_status === 'paid' && order.status === 'delivered') {
        existing.cash_received += amount;
      } else if (order.status === 'cancelled' || order.status === 'returned') {
        existing.refund_amount += amount;
      } else {
        existing.pending_cash += amount;
      }
    });

    // Calculate conversion rates
    return Array.from(channelMap.values()).map(impact => ({
      ...impact,
      cash_conversion_rate: impact.revenue_generated > 0 
        ? impact.cash_received / impact.revenue_generated 
        : 0,
    }));
  }, [expensesQuery.data, ordersQuery.data]);

  // Generate risk alerts
  const riskAlerts = useMemo<MarketingRiskAlert[]>(() => {
    const alerts: MarketingRiskAlert[] = [];

    campaignProfits.forEach(campaign => {
      // Alert 1: Negative margin - critical
      if (campaign.contribution_margin < 0) {
        alerts.push({
          type: 'negative_margin',
          severity: 'critical',
          campaign_name: campaign.campaign_name,
          channel: campaign.channel,
          metric_value: campaign.contribution_margin_percent,
          threshold: 0,
          impact_amount: Math.abs(campaign.contribution_margin),
          message: `Campaign đang LỖ ${Math.abs(campaign.contribution_margin).toLocaleString()}đ`,
        });
      }
      // Alert 2: Burning cash - margin too low
      else if (campaign.contribution_margin_percent < MDP_THRESHOLDS.MIN_CM_PERCENT && campaign.actual_cost > 1000000) {
        alerts.push({
          type: 'burning_cash',
          severity: 'warning',
          campaign_name: campaign.campaign_name,
          channel: campaign.channel,
          metric_value: campaign.contribution_margin_percent,
          threshold: MDP_THRESHOLDS.MIN_CM_PERCENT,
          impact_amount: campaign.actual_cost,
          message: `Margin chỉ ${campaign.contribution_margin_percent.toFixed(1)}% - đốt tiền`,
        });
      }

      // Alert 3: Low ROAS
      if (campaign.roas > 0 && campaign.roas < MDP_THRESHOLDS.MIN_ROAS && campaign.actual_cost > 500000) {
        alerts.push({
          type: 'low_roas',
          severity: 'warning',
          campaign_name: campaign.campaign_name,
          channel: campaign.channel,
          metric_value: campaign.roas,
          threshold: MDP_THRESHOLDS.MIN_ROAS,
          impact_amount: campaign.actual_cost * (1 - campaign.roas / MDP_THRESHOLDS.MIN_ROAS),
          message: `ROAS ${campaign.roas.toFixed(2)}x thấp hơn ngưỡng ${MDP_THRESHOLDS.MIN_ROAS}x`,
        });
      }
    });

    // Sort by impact amount
    return alerts.sort((a, b) => b.impact_amount - a.impact_amount);
  }, [campaignProfits]);

  // Calculate summary
  const summary = useMemo<MDPSummary>(() => {
    const totalSpend = campaignProfits.reduce((sum, c) => sum + c.actual_cost, 0);
    const totalRevenue = campaignProfits.reduce((sum, c) => sum + c.total_revenue, 0);
    const totalCM = campaignProfits.reduce((sum, c) => sum + c.contribution_margin, 0);
    const profitableCampaigns = campaignProfits.filter(c => c.status === 'profitable').length;
    const lossCampaigns = campaignProfits.filter(c => c.status === 'loss' || c.status === 'critical').length;

    // Estimate cash locked in ads float (5% of daily spend × 30 days)
    const dailySpend = totalSpend / 30;
    const cashLocked = dailySpend * 30 * 0.05;

    return {
      total_marketing_spend: totalSpend,
      total_revenue_from_marketing: totalRevenue,
      total_contribution_margin: totalCM,
      overall_roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      overall_profit_roas: totalSpend > 0 ? totalCM / totalSpend : 0,
      profitable_campaigns: profitableCampaigns,
      loss_campaigns: lossCampaigns,
      total_cash_locked: cashLocked,
    };
  }, [campaignProfits]);

  return {
    campaigns: campaignProfits,
    cashImpact,
    riskAlerts,
    summary,
    isLoading: campaignsQuery.isLoading || expensesQuery.isLoading || channelQuery.isLoading,
    error: campaignsQuery.error || expensesQuery.error || channelQuery.error,
    thresholds: MDP_THRESHOLDS,
  };
}
