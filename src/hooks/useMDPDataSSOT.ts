/**
 * ============================================
 * MDP DATA SSOT - Wrapper for Migration
 * ============================================
 * 
 * This hook provides a compatibility layer for migrating
 * from useMDPData to useMDPSSOT.
 * 
 * It exposes the same interface as useMDPData but uses
 * useMDPSSOT under the hood, converting types as needed.
 * 
 * MIGRATION PATH:
 * 1. Replace `useMDPData` import with `useMDPDataSSOT`
 * 2. Access `.estimation` on metrics that need transparency
 * 3. Eventually migrate fully to useMDPSSOT
 * 
 * @architecture database-first
 * @domain MDP
 */

import { useMDPSSOT } from './useMDPSSOT';
import { useMemo } from 'react';
import {
  MDP_THRESHOLDS,
  type MarketingPerformance,
  type ProfitAttribution,
  type CashImpact,
  type MarketingRiskAlert,
  type FunnelStage,
  type ExecutionAlert,
  type MarketingModeSummary,
  type CMOModeSummary,
} from './useMDPData';

// Re-export types for compatibility
export type {
  MarketingPerformance,
  ProfitAttribution,
  CashImpact,
  MarketingRiskAlert,
  FunnelStage,
  ExecutionAlert,
  MarketingModeSummary,
  CMOModeSummary,
};

// MDP_THRESHOLDS already exported via re-export
export { MDP_THRESHOLDS };

/**
 * SSOT-compliant MDP Data hook
 * 
 * Drop-in replacement for useMDPData that uses SSOT-compliant
 * data sources with estimation metadata.
 */
export function useMDPDataSSOT() {
  const ssot = useMDPSSOT();

  // Convert MDPCampaignAttribution to ProfitAttribution
  const profitAttribution = useMemo<ProfitAttribution[]>(() => {
    return ssot.campaignAttribution.map(ca => ({
      campaign_id: ca.campaign_id,
      campaign_name: ca.campaign_name,
      channel: ca.channel,
      cohort: ca.period,
      gross_revenue: ca.gross_revenue.value,
      discount_given: ca.discount_given.value,
      net_revenue: ca.net_revenue.value,
      ad_spend: ca.ad_spend.value,
      cogs: ca.cogs.value,
      platform_fees: ca.platform_fees.value,
      logistics_cost: ca.logistics_cost.value,
      payment_fees: ca.payment_fees.value,
      return_cost: ca.return_cost.value,
      contribution_margin: ca.contribution_margin.value,
      contribution_margin_percent: ca.contribution_margin_percent.value,
      profit_roas: ca.profit_roas.value,
      status: ca.status,
      // NEW: Attach estimation metadata for transparency
      _estimation: {
        cogs: ca.cogs.estimation,
        platform_fees: ca.platform_fees.estimation,
        logistics_cost: ca.logistics_cost.estimation,
        overall_confidence: ca.overall_confidence,
        estimated_fields_count: ca.estimated_fields_count,
      },
    }));
  }, [ssot.campaignAttribution]);

  // Convert MDPCashImpact to CashImpact
  const cashImpact = useMemo<CashImpact[]>(() => {
    return ssot.cashImpact.map(ci => ({
      channel: ci.channel,
      campaign_id: ci.campaign_id,
      campaign_name: ci.channel, // Use channel as name for compatibility
      total_spend: ci.total_spend.value,
      cash_received: ci.cash_received.value,
      pending_cash: ci.pending_cash.value,
      refund_amount: ci.refund_amount.value,
      cash_locked_ads: ci.cash_locked_ads.value,
      cash_conversion_rate: ci.cash_conversion_rate.value,
      avg_days_to_cash: ci.avg_days_to_cash.value,
      is_cash_positive: ci.is_cash_positive,
      cash_impact_score: ci.cash_impact_score.value,
      // NEW: Estimation metadata
      _estimation: {
        cash_received: ci.cash_received.estimation,
        pending_cash: ci.pending_cash.estimation,
      },
    }));
  }, [ssot.cashImpact]);

  // Convert MDPRiskAlert to MarketingRiskAlert
  const riskAlerts = useMemo<MarketingRiskAlert[]>(() => {
    return ssot.riskAlerts.map(ra => ({
      type: ra.type as MarketingRiskAlert['type'],
      severity: ra.severity as 'warning' | 'critical',
      campaign_name: ra.entity_name,
      channel: ra.entity_type === 'channel' ? ra.entity_id : 'Unknown',
      metric_value: ra.metric_value,
      threshold: ra.threshold,
      impact_amount: ra.impact_amount,
      message: ra.message,
      recommended_action: ra.recommended_action,
      // NEW: Source tracking
      _source: {
        id: ra.id,
        source: ra.source,
        created_at: ra.created_at,
      },
    }));
  }, [ssot.riskAlerts]);

  // Convert summaries
  const marketingModeSummary = useMemo<MarketingModeSummary>(() => {
    const ms = ssot.marketingSummary;
    return {
      total_spend: ms.total_spend.value,
      total_leads: ms.total_leads.value,
      total_orders: ms.total_orders.value,
      total_revenue: ms.total_revenue.value,
      overall_cpa: ms.overall_cpa.value,
      overall_roas: ms.overall_roas.value,
      overall_ctr: ms.overall_ctr.value,
      overall_conversion: ms.overall_conversion.value,
      active_campaigns: ms.active_campaigns,
      execution_alerts_count: ms.alert_count,
    };
  }, [ssot.marketingSummary]);

  const cmoModeSummary = useMemo<CMOModeSummary>(() => {
    const cs = ssot.cmoSummary;
    return {
      total_marketing_spend: cs.total_marketing_spend.value,
      total_gross_revenue: cs.total_gross_revenue.value,
      total_net_revenue: cs.total_net_revenue.value,
      total_contribution_margin: cs.total_contribution_margin.value,
      contribution_margin_percent: cs.contribution_margin_percent.value,
      overall_profit_roas: cs.overall_profit_roas.value,
      profitable_campaigns: cs.profitable_campaigns,
      loss_campaigns: cs.loss_campaigns,
      total_cash_received: cs.total_cash_received.value,
      total_cash_pending: cs.total_cash_pending.value,
      total_cash_locked: cs.total_cash_locked.value,
      cash_conversion_rate: cs.cash_conversion_rate.value,
      risk_alerts_count: cs.risk_alerts_count,
      critical_alerts_count: cs.critical_alerts_count,
      // NEW: Data quality
      _dataQuality: {
        overall_confidence: cs.overall_confidence,
        estimated_metrics_percent: cs.estimated_metrics_percent,
      },
    };
  }, [ssot.cmoSummary]);

  // Create mock marketing performance (for compatibility)
  const marketingPerformance = useMemo<MarketingPerformance[]>(() => {
    return ssot.campaignAttribution.map(ca => ({
      campaign_id: ca.campaign_id,
      campaign_name: ca.campaign_name,
      channel: ca.channel,
      campaign_type: 'general',
      status: 'active' as const,
      spend: ca.ad_spend.value,
      impressions: 0, // Not available in SSOT
      clicks: 0,
      leads: 0,
      orders: 0,
      revenue: ca.gross_revenue.value,
      ctr: 0,
      cpc: 0,
      cpa: 0,
      roas: ca.ad_spend.value > 0 ? ca.gross_revenue.value / ca.ad_spend.value : 0,
      conversion_rate: 0,
    }));
  }, [ssot.campaignAttribution]);

  // Mock funnel data (not available in SSOT - show empty)
  const funnelData = useMemo<FunnelStage[]>(() => {
    return [];
  }, []);

  // Execution alerts are not in SSOT (they were frontend-generated violations)
  const executionAlerts = useMemo<ExecutionAlert[]>(() => {
    return [];
  }, []);

  return {
    // Marketing Mode
    marketingPerformance,
    funnelData,
    executionAlerts,
    marketingModeSummary,
    
    // CMO Mode
    profitAttribution,
    cashImpact,
    riskAlerts,
    cmoModeSummary,
    
    // Thresholds
    thresholds: MDP_THRESHOLDS,
    
    // Loading state
    isLoading: ssot.isLoading,
    error: ssot.error,
    
    // NEW: SSOT extras
    dataQuality: ssot.dataQuality,
    as_of_timestamp: ssot.as_of_timestamp,
  };
}
