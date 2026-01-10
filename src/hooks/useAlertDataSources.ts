import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveTenantId } from './useActiveTenantId';

export interface AlertDataSource {
  id: string;
  tenant_id: string;
  source_type: 'connector' | 'bigquery' | 'manual' | 'api' | 'webhook';
  source_name: string;
  source_config: Record<string, any>;
  connector_integration_id: string | null;
  sync_frequency_minutes: number;
  last_sync_at: string | null;
  next_sync_at: string | null;
  sync_status: 'pending' | 'syncing' | 'success' | 'error';
  error_message: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertDataSourceInput {
  source_type: AlertDataSource['source_type'];
  source_name: string;
  source_config?: Record<string, any>;
  connector_integration_id?: string | null;
  sync_frequency_minutes?: number;
  is_active?: boolean;
}

export function useAlertDataSources() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['alert-data-sources', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('alert_data_sources')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AlertDataSource[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateAlertDataSource() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (input: AlertDataSourceInput) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await supabase
        .from('alert_data_sources')
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
      queryClient.invalidateQueries({ queryKey: ['alert-data-sources'] });
      toast.success('Đã thêm nguồn dữ liệu');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useUpdateAlertDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<AlertDataSource> & { id: string }) => {
      const { data, error } = await supabase
        .from('alert_data_sources')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-data-sources'] });
      toast.success('Đã cập nhật nguồn dữ liệu');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useDeleteAlertDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alert_data_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-data-sources'] });
      toast.success('Đã xóa nguồn dữ liệu');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useSyncAlertDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Update status to syncing
      const { error: updateError } = await supabase
        .from('alert_data_sources')
        .update({ sync_status: 'syncing' })
        .eq('id', id);

      if (updateError) throw updateError;

      // TODO: Trigger actual sync via edge function
      // For now, simulate sync completion
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data, error } = await supabase
        .from('alert_data_sources')
        .update({ 
          sync_status: 'success',
          last_sync_at: new Date().toISOString(),
          next_sync_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-data-sources'] });
      queryClient.invalidateQueries({ queryKey: ['alert-objects'] });
      toast.success('Đồng bộ thành công');
    },
    onError: (error) => {
      toast.error('Lỗi đồng bộ: ' + error.message);
    },
  });
}
