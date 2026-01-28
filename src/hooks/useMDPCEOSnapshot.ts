/**
 * useMDPCEOSnapshot - SSOT Thin Wrapper for CEO View
 * 
 * Phase 7.1: Fetches pre-computed CEO snapshot from v_mdp_ceo_snapshot
 * ALL business logic is in the database - this hook ONLY fetches.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export interface CEOSnapshot {
  isCreatingMoney: boolean;
  totalMarginCreated: number;
  totalMarginDestroyed: number;
  netMarginPosition: number;
  marginTrend: 'improving' | 'stable' | 'deteriorating';
  cashReceived: number;
  cashPending: number;
  cashLocked: number;
  totalCashAtRisk: number;
  cashConversionRate: number;
  immediateActions: number;
  todayActions: number;
  totalActions: number;
  dataConfidence: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

export function useMDPCEOSnapshot() {
  const { data: tenantId } = useActiveTenantId();

  const { data: snapshot, isLoading, error } = useQuery({
    queryKey: ['mdp-ceo-snapshot', tenantId],
    queryFn: async (): Promise<CEOSnapshot | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('v_mdp_ceo_snapshot')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('[useMDPCEOSnapshot] Query error:', error);
        throw error;
      }

      if (!data) {
        // Return default snapshot when no data
        return {
          isCreatingMoney: true,
          totalMarginCreated: 0,
          totalMarginDestroyed: 0,
          netMarginPosition: 0,
          marginTrend: 'stable',
          cashReceived: 0,
          cashPending: 0,
          cashLocked: 0,
          totalCashAtRisk: 0,
          cashConversionRate: 0,
          immediateActions: 0,
          todayActions: 0,
          totalActions: 0,
          dataConfidence: 'low',
          lastUpdated: new Date().toISOString(),
        };
      }

      // Transform snake_case to camelCase
      return {
        isCreatingMoney: Boolean(data.is_creating_money),
        totalMarginCreated: Number(data.total_margin_created) || 0,
        totalMarginDestroyed: Number(data.total_margin_destroyed) || 0,
        netMarginPosition: Number(data.net_margin_position) || 0,
        marginTrend: (data.margin_trend as 'improving' | 'stable' | 'deteriorating') || 'stable',
        cashReceived: Number(data.cash_received) || 0,
        cashPending: Number(data.cash_pending) || 0,
        cashLocked: Number(data.cash_locked) || 0,
        totalCashAtRisk: Number(data.total_cash_at_risk) || 0,
        cashConversionRate: Number(data.cash_conversion_rate) || 0,
        immediateActions: Number(data.immediate_actions) || 0,
        todayActions: Number(data.today_actions) || 0,
        totalActions: Number(data.total_actions) || 0,
        dataConfidence: (data.data_confidence as 'high' | 'medium' | 'low') || 'low',
        lastUpdated: data.last_updated || new Date().toISOString(),
      };
    },
    enabled: !!tenantId,
    staleTime: 60000, // 1 minute
  });

  return {
    snapshot,
    isLoading,
    error,
  };
}

/**
 * Fetch scale opportunities from database view
 */
export function useMDPScaleOpportunities() {
  const { data: tenantId } = useActiveTenantId();

  const { data: opportunities, isLoading, error } = useQuery({
    queryKey: ['mdp-scale-opportunities', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_mdp_scale_opportunities')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_scalable', true)
        .order('contribution_margin', { ascending: false })
        .limit(5);

      if (error) {
        console.error('[useMDPScaleOpportunities] Query error:', error);
        throw error;
      }

      return (data || []).map(row => ({
        channel: row.channel,
        grossRevenue: Number(row.gross_revenue) || 0,
        netRevenue: Number(row.net_revenue) || 0,
        contributionMargin: Number(row.contribution_margin) || 0,
        contributionMarginPercent: Number(row.contribution_margin_percent) || 0,
        profitRoas: Number(row.profit_roas) || 0,
        adSpend: Number(row.ad_spend) || 0,
        isScalable: Boolean(row.is_scalable),
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    opportunities: opportunities || [],
    isLoading,
    error,
  };
}
