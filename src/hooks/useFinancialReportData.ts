/**
 * useFinancialReportData - SSOT-Compliant Financial Report Hook
 * 
 * ⚠️ ZERO calculations - fetch precomputed data only
 * 
 * Follows DB-First architecture:
 * - All KPIs, margins, and ratios come pre-computed from database views
 * - Insights are pre-generated with status and descriptions
 * - Progress percentages are pre-calculated and capped at 100
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export interface FinancialKPIs {
  netRevenue: number;
  netRevenueM: number;
  grossProfit: number;
  grossProfitM: number;
  grossMarginPercent: number;
  totalCost: number;
  totalCostM: number;
  netMarginPercent: number;
  ebitdaMarginPercent: number;
  contributionMarginPercent: number;
  cashToday: number;
  cashTodayM: number;
  cashRunwayMonths: number;
  dso: number;
  totalAR: number;
  overdueAR: number;
  overdueARPercent: number;
  snapshotAt: string | null;
}

export interface FinancialInsight {
  type: 'success' | 'warning' | 'danger';
  title: string;
  description: string;
}

export interface FinancialRatio {
  ratioCode: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  isOnTarget: boolean;
  progress: number;
}

export interface FinancialReportData {
  kpis: FinancialKPIs | null;
  insights: FinancialInsight[];
  ratios: FinancialRatio[];
}

export function useFinancialReportData() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();

  return useQuery({
    queryKey: ['financial-report-ssot', tenantId],
    queryFn: async (): Promise<FinancialReportData | null> => {
      if (!tenantId) return null;

      const [kpisRes, insightsRes, ratiosRes] = await Promise.all([
        // 1. KPIs with precomputed values
        supabase
          .from('v_financial_report_kpis')
          .select('*')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
        
        // 2. Pre-generated insights
        supabase
          .from('v_financial_insights')
          .select('*')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
        
        // 3. Ratios with targets (pre-computed progress)
        supabase
          .from('v_financial_ratios_with_targets')
          .select('*')
          .eq('tenant_id', tenantId),
      ]);

      // Map KPIs - DIRECT mapping, NO calculations
      const kpisData = kpisRes.data as Record<string, unknown> | null;
      const kpis: FinancialKPIs | null = kpisData ? {
        netRevenue: Number(kpisData.net_revenue) || 0,
        netRevenueM: Number(kpisData.net_revenue_m) || 0,
        grossProfit: Number(kpisData.gross_profit) || 0,
        grossProfitM: Number(kpisData.gross_profit_m) || 0,
        grossMarginPercent: Number(kpisData.gross_margin_percent) || 0,
        totalCost: Number(kpisData.total_cost) || 0,
        totalCostM: Number(kpisData.total_cost_m) || 0,
        netMarginPercent: Number(kpisData.net_margin_percent) || 0,
        ebitdaMarginPercent: Number(kpisData.ebitda_margin_percent) || 0,
        contributionMarginPercent: Number(kpisData.contribution_margin_percent) || 0,
        cashToday: Number(kpisData.cash_today) || 0,
        cashTodayM: Number(kpisData.cash_today_m) || 0,
        cashRunwayMonths: Number(kpisData.cash_runway_months) || 0,
        dso: Number(kpisData.dso) || 0,
        totalAR: Number(kpisData.total_ar) || 0,
        overdueAR: Number(kpisData.overdue_ar) || 0,
        overdueARPercent: Number(kpisData.overdue_ar_percent) || 0,
        snapshotAt: kpisData.snapshot_at as string | null,
      } : null;

      // Map Insights - filter only those with show=true
      const insights: FinancialInsight[] = [];
      const insightsData = insightsRes.data as Record<string, unknown> | null;
      
      if (insightsData) {
        // Gross Margin insight
        if (insightsData.gross_margin_show && insightsData.gross_margin_title) {
          insights.push({ 
            type: insightsData.gross_margin_status as 'success' | 'warning' | 'danger', 
            title: insightsData.gross_margin_title as string, 
            description: insightsData.gross_margin_description as string 
          });
        }
        // DSO insight
        if (insightsData.dso_show && insightsData.dso_title) {
          insights.push({ 
            type: insightsData.dso_status as 'success' | 'warning' | 'danger', 
            title: insightsData.dso_title as string, 
            description: insightsData.dso_description as string 
          });
        }
        // Net Margin insight
        if (insightsData.net_margin_show && insightsData.net_margin_title) {
          insights.push({ 
            type: insightsData.net_margin_status as 'success' | 'warning' | 'danger', 
            title: insightsData.net_margin_title as string, 
            description: insightsData.net_margin_description as string 
          });
        }
        // AR insight
        if (insightsData.ar_show && insightsData.ar_title) {
          insights.push({ 
            type: insightsData.ar_status as 'success' | 'warning' | 'danger', 
            title: insightsData.ar_title as string, 
            description: insightsData.ar_description as string 
          });
        }
        // Cash Health insight
        if (insightsData.cash_show && insightsData.cash_title) {
          insights.push({ 
            type: insightsData.cash_status as 'success' | 'warning' | 'danger', 
            title: insightsData.cash_title as string, 
            description: insightsData.cash_description as string 
          });
        }
      }

      // Map Ratios - DIRECT mapping from DB
      const ratiosData = (ratiosRes.data || []) as Record<string, unknown>[];
      const ratios: FinancialRatio[] = ratiosData.map(r => ({
        ratioCode: r.ratio_code as string,
        name: r.ratio_name as string,
        value: Number(r.actual_value) || 0,
        target: Number(r.target_value) || 0,
        unit: (r.unit as string) || '%',
        isOnTarget: Boolean(r.is_on_target),
        progress: Number(r.progress_percent) || 0,
      }));

      return { kpis, insights, ratios };
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}
