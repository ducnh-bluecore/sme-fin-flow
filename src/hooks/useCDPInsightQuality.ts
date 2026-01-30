import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';

export interface InsightQualitySummary {
  totalInsights: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  codesTested: number;
  lastCheckAt: string | null;
}

export interface InsightValidationResult {
  insightCode: string;
  insightEventId: string;
  sourceCustomerCount: number;
  reportedCustomerCount: number;
  customerMatch: boolean;
  sourceMetricValue: number;
  reportedMetricValue: number;
  metricMatch: boolean;
  overallPassed: boolean;
}

/**
 * Hook để lấy Insight Quality Summary từ audit log
 */
export function useCDPInsightQualitySummary() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-insight-quality-summary', tenantId],
    queryFn: async (): Promise<InsightQualitySummary | null> => {
      let query = client
        .from('v_cdp_insight_quality_summary' as any)
        .select('*');

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error fetching insight quality summary:', error);
        return null;
      }

      if (!data) return null;

      const row = data as any;
      return {
        totalInsights: Number(row.total_insights) || 0,
        passedCount: Number(row.passed_count) || 0,
        failedCount: Number(row.failed_count) || 0,
        passRate: Number(row.pass_rate) || 0,
        codesTested: Number(row.codes_tested) || 0,
        lastCheckAt: row.last_check_at,
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook để validate insight accuracy so với source data
 */
export function useCDPValidateInsightAccuracy(insightCode?: string) {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-validate-insight-accuracy', tenantId, insightCode],
    queryFn: async (): Promise<InsightValidationResult[]> => {
      const { data, error } = await client.rpc('cdp_validate_insight_accuracy', {
        p_tenant_id: tenantId,
        p_insight_code: insightCode || null,
      });

      if (error) {
        console.error('Error validating insight accuracy:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        insightCode: row.insight_code,
        insightEventId: row.insight_event_id,
        sourceCustomerCount: row.source_customer_count || 0,
        reportedCustomerCount: row.reported_customer_count || 0,
        customerMatch: row.customer_match ?? true,
        sourceMetricValue: Number(row.source_metric_value) || 0,
        reportedMetricValue: Number(row.reported_metric_value) || 0,
        metricMatch: row.metric_match ?? true,
        overallPassed: row.overall_passed ?? true,
      }));
    },
    enabled: !!tenantId && isReady,
    staleTime: 2 * 60 * 1000,
  });
}
