import { useMemo } from 'react';
import { useMDPDataSSOT } from './useMDPDataSSOT';
import { 
  MarketingDecisionCard, 
  CEOMarketingSnapshot,
  MDP_V2_THRESHOLDS,
  DECISION_LANGUAGE,
  formatVND,
  DecisionCardType,
  DecisionAction,
  DecisionUrgency,
  DecisionOwner,
} from '@/types/mdp-v2';

/**
 * @deprecated Phase 7.1 - Use useMDPDecisionSignals + useMDPCEOSnapshot instead
 * 
 * This hook contains legacy business logic that should be in the database.
 * Migration path:
 * - Decision Cards: useMDPDecisionSignals() from './useMDPDecisionSignals'
 * - CEO Snapshot: useMDPCEOSnapshot() from './useMDPCEOSnapshot'
 * - Scale Opportunities: useMDPScaleOpportunities() from './useMDPCEOSnapshot'
 * 
 * All business logic is now in database views:
 * - v_mdp_decision_signals
 * - v_mdp_ceo_snapshot
 * - v_mdp_scale_opportunities
 */
export function useMarketingDecisionEngine() {
  const {
    profitAttribution,
    cashImpact,
    riskAlerts,
    cmoModeSummary,
    isLoading,
    error,
  } = useMDPDataSSOT();

  // Generate Decision Cards from deterministic rules
  const decisionCards = useMemo<MarketingDecisionCard[]>(() => {
    if (!profitAttribution || !cashImpact) return [];
    
    const cards: MarketingDecisionCard[] = [];
    const now = new Date().toISOString();

    // === RULE 1: Campaign Burning Cash ===
    // If profit ROAS < 0 for 3+ days → KILL
    profitAttribution
      .filter(p => p.profit_roas < 0 && p.ad_spend > 1000000) // > 1M spend
      .forEach(campaign => {
        const dailyLoss = Math.abs(campaign.contribution_margin) / 7; // Assume 7-day window
        
        cards.push({
          id: `burn-${campaign.campaign_id}`,
          type: 'CAMPAIGN_BURNING_CASH',
          title: DECISION_LANGUAGE.CAMPAIGN_BURNING_CASH.title,
          headline: `Negative contribution: ${formatVND(Math.abs(campaign.contribution_margin))}`,
          impactAmount: Math.abs(campaign.contribution_margin),
          projectedLoss: dailyLoss * 7, // Next 7 days if no action
          cashAtRisk: campaign.ad_spend,
          urgency: campaign.status === 'critical' ? 'IMMEDIATE' : 'TODAY',
          deadlineHours: campaign.status === 'critical' ? 4 : 24,
          daysSinceIssueStart: 3, // Minimum to trigger
          owner: 'CEO',
          recommendedAction: 'KILL',
          actionDescription: `Stop campaign "${campaign.campaign_name}" — CM%: ${(campaign.contribution_margin_percent).toFixed(1)}%`,
          campaignName: campaign.campaign_name,
          channel: campaign.channel,
          metrics: [
            { label: 'Profit ROAS', value: `${campaign.profit_roas.toFixed(2)}x`, trend: 'down', severity: 'critical' },
            { label: 'CM%', value: `${campaign.contribution_margin_percent.toFixed(1)}%`, trend: 'down', severity: 'critical' },
            { label: 'Spend', value: formatVND(campaign.ad_spend), trend: 'flat', severity: 'warning' },
          ],
          status: 'PENDING',
          createdAt: now,
        });
      });

    // === RULE 2: Fake Growth Alert ===
    // High revenue but negative CM
    profitAttribution
      .filter(p => p.gross_revenue > 10000000 && p.contribution_margin < 0) // >10M revenue but losing money
      .forEach(campaign => {
        cards.push({
          id: `fake-${campaign.campaign_id}`,
          type: 'FAKE_GROWTH_ALERT',
          title: DECISION_LANGUAGE.FAKE_GROWTH_ALERT.title,
          headline: `Revenue ${formatVND(campaign.gross_revenue)} with negative margin`,
          impactAmount: Math.abs(campaign.contribution_margin),
          projectedLoss: Math.abs(campaign.contribution_margin) * 2, // Will double if not addressed
          cashAtRisk: campaign.gross_revenue * 0.4, // COGS + fees locked
          urgency: 'TODAY',
          deadlineHours: 24,
          daysSinceIssueStart: 1,
          owner: 'CFO',
          recommendedAction: 'INVESTIGATE',
          actionDescription: `Review cost structure for "${campaign.campaign_name}" — high revenue, negative margin`,
          campaignName: campaign.campaign_name,
          channel: campaign.channel,
          metrics: [
            { label: 'Revenue', value: formatVND(campaign.gross_revenue), trend: 'up', severity: 'warning' },
            { label: 'CM', value: formatVND(campaign.contribution_margin), trend: 'down', severity: 'critical' },
            { label: 'CM%', value: `${campaign.contribution_margin_percent.toFixed(1)}%`, trend: 'down', severity: 'critical' },
          ],
          status: 'PENDING',
          createdAt: now,
        });
      });

    // === RULE 3: Delayed Cash Trap ===
    // Cash conversion < 50% - money is locked
    cashImpact
      .filter(c => c.cash_conversion_rate < MDP_V2_THRESHOLDS.PAUSE_CASH_CONVERSION_D14 && c.total_spend > 5000000)
      .forEach(channel => {
        const lockedCash = channel.total_spend - channel.cash_received;
        
        cards.push({
          id: `cash-trap-${channel.channel}`,
          type: 'DELAYED_CASH_TRAP',
          title: DECISION_LANGUAGE.DELAYED_CASH_TRAP.title,
          headline: `${formatVND(lockedCash)} locked in ${channel.channel}`,
          impactAmount: lockedCash,
          projectedLoss: lockedCash * 0.1, // 10% opportunity cost
          cashAtRisk: lockedCash,
          urgency: '48H',
          deadlineHours: 48,
          daysSinceIssueStart: channel.avg_days_to_cash || 14,
          owner: 'CFO',
          recommendedAction: 'PAUSE',
          actionDescription: `Pause spend on ${channel.channel} — ${(channel.cash_conversion_rate * 100).toFixed(0)}% cash collected`,
          campaignName: channel.campaign_name || channel.channel,
          channel: channel.channel,
          metrics: [
            { label: 'Spent', value: formatVND(channel.total_spend), trend: 'flat', severity: 'warning' },
            { label: 'Collected', value: formatVND(channel.cash_received), trend: 'flat', severity: channel.cash_conversion_rate > 0.5 ? 'ok' : 'critical' },
            { label: 'Conversion', value: `${(channel.cash_conversion_rate * 100).toFixed(0)}%`, trend: 'down', severity: 'critical' },
          ],
          status: 'PENDING',
          createdAt: now,
        });
      });

    // === RULE 4: Return Bomb Risk ===
    // High refund rate campaigns
    cashImpact
      .filter(c => {
        const refundRate = c.refund_amount / (c.cash_received + c.refund_amount || 1);
        return refundRate > MDP_V2_THRESHOLDS.CAP_RETURN_RATE;
      })
      .forEach(channel => {
        const refundRate = channel.refund_amount / (channel.cash_received + channel.refund_amount || 1);
        
        cards.push({
          id: `return-${channel.channel}`,
          type: 'RETURN_BOMB_RISK',
          title: DECISION_LANGUAGE.RETURN_BOMB_RISK.title,
          headline: DECISION_LANGUAGE.RETURN_BOMB_RISK.headline(refundRate),
          impactAmount: channel.refund_amount,
          projectedLoss: channel.refund_amount * 1.5, // Will grow
          cashAtRisk: channel.pending_cash,
          urgency: '48H',
          deadlineHours: 48,
          daysSinceIssueStart: 7,
          owner: 'CMO',
          recommendedAction: 'CAP',
          actionDescription: `Giới hạn budget ${channel.channel} và review chất lượng sản phẩm/targeting`,
          campaignName: channel.campaign_name || channel.channel,
          channel: channel.channel,
          metrics: [
            { label: 'Hoàn trả', value: formatVND(channel.refund_amount), trend: 'up', severity: 'critical' },
            { label: 'Tỷ lệ', value: `${(refundRate * 100).toFixed(0)}%`, trend: 'up', severity: 'critical' },
          ],
          status: 'PENDING',
          createdAt: now,
        });
      });

    // Sort by urgency: IMMEDIATE > TODAY > 48H > THIS_WEEK
    const urgencyOrder: Record<string, number> = { 
      'IMMEDIATE': 0, 
      'TODAY': 1, 
      '48H': 2, 
      'THIS_WEEK': 3 
    };
    
    return cards.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  }, [profitAttribution, cashImpact]);

  // Generate CEO Snapshot
  const ceoSnapshot = useMemo<CEOMarketingSnapshot>(() => {
    const marginCreated = profitAttribution
      .filter(p => p.contribution_margin > 0)
      .reduce((sum, p) => sum + p.contribution_margin, 0);
      
    const marginDestroyed = profitAttribution
      .filter(p => p.contribution_margin < 0)
      .reduce((sum, p) => sum + Math.abs(p.contribution_margin), 0);
    
    const netMargin = marginCreated - marginDestroyed;
    
    const totalCashReceived = cashImpact.reduce((sum, c) => sum + c.cash_received, 0);
    const totalCashPending = cashImpact.reduce((sum, c) => sum + c.pending_cash, 0);
    const totalCashLocked = cashImpact.reduce((sum, c) => sum + c.cash_locked_ads, 0);
    const totalSpend = cashImpact.reduce((sum, c) => sum + c.total_spend, 0);
    
    const cashConversion = totalSpend > 0 ? totalCashReceived / totalSpend : 0;
    
    const criticalCards = decisionCards.filter(c => c.urgency === 'IMMEDIATE' || c.urgency === 'TODAY');

    return {
      // Q1: Creating or destroying money?
      isCreatingMoney: netMargin > 0,
      totalMarginCreated: marginCreated,
      totalMarginDestroyed: marginDestroyed,
      netMarginPosition: netMargin,
      marginTrend: netMargin > 0 ? 'improving' : netMargin < -1000000 ? 'deteriorating' : 'stable',
      
      // Q2: Cash at risk?
      cashReceived: totalCashReceived,
      cashPending: totalCashPending,
      cashLocked: totalCashLocked,
      totalCashAtRisk: totalCashPending + totalCashLocked,
      cashConversionRate: cashConversion,
      
      // Q3: Immediate actions?
      immediateActions: criticalCards.length,
      criticalCards: criticalCards.slice(0, 5), // Max 5 critical
      
      // Trust
      dataConfidence: cmoModeSummary.risk_alerts_count === 0 ? 'high' : 
                      cmoModeSummary.critical_alerts_count > 0 ? 'low' : 'medium',
      lastUpdated: new Date().toISOString(),
    };
  }, [profitAttribution, cashImpact, decisionCards, cmoModeSummary]);

  // Scale Opportunities (positive campaigns worth growing)
  const scaleOpportunities = useMemo(() => {
    return profitAttribution
      .filter(p => 
        p.contribution_margin_percent >= MDP_V2_THRESHOLDS.SCALE_MIN_CM_PERCENT * 100 &&
        p.profit_roas > 0.5
      )
      .map(p => {
        const channelCash = cashImpact.find(c => c.channel === p.channel);
        return {
          ...p,
          cashPositive: channelCash?.is_cash_positive ?? false,
          cashConversion: channelCash?.cash_conversion_rate ?? 0,
        };
      })
      .filter(p => p.cashConversion >= MDP_V2_THRESHOLDS.SCALE_MIN_CASH_CONVERSION)
      .sort((a, b) => b.contribution_margin - a.contribution_margin)
      .slice(0, 3); // Top 3 opportunities
  }, [profitAttribution, cashImpact]);

  return {
    // Decision Cards (the core output)
    decisionCards,
    criticalCards: decisionCards.filter(c => c.urgency === 'IMMEDIATE'),
    todayCards: decisionCards.filter(c => c.urgency === 'TODAY'),
    
    // CEO Snapshot (one-screen summary)
    ceoSnapshot,
    
    // Scale Opportunities
    scaleOpportunities,
    
    // Raw data for drill-down
    profitAttribution,
    cashImpact,
    
    // Status
    isLoading,
    error,
    
    // Summary counts
    totalCards: decisionCards.length,
    criticalCount: decisionCards.filter(c => c.urgency === 'IMMEDIATE').length,
    todayCount: decisionCards.filter(c => c.urgency === 'TODAY').length,
  };
}
