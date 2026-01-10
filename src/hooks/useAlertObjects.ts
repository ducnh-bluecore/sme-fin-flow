import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveTenantId } from './useActiveTenantId';

export type AlertObjectType = 'product' | 'order' | 'customer' | 'store' | 'inventory' | 'cashflow' | 'kpi' | 'channel';
export type AlertObjectStatus = 'normal' | 'warning' | 'critical' | 'acknowledged';

export interface AlertObject {
  id: string;
  tenant_id: string;
  data_source_id: string | null;
  object_type: AlertObjectType;
  object_category: string | null;
  external_id: string | null;
  object_name: string;
  object_data: Record<string, any>;
  current_metrics: Record<string, any>;
  previous_metrics: Record<string, any>;
  threshold_overrides: Record<string, any>;
  alert_status: AlertObjectStatus;
  last_alert_at: string | null;
  is_monitored: boolean;
  metadata: Record<string, any>;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertObjectInput {
  data_source_id?: string | null;
  object_type: AlertObjectType;
  object_category?: string | null;
  external_id?: string | null;
  object_name: string;
  object_data?: Record<string, any>;
  current_metrics?: Record<string, any>;
  threshold_overrides?: Record<string, any>;
  is_monitored?: boolean;
  metadata?: Record<string, any>;
}

export interface AlertObjectFilters {
  object_type?: AlertObjectType;
  alert_status?: AlertObjectStatus;
  is_monitored?: boolean;
  data_source_id?: string;
  search?: string;
}

export function useAlertObjects(filters?: AlertObjectFilters) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['alert-objects', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('alert_objects')
        .select('*')
        .eq('tenant_id', tenantId);

      if (filters?.object_type) {
        query = query.eq('object_type', filters.object_type);
      }
      if (filters?.alert_status) {
        query = query.eq('alert_status', filters.alert_status);
      }
      if (filters?.is_monitored !== undefined) {
        query = query.eq('is_monitored', filters.is_monitored);
      }
      if (filters?.data_source_id) {
        query = query.eq('data_source_id', filters.data_source_id);
      }
      if (filters?.search) {
        query = query.ilike('object_name', `%${filters.search}%`);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;
      return data as AlertObject[];
    },
    enabled: !!tenantId,
  });
}

export function useAlertObjectStats() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['alert-object-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('alert_objects')
        .select('object_type, alert_status, is_monitored')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const stats = {
        total: data.length,
        monitored: data.filter(o => o.is_monitored).length,
        byType: {} as Record<string, number>,
        byStatus: {
          normal: 0,
          warning: 0,
          critical: 0,
          acknowledged: 0,
        },
      };

      data.forEach(obj => {
        stats.byType[obj.object_type] = (stats.byType[obj.object_type] || 0) + 1;
        stats.byStatus[obj.alert_status as AlertObjectStatus]++;
      });

      return stats;
    },
    enabled: !!tenantId,
  });
}

export function useCreateAlertObject() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (input: AlertObjectInput) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await supabase
        .from('alert_objects')
        .insert({
          tenant_id: tenantId,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-objects'] });
      queryClient.invalidateQueries({ queryKey: ['alert-object-stats'] });
      toast.success('Đã thêm đối tượng giám sát');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useUpdateAlertObject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<AlertObject> & { id: string }) => {
      const { data, error } = await supabase
        .from('alert_objects')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-objects'] });
      queryClient.invalidateQueries({ queryKey: ['alert-object-stats'] });
      toast.success('Đã cập nhật đối tượng');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useDeleteAlertObject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alert_objects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-objects'] });
      queryClient.invalidateQueries({ queryKey: ['alert-object-stats'] });
      toast.success('Đã xóa đối tượng');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useBulkUpdateAlertObjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<AlertObject> }) => {
      const { error } = await supabase
        .from('alert_objects')
        .update(updates)
        .in('id', ids);

      if (error) throw error;
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-objects'] });
      queryClient.invalidateQueries({ queryKey: ['alert-object-stats'] });
      toast.success('Đã cập nhật các đối tượng');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}
