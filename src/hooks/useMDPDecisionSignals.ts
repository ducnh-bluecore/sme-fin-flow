/**
 * useMDPDecisionSignals - SSOT Thin Wrapper
 * 
 * Fetches pre-computed decision signals from v_mdp_decision_signals view.
 * ALL business logic is in the database - this hook ONLY fetches.
 * 
 * MANIFESTO COMPLIANCE:
 * - NO client-side computation
 * - NO threshold logic
 * - NO decision rules
 * - ONLY fetch and transform for UI
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { 
  MarketingDecisionCard, 
  DecisionCardType, 
  DecisionAction, 
  DecisionUrgency, 
  DecisionOwner,
  DECISION_LANGUAGE,
  formatVND,
} from '@/types/mdp-v2';

// Types matching the v_mdp_decision_signals view
export interface MDPDecisionSignal {
  tenant_id: string;
  channel: string;
  gross_revenue: number;
  net_revenue: number;
  contribution_margin: number;
  contribution_margin_percent: number;
  ad_spend: number;
  profit_roas: number | null;
  impressions: number;
  clicks: number;
  conversions: number;
  order_count: number;
  recommended_action: 'KILL' | 'PAUSE' | 'CAP' | 'SCALE' | 'MONITOR';
  urgency: 'IMMEDIATE' | 'TODAY' | '48H' | 'THIS_WEEK';
  decision_owner: 'CEO' | 'CFO' | 'CMO';
  computed_at: string;
}

export interface MDPConfig {
  id: string;
  tenant_id: string;
  config_key: string;
  config_value: number;
  description: string | null;
}

/**
 * Fetch decision signals from database view
 * This is a THIN WRAPPER - no business logic here
 */
export function useMDPDecisionSignals() {
  const { data: tenantId } = useActiveTenantId();

  const { data: signals, isLoading, error } = useQuery({
    queryKey: ['mdp-decision-signals', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_mdp_decision_signals')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return (data || []) as MDPDecisionSignal[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Transform DB signals to UI Decision Cards
  // This is ONLY UI transformation, not business logic
  const decisionCards = (signals || [])
    .filter(s => s.recommended_action !== 'MONITOR')
    .map(signal => transformToDecisionCard(signal));

  // Categorize by urgency for UI display
  const criticalCards = decisionCards.filter(c => c.urgency === 'IMMEDIATE');
  const todayCards = decisionCards.filter(c => c.urgency === 'TODAY');
  const weekCards = decisionCards.filter(c => c.urgency === 'THIS_WEEK' || c.urgency === '48H');

  // Summary for CEO view
  const summary = {
    totalCards: decisionCards.length,
    criticalCount: criticalCards.length,
    todayCount: todayCards.length,
    totalImpact: decisionCards.reduce((sum, c) => sum + c.impactAmount, 0),
    dataSource: 'v_mdp_decision_signals',
    computedAt: signals?.[0]?.computed_at || new Date().toISOString(),
  };

  return {
    // Raw signals from DB
    signals: signals || [],
    
    // Transformed for UI
    decisionCards,
    criticalCards,
    todayCards,
    weekCards,
    
    // Summary
    summary,
    
    // Status
    isLoading,
    error,
  };
}

/**
 * Fetch MDP config thresholds
 */
export function useMDPConfig() {
  const { data: tenantId } = useActiveTenantId();

  const { data: config, isLoading } = useQuery({
    queryKey: ['mdp-config', tenantId],
    queryFn: async () => {
      if (!tenantId) return {};

      const { data, error } = await supabase
        .from('mdp_config')
        .select('config_key, config_value')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      // Transform to key-value object
      const configMap: Record<string, number> = {};
      (data || []).forEach(row => {
        configMap[row.config_key] = typeof row.config_value === 'number' 
          ? row.config_value 
          : parseFloat(String(row.config_value));
      });
      
      return configMap;
    },
    enabled: !!tenantId,
    staleTime: 30 * 60 * 1000, // 30 minutes - config rarely changes
  });

  return { config: config || {}, isLoading };
}

/**
 * Transform database signal to UI DecisionCard
 * This is ONLY formatting/presentation, not business logic
 */
function transformToDecisionCard(signal: MDPDecisionSignal): MarketingDecisionCard {
  const cardType = getCardType(signal);
  const language = DECISION_LANGUAGE[cardType];
  
  return {
    id: `${signal.channel}-${signal.recommended_action}`,
    type: cardType,
    title: language?.title || 'Decision Required',
    headline: getHeadline(signal, cardType),
    impactAmount: Math.abs(signal.contribution_margin),
    projectedLoss: signal.contribution_margin < 0 ? Math.abs(signal.contribution_margin) * 2 : 0,
    cashAtRisk: signal.ad_spend,
    urgency: signal.urgency as DecisionUrgency,
    deadlineHours: getDeadlineHours(signal.urgency),
    daysSinceIssueStart: 1,
    owner: signal.decision_owner as DecisionOwner,
    recommendedAction: signal.recommended_action as DecisionAction,
    actionDescription: getActionDescription(signal),
    campaignName: signal.channel,
    channel: signal.channel,
    metrics: [
      {
        label: 'Profit ROAS',
        value: signal.profit_roas !== null ? `${signal.profit_roas.toFixed(2)}x` : 'N/A',
        trend: signal.profit_roas !== null && signal.profit_roas < 0 ? 'down' : 'flat',
        severity: signal.profit_roas !== null && signal.profit_roas < 0 ? 'critical' : 'ok',
      },
      {
        label: 'CM%',
        value: `${(signal.contribution_margin_percent * 100).toFixed(1)}%`,
        trend: signal.contribution_margin_percent < 0 ? 'down' : 'up',
        severity: signal.contribution_margin_percent < 0 ? 'critical' : 'ok',
      },
      {
        label: 'Spend',
        value: formatVND(signal.ad_spend),
        trend: 'flat',
        severity: 'ok',
      },
    ],
    status: 'PENDING',
    createdAt: signal.computed_at,
  };
}

function getCardType(signal: MDPDecisionSignal): DecisionCardType {
  if (signal.recommended_action === 'KILL' && signal.profit_roas !== null && signal.profit_roas < 0) {
    return 'CAMPAIGN_BURNING_CASH';
  }
  if (signal.recommended_action === 'KILL' && signal.contribution_margin < 0 && signal.gross_revenue > 0) {
    return 'FAKE_GROWTH_ALERT';
  }
  if (signal.recommended_action === 'PAUSE') {
    return 'DELAYED_CASH_TRAP';
  }
  if (signal.recommended_action === 'CAP') {
    return 'RETURN_BOMB_RISK';
  }
  return 'CAMPAIGN_BURNING_CASH';
}

function getHeadline(signal: MDPDecisionSignal, cardType: DecisionCardType): string {
  switch (cardType) {
    case 'CAMPAIGN_BURNING_CASH':
      return `Negative contribution: ${formatVND(Math.abs(signal.contribution_margin))}`;
    case 'FAKE_GROWTH_ALERT':
      return `Revenue ${formatVND(signal.gross_revenue)} with negative margin`;
    case 'DELAYED_CASH_TRAP':
      return `Low cash conversion on ${signal.channel}`;
    case 'RETURN_BOMB_RISK':
      return `High return rate detected`;
    default:
      return `Action required for ${signal.channel}`;
  }
}

function getDeadlineHours(urgency: string): number {
  switch (urgency) {
    case 'IMMEDIATE': return 4;
    case 'TODAY': return 24;
    case '48H': return 48;
    default: return 168; // 1 week
  }
}

function getActionDescription(signal: MDPDecisionSignal): string {
  switch (signal.recommended_action) {
    case 'KILL':
      return `Stop channel "${signal.channel}" — CM%: ${(signal.contribution_margin_percent * 100).toFixed(1)}%`;
    case 'PAUSE':
      return `Pause spend on ${signal.channel} until cash conversion improves`;
    case 'CAP':
      return `Limit budget on ${signal.channel} and review quality`;
    case 'SCALE':
      return `Consider increasing budget for ${signal.channel}`;
    default:
      return `Review ${signal.channel} performance`;
  }
}
