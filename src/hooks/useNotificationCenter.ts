/**
 * Unified Notification Center Hook
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 * 
 * This hook provides a centralized way to manage all notification-related data:
 * - Alert configs (rules)
 * - Alert instances (active alerts)
 * - Notification recipients
 * - Alert statistics
 * - Realtime updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';
import { useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  calculation_details: Record<string, any> | null;
  suggested_action: string | null;
  impact_amount: number | null;
  impact_currency: string | null;
  impact_description: string | null;
  deadline_at: string | null;
  time_to_resolve_hours: number | null;
  assigned_to: string | null;
  assigned_at: string | null;
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
  bySeverity: { critical: number; warning: number; info: number };
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
  const { buildSelectQuery, buildInsertQuery, buildUpdateQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  // ============= Alert Configs (Rules) =============
  const configsQuery = useQuery({
    queryKey: [QUERY_KEYS.configs, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('extended_alert_configs', '*')
        .order('category', { ascending: true })
        .order('alert_type', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as AlertConfig[];
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
  });

  // ============= Alert Instances =============
  const instancesQuery = useQuery({
    queryKey: [QUERY_KEYS.instances, tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = buildSelectQuery('alert_instances', '*');

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.severity) query = query.eq('severity', filters.severity);
      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.alert_type) query = query.eq('alert_type', filters.alert_type);
      if (filters?.object_type) query = query.eq('object_type', filters.object_type);
      if (filters?.date_from) query = query.gte('created_at', filters.date_from);
      if (filters?.date_to) query = query.lte('created_at', filters.date_to);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AlertInstance[];
    },
    enabled: isReady,
    staleTime: 30 * 1000,
  });

  // ============= Active Alerts Only =============
  const activeAlertsQuery = useQuery({
    queryKey: [QUERY_KEYS.activeAlerts, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('alert_instances', '*')
        .eq('status', 'active')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AlertInstance[];
    },
    enabled: isReady,
    refetchInterval: 30000,
    staleTime: 15 * 1000,
  });

  // ============= Recipients =============
  const recipientsQuery = useQuery({
    queryKey: [QUERY_KEYS.recipients, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('notification_recipients', '*')
        .order('role', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as NotificationRecipient[];
    },
    enabled: isReady,
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
      stats[alert.status as keyof Pick<AlertStats, 'active' | 'acknowledged' | 'resolved' | 'snoozed'>]++;
      if (alert.severity in stats.bySeverity) stats.bySeverity[alert.severity]++;
      stats.byCategory[alert.category] = (stats.byCategory[alert.category] || 0) + 1;
      if (alert.created_at.startsWith(today)) stats.todayCount++;
      if (alert.severity === 'critical' && alert.status !== 'resolved') stats.unresolvedCritical++;
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

      const { data: existing } = await buildSelectQuery('extended_alert_configs', 'id')
        .eq('category', config.category)
        .eq('alert_type', config.alert_type)
        .maybeSingle();

      const dataToSave = {
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
        const { data, error } = await buildUpdateQuery('extended_alert_configs', dataToSave)
          .eq('id', (existing as any).id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await buildInsertQuery('extended_alert_configs', dataToSave)
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
      const { data, error } = await buildUpdateQuery('extended_alert_configs', { enabled })
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
      
      const { data, error } = await buildUpdateQuery('alert_instances', {
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
      
      const { data, error } = await buildUpdateQuery('alert_instances', {
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
      const { data, error } = await buildUpdateQuery('alert_instances', {
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

  // Assign Alert
  const assignAlert = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { data, error } = await buildUpdateQuery('alert_instances', {
        assigned_to: userId,
        assigned_at: new Date().toISOString(),
      })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Đã phân công xử lý');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  // ============= Realtime Subscription =============
  useEffect(() => {
    if (!tenantId || !isReady) return;

    const channel = supabase
      .channel(`alerts-${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alert_instances' },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.instances] });
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activeAlerts] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, isReady, queryClient]);

  return {
    // Data
    configs: configsQuery.data || [],
    instances: instancesQuery.data || [],
    activeAlerts: activeAlertsQuery.data || [],
    recipients: recipientsQuery.data || [],
    stats,
    
    // Loading states
    isLoading: configsQuery.isLoading || instancesQuery.isLoading,
    isLoadingConfigs: configsQuery.isLoading,
    isLoadingInstances: instancesQuery.isLoading,
    isLoadingActiveAlerts: activeAlertsQuery.isLoading,
    isLoadingRecipients: recipientsQuery.isLoading,
    
    // Errors
    error: configsQuery.error || instancesQuery.error,
    
    // Mutations
    saveConfig,
    toggleConfig,
    acknowledgeAlert,
    resolveAlert,
    snoozeAlert,
    assignAlert,
    
    // Utils
    invalidateAll,
    refetch: () => {
      configsQuery.refetch();
      instancesQuery.refetch();
      activeAlertsQuery.refetch();
      recipientsQuery.refetch();
    },
  };
}

// ============= Helper Hooks =============

export function useActiveAlertsCount() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['active-alerts-count', tenantId],
    queryFn: async (): Promise<number> => {
      if (!tenantId) return 0;

      const { data, error } = await buildSelectQuery('alert_instances', 'id')
        .eq('status', 'active');

      if (error) throw error;
      return data?.length || 0;
    },
    enabled: isReady,
    refetchInterval: 30000,
  });
}

export function useUnresolvedCriticalCount() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['unresolved-critical-count', tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;

      const { data, error } = await buildSelectQuery('alert_instances', 'id')
        .eq('severity', 'critical')
        .neq('status', 'resolved');

      if (error) throw error;
      return data?.length || 0;
    },
    enabled: isReady,
    refetchInterval: 30000,
  });
}
