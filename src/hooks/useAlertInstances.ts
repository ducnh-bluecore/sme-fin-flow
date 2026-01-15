import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveTenantId } from './useActiveTenantId';
import { useEffect } from 'react';

export type AlertInstanceStatus = 'active' | 'acknowledged' | 'resolved' | 'snoozed';
export type AlertSeverity = 'critical' | 'warning' | 'info';

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
  // New fields for Alert ↔ Decision linking
  linked_decision_card_id: string | null;
  resolved_by_decision: boolean;
}

export interface AlertInstanceFilters {
  status?: AlertInstanceStatus;
  severity?: AlertSeverity;
  category?: string;
  alert_type?: string;
  object_type?: string;
  date_from?: string;
  hideLinkedToDecision?: boolean; // Ẩn alerts đã có decision card
  date_to?: string;
}

export function useAlertInstances(filters?: AlertInstanceFilters) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['alert-instances', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('alert_instances')
        .select('*')
        .eq('tenant_id', tenantId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.alert_type) {
        query = query.eq('alert_type', filters.alert_type);
      }
      if (filters?.object_type) {
        query = query.eq('object_type', filters.object_type);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      // Ẩn alerts đã được link tới Decision Card khỏi Control Tower
      if (filters?.hideLinkedToDecision) {
        query = query.is('linked_decision_card_id', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as AlertInstance[];
    },
    enabled: !!tenantId,
  });
}

export function useActiveAlerts() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['active-alerts', tenantId],
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
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useAlertInstanceStats() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['alert-instance-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('alert_instances')
        .select('status, severity, category')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const stats = {
        total: data.length,
        byStatus: {
          active: 0,
          acknowledged: 0,
          resolved: 0,
          snoozed: 0,
        },
        bySeverity: {
          critical: 0,
          warning: 0,
          info: 0,
        },
        byCategory: {} as Record<string, number>,
      };

      data.forEach(alert => {
        stats.byStatus[alert.status as AlertInstanceStatus]++;
        stats.bySeverity[alert.severity as AlertSeverity]++;
        stats.byCategory[alert.category] = (stats.byCategory[alert.category] || 0) + 1;
      });

      return stats;
    },
    enabled: !!tenantId,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['alert-instances'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-instance-stats'] });
      toast.success('Đã xác nhận cảnh báo');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['alert-instances'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-instance-stats'] });
      toast.success('Đã xử lý xong cảnh báo');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useSnoozeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['alert-instances'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-instance-stats'] });
      toast.success('Đã tạm ẩn cảnh báo');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useBulkUpdateAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<AlertInstance> }) => {
      const { error } = await supabase
        .from('alert_instances')
        .update(updates)
        .in('id', ids);

      if (error) throw error;
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-instances'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-instance-stats'] });
      toast.success('Đã cập nhật các cảnh báo');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

// Realtime subscription for alerts
export function useRealtimeAlerts() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('alert-instances-realtime')
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
          queryClient.invalidateQueries({ queryKey: ['alert-instances'] });
          queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
          queryClient.invalidateQueries({ queryKey: ['alert-instance-stats'] });

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
  }, [tenantId, queryClient]);
}
