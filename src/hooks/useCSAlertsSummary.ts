import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CSAlertsSummary {
  total_open: number;
  total_acknowledged: number;
  total_in_progress: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  by_type: {
    churn_risk: number;
    inactive: number;
    engagement_drop: number;
    stuck_onboarding: number;
    data_stale: number;
    low_adoption: number;
  };
  recent_alerts: Array<{
    id: string;
    tenant_id: string;
    tenant_name: string;
    alert_type: string;
    severity: string;
    title: string;
    status: string;
    created_at: string;
  }>;
}

export interface OpenCSAlert {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_email: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  recommended_action: string;
  metadata: Record<string, unknown>;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch CS alerts summary for admin dashboard
 */
export function useCSAlertsSummary() {
  return useQuery({
    queryKey: ['cs-alerts-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cs_alerts_summary');

      if (error) throw error;
      return data as unknown as CSAlertsSummary;
    },
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });
}

/**
 * Hook to fetch all open CS alerts with tenant info
 */
export function useAllOpenCSAlerts(
  limit: number = 50,
  offset: number = 0,
  severity?: string,
  alertType?: string
) {
  return useQuery({
    queryKey: ['all-open-cs-alerts', limit, offset, severity, alertType],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_open_cs_alerts', {
        p_limit: limit,
        p_offset: offset,
        p_severity: severity || null,
        p_alert_type: alertType || null,
      });

      if (error) throw error;
      return data as unknown as OpenCSAlert[];
    },
  });
}

/**
 * Hook to run alert checks for a specific tenant
 */
export function useRunAlertCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase.rpc('check_and_create_cs_alerts', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (_, tenantId) => {
      queryClient.invalidateQueries({ queryKey: ['cs-alerts', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['cs-alerts-summary'] });
      queryClient.invalidateQueries({ queryKey: ['all-open-cs-alerts'] });
    },
  });
}

/**
 * Hook to run alert checks for all tenants
 */
export function useRunAllAlertChecks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('run_cs_alert_checks');

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['cs-alerts-summary'] });
      queryClient.invalidateQueries({ queryKey: ['all-open-cs-alerts'] });
    },
  });
}
