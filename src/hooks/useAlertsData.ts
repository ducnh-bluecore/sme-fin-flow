import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveTenantId } from './useActiveTenantId';

export interface Alert {
  id: string;
  alert_type: string;
  severity: string | null;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean | null;
  created_at: string;
}

// Fetch all alerts
export function useAlerts() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['alerts-all', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Alert[];
    },
    staleTime: 30000,
    enabled: !!tenantId,
  });
}

// Mark alert as read
export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return alertId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-all'] });
      toast.success('Đã đánh dấu đã đọc');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    }
  });
}

// Mark all alerts as read
export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('tenant_id', tenantId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-all'] });
      toast.success('Đã đánh dấu tất cả đã đọc');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    }
  });
}

// Get alert statistics
export function useAlertStats() {
  const { data: alerts, isLoading, error } = useAlerts();

  const stats = {
    total: 0,
    unread: 0,
    // Chuẩn hóa: critical, warning, info (thay thế high, medium, low)
    critical: 0,
    warning: 0,
    info: 0,
    byType: {} as Record<string, { total: number; critical: number; unread: number }>,
  };

  if (alerts) {
    stats.total = alerts.length;
    alerts.forEach((alert) => {
      if (!alert.is_read) stats.unread++;
      if (alert.severity === 'critical') stats.critical++;
      if (alert.severity === 'warning') stats.warning++;
      if (alert.severity === 'info') stats.info++;

      const type = alert.alert_type;
      if (!stats.byType[type]) {
        stats.byType[type] = { total: 0, critical: 0, unread: 0 };
      }
      stats.byType[type].total++;
      if (alert.severity === 'critical') stats.byType[type].critical++;
      if (!alert.is_read) stats.byType[type].unread++;
    });
  }

  return { stats, alerts, isLoading, error };
}
