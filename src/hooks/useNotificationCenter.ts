/**
 * Unified Notification Center Hook
 * 
 * This hook provides a centralized way to manage all notification-related data:
 * - Alert configs (rules)
 * - Alert instances (active alerts)
 * - Notification recipients
 * - Alert statistics
 * - Realtime updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveTenantId } from './useActiveTenantId';
import { useEffect, useCallback, useMemo } from 'react';

// ============= Types =============

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCategory = 'product' | 'business' | 'store' | 'cashflow' | 'kpi' | 'customer' | 'fulfillment' | 'operations';
export type AlertInstanceStatus = 'active' | 'acknowledged' | 'resolved' | 'snoozed';

export interface AlertConfig {
  id: string;
  tenant_id: string;
  category: AlertCategory;
  alert_type: string;
  severity: AlertSeverity;
  enabled: boolean;
  threshold_value: number | null;
  threshold_unit: string | null;
  threshold_operator: string | null;
  title: string;
  description: string | null;
  recipient_role: string;
  notify_email: boolean;
  notify_slack: boolean;
  notify_push: boolean;
  notify_sms: boolean;
  notify_immediately: boolean;
  notify_in_daily_digest: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertInstance {
  id: string;
  tenant_id: string;
  alert_config_id: string | null;
  alert_object_id: string | null;
  data_source_id: string | null;
  alert_type: string;
  category: string;
  severity: AlertSeverity;
  title: string;
  message: string | null;
  object_type: string | null;
  object_name: string | null;
  external_object_id: string | null;
  metric_name: string | null;
  current_value: number | null;
  threshold_value: number | null;
  threshold_operator: string | null;
  change_percent: number | null;
  status: AlertInstanceStatus;
  priority: number;
  notification_sent: boolean;
  notification_channels: string[];
  sent_to: string[];
  sent_at: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  snoozed_until: string | null;
  related_alerts: string[] | null;
  action_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface NotificationRecipient {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  slack_user_id: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  snoozed: number;
  bySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
  byCategory: Record<string, number>;
  todayCount: number;
  unresolvedCritical: number;
}

export interface AlertFilters {
  status?: AlertInstanceStatus;
  severity?: AlertSeverity;
  category?: string;
  alert_type?: string;
  object_type?: string;
  date_from?: string;
  date_to?: string;
}

// ============= Labels & Constants =============

export const categoryLabels: Record<AlertCategory, string> = {
  product: 'Sản phẩm',
  business: 'Kinh doanh',
  store: 'Chi nhánh',
  cashflow: 'Dòng tiền',
  kpi: 'KPI',
  customer: 'Khách hàng',
  fulfillment: 'Fulfillment',
  operations: 'Vận hành',
};

export const severityConfig: Record<AlertSeverity, { label: string; color: string; bgColor: string; icon: string }> = {
  critical: { label: 'Nguy cấp', color: 'text-destructive', bgColor: 'bg-destructive/10', icon: '🚨' },
  warning: { label: 'Cảnh báo', color: 'text-warning', bgColor: 'bg-warning/10', icon: '⚠️' },
  info: { label: 'Thông tin', color: 'text-info', bgColor: 'bg-info/10', icon: 'ℹ️' },
};

export const statusLabels: Record<AlertInstanceStatus, string> = {
  active: 'Đang hoạt động',
  acknowledged: 'Đã xác nhận',
  resolved: 'Đã xử lý',
  snoozed: 'Tạm ẩn',
};

export const recipientRoleLabels: Record<string, string> = {
  general: 'Tất cả',
  manager: 'Quản lý',
  store_manager: 'Quản lý cửa hàng',
  warehouse_manager: 'Quản lý kho',
  finance: 'Tài chính',
  operations: 'Vận hành',
  sales: 'Kinh doanh',
  customer_service: 'CSKH',
};

// ============= Query Keys =============

const QUERY_KEYS = {
  configs: 'notification-center-configs',
  instances: 'notification-center-instances',
  activeAlerts: 'notification-center-active',
  recipients: 'notification-center-recipients',
  stats: 'notification-center-stats',
} as const;

// ============= Main Hook =============

export function useNotificationCenter(filters?: AlertFilters) {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const queryClient = useQueryClient();

  // ============= Alert Configs (Rules) =============
  const configsQuery = useQuery({
    queryKey: [QUERY_KEYS.configs, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('extended_alert_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('category', { ascending: true })
        .order('alert_type', { ascending: true });

      if (error) throw error;
      return data as AlertConfig[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ============= Alert Instances =============
  const instancesQuery = useQuery({
    queryKey: [QUERY_KEYS.instances, tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('alert_instances')
        .select('*')
        .eq('tenant_id', tenantId);

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.severity) query = query.eq('severity', filters.severity);
      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.alert_type) query = query.eq('alert_type', filters.alert_type);
      if (filters?.object_type) query = query.eq('object_type', filters.object_type);
      if (filters?.date_from) query = query.gte('created_at', filters.date_from);
      if (filters?.date_to) query = query.lte('created_at', filters.date_to);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as AlertInstance[];
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // ============= Active Alerts Only =============
  const activeAlertsQuery = useQuery({
    queryKey: [QUERY_KEYS.activeAlerts, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('alert_instances')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AlertInstance[];
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15 * 1000,
  });

  // ============= Recipients =============
  const recipientsQuery = useQuery({
    queryKey: [QUERY_KEYS.recipients, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('notification_recipients')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('role', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as NotificationRecipient[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  // ============= Computed Stats =============
  const stats = useMemo<AlertStats>(() => {
    const instances = instancesQuery.data || [];
    const today = new Date().toISOString().split('T')[0];

    const stats: AlertStats = {
      total: instances.length,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      snoozed: 0,
      bySeverity: { critical: 0, warning: 0, info: 0 },
      byCategory: {},
      todayCount: 0,
      unresolvedCritical: 0,
    };

    instances.forEach(alert => {
      // By status
      stats[alert.status as keyof Pick<AlertStats, 'active' | 'acknowledged' | 'resolved' | 'snoozed'>]++;
      
      // By severity
      if (alert.severity in stats.bySeverity) {
        stats.bySeverity[alert.severity]++;
      }
      
      // By category
      stats.byCategory[alert.category] = (stats.byCategory[alert.category] || 0) + 1;
      
      // Today's count
      if (alert.created_at.startsWith(today)) {
        stats.todayCount++;
      }
      
      // Unresolved critical
      if (alert.severity === 'critical' && alert.status !== 'resolved') {
        stats.unresolvedCritical++;
      }
    });

    return stats;
  }, [instancesQuery.data]);

  // ============= Mutations =============

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.configs] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.instances] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activeAlerts] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.stats] });
  }, [queryClient]);

  // Save/Update Alert Config
  const saveConfig = useMutation({
    mutationFn: async (config: Partial<AlertConfig> & { category: AlertCategory; alert_type: string }) => {
      if (!tenantId) throw new Error('No tenant selected');

      // Check if config exists
      const { data: existing } = await supabase
        .from('extended_alert_configs')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('category', config.category)
        .eq('alert_type', config.alert_type)
        .maybeSingle();

      const dataToSave = {
        tenant_id: tenantId,
        category: config.category,
        alert_type: config.alert_type,
        severity: config.severity || 'info',
        enabled: config.enabled ?? true,
        threshold_value: config.threshold_value ?? null,
        threshold_unit: config.threshold_unit ?? null,
        threshold_operator: config.threshold_operator ?? null,
        title: config.title || config.alert_type,
        description: config.description ?? null,
        recipient_role: config.recipient_role || 'general',
        notify_email: config.notify_email ?? false,
        notify_slack: config.notify_slack ?? false,
        notify_push: config.notify_push ?? false,
        notify_sms: config.notify_sms ?? false,
        notify_immediately: config.notify_immediately ?? false,
        notify_in_daily_digest: config.notify_in_daily_digest ?? true,
      };

      if (existing?.id) {
        const { data, error } = await supabase
          .from('extended_alert_configs')
          .update(dataToSave)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('extended_alert_configs')
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.configs] });
      toast.success('Đã lưu cấu hình');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  // Toggle Alert Config
  const toggleConfig = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data, error } = await supabase
        .from('extended_alert_configs')
        .update({ enabled })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.configs] });
      toast.success(variables.enabled ? 'Đã bật cảnh báo' : 'Đã tắt cảnh báo');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  // Acknowledge Alert
  const acknowledgeAlert = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('alert_instances')
        .update({
          status: 'acknowledged',
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Đã xác nhận cảnh báo');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  // Resolve Alert
  const resolveAlert = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('alert_instances')
        .update({
          status: 'resolved',
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Đã xử lý xong cảnh báo');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  // Snooze Alert
  const snoozeAlert = useMutation({
    mutationFn: async ({ id, until }: { id: string; until: Date }) => {
      const { data, error } = await supabase
        .from('alert_instances')
        .update({
          status: 'snoozed',
          snoozed_until: until.toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Đã tạm ẩn cảnh báo');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  // Bulk Update Alerts
  const bulkUpdateAlerts = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<AlertInstance> }) => {
      const { error } = await supabase
        .from('alert_instances')
        .update(updates)
        .in('id', ids);

      if (error) throw error;
      return ids;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Đã cập nhật các cảnh báo');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  // Save Recipient
  const saveRecipient = useMutation({
    mutationFn: async (recipient: Partial<NotificationRecipient> & { name: string; role: string }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const dataToSave = {
        tenant_id: tenantId,
        name: recipient.name,
        email: recipient.email || null,
        phone: recipient.phone || null,
        slack_user_id: recipient.slack_user_id || null,
        role: recipient.role,
        is_active: recipient.is_active ?? true,
      };

      if (recipient.id) {
        const { data, error } = await supabase
          .from('notification_recipients')
          .update(dataToSave)
          .eq('id', recipient.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('notification_recipients')
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recipients] });
      toast.success('Đã lưu thông tin người nhận');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  // Delete Recipient
  const deleteRecipient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notification_recipients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recipients] });
      toast.success('Đã xóa người nhận');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  // ============= Realtime Subscription =============
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('notification-center-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alert_instances',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('Alert change:', payload);
          invalidateAll();

          if (payload.eventType === 'INSERT') {
            const newAlert = payload.new as AlertInstance;
            if (newAlert.severity === 'critical') {
              toast.error(`🚨 ${newAlert.title}`, {
                description: newAlert.message || undefined,
                duration: 10000,
              });
            } else if (newAlert.severity === 'warning') {
              toast.warning(`⚠️ ${newAlert.title}`, {
                description: newAlert.message || undefined,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, invalidateAll]);

  // ============= Helpers =============
  const getConfigsByCategory = useCallback((category: AlertCategory) => {
    return (configsQuery.data || []).filter(c => c.category === category);
  }, [configsQuery.data]);

  const getEnabledConfigs = useCallback(() => {
    return (configsQuery.data || []).filter(c => c.enabled);
  }, [configsQuery.data]);

  const getActiveRecipients = useCallback(() => {
    return (recipientsQuery.data || []).filter(r => r.is_active);
  }, [recipientsQuery.data]);

  const getRecipientsByRole = useCallback((role: string) => {
    return (recipientsQuery.data || []).filter(r => r.role === role && r.is_active);
  }, [recipientsQuery.data]);

  // ============= Return =============
  return {
    // Loading states
    isLoading: tenantLoading || configsQuery.isLoading || instancesQuery.isLoading,
    isConfigsLoading: configsQuery.isLoading,
    isInstancesLoading: instancesQuery.isLoading,
    isRecipientsLoading: recipientsQuery.isLoading,

    // Data
    configs: configsQuery.data || [],
    instances: instancesQuery.data || [],
    activeAlerts: activeAlertsQuery.data || [],
    recipients: recipientsQuery.data || [],
    stats,

    // Errors
    configsError: configsQuery.error,
    instancesError: instancesQuery.error,
    recipientsError: recipientsQuery.error,

    // Mutations
    saveConfig,
    toggleConfig,
    acknowledgeAlert,
    resolveAlert,
    snoozeAlert,
    bulkUpdateAlerts,
    saveRecipient,
    deleteRecipient,

    // Helpers
    getConfigsByCategory,
    getEnabledConfigs,
    getActiveRecipients,
    getRecipientsByRole,

    // Refetch
    refetchConfigs: configsQuery.refetch,
    refetchInstances: instancesQuery.refetch,
    refetchRecipients: recipientsQuery.refetch,
    refetchAll: () => {
      configsQuery.refetch();
      instancesQuery.refetch();
      activeAlertsQuery.refetch();
      recipientsQuery.refetch();
    },

    // Constants
    categoryLabels,
    severityConfig,
    statusLabels,
    recipientRoleLabels,
  };
}

// ============= Lightweight Hooks for Specific Use Cases =============

/**
 * Hook for dashboard badge - only fetches active alerts count
 */
export function useActiveAlertsCount() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: [QUERY_KEYS.activeAlerts, 'count', tenantId],
    queryFn: async () => {
      if (!tenantId) return { total: 0, critical: 0 };

      const { data, error } = await supabase
        .from('alert_instances')
        .select('severity')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      if (error) throw error;

      return {
        total: data.length,
        critical: data.filter(a => a.severity === 'critical').length,
      };
    },
    enabled: !!tenantId,
    refetchInterval: 60000, // 1 minute
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for quick stats panel
 */
export function useAlertQuickStats() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: [QUERY_KEYS.stats, 'quick', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('alert_instances')
        .select('status, severity, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      return {
        todayTotal: data.length,
        todayActive: data.filter(a => a.status === 'active').length,
        todayCritical: data.filter(a => a.severity === 'critical').length,
        todayResolved: data.filter(a => a.status === 'resolved').length,
      };
    },
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  });
}
