/**
 * useBigQueryBackfill - Hook for triggering and monitoring BigQuery backfill jobs
 * 
 * @architecture Layer 10 Integration
 * Provides UI interface for backfill-bigquery edge function.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';

// ============= Types =============

export type BackfillModelType = 
  | 'customers' 
  | 'products' 
  | 'orders' 
  | 'order_items'
  | 'refunds'
  | 'payments'
  | 'fulfillments'
  | 'inventory'
  | 'campaigns'
  | 'ad_spend';

export type BackfillAction = 'start' | 'continue' | 'status' | 'cancel';

export interface BackfillOptions {
  source_table?: string;
  batch_size?: number;
  date_from?: string;
  date_to?: string;
}

export interface BackfillJob {
  id: string;
  tenant_id: string;
  model_type: BackfillModelType;
  source_table: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_records: number;
  processed_records: number;
  failed_records: number;
  last_processed_date: string | null;
  last_watermark: string | null;
  error_message: string | null;
  metadata: Record<string, any>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface BackfillResult {
  success: boolean;
  job_id?: string;
  model_type?: BackfillModelType;
  result?: {
    processed: number;
    created?: number;
    merged?: number;
    inserted?: number;
  };
  duration_ms?: number;
  jobs?: BackfillJob[];
  error?: string;
  message?: string;
}

// ============= Main Hook =============

export function useBigQueryBackfill() {
  const { client, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  // Start backfill mutation
  const startBackfill = useMutation({
    mutationFn: async ({ 
      modelType, 
      options 
    }: { 
      modelType: BackfillModelType; 
      options?: BackfillOptions 
    }): Promise<BackfillResult> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const { data, error } = await client.functions.invoke('backfill-bigquery', {
        body: {
          action: 'start',
          tenant_id: tenantId,
          model_type: modelType,
          options,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to start backfill');
      }

      return data as BackfillResult;
    },
    onSuccess: (data, variables) => {
      toast.success(`Backfill ${variables.modelType} started`, {
        description: `Job ID: ${data.job_id?.substring(0, 8)}...`,
      });
      // Invalidate job status queries
      queryClient.invalidateQueries({ 
        queryKey: ['backfill-status', tenantId, variables.modelType] 
      });
    },
    onError: (error) => {
      toast.error('Backfill failed to start', {
        description: error.message,
      });
    },
  });

  // Continue backfill mutation
  const continueBackfill = useMutation({
    mutationFn: async ({ 
      modelType, 
      options 
    }: { 
      modelType: BackfillModelType; 
      options?: BackfillOptions 
    }): Promise<BackfillResult> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const { data, error } = await client.functions.invoke('backfill-bigquery', {
        body: {
          action: 'continue',
          tenant_id: tenantId,
          model_type: modelType,
          options,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to continue backfill');
      }

      return data as BackfillResult;
    },
    onSuccess: (data, variables) => {
      toast.success(`Backfill ${variables.modelType} continued`);
      queryClient.invalidateQueries({ 
        queryKey: ['backfill-status', tenantId, variables.modelType] 
      });
    },
    onError: (error) => {
      toast.error('Backfill continue failed', {
        description: error.message,
      });
    },
  });

  // Cancel backfill mutation
  const cancelBackfill = useMutation({
    mutationFn: async (modelType: BackfillModelType): Promise<BackfillResult> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const { data, error } = await client.functions.invoke('backfill-bigquery', {
        body: {
          action: 'cancel',
          tenant_id: tenantId,
          model_type: modelType,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to cancel backfill');
      }

      return data as BackfillResult;
    },
    onSuccess: (_, modelType) => {
      toast.info(`Backfill ${modelType} cancelled`);
      queryClient.invalidateQueries({ 
        queryKey: ['backfill-status', tenantId, modelType] 
      });
    },
    onError: (error) => {
      toast.error('Backfill cancel failed', {
        description: error.message,
      });
    },
  });

  return {
    startBackfill,
    continueBackfill,
    cancelBackfill,
    isReady,
    tenantId,
  };
}

// ============= Status Hook =============

export function useBackfillStatus(modelType: BackfillModelType) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['backfill-status', tenantId, modelType],
    queryFn: async (): Promise<BackfillJob[]> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const { data, error } = await client.functions.invoke('backfill-bigquery', {
        body: {
          action: 'status',
          tenant_id: tenantId,
          model_type: modelType,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to get backfill status');
      }

      return (data as BackfillResult).jobs || [];
    },
    enabled: isReady && !!tenantId,
    refetchInterval: 10000, // Poll every 10 seconds
    staleTime: 5000,
  });
}

// ============= All Jobs Hook =============

export function useAllBackfillJobs() {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['backfill-jobs-all', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const { data, error } = await client
        .from('bigquery_backfill_jobs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return data as BackfillJob[];
    },
    enabled: isReady && !!tenantId,
    refetchInterval: 15000,
  });
}

// ============= Model Type Labels =============

export const MODEL_TYPE_LABELS: Record<BackfillModelType, string> = {
  customers: 'Customers',
  products: 'Products',
  orders: 'Orders',
  order_items: 'Order Items',
  refunds: 'Refunds',
  payments: 'Payments',
  fulfillments: 'Fulfillments',
  inventory: 'Inventory',
  campaigns: 'Campaigns',
  ad_spend: 'Ad Spend',
};

export const MODEL_TYPE_ICONS: Record<BackfillModelType, string> = {
  customers: '👥',
  products: '📦',
  orders: '🛒',
  order_items: '📋',
  refunds: '↩️',
  payments: '💳',
  fulfillments: '🚚',
  inventory: '📊',
  campaigns: '📢',
  ad_spend: '💰',
};
