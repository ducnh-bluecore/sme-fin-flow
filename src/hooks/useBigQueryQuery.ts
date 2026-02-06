/**
 * useBigQueryQuery - Query raw data from BigQuery
 * 
 * @architecture Layer 10 - BigQuery Integration
 * Uses useTenantQueryBuilder for tenant-aware queries.
 * Supports raw_select, filtered, aggregated, and custom_sql queries.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';

// ============= Types =============

export type QueryType = 'raw_select' | 'filtered' | 'aggregated' | 'custom_sql';

export type FilterOperator = 
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' 
  | 'like' | 'in' | 'between' | 'is_null' | 'is_not_null';

export interface BigQueryFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface BigQueryOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface BigQueryAggregation {
  field: string;
  func: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
  alias?: string;
}

export interface BigQueryQueryParams {
  dataset: string;
  table: string;
  query_type?: QueryType;
  
  // For raw_select / filtered
  columns?: string[];
  filters?: BigQueryFilter[];
  order_by?: BigQueryOrderBy[];
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Date filtering shorthand
  date_field?: string;
  start_date?: string;
  end_date?: string;
  
  // For aggregated
  group_by?: string[];
  aggregations?: BigQueryAggregation[];
  
  // For custom_sql
  custom_sql?: string;
  
  // Caching
  use_cache?: boolean;
  cache_ttl_minutes?: number;
  
  // Query options
  enabled?: boolean;
}

export interface SchemaField {
  name: string;
  type: string;
  mode: string;
}

export interface BigQueryQueryResult {
  success: boolean;
  rows: Record<string, any>[];
  row_count: number;
  total_count?: number;
  schema: SchemaField[];
  query_time_ms: number;
  bytes_processed?: number;
  cached: boolean;
  cached_at?: string;
  expires_at?: string;
  error?: string;
  warnings?: string[];
}

// ============= Main Hook =============

export function useBigQueryQuery(params: BigQueryQueryParams) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();
  
  const isEnabled = params.enabled !== false && 
    !!tenantId && 
    isReady && 
    !!params.dataset && 
    !!params.table;

  return useQuery({
    queryKey: [
      'bigquery-query', 
      tenantId, 
      params.dataset, 
      params.table, 
      params.query_type || 'raw_select',
      params.columns,
      params.filters,
      params.order_by,
      params.limit,
      params.offset,
      params.date_field,
      params.start_date,
      params.end_date,
      params.group_by,
      params.aggregations,
      params.custom_sql,
    ],
    queryFn: async (): Promise<BigQueryQueryResult> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const { data, error } = await client.functions.invoke('bigquery-query', {
        body: {
          tenant_id: tenantId,
          dataset: params.dataset,
          table: params.table,
          query_type: params.query_type || 'raw_select',
          columns: params.columns,
          filters: params.filters,
          order_by: params.order_by,
          limit: params.limit,
          offset: params.offset,
          date_field: params.date_field,
          start_date: params.start_date,
          end_date: params.end_date,
          group_by: params.group_by,
          aggregations: params.aggregations,
          custom_sql: params.custom_sql,
          use_cache: params.use_cache ?? true,
          cache_ttl_minutes: params.cache_ttl_minutes ?? 15,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to query BigQuery');
      }

      return data as BigQueryQueryResult;
    },
    enabled: isEnabled,
    staleTime: params.use_cache !== false ? 5 * 60 * 1000 : 0, // 5 min if caching
    gcTime: 10 * 60 * 1000, // 10 min
  });
}

// ============= Lazy Query Hook =============

export function useBigQueryLazyQuery() {
  const { client, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: BigQueryQueryParams): Promise<BigQueryQueryResult> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const { data, error } = await client.functions.invoke('bigquery-query', {
        body: {
          tenant_id: tenantId,
          dataset: params.dataset,
          table: params.table,
          query_type: params.query_type || 'raw_select',
          columns: params.columns,
          filters: params.filters,
          order_by: params.order_by,
          limit: params.limit,
          offset: params.offset,
          date_field: params.date_field,
          start_date: params.start_date,
          end_date: params.end_date,
          group_by: params.group_by,
          aggregations: params.aggregations,
          custom_sql: params.custom_sql,
          use_cache: params.use_cache ?? true,
          cache_ttl_minutes: params.cache_ttl_minutes ?? 15,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to query BigQuery');
      }

      return data as BigQueryQueryResult;
    },
    onError: (error) => {
      toast.error('Lỗi query BigQuery: ' + error.message);
    },
  });
}

// ============= Paginated Query Hook =============

export function useBigQueryPaginatedQuery(
  baseParams: Omit<BigQueryQueryParams, 'limit' | 'offset'>,
  page: number = 1,
  pageSize: number = 100
) {
  const offset = (page - 1) * pageSize;
  
  return useBigQueryQuery({
    ...baseParams,
    limit: pageSize,
    offset,
  });
}

// ============= Aggregation Query Hook =============

export function useBigQueryAggregation(params: {
  dataset: string;
  table: string;
  group_by?: string[];
  aggregations: BigQueryAggregation[];
  filters?: BigQueryFilter[];
  date_field?: string;
  start_date?: string;
  end_date?: string;
  enabled?: boolean;
}) {
  return useBigQueryQuery({
    ...params,
    query_type: 'aggregated',
  });
}

// ============= Custom SQL Query Hook =============

export function useBigQueryCustomSql(params: {
  custom_sql: string;
  enabled?: boolean;
}) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();
  
  // For custom SQL, we need dataset/table but they're not used
  // We'll use a placeholder since custom_sql contains the full query
  return useQuery({
    queryKey: ['bigquery-custom-sql', tenantId, params.custom_sql],
    queryFn: async (): Promise<BigQueryQueryResult> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const { data, error } = await client.functions.invoke('bigquery-query', {
        body: {
          tenant_id: tenantId,
          dataset: '_custom',
          table: '_custom',
          query_type: 'custom_sql',
          custom_sql: params.custom_sql,
          use_cache: false, // Custom SQL queries should not be cached
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to execute custom SQL');
      }

      return data as BigQueryQueryResult;
    },
    enabled: params.enabled !== false && !!tenantId && isReady && !!params.custom_sql,
    staleTime: 0, // Don't cache custom SQL
  });
}

// ============= Export Types =============
export type { BigQueryQueryParams as BigQueryRawQueryParams };
