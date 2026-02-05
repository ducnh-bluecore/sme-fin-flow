/**
 * useDataWatermarks - Track sync checkpoints/watermarks
 * 
 * Part of Architecture v1.4.1 - Layer 1.5 (Ingestion)
 * 
 * Watermarks track the last synced timestamp/ID for incremental data pulls.
 * 
 * @architecture Schema-per-Tenant Ready
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '../useTenantQueryBuilder';

// =====================================================
// Types
// =====================================================

export interface DataWatermark {
  id: string;
  tenant_id: string;
  source_type: string;
  source_name: string;
  table_name: string;
  watermark_type: 'timestamp' | 'id' | 'offset';
  watermark_value: string;
  last_synced_at: string;
  next_sync_at: string | null;
  sync_frequency_minutes: number | null;
  is_active: boolean;
  error_count: number;
  last_error: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface SyncCheckpoint {
  id: string;
  tenant_id: string;
  connector_id: string;
  checkpoint_type: string;
  checkpoint_value: string;
  records_synced: number;
  created_at: string;
}

// =====================================================
// Hooks
// =====================================================

/**
 * Fetch all data watermarks for current tenant
 */
export function useDataWatermarks(options?: {
  sourceType?: string;
  isActive?: boolean;
}) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { sourceType, isActive } = options ?? {};

  return useQuery({
    queryKey: ['data-watermarks', tenantId, sourceType, isActive],
    queryFn: async () => {
      let query = buildSelectQuery('data_watermarks', '*')
        .order('last_synced_at', { ascending: false });

      if (sourceType) {
        query = query.eq('source_type', sourceType);
      }
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown) as DataWatermark[];
    },
    enabled: isReady && !!tenantId,
    staleTime: 30000,
  });
}

/**
 * Get a single watermark by source and table
 */
export function useDataWatermark(sourceType?: string, tableName?: string) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['data-watermark', tenantId, sourceType, tableName],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('data_watermarks', '*')
        .eq('source_type', sourceType)
        .eq('table_name', tableName)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }
      return (data as unknown) as DataWatermark;
    },
    enabled: isReady && !!tenantId && !!sourceType && !!tableName,
  });
}

/**
 * Get watermarks due for sync
 */
export function useWatermarksDueForSync() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['watermarks-due-sync', tenantId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await buildSelectQuery('data_watermarks', '*')
        .eq('is_active', true)
        .or(`next_sync_at.is.null,next_sync_at.lte.${now}`)
        .order('next_sync_at', { ascending: true, nullsFirst: true });

      if (error) throw error;
      return (data as unknown) as DataWatermark[];
    },
    enabled: isReady && !!tenantId,
    staleTime: 10000, // Refresh frequently
    refetchInterval: 60000, // Auto-refresh every minute
  });
}

/**
 * Create or update a watermark
 */
export function useUpsertWatermark() {
  const queryClient = useQueryClient();
  const { client, tenantId, getActualTableName, isSchemaProvisioned } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (input: {
      source_type: string;
      source_name: string;
      table_name: string;
      watermark_type: DataWatermark['watermark_type'];
      watermark_value: string;
      sync_frequency_minutes?: number;
      metadata?: Record<string, any>;
    }) => {
      const actualTable = getActualTableName('data_watermarks');
      const now = new Date();
      const nextSync = input.sync_frequency_minutes
        ? new Date(now.getTime() + input.sync_frequency_minutes * 60000).toISOString()
        : null;

      const { data, error } = await client
        .from(actualTable as any)
        .upsert({
          tenant_id: tenantId,
          source_type: input.source_type,
          source_name: input.source_name,
          table_name: input.table_name,
          watermark_type: input.watermark_type,
          watermark_value: input.watermark_value,
          last_synced_at: now.toISOString(),
          next_sync_at: nextSync,
          sync_frequency_minutes: input.sync_frequency_minutes ?? null,
          is_active: true,
          error_count: 0,
          last_error: null,
          metadata: input.metadata ?? null,
          updated_at: now.toISOString(),
        }, {
          onConflict: 'tenant_id,source_type,table_name',
        })
        .select()
        .single();

      if (error) throw error;
      return (data as unknown) as DataWatermark;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-watermarks', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['watermarks-due-sync', tenantId] });
    },
  });
}

/**
 * Record sync error for a watermark
 */
export function useRecordWatermarkError() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, buildSelectQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (input: { id: string; error_message: string }) => {
      // Get current error count
      const { data: currentData } = await buildSelectQuery('data_watermarks', 'error_count')
        .eq('id', input.id)
        .single();
      
      const currentErrorCount = (currentData as any)?.error_count ?? 0;

      const { data, error } = await buildUpdateQuery('data_watermarks', {
        error_count: currentErrorCount + 1,
        last_error: input.error_message,
        updated_at: new Date().toISOString(),
      })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return (data as unknown) as DataWatermark;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-watermarks', tenantId] });
    },
  });
}

/**
 * Disable a watermark
 */
export function useDisableWatermark() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await buildUpdateQuery('data_watermarks', {
        is_active: false,
        updated_at: new Date().toISOString(),
      })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return (data as unknown) as DataWatermark;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-watermarks', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['watermarks-due-sync', tenantId] });
    },
  });
}

// =====================================================
// Sync Checkpoints
// =====================================================

/**
 * Fetch sync checkpoints for a connector
 */
export function useSyncCheckpoints(connectorId?: string, limit = 50) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['sync-checkpoints', tenantId, connectorId, limit],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('sync_checkpoints', '*')
        .eq('connector_id', connectorId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as unknown) as SyncCheckpoint[];
    },
    enabled: isReady && !!tenantId && !!connectorId,
  });
}

/**
 * Create a sync checkpoint
 */
export function useCreateSyncCheckpoint() {
  const queryClient = useQueryClient();
  const { buildInsertQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (input: {
      connector_id: string;
      checkpoint_type: string;
      checkpoint_value: string;
      records_synced: number;
    }) => {
      const { data, error } = await buildInsertQuery('sync_checkpoints', {
        connector_id: input.connector_id,
        checkpoint_type: input.checkpoint_type,
        checkpoint_value: input.checkpoint_value,
        records_synced: input.records_synced,
      })
        .select()
        .single();

      if (error) throw error;
      return (data as unknown) as SyncCheckpoint;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['sync-checkpoints', tenantId, variables.connector_id] 
      });
    },
  });
}
