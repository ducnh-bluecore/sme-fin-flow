/**
 * useCDPOverview - CDP Overview hooks
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
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
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-highlight-signals', tenantId],
    queryFn: async (): Promise<HighlightSignal[]> => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('v_cdp_highlight_signals', '*')
        .limit(10);

      if (error) throw error;

      return ((data || []) as unknown as Record<string, unknown>[]).map(row => ({
        id: row.insight_code as string,
        headline: row.headline as string,
        population: (row.population_type || 'Unknown') as string,
        populationCount: (row.n_customers || 0) as number,
        direction: ((row.direction || 'stable') as DirectionType),
        changePercent: Math.abs((row.change_percent || 0) as number),
        revenueImpact: (row.revenue_impact || 0) as number,
        severity: mapSeverity(row.severity as string | null),
        category: mapCategory((row.topic || row.category) as string | null),
      }));
    },
    enabled: isReady,
  });
}

/**
 * Hook để lấy topic summaries từ database
 */
export function useCDPTopicSummaries() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-topic-summaries', tenantId],
    queryFn: async (): Promise<TopicSummary[]> => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('v_cdp_topic_summaries', '*');

      if (error) throw error;

      return ((data || []) as unknown as Record<string, unknown>[]).map(row => ({
        category: mapCategory((row.topic || row.category) as string | null),
        signalCount: (row.signal_count || 0) as number,
        criticalCount: (row.critical_count || 0) as number,
        trendDirection: ((row.trend_direction || 'stable') as 'improving' | 'stable' | 'declining'),
        headline: (row.headline || '') as string,
      }));
    },
    enabled: isReady,
  });
}

/**
 * Hook để lấy pending decisions từ database
 */
export function useCDPPendingDecisions() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-pending-decisions', tenantId],
    queryFn: async (): Promise<PendingDecision[]> => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('v_cdp_pending_decisions', '*')
        .limit(10);

      if (error) throw error;

      return ((data || []) as unknown as Record<string, unknown>[]).map(row => ({
        id: row.id as string,
        title: row.title as string,
        insightSource: (row.insight_source || '') as string,
        severity: mapSeverity(row.severity as string | null),
        status: ((row.status as string)?.toLowerCase() === 'new' ? 'new' : 
                (row.status as string)?.toLowerCase() === 'in_review' ? 'reviewing' : 'new') as 'new' | 'reviewing' | 'decided' | 'archived',
        assignedTo: (row.assigned_to || 'CEO') as string,
        daysOpen: (row.days_open || 0) as number,
        riskIfIgnored: (row.risk_if_ignored || 0) as number,
      }));
    },
    enabled: isReady,
  });
}

/**
 * Hook để lấy data confidence metrics từ database
 */
export function useCDPDataConfidence() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-data-confidence', tenantId],
    queryFn: async (): Promise<DataConfidence> => {
      if (!tenantId) return {
        overallScore: 0,
        identityCoverage: 0,
        matchAccuracy: 0,
        returnDataCompleteness: 0,
        dataFreshnessDays: 0,
        issues: [],
      };
      
      let query = client.from('v_cdp_data_quality' as any).select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.maybeSingle();

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

      const row = data as unknown as Record<string, unknown>;
      
      // Calculate overall score from available metrics
      const identityCov = Number(row.identity_coverage) || 0;
      const cogsCov = Number(row.cogs_coverage) || 0;
      const overallScore = Math.round((identityCov * 0.6 + cogsCov * 0.4));

      // Generate issues based on metrics
      const issues: Array<{ id: string; label: string; severity: 'critical' | 'warning' | 'info' }> = [];
      if (identityCov < 80) {
        issues.push({ id: 'identity', label: 'Identity coverage thấp', severity: identityCov < 50 ? 'critical' : 'warning' });
      }
      if (cogsCov < 70) {
        issues.push({ id: 'cogs', label: 'COGS coverage thấp', severity: cogsCov < 40 ? 'critical' : 'warning' });
      }
      const daysSinceOrder = Number(row.days_since_last_order) || 0;
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
    enabled: isReady,
  });
}

/**
 * Hook để lấy equity snapshot từ database
 */
export function useCDPEquitySnapshotForOverview() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-equity-snapshot-overview', tenantId],
    queryFn: async (): Promise<EquitySnapshot> => {
      if (!tenantId) return {
        totalEquity12M: 0,
        totalEquity24M: 0,
        atRiskValue: 0,
        atRiskPercent: 0,
        equityChange: 0,
        changeDirection: 'stable',
        topDrivers: [],
      };
      
      let query = client.from('v_cdp_equity_snapshot' as any).select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.maybeSingle();

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

      const row = data as unknown as Record<string, unknown>;

      return {
        totalEquity12M: (row.total_equity_12m || 0) as number,
        totalEquity24M: (row.total_equity_24m || 0) as number,
        atRiskValue: (row.at_risk_value || 0) as number,
        atRiskPercent: (row.at_risk_percent || 0) as number,
        equityChange: (row.equity_change || 0) as number,
        changeDirection: ((row.change_direction || 'stable') as DirectionType),
        topDrivers: [], // Would need separate table for drivers
      };
    },
    enabled: isReady,
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
  const equity = useCDPEquitySnapshotForOverview();

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

// Alias for backward compatibility
export { useCDPEquitySnapshotForOverview as useCDPEquitySnapshot };
