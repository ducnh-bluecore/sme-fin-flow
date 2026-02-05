/**
 * useIngestionBatches - Track data import batches
 * 
 * Part of Architecture v1.4.1 - Layer 1.5 (Ingestion)
 * 
 * @architecture Schema-per-Tenant Ready
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '../useTenantQueryBuilder';

// =====================================================
// Types
// =====================================================

export interface IngestionBatch {
  id: string;
  tenant_id: string;
  source_type: string;
  source_name: string;
  batch_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  records_total: number | null;
  records_processed: number | null;
  records_failed: number | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface IngestionBatchStats {
  total_batches: number;
  completed_batches: number;
  failed_batches: number;
  pending_batches: number;
  total_records_processed: number;
  avg_processing_time_ms: number;
}

// =====================================================
// Hooks
// =====================================================

/**
 * Fetch all ingestion batches for current tenant
 */
export function useIngestionBatches(options?: {
  status?: IngestionBatch['status'];
  sourceType?: string;
  limit?: number;
}) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { status, sourceType, limit = 100 } = options ?? {};

  return useQuery({
    queryKey: ['ingestion-batches', tenantId, status, sourceType, limit],
    queryFn: async () => {
      let query = buildSelectQuery('ingestion_batches', '*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }
      if (sourceType) {
        query = query.eq('source_type', sourceType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown) as IngestionBatch[];
    },
    enabled: isReady && !!tenantId,
    staleTime: 30000,
  });
}

/**
 * Get a single ingestion batch by ID
 */
export function useIngestionBatch(batchId?: string) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['ingestion-batch', batchId, tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('ingestion_batches', '*')
        .eq('id', batchId)
        .single();

      if (error) throw error;
      return (data as unknown) as IngestionBatch;
    },
    enabled: isReady && !!tenantId && !!batchId,
  });
}

/**
 * Get ingestion batch statistics
 */
export function useIngestionBatchStats() {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['ingestion-batch-stats', tenantId],
    queryFn: async () => {
      const { data, error } = await callRpc<IngestionBatchStats>(
        'get_ingestion_batch_stats',
        { p_tenant_id: tenantId }
      );

      if (error) {
        console.warn('[useIngestionBatchStats] RPC not available, returning defaults');
        return {
          total_batches: 0,
          completed_batches: 0,
          failed_batches: 0,
          pending_batches: 0,
          total_records_processed: 0,
          avg_processing_time_ms: 0,
        } as IngestionBatchStats;
      }

      return data as IngestionBatchStats;
    },
    enabled: isReady && !!tenantId,
    staleTime: 60000,
  });
}

/**
 * Create a new ingestion batch
 */
export function useCreateIngestionBatch() {
  const queryClient = useQueryClient();
  const { buildInsertQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (input: {
      source_type: string;
      source_name: string;
      batch_id?: string;
      records_total?: number;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await buildInsertQuery('ingestion_batches', {
        source_type: input.source_type,
        source_name: input.source_name,
        batch_id: input.batch_id ?? crypto.randomUUID(),
        status: 'pending',
        records_total: input.records_total ?? null,
        metadata: input.metadata ?? null,
      })
        .select()
        .single();

      if (error) throw error;
      return (data as unknown) as IngestionBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-batches', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['ingestion-batch-stats', tenantId] });
    },
  });
}

/**
 * Update ingestion batch status
 */
export function useUpdateIngestionBatch() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IngestionBatch> & { id: string }) => {
      const { data, error } = await buildUpdateQuery('ingestion_batches', {
        ...updates,
        updated_at: new Date().toISOString(),
      })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return (data as unknown) as IngestionBatch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-batches', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['ingestion-batch', data.id, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['ingestion-batch-stats', tenantId] });
    },
  });
}

/**
 * Mark batch as completed
 */
export function useCompleteIngestionBatch() {
  const { mutateAsync: updateBatch } = useUpdateIngestionBatch();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      records_processed: number;
      records_failed?: number;
    }) => {
      return updateBatch({
        id: input.id,
        status: input.records_failed && input.records_failed > 0 ? 'partial' : 'completed',
        records_processed: input.records_processed,
        records_failed: input.records_failed ?? 0,
        completed_at: new Date().toISOString(),
      });
    },
  });
}

/**
 * Mark batch as failed
 */
export function useFailIngestionBatch() {
  const { mutateAsync: updateBatch } = useUpdateIngestionBatch();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      error_message: string;
      records_processed?: number;
    }) => {
      return updateBatch({
        id: input.id,
        status: 'failed',
        error_message: input.error_message,
        records_processed: input.records_processed ?? 0,
        completed_at: new Date().toISOString(),
      });
    },
  });
}
