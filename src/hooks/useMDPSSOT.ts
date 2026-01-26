/**
 * MDP SSOT Hook - Data-Honest Marketing Platform
 * 
 * MDP MANIFESTO:
 * - Profit before Performance. Cash before Clicks.
 * - Every metric includes observed vs estimated separation
 * - No silent defaults (no fixed 55% COGS, no fixed 12% fees)
 * - Alerts ONLY from backend, never frontend-generated
 * 
 * @architecture database-first
 * @domain MDP
 * @deprecated-pattern Do NOT compute business metrics in React
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { useMemo } from 'react';
import {
  MDPSSOTResult,
  MDPCampaignAttribution,
  MDPCashImpact,
  MDPRiskAlert,
  MDPMarketingSummary,
  MDPCMOSummary,
  MDPDataQuality,
  MDPMetricValue,
  createObservedMetric,
  createEstimatedMetric,
  createUnavailableMetric,
  calculateOverallConfidence,
  countEstimatedFields,
  ConfidenceLevel,
} from '@/types/mdp-ssot';

// ============ EXPLICIT METRIC CODES ============
// Following MDP Manifesto - explicit naming, no ambiguity

export const MDP_METRIC_CODES = {
  // Revenue metrics
  GROSS_REVENUE: 'MDP_GROSS_REVENUE',
  NET_REVENUE: 'MDP_NET_REVENUE',
  DISCOUNT_GIVEN: 'MDP_DISCOUNT_GIVEN',
  
  // Cost metrics
  AD_SPEND: 'MDP_AD_SPEND',
  COGS: 'MDP_COGS',
  PLATFORM_FEES: 'MDP_PLATFORM_FEES',
  LOGISTICS_COST: 'MDP_LOGISTICS_COST',
  PAYMENT_FEES: 'MDP_PAYMENT_FEES',
  RETURN_COST: 'MDP_RETURN_COST',
  
  // Profit metrics
  CONTRIBUTION_MARGIN: 'MDP_CONTRIBUTION_MARGIN',
  CM_PERCENT: 'MDP_CM_PERCENT',
  PROFIT_ROAS: 'MDP_PROFIT_ROAS',
  
  // Cash metrics
  CASH_RECEIVED: 'MDP_CASH_RECEIVED',
  CASH_PENDING: 'MDP_CASH_PENDING',
  CASH_LOCKED: 'MDP_CASH_LOCKED',
  CASH_CONVERSION_RATE: 'MDP_CASH_CONVERSION_RATE',
  
  // Performance metrics
  ROAS_REVENUE: 'MDP_ROAS_REVENUE',
  CPA: 'MDP_CPA',
  CTR: 'MDP_CTR',
  CVR: 'MDP_CVR',
} as const;

// ============ MAIN HOOK ============

export function useMDPSSOT(): MDPSSOTResult {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  // ============ QUERY: Campaigns ============
  const campaignsQuery = useQuery({
    queryKey: ['mdp-ssot-campaigns', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('promotion_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .lte('start_date', endDateStr)
        .gte('end_date', startDateStr)
        .order('actual_cost', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // ============ QUERY: Order Items with COGS ============
  const orderItemsQuery = useQuery({
    queryKey: ['mdp-ssot-order-items', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('external_order_items')
        .select('external_order_id, sku, quantity, unit_price, total_amount, unit_cogs, total_cogs, gross_profit')
        .eq('tenant_id', tenantId)
        .limit(100000);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // ============ QUERY: Channel Fees ============
  const channelFeesQuery = useQuery({
    queryKey: ['mdp-ssot-channel-fees', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('channel_fees')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('fee_date', startDateStr)
        .lte('fee_date', endDateStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // ============ QUERY: Settlements ============
  const settlementsQuery = useQuery({
    queryKey: ['mdp-ssot-settlements', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('channel_settlements')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('period_start', startDateStr)
        .lte('period_end', endDateStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // ============ QUERY: Orders for cash tracking ============
  const ordersQuery = useQuery({
    queryKey: ['mdp-ssot-orders', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      // SSOT: Query cdp_orders instead of external_orders
      // cdp_orders contains validated financial data (all delivered, paid)
      const { data, error } = await supabase
        .from('cdp_orders')
        .select('id, channel, gross_revenue, order_at')
        .eq('tenant_id', tenantId)
        .gte('order_at', startDateStr)
        .lte('order_at', endDateStr)
        .limit(50000);
      if (error) throw error;
      // Map columns for compatibility, default: status='delivered', payment_status='paid', shipping_fee=0
      return (data || []).map(d => ({
        id: d.id,
        channel: d.channel,
        status: 'delivered' as const,
        total_amount: Number(d.gross_revenue) || 0,
        payment_status: 'paid' as const,
        order_date: d.order_at,
        shipping_fee: 0
      }));
    },
    enabled: !!tenantId,
  });

  // ============ QUERY: Marketing Expenses ============
  const expensesQuery = useQuery({
    queryKey: ['mdp-ssot-expenses', tenantId, startDateStr, endDateStr],
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

  // ============ QUERY: Backend Alerts (ONLY SOURCE OF ALERTS) ============
  const alertsQuery = useQuery({
    queryKey: ['mdp-ssot-alerts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      // Fetch from decision_cards table - backend generated
      const { data, error } = await supabase
        .from('decision_cards')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('card_type', [
          'MDP_NEGATIVE_MARGIN',
          'MDP_BURNING_CASH',
          'MDP_CAC_EXCEEDS_LTV',
          'MDP_CASH_RUNWAY_IMPACT',
          'MDP_FAKE_GROWTH',
          'MDP_ROAS_BELOW_THRESHOLD',
          'MDP_HIGH_RETURN_RATE',
          'GROWTH_SCALE_CHANNEL',
          'GROWTH_SCALE_SKU',
        ])
        .eq('status', 'OPEN')
        .order('severity_score', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // ============ DERIVED: Data Quality ============
  const dataQuality = useMemo<MDPDataQuality>(() => {
    const hasRealCOGS = (orderItemsQuery.data?.filter(i => i.total_cogs !== null).length || 0) > 0;
    const hasRealFees = (channelFeesQuery.data?.length || 0) > 0;
    const hasRealSettlements = (settlementsQuery.data?.length || 0) > 0;
    const hasChannelAnalytics = false; // TODO: add channel_analytics query if needed
    
    const ordersCount = ordersQuery.data?.length || 0;
    const campaignsCount = campaignsQuery.data?.length || 0;
    const productsCount = 0;
    
    const missing: string[] = [];
    const estimated: string[] = [];
    
    if (!hasRealCOGS) {
      missing.push('COGS data (order_items.total_cogs)');
      estimated.push('COGS');
    }
    if (!hasRealFees) {
      missing.push('Channel fees (channel_fees)');
      estimated.push('Platform Fees');
    }
    if (!hasRealSettlements) {
      missing.push('Settlements (channel_settlements)');
      estimated.push('Cash Received', 'Refunds');
    }
    
    // Calculate quality score
    let score = 100;
    if (!hasRealCOGS) score -= 30;
    if (!hasRealFees) score -= 20;
    if (!hasRealSettlements) score -= 25;
    if (ordersCount === 0) score -= 25;
    
    const qualityLevel = 
      score >= 80 ? 'excellent' :
      score >= 60 ? 'good' :
      score >= 40 ? 'fair' : 'poor';
    
    return {
      has_real_cogs: hasRealCOGS,
      has_real_fees: hasRealFees,
      has_real_settlements: hasRealSettlements,
      has_channel_analytics: hasChannelAnalytics,
      orders_count: ordersCount,
      campaigns_count: campaignsCount,
      products_count: productsCount,
      quality_score: Math.max(0, score),
      quality_level: qualityLevel,
      missing_data: missing,
      estimated_fields: estimated,
    };
  }, [orderItemsQuery.data, channelFeesQuery.data, settlementsQuery.data, ordersQuery.data, campaignsQuery.data]);

  // ============ DERIVED: COGS Lookup ============
  const cogsData = useMemo(() => {
    const items = orderItemsQuery.data || [];
    const lookup: Record<string, { cogs: number; revenue: number; count: number }> = {};
    
    items.forEach(item => {
      const orderId = item.external_order_id;
      if (!lookup[orderId]) {
        lookup[orderId] = { cogs: 0, revenue: 0, count: 0 };
      }
      lookup[orderId].cogs += item.total_cogs || (item.unit_cogs || 0) * (item.quantity || 1);
      lookup[orderId].revenue += item.total_amount || 0;
      lookup[orderId].count += 1;
    });
    
    const totalCOGS = Object.values(lookup).reduce((sum, v) => sum + v.cogs, 0);
    const totalRevenue = Object.values(lookup).reduce((sum, v) => sum + v.revenue, 0);
    const cogsRatio = totalRevenue > 0 ? totalCOGS / totalRevenue : null;
    
    return { lookup, totalCOGS, totalRevenue, cogsRatio };
  }, [orderItemsQuery.data]);

  // ============ DERIVED: Fees by Type ============
  const feesData = useMemo(() => {
    const fees = channelFeesQuery.data || [];
    const byType: Record<string, number> = {
      commission: 0,
      service: 0,
      shipping: 0,
      payment: 0,
      other: 0,
    };
    
    fees.forEach(fee => {
      const category = fee.fee_category || 'other';
      byType[category] = (byType[category] || 0) + (fee.amount || 0);
    });
    
    const totalFees = Object.values(byType).reduce((sum, v) => sum + v, 0);
    
    return { byType, totalFees };
  }, [channelFeesQuery.data]);

  // ============ DERIVED: Settlements Totals ============
  const settlementsData = useMemo(() => {
    const settlements = settlementsQuery.data || [];
    
    return settlements.reduce((acc, s) => ({
      gross_sales: acc.gross_sales + (s.gross_sales || 0),
      total_commission: acc.total_commission + (s.total_commission || 0),
      total_shipping_fee: acc.total_shipping_fee + (s.total_shipping_fee || 0),
      total_payment_fee: acc.total_payment_fee + (s.total_payment_fee || 0),
      total_service_fee: acc.total_service_fee + (s.total_service_fee || 0),
      total_refunds: acc.total_refunds + (s.total_refunds || 0),
      net_amount: acc.net_amount + (s.net_amount || 0),
      total_orders: acc.total_orders + (s.total_orders || 0),
    }), {
      gross_sales: 0,
      total_commission: 0,
      total_shipping_fee: 0,
      total_payment_fee: 0,
      total_service_fee: 0,
      total_refunds: 0,
      net_amount: 0,
      total_orders: 0,
    });
  }, [settlementsQuery.data]);

  // ============ CAMPAIGN ATTRIBUTION WITH ESTIMATION ============
  const campaignAttribution = useMemo<MDPCampaignAttribution[]>(() => {
    if (!campaignsQuery.data) return [];
    
    const activeCampaigns = campaignsQuery.data.filter(c => 
      c.status !== 'planned' && (c.total_revenue || 0) > 0
    );
    
    if (activeCampaigns.length === 0) return [];
    
    const totalCampaigns = activeCampaigns.length;
    const hasRealFees = dataQuality.has_real_fees;
    const hasRealCOGS = dataQuality.has_real_cogs;
    const hasRealSettlements = dataQuality.has_real_settlements;
    
    return activeCampaigns.map(campaign => {
      const grossRevenue = campaign.total_revenue || 0;
      const discount = campaign.total_discount_given || 0;
      const netRevenue = grossRevenue - discount;
      const adSpend = campaign.actual_cost || 0;
      const orders = campaign.total_orders || 0;
      const channel = campaign.channel || 'Unknown';
      
      // ============ COGS - With estimation metadata ============
      let cogs: MDPMetricValue<number>;
      if (hasRealCOGS && cogsData.cogsRatio !== null) {
        cogs = createObservedMetric(
          netRevenue * cogsData.cogsRatio,
          'external_order_items.total_cogs',
          Object.keys(cogsData.lookup).length
        );
      } else {
        // EXPLICITLY mark as estimated - NO SILENT DEFAULT
        cogs = createEstimatedMetric(
          netRevenue * 0.55, // Still compute but mark as estimated
          'rule_of_thumb',
          'No COGS data available. Using 55% estimate - please import order_items with unit_cogs',
          25 // Low confidence
        );
      }
      
      // ============ Platform Fees - With estimation metadata ============
      let platformFees: MDPMetricValue<number>;
      if (hasRealFees) {
        const totalFees = feesData.byType.commission + feesData.byType.service;
        const totalCampaignRevenue = activeCampaigns.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
        const revenueShare = totalCampaignRevenue > 0 ? netRevenue / totalCampaignRevenue : 1 / totalCampaigns;
        
        platformFees = createObservedMetric(
          totalFees * revenueShare,
          'channel_fees',
          channelFeesQuery.data?.length || 0
        );
      } else if (hasRealSettlements && settlementsData.gross_sales > 0) {
        const feeRatio = (settlementsData.total_commission + settlementsData.total_service_fee) / settlementsData.gross_sales;
        platformFees = createObservedMetric(
          netRevenue * feeRatio,
          'channel_settlements',
          settlementsQuery.data?.length || 0
        );
      } else {
        // EXPLICITLY mark as estimated - NO SILENT DEFAULT
        platformFees = createEstimatedMetric(
          netRevenue * 0.12,
          'rule_of_thumb',
          'No fee data available. Using 12% estimate - please import channel_fees or settlements',
          20
        );
      }
      
      // ============ Logistics Cost ============
      let logisticsCost: MDPMetricValue<number>;
      if (hasRealFees && feesData.byType.shipping > 0) {
        const totalCampaignOrders = activeCampaigns.reduce((sum, c) => sum + (c.total_orders || 0), 0);
        const orderShare = totalCampaignOrders > 0 ? orders / totalCampaignOrders : 1 / totalCampaigns;
        logisticsCost = createObservedMetric(
          feesData.byType.shipping * orderShare,
          'channel_fees.shipping',
          channelFeesQuery.data?.length || 0
        );
      } else if (hasRealSettlements && settlementsData.total_orders > 0) {
        const avgShipPerOrder = settlementsData.total_shipping_fee / settlementsData.total_orders;
        logisticsCost = createObservedMetric(
          orders * avgShipPerOrder,
          'channel_settlements.shipping_fee',
          settlementsQuery.data?.length || 0
        );
      } else {
        logisticsCost = createEstimatedMetric(
          orders * 25000,
          'industry_benchmark',
          'Using 25,000đ/order industry average - please import shipping data',
          30
        );
      }
      
      // ============ Payment Fees ============
      let paymentFees: MDPMetricValue<number>;
      if (hasRealFees && feesData.byType.payment > 0) {
        const totalCampaignRevenue = activeCampaigns.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
        const revenueShare = totalCampaignRevenue > 0 ? netRevenue / totalCampaignRevenue : 1 / totalCampaigns;
        paymentFees = createObservedMetric(
          feesData.byType.payment * revenueShare,
          'channel_fees.payment',
          channelFeesQuery.data?.length || 0
        );
      } else if (hasRealSettlements && settlementsData.gross_sales > 0) {
        const paymentRatio = settlementsData.total_payment_fee / settlementsData.gross_sales;
        paymentFees = createObservedMetric(
          netRevenue * paymentRatio,
          'channel_settlements.payment_fee',
          settlementsQuery.data?.length || 0
        );
      } else {
        paymentFees = createEstimatedMetric(
          netRevenue * 0.02,
          'industry_benchmark',
          'Using 2% payment fee estimate',
          40
        );
      }
      
      // ============ Return Cost ============
      let returnCost: MDPMetricValue<number>;
      if (hasRealSettlements && settlementsData.gross_sales > 0) {
        const refundRatio = settlementsData.total_refunds / settlementsData.gross_sales;
        returnCost = createObservedMetric(
          netRevenue * refundRatio,
          'channel_settlements.refunds',
          settlementsQuery.data?.length || 0
        );
      } else {
        returnCost = createEstimatedMetric(
          netRevenue * 0.05,
          'industry_benchmark',
          'Using 5% return rate estimate - please import settlement data',
          30
        );
      }
      
      // ============ Contribution Margin - Derived ============
      const cmValue = netRevenue - cogs.value - platformFees.value - logisticsCost.value - paymentFees.value - returnCost.value - adSpend;
      const cmPercent = netRevenue > 0 ? (cmValue / netRevenue) * 100 : 0;
      const profitRoasValue = adSpend > 0 ? cmValue / adSpend : 0;
      
      // CM estimation depends on its inputs
      const allMetrics = [cogs, platformFees, logisticsCost, paymentFees, returnCost];
      const estimatedCount = countEstimatedFields(allMetrics);
      const avgConfidence = allMetrics.reduce((sum, m) => sum + m.estimation.confidence_score, 0) / allMetrics.length;
      
      let contributionMargin: MDPMetricValue<number>;
      let contributionMarginPercent: MDPMetricValue<number>;
      let profitRoas: MDPMetricValue<number>;
      
      if (estimatedCount === 0) {
        contributionMargin = createObservedMetric(cmValue, 'calculated_from_observed');
        contributionMarginPercent = createObservedMetric(cmPercent, 'calculated_from_observed');
        profitRoas = createObservedMetric(profitRoasValue, 'calculated_from_observed');
      } else {
        const reason = `Derived from ${estimatedCount}/${allMetrics.length} estimated inputs`;
        contributionMargin = createEstimatedMetric(cmValue, 'historical_average', reason, avgConfidence);
        contributionMarginPercent = createEstimatedMetric(cmPercent, 'historical_average', reason, avgConfidence);
        profitRoas = createEstimatedMetric(profitRoasValue, 'historical_average', reason, avgConfidence);
      }
      
      // Determine status
      let status: MDPCampaignAttribution['status'];
      if (cmPercent < 0) {
        status = 'critical';
      } else if (cmPercent < 10) {
        status = 'loss';
      } else if (profitRoasValue < 0.3) {
        status = 'marginal';
      } else {
        status = 'profitable';
      }
      
      return {
        campaign_id: campaign.id,
        campaign_name: campaign.campaign_name || 'Unknown',
        channel,
        period: `${startDateStr} - ${endDateStr}`,
        
        gross_revenue: createObservedMetric(grossRevenue, 'promotion_campaigns.total_revenue'),
        discount_given: createObservedMetric(discount, 'promotion_campaigns.total_discount_given'),
        net_revenue: createObservedMetric(netRevenue, 'calculated'),
        
        ad_spend: createObservedMetric(adSpend, 'promotion_campaigns.actual_cost'),
        cogs,
        platform_fees: platformFees,
        logistics_cost: logisticsCost,
        payment_fees: paymentFees,
        return_cost: returnCost,
        
        contribution_margin: contributionMargin,
        contribution_margin_percent: contributionMarginPercent,
        profit_roas: profitRoas,
        
        status,
        overall_confidence: calculateOverallConfidence(allMetrics),
        estimated_fields_count: estimatedCount,
        total_fields_count: allMetrics.length,
      };
    });
  }, [campaignsQuery.data, dataQuality, cogsData, feesData, settlementsData, startDateStr, endDateStr, channelFeesQuery.data, settlementsQuery.data]);

  // ============ CASH IMPACT ============
  const cashImpact = useMemo<MDPCashImpact[]>(() => {
    if (!ordersQuery.data || !expensesQuery.data) return [];
    
    const channelMap = new Map<string, {
      totalSpend: number;
      cashReceived: number;
      pendingCash: number;
      refundAmount: number;
      ordersCount: number;
    }>();
    
    // Aggregate expenses
    expensesQuery.data.forEach(expense => {
      const channel = expense.channel || 'Other';
      const existing = channelMap.get(channel) || {
        totalSpend: 0, cashReceived: 0, pendingCash: 0, refundAmount: 0, ordersCount: 0
      };
      existing.totalSpend += expense.amount || 0;
      channelMap.set(channel, existing);
    });
    
    // Aggregate orders
    ordersQuery.data.forEach(order => {
      const channel = order.channel || 'Other';
      let existing = channelMap.get(channel);
      if (!existing) {
        existing = { totalSpend: 0, cashReceived: 0, pendingCash: 0, refundAmount: 0, ordersCount: 0 };
        channelMap.set(channel, existing);
      }
      
      const amount = order.total_amount || 0;
      existing.ordersCount += 1;
      
      // NOTE: cdp_orders only contains delivered & paid orders
      // So all orders go to cashReceived
      if (order.payment_status === 'paid') {
        existing.cashReceived += amount;
      } else {
        existing.pendingCash += amount;
      }
    });
    
    return Array.from(channelMap.entries()).map(([channel, data]) => {
      const totalRevenue = data.cashReceived + data.pendingCash + data.refundAmount;
      const conversionRate = totalRevenue > 0 ? data.cashReceived / totalRevenue : 0;
      const cashLocked = data.totalSpend * 0.05 * 30;
      const netCashFlow = data.cashReceived - data.totalSpend - data.refundAmount;
      const impactScore = Math.max(-100, Math.min(100, (netCashFlow / Math.max(data.totalSpend, 1)) * 100));
      
      return {
        channel,
        total_spend: createObservedMetric(data.totalSpend, 'marketing_expenses', expensesQuery.data?.length),
        cash_received: createObservedMetric(data.cashReceived, 'external_orders.payment_status=paid', data.ordersCount),
        pending_cash: createObservedMetric(data.pendingCash, 'external_orders.pending', data.ordersCount),
        refund_amount: createObservedMetric(data.refundAmount, 'external_orders.cancelled', data.ordersCount),
        cash_locked_ads: createEstimatedMetric(cashLocked, 'rule_of_thumb', '5% daily spend locked for 30 days', 50),
        cash_conversion_rate: createObservedMetric(conversionRate, 'calculated'),
        avg_days_to_cash: createEstimatedMetric(14, 'industry_benchmark', 'Industry average 14 days', 40),
        is_cash_positive: data.cashReceived > data.totalSpend,
        cash_impact_score: createObservedMetric(impactScore, 'calculated'),
      };
    });
  }, [ordersQuery.data, expensesQuery.data]);

  // ============ RISK ALERTS - FROM BACKEND ONLY ============
  const riskAlerts = useMemo<MDPRiskAlert[]>(() => {
    // CRITICAL: Alerts come from decision_cards table, NOT computed in frontend
    const backendAlerts = alertsQuery.data || [];
    
    return backendAlerts.map(alert => ({
      id: alert.id,
      type: mapCardTypeToAlertType(alert.card_type),
      severity: mapSeverityScore(alert.severity_score),
      entity_type: alert.entity_type as 'campaign' | 'channel' | 'sku',
      entity_id: alert.entity_id || '',
      entity_name: alert.entity_label || alert.title || 'Unknown',
      metric_code: alert.card_type,
      metric_value: alert.impact_amount || 0,
      threshold: 0,
      impact_amount: alert.impact_amount || 0,
      message: alert.title || '',
      recommended_action: alert.question || 'Review and take action',
      created_at: alert.created_at,
      source: 'backend' as const,
      alert_source_id: alert.id,
    }));
  }, [alertsQuery.data]);

  // ============ SUMMARIES ============
  const marketingSummary = useMemo<MDPMarketingSummary>(() => {
    const campaigns = campaignsQuery.data || [];
    const orders = ordersQuery.data || [];
    
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.actual_cost || 0), 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
    const totalOrders = orders.length;
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.total_orders || 0), 0); // Using orders as proxy
    
    return {
      period: `${startDateStr} - ${endDateStr}`,
      total_spend: createObservedMetric(totalSpend, 'promotion_campaigns.actual_cost'),
      total_revenue: createObservedMetric(totalRevenue, 'promotion_campaigns.total_revenue'),
      total_orders: createObservedMetric(totalOrders, 'external_orders'),
      total_leads: createObservedMetric(totalLeads, 'promotion_campaigns.total_orders'),
      overall_roas: totalSpend > 0 
        ? createObservedMetric(totalRevenue / totalSpend, 'calculated')
        : createUnavailableMetric(0),
      overall_cpa: totalOrders > 0 
        ? createObservedMetric(totalSpend / totalOrders, 'calculated')
        : createUnavailableMetric(0),
      overall_ctr: createEstimatedMetric(2.0, 'industry_benchmark', 'CTR requires channel_analytics data', 30),
      overall_conversion: createEstimatedMetric(3.0, 'industry_benchmark', 'CVR requires funnel data', 30),
      active_campaigns: campaigns.filter(c => c.status === 'active').length,
      alert_count: riskAlerts.length,
    };
  }, [campaignsQuery.data, ordersQuery.data, riskAlerts, startDateStr, endDateStr]);

  const cmoSummary = useMemo<MDPCMOSummary>(() => {
    const totalSpend = campaignAttribution.reduce((sum, c) => sum + c.ad_spend.value, 0);
    const totalGrossRevenue = campaignAttribution.reduce((sum, c) => sum + c.gross_revenue.value, 0);
    const totalNetRevenue = campaignAttribution.reduce((sum, c) => sum + c.net_revenue.value, 0);
    const totalCM = campaignAttribution.reduce((sum, c) => sum + c.contribution_margin.value, 0);
    
    const totalCashReceived = cashImpact.reduce((sum, c) => sum + c.cash_received.value, 0);
    const totalCashPending = cashImpact.reduce((sum, c) => sum + c.pending_cash.value, 0);
    const totalCashLocked = cashImpact.reduce((sum, c) => sum + c.cash_locked_ads.value, 0);
    const totalCashRevenue = totalCashReceived + totalCashPending;
    
    const allMetrics = campaignAttribution.flatMap(c => [
      c.cogs, c.platform_fees, c.logistics_cost, c.payment_fees, c.return_cost
    ]);
    const estimatedPercent = allMetrics.length > 0 
      ? (countEstimatedFields(allMetrics) / allMetrics.length) * 100 
      : 100;
    
    return {
      period: `${startDateStr} - ${endDateStr}`,
      total_marketing_spend: createObservedMetric(totalSpend, 'aggregated'),
      total_gross_revenue: createObservedMetric(totalGrossRevenue, 'aggregated'),
      total_net_revenue: createObservedMetric(totalNetRevenue, 'aggregated'),
      total_contribution_margin: allMetrics.length > 0 && countEstimatedFields(allMetrics) < allMetrics.length / 2
        ? createObservedMetric(totalCM, 'aggregated')
        : createEstimatedMetric(totalCM, 'historical_average', 'Some cost inputs are estimated', 60),
      contribution_margin_percent: totalNetRevenue > 0
        ? createObservedMetric((totalCM / totalNetRevenue) * 100, 'calculated')
        : createUnavailableMetric(0),
      overall_profit_roas: totalSpend > 0
        ? createObservedMetric(totalCM / totalSpend, 'calculated')
        : createUnavailableMetric(0),
      total_cash_received: createObservedMetric(totalCashReceived, 'aggregated'),
      total_cash_pending: createObservedMetric(totalCashPending, 'aggregated'),
      total_cash_locked: createEstimatedMetric(totalCashLocked, 'rule_of_thumb', 'Estimated from spend pattern', 50),
      cash_conversion_rate: totalCashRevenue > 0
        ? createObservedMetric(totalCashReceived / totalCashRevenue, 'calculated')
        : createUnavailableMetric(0),
      profitable_campaigns: campaignAttribution.filter(c => c.status === 'profitable').length,
      loss_campaigns: campaignAttribution.filter(c => c.status === 'loss' || c.status === 'critical').length,
      risk_alerts_count: riskAlerts.length,
      critical_alerts_count: riskAlerts.filter(a => a.severity === 'critical').length,
      overall_confidence: calculateOverallConfidence(allMetrics),
      estimated_metrics_percent: estimatedPercent,
    };
  }, [campaignAttribution, cashImpact, riskAlerts, startDateStr, endDateStr]);

  const isLoading = 
    campaignsQuery.isLoading || 
    orderItemsQuery.isLoading || 
    channelFeesQuery.isLoading || 
    settlementsQuery.isLoading || 
    ordersQuery.isLoading || 
    expensesQuery.isLoading ||
    alertsQuery.isLoading;

  const error = 
    campaignsQuery.error || 
    orderItemsQuery.error || 
    channelFeesQuery.error || 
    settlementsQuery.error || 
    ordersQuery.error || 
    expensesQuery.error ||
    alertsQuery.error;

  return {
    campaignAttribution,
    cashImpact,
    riskAlerts,
    marketingSummary,
    cmoSummary,
    dataQuality,
    as_of_timestamp: new Date().toISOString(),
    period: {
      start: startDateStr,
      end: endDateStr,
    },
    isLoading,
    error: error as Error | null,
  };
}

// ============ HELPER FUNCTIONS ============

function mapCardTypeToAlertType(cardType: string): MDPRiskAlert['type'] {
  const mapping: Record<string, MDPRiskAlert['type']> = {
    'MDP_NEGATIVE_MARGIN': 'negative_margin',
    'MDP_BURNING_CASH': 'burning_cash',
    'MDP_CAC_EXCEEDS_LTV': 'cac_exceeds_ltv',
    'MDP_CASH_RUNWAY_IMPACT': 'cash_runway_impact',
    'MDP_FAKE_GROWTH': 'fake_growth',
    'MDP_ROAS_BELOW_THRESHOLD': 'roas_below_threshold',
    'MDP_HIGH_RETURN_RATE': 'high_return_rate',
    'GROWTH_SCALE_CHANNEL': 'burning_cash',
    'GROWTH_SCALE_SKU': 'negative_margin',
  };
  return mapping[cardType] || 'burning_cash';
}

function mapSeverityScore(score: number | null): MDPRiskAlert['severity'] {
  if (!score) return 'info';
  if (score >= 80) return 'critical';
  if (score >= 50) return 'warning';
  return 'info';
}

// ============ DEPRECATION NOTICE ============
/**
 * @deprecated useMDPData computes metrics in frontend - use useMDPSSOT instead
 * 
 * useMDPData VIOLATES MDP Manifesto:
 * - Computes COGS with silent 55% default
 * - Computes platform fees with silent 12% default
 * - Generates alerts in frontend
 * 
 * Migration path:
 * 1. Replace useMDPData with useMDPSSOT
 * 2. Update components to handle MDPMetricValue (includes estimation status)
 * 3. Display estimation badges for estimated metrics
 */
