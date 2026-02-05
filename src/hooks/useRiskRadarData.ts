/**
 * Risk Radar Data Hook - SSOT
 * 
 * Fetches risk radar scores from v_risk_radar_summary view.
 * Replaces hardcoded mock data in RiskDashboardPage.
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * @domain FDP/Risk
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface RiskRadarData {
  liquidity_score: number;
  credit_score: number;
  market_score: number;
  operational_score: number;
  overall_score: number;
  liquidity_severity: 'low' | 'medium' | 'high';
  credit_severity: 'low' | 'medium' | 'high';
  market_severity: 'low' | 'medium' | 'high';
  operational_severity: 'low' | 'medium' | 'high';
  calculation_details: Record<string, unknown> | null;
}

export interface RiskScoreItem {
  category: string;
  score: number;
  maxScore: number;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Convert numeric score to severity level
 */
function getSeverity(score: number): 'low' | 'medium' | 'high' {
  if (score < 40) return 'low';
  if (score < 70) return 'medium';
  return 'high';
}

export function useRiskRadarData() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  const query = useQuery({
    queryKey: ['risk-radar-data', tenantId],
    queryFn: async (): Promise<RiskRadarData | null> => {
      if (!tenantId) return null;
      
      const { data, error } = await buildSelectQuery('v_risk_radar_summary', '*')
        .maybeSingle();
        
      if (error) throw error;
      
      if (!data) return null;
      
      const row = data as unknown as Record<string, unknown>;
      
      return {
        liquidity_score: Number(row.liquidity_score) || 0,
        credit_score: Number(row.credit_score) || 0,
        market_score: Number(row.market_score) || 0,
        operational_score: Number(row.operational_score) || 0,
        overall_score: Number(row.overall_score) || 0,
        liquidity_severity: getSeverity(Number(row.liquidity_score) || 0),
        credit_severity: getSeverity(Number(row.credit_score) || 0),
        market_severity: getSeverity(Number(row.market_score) || 0),
        operational_severity: getSeverity(Number(row.operational_score) || 0),
        calculation_details: row.calculation_details as Record<string, unknown> | null,
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000, // Cache for 1 minute
  });

  // Transform to array format for components that need it
  const riskScores: RiskScoreItem[] = query.data ? [
    { category: 'Liquidity', score: query.data.liquidity_score, maxScore: 100, severity: query.data.liquidity_severity },
    { category: 'Credit', score: query.data.credit_score, maxScore: 100, severity: query.data.credit_severity },
    { category: 'Market', score: query.data.market_score, maxScore: 100, severity: query.data.market_severity },
    { category: 'Operational', score: query.data.operational_score, maxScore: 100, severity: query.data.operational_severity },
  ] : [];

  // Count by severity
  const lowCount = riskScores.filter(r => r.severity === 'low').length;
  const mediumCount = riskScores.filter(r => r.severity === 'medium').length;
  const highCount = riskScores.filter(r => r.severity === 'high').length;

  return {
    ...query,
    riskScores,
    overallScore: query.data?.overall_score || 0,
    lowCount,
    mediumCount,
    highCount,
    criticalCount: 0, // No critical in current model
  };
}
