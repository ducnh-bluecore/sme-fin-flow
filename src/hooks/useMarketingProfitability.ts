/**
 * ============================================
 * DEPRECATED: Use useFDPMetrics instead
 * ============================================
 * 
 * This hook is kept for backwards compatibility only.
 * All new code should use useFDPMetrics as the Single Source of Truth.
 * 
 * @deprecated Use useFDPMetrics from './useFDPMetrics'
 */
import { useFDPMetrics, FDPChannelMetrics } from './useFDPMetrics';
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
  estimated_cogs: number;
  estimated_fees: number;
  contribution_margin: number;
  contribution_margin_percent: number;
  roas: number;
  profit_roas: number;
  cac: number;
  status: 'profitable' | 'marginal' | 'loss' | 'critical';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface MarketingCashImpact {
  channel: string;
  total_spend: number;
  revenue_generated: number;
  cash_received: number;
  pending_cash: number;
  refund_amount: number;
  cash_conversion_rate: number;
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
  total_cash_locked: number;
}

const MDP_THRESHOLDS = {
  MIN_CM_PERCENT: 10,
  MIN_ROAS: 2.0,
  MAX_CAC_TO_AOV: 0.3,
  MIN_CASH_CONVERSION: 0.7,
};

/**
 * @deprecated Use useFDPMetrics instead for Single Source of Truth
 * This hook now wraps useFDPMetrics for backwards compatibility
 */
export function useMarketingProfitability() {
  const { data: fdpMetrics, isLoading, error } = useFDPMetrics();

  // Convert FDP channel metrics to legacy CampaignProfit format
  const campaigns = useMemo<CampaignProfit[]>(() => {
    if (!fdpMetrics) return [];

    return fdpMetrics.channelMetrics.map((ch, idx) => {
      let status: CampaignProfit['status'];
      let riskLevel: CampaignProfit['risk_level'];

      if (ch.contributionMarginPercent < 0) {
        status = 'critical';
        riskLevel = 'critical';
      } else if (ch.contributionMarginPercent < MDP_THRESHOLDS.MIN_CM_PERCENT) {
        status = 'loss';
        riskLevel = 'high';
      } else if (ch.roas < MDP_THRESHOLDS.MIN_ROAS) {
        status = 'marginal';
        riskLevel = 'medium';
      } else {
        status = 'profitable';
        riskLevel = 'low';
      }

      return {
        campaign_id: `channel-${idx}`,
        campaign_name: ch.channel,
        channel: ch.channel,
        campaign_type: 'channel',
        budget: ch.marketingSpend,
        actual_cost: ch.marketingSpend,
        total_orders: ch.orders,
        total_revenue: ch.revenue,
        total_discount_given: 0,
        estimated_cogs: ch.cogs,
        estimated_fees: ch.fees,
        contribution_margin: ch.contributionMargin,
        contribution_margin_percent: ch.contributionMarginPercent,
        roas: ch.roas,
        profit_roas: ch.profitRoas,
        cac: ch.orders > 0 ? ch.marketingSpend / ch.orders : 0,
        status,
        risk_level: riskLevel,
      };
    });
  }, [fdpMetrics]);

  // Generate cash impact from FDP data
  const cashImpact = useMemo<MarketingCashImpact[]>(() => {
    if (!fdpMetrics) return [];

    return fdpMetrics.channelMetrics.map(ch => ({
      channel: ch.channel,
      total_spend: ch.marketingSpend,
      revenue_generated: ch.revenue,
      cash_received: ch.revenue * 0.85, // Estimate 85% cash received
      pending_cash: ch.revenue * 0.15,
      refund_amount: 0,
      cash_conversion_rate: 0.85,
      avg_days_to_cash: 14,
    }));
  }, [fdpMetrics]);

  // Generate risk alerts
  const riskAlerts = useMemo<MarketingRiskAlert[]>(() => {
    const alerts: MarketingRiskAlert[] = [];

    campaigns.forEach(campaign => {
      if (campaign.contribution_margin < 0) {
        alerts.push({
          type: 'negative_margin',
          severity: 'critical',
          campaign_name: campaign.campaign_name,
          channel: campaign.channel,
          metric_value: campaign.contribution_margin_percent,
          threshold: 0,
          impact_amount: Math.abs(campaign.contribution_margin),
          message: `Kênh ${campaign.channel} đang LỖ ${Math.abs(campaign.contribution_margin).toLocaleString()}đ`,
        });
      } else if (campaign.contribution_margin_percent < MDP_THRESHOLDS.MIN_CM_PERCENT && campaign.actual_cost > 1000000) {
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

    return alerts.sort((a, b) => b.impact_amount - a.impact_amount);
  }, [campaigns]);

  // Calculate summary from FDP metrics
  const summary = useMemo<MDPSummary>(() => {
    if (!fdpMetrics) {
      return {
        total_marketing_spend: 0,
        total_revenue_from_marketing: 0,
        total_contribution_margin: 0,
        overall_roas: 0,
        overall_profit_roas: 0,
        profitable_campaigns: 0,
        loss_campaigns: 0,
        total_cash_locked: 0,
      };
    }

    const profitableCampaigns = campaigns.filter(c => c.status === 'profitable').length;
    const lossCampaigns = campaigns.filter(c => c.status === 'loss' || c.status === 'critical').length;

    return {
      total_marketing_spend: fdpMetrics.marketing.totalSpend,
      total_revenue_from_marketing: fdpMetrics.revenue.orderRevenue,
      total_contribution_margin: fdpMetrics.profit.contributionMargin,
      overall_roas: fdpMetrics.marketing.roas,
      overall_profit_roas: fdpMetrics.marketing.profitRoas,
      profitable_campaigns: profitableCampaigns,
      loss_campaigns: lossCampaigns,
      total_cash_locked: fdpMetrics.marketing.totalSpend * 0.05, // Estimate 5% locked
    };
  }, [fdpMetrics, campaigns]);

  return {
    campaigns,
    cashImpact,
    riskAlerts,
    summary,
    isLoading,
    error,
    thresholds: MDP_THRESHOLDS,
  };
}
