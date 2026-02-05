import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';

export interface InsightRegistryItem {
  code: string;
  name: string;
  description: string;
  topic: string;
  threshold: string;
  cooldownDays: number;
  owners: string[];
  isEnabled: boolean;
  isTriggered: boolean;
  triggeredCount: number;
  lastTriggeredDate: string | null;
  category: string;
  windowDays: number;
  baselineDays: number;
  populationType: string;
}

export interface InsightRegistryStats {
  totalInsights: number;
  enabledCount: number;
  triggeredCount: number;
  topicCount: number;
}

/**
 * Hook để lấy danh sách insight registry từ database
 * KHÔNG tính toán - chỉ fetch dữ liệu đã được tính sẵn trong view
 */
export function useCDPInsightRegistry() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  const { data: insights = [], isLoading, error, refetch } = useQuery({
    queryKey: ['cdp-insight-registry', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('v_cdp_insight_registry_summary', '*');

      if (error) throw error;

      // Map database fields to component interface
      // Group by code để remove duplicates (có thể có nhiều tenant_id)
      const uniqueInsights = new Map<string, InsightRegistryItem>();
      const rows = (data || []) as any[];
      
      for (const row of rows) {
        const existing = uniqueInsights.get(row.code);
        // Prefer row with tenant_id match (has triggered info)
        if (!existing || row.tenant_id === tenantId) {
          uniqueInsights.set(row.code, {
            code: row.code,
            name: row.name,
            description: row.description || '',
            topic: row.topic,
            threshold: row.threshold || '',
            cooldownDays: row.cooldown_days,
            owners: row.owners || ['CEO'],
            isEnabled: row.is_enabled,
            isTriggered: row.is_triggered || false,
            triggeredCount: row.triggered_count || 0,
            lastTriggeredDate: row.last_triggered_date,
            category: row.category,
            windowDays: row.window_days,
            baselineDays: row.baseline_days,
            populationType: row.population_type,
          });
        }
      }

      return Array.from(uniqueInsights.values());
    },
    enabled: !!tenantId && isReady,
  });

  // Tính stats từ dữ liệu đã fetch (không query thêm)
  const stats: InsightRegistryStats = {
    totalInsights: insights.length,
    enabledCount: insights.filter(i => i.isEnabled).length,
    triggeredCount: insights.filter(i => i.isTriggered).length,
    topicCount: new Set(insights.map(i => i.topic)).size,
  };

  return {
    insights,
    stats,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook để toggle insight enabled/disabled
 */
export function useCDPInsightToggle() {
  const queryClient = useQueryClient();
  const { callRpc } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ code, enabled }: { code: string; enabled: boolean }) => {
      const { error } = await callRpc('cdp_toggle_insight_enabled', {
        p_insight_code: code,
        p_enabled: enabled,
      });

      if (error) throw error;
      return { code, enabled };
    },
    onSuccess: ({ code, enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['cdp-insight-registry'] });
      toast.success(enabled ? 'Đã bật theo dõi insight' : 'Đã tạm dừng theo dõi insight', {
        description: `Insight ${code} ${enabled ? 'sẽ được hệ thống theo dõi' : 'đã tạm dừng theo dõi'}.`
      });
    },
    onError: (error) => {
      toast.error('Lỗi cập nhật insight', {
        description: error.message,
      });
    },
  });
}
