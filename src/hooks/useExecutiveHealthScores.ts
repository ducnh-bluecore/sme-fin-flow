/**
 * useExecutiveHealthScores - SSOT Hook for Executive Health Radar
 * 
 * ✅ DB-FIRST: All scores pre-computed in v_executive_health_scores view
 * ✅ NO client-side calculations - pure data fetch
 * ✅ Formulas centralized in DB (×15, ×2.5, ×4 multipliers)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export interface HealthDimension {
  dimension: string;
  score: number;
  fullMark: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
  formulaKey: string;
}

export interface ExecutiveHealthData {
  dimensions: HealthDimension[];
  overallScore: number;
  overallStatus: 'good' | 'warning' | 'critical';
  goodCount: number;
  warningCount: number;
  criticalCount: number;
  snapshotAt: string | null;
  
  // Raw values for display
  runwayMonths: number;
  dso: number;
  grossMargin: number;
  ccc: number;
  revenueYoY: number;
  ebitdaMargin: number;
}

interface DBHealthScores {
  tenant_id: string;
  liquidity_score: number;
  liquidity_status: string;
  runway_months: number;
  receivables_score: number;
  receivables_status: string;
  dso: number;
  profitability_score: number;
  profitability_status: string;
  gross_margin: number;
  efficiency_score: number;
  efficiency_status: string;
  ccc: number;
  growth_score: number;
  growth_status: string;
  revenue_yoy: number;
  stability_score: number;
  stability_status: string;
  ebitda_margin: number;
  overall_score: number;
  overall_status: string;
  good_count: number;
  warning_count: number;
  critical_count: number;
  snapshot_at: string | null;
}

/**
 * Fetches pre-computed health scores from DB view
 * ZERO client-side calculations
 */
export function useExecutiveHealthScores() {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['executive-health-scores', tenantId],
    queryFn: async (): Promise<ExecutiveHealthData | null> => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('v_executive_health_scores')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching health scores:', error);
        throw error;
      }
      
      if (!data) {
        // Return default empty state
        return {
          dimensions: [],
          overallScore: 0,
          overallStatus: 'critical',
          goodCount: 0,
          warningCount: 0,
          criticalCount: 0,
          snapshotAt: null,
          runwayMonths: 0,
          dso: 0,
          grossMargin: 0,
          ccc: 0,
          revenueYoY: 0,
          ebitdaMargin: 0,
        };
      }
      
      const dbData = data as DBHealthScores;
      
      // Direct mapping from DB - NO calculations
      const dimensions: HealthDimension[] = [
        {
          dimension: 'Thanh khoản',
          score: Math.round(dbData.liquidity_score),
          fullMark: 100,
          status: dbData.liquidity_status as 'good' | 'warning' | 'critical',
          description: `Cash runway: ${dbData.runway_months?.toFixed(1) || '0'} tháng`,
          formulaKey: 'liquidity',
        },
        {
          dimension: 'Công nợ',
          score: Math.round(dbData.receivables_score),
          fullMark: 100,
          status: dbData.receivables_status as 'good' | 'warning' | 'critical',
          description: `DSO: ${Math.round(dbData.dso || 0)} ngày`,
          formulaKey: 'receivables',
        },
        {
          dimension: 'Lợi nhuận',
          score: Math.round(dbData.profitability_score),
          fullMark: 100,
          status: dbData.profitability_status as 'good' | 'warning' | 'critical',
          description: `Gross Margin: ${(dbData.gross_margin || 0).toFixed(1)}%`,
          formulaKey: 'profitability',
        },
        {
          dimension: 'Hiệu quả',
          score: Math.round(dbData.efficiency_score),
          fullMark: 100,
          status: dbData.efficiency_status as 'good' | 'warning' | 'critical',
          description: `CCC: ${Math.round(dbData.ccc || 0)} ngày`,
          formulaKey: 'efficiency',
        },
        {
          dimension: 'Tăng trưởng',
          score: Math.round(dbData.growth_score),
          fullMark: 100,
          status: dbData.growth_status as 'good' | 'warning' | 'critical',
          description: `YoY: ${(dbData.revenue_yoy || 0) >= 0 ? '+' : ''}${(dbData.revenue_yoy || 0).toFixed(1)}%`,
          formulaKey: 'growth',
        },
        {
          dimension: 'Ổn định',
          score: Math.round(dbData.stability_score),
          fullMark: 100,
          status: dbData.stability_status as 'good' | 'warning' | 'critical',
          description: `EBITDA: ${(dbData.ebitda_margin || 0).toFixed(1)}%`,
          formulaKey: 'stability',
        },
      ];
      
      return {
        dimensions,
        overallScore: Math.round(dbData.overall_score || 0),
        overallStatus: dbData.overall_status as 'good' | 'warning' | 'critical',
        goodCount: dbData.good_count || 0,
        warningCount: dbData.warning_count || 0,
        criticalCount: dbData.critical_count || 0,
        snapshotAt: dbData.snapshot_at,
        runwayMonths: dbData.runway_months || 0,
        dso: dbData.dso || 0,
        grossMargin: dbData.gross_margin || 0,
        ccc: dbData.ccc || 0,
        revenueYoY: dbData.revenue_yoy || 0,
        ebitdaMargin: dbData.ebitda_margin || 0,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
