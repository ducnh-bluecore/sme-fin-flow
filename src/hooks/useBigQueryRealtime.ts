/**
 * useBigQueryRealtime - BigQuery realtime data hooks
 * 
 * @architecture Schema-per-Tenant Ready
 * Uses useTenantQueryBuilder for tenant-aware queries.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
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

// Sync watermark type
export interface SyncWatermark {
  id: string;
  tenant_id: string;
  data_model: string;
  last_sync_at: string | null;
  total_records_synced: number;
  sync_status: 'pending' | 'syncing' | 'completed' | 'error' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// BigQuery data model type
export interface BigQueryDataModel {
  id: string;
  tenant_id: string;
  model_name: string;
  model_label: string;
  description: string | null;
  bigquery_dataset: string;
  bigquery_table: string;
  primary_key_field: string;
  timestamp_field: string | null;
  mapping_config: Record<string, any> | null;
  target_table: string | null;
  is_enabled: boolean;
  sync_frequency_hours: number | null;
  created_at: string;
  updated_at: string;
}

export function useBigQueryRealtime(params: BigQueryRealtimeParams) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();
  
  return useQuery({
    queryKey: ['bigquery-realtime', tenantId, params.queryType, params.startDate, params.endDate],
    queryFn: async (): Promise<BigQueryRealtimeResult> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const { data, error } = await client.functions.invoke('bigquery-realtime', {
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
    enabled: !!tenantId && isReady && !!params.queryType,
    staleTime: params.useCache ? 5 * 60 * 1000 : 0,
    refetchInterval: params.queryType === 'hourly_trend' ? 5 * 60 * 1000 : false,
  });
}

// Hook for invalidating cache
export function useInvalidateBigQueryCache() {
  const { buildUpdateQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No active tenant');

      // Invalidate cache in database
      const { error } = await buildUpdateQuery('bigquery_query_cache', { is_valid: false });
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
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['sync-watermarks', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No active tenant');

      const { data, error } = await buildSelectQuery('bigquery_sync_watermarks', '*')
        .order('data_model', { ascending: true });

      if (error) throw error;
      return (data as unknown) as SyncWatermark[];
    },
    enabled: !!tenantId && isReady,
  });
}

// Hook for data model configurations
export function useBigQueryDataModels() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['bigquery-data-models', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No active tenant');

      const { data, error } = await buildSelectQuery('bigquery_data_models', '*')
        .order('model_name', { ascending: true });

      if (error) throw error;
      return (data as unknown) as BigQueryDataModel[];
    },
    enabled: !!tenantId && isReady,
  });
}

// Create/update data model configuration
export function useUpsertDataModel() {
  const { client, tenantId, getActualTableName, isReady } = useTenantQueryBuilder();
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

      const actualTable = getActualTableName('bigquery_data_models');
      
      const { data, error } = await client
        .from(actualTable as any)
        .upsert({
          tenant_id: tenantId,
          ...model,
        }, {
          onConflict: 'tenant_id,model_name,bigquery_dataset,bigquery_table',
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as BigQueryDataModel;
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
