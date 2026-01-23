import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import type { HighlightSignal } from '@/components/cdp/overview/HighlightSignalCard';
import type { TopicSummary } from '@/components/cdp/overview/TopicSummarySection';

// Re-export types from components for consistency
export type { HighlightSignal } from '@/components/cdp/overview/HighlightSignalCard';
export type { TopicSummary } from '@/components/cdp/overview/TopicSummarySection';

// Types for CDP Overview data
type CategoryType = 'value' | 'velocity' | 'mix' | 'risk' | 'quality';
type SeverityType = 'critical' | 'high' | 'medium';
type DirectionType = 'up' | 'down' | 'stable';

export interface PendingDecision {
  id: string;
  title: string;
  insightSource: string;
  severity: SeverityType;
  status: 'new' | 'reviewing' | 'decided' | 'archived';
  assignedTo: string;
  daysOpen: number;
  riskIfIgnored: number;
}

export interface DataConfidence {
  overallScore: number;
  identityCoverage: number;
  matchAccuracy: number;
  returnDataCompleteness: number;
  dataFreshnessDays: number;
  issues: Array<{ id: string; label: string; severity: 'critical' | 'warning' | 'info' }>;
}

export interface EquitySnapshot {
  totalEquity12M: number;
  totalEquity24M: number;
  atRiskValue: number;
  atRiskPercent: number;
  equityChange: number;
  changeDirection: DirectionType;
  topDrivers: Array<{ label: string; impact: number; direction: 'positive' | 'negative' }>;
}

// Helper to map string to category
function mapCategory(cat: string | null): CategoryType {
  const valid: CategoryType[] = ['value', 'velocity', 'mix', 'risk', 'quality'];
  const normalized = (cat || 'value').toLowerCase() as CategoryType;
  return valid.includes(normalized) ? normalized : 'value';
}

// Helper to map severity
function mapSeverity(sev: string | null): SeverityType {
  const s = (sev || 'medium').toLowerCase();
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'high';
  return 'medium';
}

/**
 * Hook để lấy highlight signals từ database
 * KHÔNG tính toán - chỉ fetch từ view
 */
export function useCDPHighlightSignals() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp-highlight-signals', tenantId],
    queryFn: async (): Promise<HighlightSignal[]> => {
      const { data, error } = await supabase
        .from('v_cdp_highlight_signals')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(10);

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.insight_code,
        headline: row.headline,
        population: row.population_type || 'Unknown',
        populationCount: row.n_customers || 0,
        direction: (row.direction || 'stable') as DirectionType,
        changePercent: Math.abs(row.change_percent || 0),
        revenueImpact: row.revenue_impact || 0,
        severity: mapSeverity(row.severity),
        category: mapCategory(row.topic || row.category),
      }));
    },
    enabled: !!tenantId,
  });
}

/**
 * Hook để lấy topic summaries từ database
 */
export function useCDPTopicSummaries() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp-topic-summaries', tenantId],
    queryFn: async (): Promise<TopicSummary[]> => {
      const { data, error } = await supabase
        .from('v_cdp_topic_summaries')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      return (data || []).map(row => ({
        category: mapCategory(row.topic || row.category),
        signalCount: row.signal_count || 0,
        criticalCount: row.critical_count || 0,
        trendDirection: (row.trend_direction || 'stable') as 'improving' | 'stable' | 'declining',
        headline: row.headline || '',
      }));
    },
    enabled: !!tenantId,
  });
}

/**
 * Hook để lấy pending decisions từ database
 */
export function useCDPPendingDecisions() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp-pending-decisions', tenantId],
    queryFn: async (): Promise<PendingDecision[]> => {
      const { data, error } = await supabase
        .from('v_cdp_pending_decisions')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(10);

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        title: row.title,
        insightSource: row.insight_source || '',
        severity: mapSeverity(row.severity),
        status: (row.status?.toLowerCase() === 'new' ? 'new' : 
                row.status?.toLowerCase() === 'in_review' ? 'reviewing' : 'new') as 'new' | 'reviewing' | 'decided' | 'archived',
        assignedTo: row.assigned_to || 'CEO',
        daysOpen: row.days_open || 0,
        riskIfIgnored: row.risk_if_ignored || 0,
      }));
    },
    enabled: !!tenantId,
  });
}

/**
 * Hook để lấy data confidence metrics từ database
 */
export function useCDPDataConfidence() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp-data-confidence', tenantId],
    queryFn: async (): Promise<DataConfidence> => {
      const { data, error } = await supabase
        .from('v_cdp_data_quality')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;

      // Default values if no data
      if (!data) {
        return {
          overallScore: 0,
          identityCoverage: 0,
          matchAccuracy: 0,
          returnDataCompleteness: 0,
          dataFreshnessDays: 0,
          issues: [],
        };
      }

      // Calculate overall score from available metrics
      const identityCov = Number(data.identity_coverage) || 0;
      const cogsCov = Number(data.cogs_coverage) || 0;
      const overallScore = Math.round((identityCov * 0.6 + cogsCov * 0.4));

      // Generate issues based on metrics
      const issues: Array<{ id: string; label: string; severity: 'critical' | 'warning' | 'info' }> = [];
      if (identityCov < 80) {
        issues.push({ id: 'identity', label: 'Identity coverage thấp', severity: identityCov < 50 ? 'critical' : 'warning' });
      }
      if (cogsCov < 70) {
        issues.push({ id: 'cogs', label: 'COGS coverage thấp', severity: cogsCov < 40 ? 'critical' : 'warning' });
      }
      const daysSinceOrder = Number(data.days_since_last_order) || 0;
      if (daysSinceOrder > 7) {
        issues.push({ id: 'freshness', label: 'Dữ liệu cũ', severity: daysSinceOrder > 30 ? 'critical' : 'warning' });
      }

      return {
        overallScore,
        identityCoverage: identityCov,
        matchAccuracy: Math.round(identityCov * 0.95), // Approximate
        returnDataCompleteness: cogsCov,
        dataFreshnessDays: daysSinceOrder,
        issues,
      };
    },
    enabled: !!tenantId,
  });
}

/**
 * Hook để lấy equity snapshot từ database
 */
export function useCDPEquitySnapshot() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp-equity-snapshot', tenantId],
    queryFn: async (): Promise<EquitySnapshot> => {
      const { data, error } = await supabase
        .from('v_cdp_equity_snapshot')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;

      // Default values if no data
      if (!data) {
        return {
          totalEquity12M: 0,
          totalEquity24M: 0,
          atRiskValue: 0,
          atRiskPercent: 0,
          equityChange: 0,
          changeDirection: 'stable',
          topDrivers: [],
        };
      }

      return {
        totalEquity12M: data.total_equity_12m || 0,
        totalEquity24M: data.total_equity_24m || 0,
        atRiskValue: data.at_risk_value || 0,
        atRiskPercent: data.at_risk_percent || 0,
        equityChange: data.equity_change || 0,
        changeDirection: (data.change_direction || 'stable') as DirectionType,
        topDrivers: [], // Would need separate table for drivers
      };
    },
    enabled: !!tenantId,
  });
}

/**
 * Composite hook for full CDP Overview data
 */
export function useCDPOverview() {
  const signals = useCDPHighlightSignals();
  const topics = useCDPTopicSummaries();
  const decisions = useCDPPendingDecisions();
  const confidence = useCDPDataConfidence();
  const equity = useCDPEquitySnapshot();

  return {
    signals: signals.data || [],
    topics: topics.data || [],
    decisions: decisions.data || [],
    confidence: confidence.data,
    equity: equity.data,
    isLoading: signals.isLoading || topics.isLoading || decisions.isLoading || confidence.isLoading || equity.isLoading,
    error: signals.error || topics.error || decisions.error || confidence.error || equity.error,
  };
}
