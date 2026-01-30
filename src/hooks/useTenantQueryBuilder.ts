/**
 * Tenant Query Builder - Helper for Schema-per-Tenant Migration
 * 
 * This utility provides backward-compatible query building during the migration period.
 * It automatically adds tenant_id filter when schema is not provisioned (shared DB mode),
 * and skips it when using schema-per-tenant mode (isolation via search_path).
 * 
 * Usage:
 * ```ts
 * const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();
 * 
 * const { data } = await buildQuery('products')
 *   .select('*')
 *   .order('name');
 * ```
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSupabaseCompat } from './useTenantSupabase';

export type TableName = string;

/**
 * Hook to get tenant-aware query builder
 * Automatically handles tenant_id filter based on schema mode
 */
export function useTenantQueryBuilder() {
  const {
    client,
    tenantId,
    isLoading,
    isReady,
    shouldAddTenantFilter,
    isSchemaProvisioned,
  } = useTenantSupabaseCompat();

  /**
   * Build a query with automatic tenant filtering
   * @param tableName - The table to query
   * @returns PostgrestFilterBuilder with tenant filter applied if needed
   */
  const buildQuery = useCallback(
    <T extends TableName>(tableName: T) => {
      const query = client.from(tableName as any).select();
      
      // In schema-per-tenant mode, no filter needed (isolation via search_path)
      // In shared DB mode, add tenant_id filter
      if (shouldAddTenantFilter && tenantId) {
        return query.eq('tenant_id', tenantId);
      }
      
      return query;
    },
    [client, shouldAddTenantFilter, tenantId]
  );

  /**
   * Build a query for a specific table with custom select
   */
  const buildSelectQuery = useCallback(
    <T extends TableName>(tableName: T, columns: string) => {
      const query = client.from(tableName as any).select(columns);
      
      if (shouldAddTenantFilter && tenantId) {
        return query.eq('tenant_id', tenantId);
      }
      
      return query;
    },
    [client, shouldAddTenantFilter, tenantId]
  );

  /**
   * Build an insert query with automatic tenant_id
   */
  const buildInsertQuery = useCallback(
    <T extends TableName>(tableName: T, data: Record<string, any> | Record<string, any>[]) => {
      // Always add tenant_id to inserts (both modes need it for data integrity)
      const addTenantId = (row: Record<string, any>) => ({
        ...row,
        tenant_id: tenantId,
      });

      const dataWithTenant = Array.isArray(data) 
        ? data.map(addTenantId) 
        : addTenantId(data);

      return client.from(tableName as any).insert(dataWithTenant);
    },
    [client, tenantId]
  );

  /**
   * Build an update query with tenant filter
   */
  const buildUpdateQuery = useCallback(
    <T extends TableName>(tableName: T, data: Record<string, any>) => {
      const query = client.from(tableName as any).update(data);
      
      if (shouldAddTenantFilter && tenantId) {
        return query.eq('tenant_id', tenantId);
      }
      
      return query;
    },
    [client, shouldAddTenantFilter, tenantId]
  );

  /**
   * Build a delete query with tenant filter
   */
  const buildDeleteQuery = useCallback(
    <T extends TableName>(tableName: T) => {
      const query = client.from(tableName as any).delete();
      
      if (shouldAddTenantFilter && tenantId) {
        return query.eq('tenant_id', tenantId);
      }
      
      return query;
    },
    [client, shouldAddTenantFilter, tenantId]
  );

  /**
   * Call an RPC function (RPCs don't need tenant filter, they handle it internally)
   */
  const callRpc = useCallback(
    async <T = any>(fnName: string, params?: Record<string, any>): Promise<{ data: T | null; error: any }> => {
      // Most RPCs already include tenant_id in params
      // Pass tenantId if not already provided
      const finalParams = params?.tenant_id 
        ? params 
        : { ...params, p_tenant_id: tenantId };
      
      const { data, error } = await client.rpc(fnName as any, finalParams);
      return { data: data as T | null, error };
    },
    [client, tenantId]
  );

  return {
    client,
    tenantId,
    isLoading,
    isReady,
    isSchemaProvisioned,
    shouldAddTenantFilter,
    // Query builders
    buildQuery,
    buildSelectQuery,
    buildInsertQuery,
    buildUpdateQuery,
    buildDeleteQuery,
    callRpc,
  };
}

/**
 * Standalone function for non-hook contexts
 * Requires tenantId and mode to be passed explicitly
 */
export function buildTenantQuery(
  tableName: string,
  tenantId: string,
  shouldAddFilter: boolean
) {
  const query = supabase.from(tableName as any).select();
  
  if (shouldAddFilter && tenantId) {
    return query.eq('tenant_id', tenantId);
  }
  
  return query;
}
