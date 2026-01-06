import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';

export type QueryType = 
  | 'daily_revenue' 
  | 'channel_summary' 
  | 'order_status' 
  | 'hourly_trend' 
  | 'top_products'
  | 'custom';

interface BigQueryRealtimeParams {
  queryType: QueryType;
  startDate?: string;
  endDate?: string;
  customQuery?: string;
  useCache?: boolean;
  cacheTtlMinutes?: number;
}

interface BigQueryRealtimeResult {
  success: boolean;
  data: any[];
  cached: boolean;
  cached_at?: string;
  expires_at?: string;
  query_time_ms?: number;
  row_count?: number;
  error?: string;
}

export function useBigQueryRealtime(params: BigQueryRealtimeParams) {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['bigquery-realtime', tenantId, params.queryType, params.startDate, params.endDate],
    queryFn: async (): Promise<BigQueryRealtimeResult> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const { data, error } = await supabase.functions.invoke('bigquery-realtime', {
        body: {
          tenant_id: tenantId,
          query_type: params.queryType,
          start_date: params.startDate,
          end_date: params.endDate,
          custom_query: params.customQuery,
          use_cache: params.useCache ?? true,
          cache_ttl_minutes: params.cacheTtlMinutes ?? 15,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to query BigQuery');
      }

      return data;
    },
    enabled: !!tenantId && !!params.queryType,
    staleTime: params.useCache ? 5 * 60 * 1000 : 0, // 5 minutes if using cache
    refetchInterval: params.queryType === 'hourly_trend' ? 5 * 60 * 1000 : false, // Auto-refresh hourly trends
  });
}

// Hook for invalidating cache
export function useInvalidateBigQueryCache() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No active tenant');

      // Invalidate cache in database
      const { error } = await supabase
        .from('bigquery_query_cache')
        .update({ is_valid: false })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Also invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['bigquery-realtime', tenantId] });
    },
    onSuccess: () => {
      toast.success('Đã xóa cache, dữ liệu sẽ được làm mới');
    },
    onError: (error) => {
      toast.error('Lỗi khi xóa cache: ' + error.message);
    },
  });
}

// Hook for watermarks management
export function useSyncWatermarks() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['sync-watermarks', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No active tenant');

      const { data, error } = await supabase
        .from('bigquery_sync_watermarks')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('data_model', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

// Hook for data model configurations
export function useBigQueryDataModels() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['bigquery-data-models', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No active tenant');

      const { data, error } = await supabase
        .from('bigquery_data_models')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('model_name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

// Create/update data model configuration
export function useUpsertDataModel() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (model: {
      model_name: string;
      model_label: string;
      description?: string;
      bigquery_dataset: string;
      bigquery_table: string;
      primary_key_field: string;
      timestamp_field?: string;
      mapping_config?: Record<string, any>;
      target_table?: string;
      is_enabled?: boolean;
      sync_frequency_hours?: number;
    }) => {
      if (!tenantId) throw new Error('No active tenant');

      const { data, error } = await supabase
        .from('bigquery_data_models')
        .upsert({
          tenant_id: tenantId,
          ...model,
        }, {
          onConflict: 'tenant_id,model_name,bigquery_dataset,bigquery_table',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bigquery-data-models', tenantId] });
      toast.success('Đã lưu cấu hình data model');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}
