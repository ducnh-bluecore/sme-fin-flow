import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TenantHealthData {
  tenant_id: string;
  health_score: number;
  risk_level: 'healthy' | 'monitor' | 'at_risk' | 'critical';
  daily_active_users: number;
  weekly_active_users: number;
  total_page_views: number;
  total_decisions: number;
  modules_used: string[];
  module_usage: Record<string, number>;
  avg_session_duration_min: number;
  last_activity_at: string | null;
  daily_trend: Array<{
    date: string;
    events: number;
    users: number;
  }>;
  calculated_at: string;
}

export interface CSAlert {
  id: string;
  tenant_id: string;
  alert_type: 'churn_risk' | 'inactive' | 'stuck_onboarding' | 'engagement_drop' | 'data_stale' | 'low_adoption';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string | null;
  recommended_action: string | null;
  metadata: Record<string, unknown>;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'ignored';
  assigned_to: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch tenant health metrics
 */
export function useTenantHealth(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenant-health', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase.rpc('get_tenant_health', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return data as unknown as TenantHealthData;
    },
    enabled: !!tenantId,
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}

/**
 * Hook to fetch tenant activity summary with custom time range
 */
export function useTenantActivitySummary(tenantId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['tenant-activity-summary', tenantId, days],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase.rpc('get_tenant_activity_summary', {
        p_tenant_id: tenantId,
        p_days: days,
      });

      if (error) throw error;
      return data as unknown as TenantHealthData;
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });
}

/**
 * Hook to fetch CS alerts for a tenant
 */
export function useCSAlerts(tenantId: string | undefined, statusFilter?: string[]) {
  return useQuery({
    queryKey: ['cs-alerts', tenantId, statusFilter],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('cs_alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CSAlert[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Hook to update CS alert status
 */
export function useUpdateCSAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      alertId,
      updates,
    }: {
      alertId: string;
      updates: Partial<Pick<CSAlert, 'status' | 'resolution_notes' | 'assigned_to'>>;
    }) => {
      const updateData: Record<string, unknown> = { ...updates };
      
      if (updates.status === 'acknowledged') {
        updateData.acknowledged_at = new Date().toISOString();
      } else if (updates.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        const { data: userData } = await supabase.auth.getUser();
        updateData.resolved_by = userData.user?.id;
      }

      const { data, error } = await supabase
        .from('cs_alerts')
        .update(updateData)
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cs-alerts', data.tenant_id] });
    },
  });
}

/**
 * Hook to get all open CS alerts count (for admin dashboard)
 */
export function useOpenCSAlertsCount() {
  return useQuery({
    queryKey: ['cs-alerts-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('cs_alerts')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'acknowledged']);

      if (error) throw error;
      return count || 0;
    },
  });
}

/**
 * Hook to get recent tenant events (for debugging/detail view)
 */
export function useTenantEvents(tenantId: string | undefined, limit: number = 50) {
  return useQuery({
    queryKey: ['tenant-events', tenantId, limit],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('tenant_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

/**
 * Module labels for display
 */
export const MODULE_LABELS: Record<string, string> = {
  fdp: 'FDP (Financial)',
  mdp: 'MDP (Marketing)',
  cdp: 'CDP (Customer)',
  control_tower: 'Control Tower',
  settings: 'Cài đặt',
  onboarding: 'Onboarding',
  admin: 'Admin',
  other: 'Khác',
};

/**
 * Risk level colors and labels
 */
export const RISK_LEVELS = {
  healthy: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Khỏe mạnh', badgeVariant: 'default' as const },
  monitor: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Theo dõi', badgeVariant: 'secondary' as const },
  at_risk: { color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Có rủi ro', badgeVariant: 'outline' as const },
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Nguy cấp', badgeVariant: 'destructive' as const },
};

/**
 * Alert type labels and icons
 */
export const ALERT_TYPES = {
  churn_risk: { label: 'Nguy cơ rời bỏ', icon: '🚨' },
  inactive: { label: 'Không hoạt động', icon: '💤' },
  stuck_onboarding: { label: 'Kẹt onboarding', icon: '🚧' },
  engagement_drop: { label: 'Giảm engagement', icon: '📉' },
  data_stale: { label: 'Dữ liệu cũ', icon: '⏰' },
  low_adoption: { label: 'Adoption thấp', icon: '📊' },
};

/**
 * Severity colors
 */
export const SEVERITY_COLORS = {
  low: 'text-blue-500 bg-blue-500/10',
  medium: 'text-amber-500 bg-amber-500/10',
  high: 'text-orange-500 bg-orange-500/10',
  critical: 'text-red-500 bg-red-500/10',
};
