/**
 * Tenant Query Builder - Helper for Schema-per-Tenant Migration
 * 
 * This utility provides backward-compatible query building during the migration period.
 * It automatically:
 * 1. Translates legacy table names (cdp_*) to new names (master_*) when schema is provisioned
 * 2. Adds tenant_id filter when using shared DB mode (not provisioned)
 * 3. Skips tenant filter when using schema-per-tenant mode (isolation via search_path)
 * 
 * Usage:
 * ```ts
 * const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();
 * 
 * // Table name auto-translated, tenant filter auto-applied
 * const { data } = await buildQuery('cdp_orders') // → master_orders if provisioned
 *   .select('*')
 *   .order('created_at');
 * ```
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { getTableName, isPlatformTable, isPublicOnlyTable } from '@/lib/tableMapping';

export type TableName = string;

/**
 * Hook to get tenant-aware query builder
 * Automatically handles:
 * - Table name translation (cdp_* → master_*)
 * - Tenant_id filter based on schema mode
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
   * Build a query with automatic table translation and tenant filtering
   * @param tableName - The table to query (can be legacy name like 'cdp_orders')
   * @returns PostgrestFilterBuilder with table translated and tenant filter applied if needed
   */
  const buildQuery = useCallback(
    <T extends TableName>(tableName: T) => {
      // Translate table name if schema is provisioned
      const actualTable = getTableName(tableName, isSchemaProvisioned ?? false);
      
      const query = client.from(actualTable as any).select();
      
      // Platform tables and public-only tables don't need tenant filter
      if (isPlatformTable(tableName) || isPublicOnlyTable(tableName)) {
        return query;
      }
      
      // In schema-per-tenant mode, no filter needed (isolation via search_path)
      // In shared DB mode, add tenant_id filter
      if (shouldAddTenantFilter && tenantId) {
        return query.eq('tenant_id', tenantId);
      }
      
      return query;
    },
    [client, shouldAddTenantFilter, tenantId, isSchemaProvisioned]
  );

  /**
   * Build a query for a specific table with custom select
   */
  const buildSelectQuery = useCallback(
    <T extends TableName>(tableName: T, columns: string) => {
      // Translate table name if schema is provisioned
      const actualTable = getTableName(tableName, isSchemaProvisioned ?? false);
      
      const query = client.from(actualTable as any).select(columns);
      
      // Platform tables and public-only tables don't need tenant filter
      if (isPlatformTable(tableName) || isPublicOnlyTable(tableName)) {
        return query;
      }
      
      if (shouldAddTenantFilter && tenantId) {
        return query.eq('tenant_id', tenantId);
      }
      
      return query;
    },
    [client, shouldAddTenantFilter, tenantId, isSchemaProvisioned]
  );

  /**
   * Build an insert query with automatic tenant_id
   */
  const buildInsertQuery = useCallback(
    <T extends TableName>(tableName: T, data: Record<string, any> | Record<string, any>[]) => {
      // Translate table name if schema is provisioned
      const actualTable = getTableName(tableName, isSchemaProvisioned ?? false);
      
      // Platform tables and public-only tables don't need tenant_id
      if (isPlatformTable(tableName) || isPublicOnlyTable(tableName)) {
        return client.from(actualTable as any).insert(data);
      }
      
      // Add tenant_id to inserts for data integrity
      // In schema mode, this is for consistency; in shared mode, it's required
      const addTenantId = (row: Record<string, any>) => ({
        ...row,
        tenant_id: tenantId,
      });

      const dataWithTenant = Array.isArray(data) 
        ? data.map(addTenantId) 
        : addTenantId(data);

      return client.from(actualTable as any).insert(dataWithTenant);
    },
    [client, tenantId, isSchemaProvisioned]
  );

  /**
   * Build an update query with tenant filter
   */
  const buildUpdateQuery = useCallback(
    <T extends TableName>(tableName: T, data: Record<string, any>) => {
      // Translate table name if schema is provisioned
      const actualTable = getTableName(tableName, isSchemaProvisioned ?? false);
      
      const query = client.from(actualTable as any).update(data);
      
      // Platform tables and public-only tables don't need tenant filter
      if (isPlatformTable(tableName) || isPublicOnlyTable(tableName)) {
        return query;
      }
      
      if (shouldAddTenantFilter && tenantId) {
        return query.eq('tenant_id', tenantId);
      }
      
      return query;
    },
    [client, shouldAddTenantFilter, tenantId, isSchemaProvisioned]
  );

  /**
   * Build a delete query with tenant filter
   */
  const buildDeleteQuery = useCallback(
    <T extends TableName>(tableName: T) => {
      // Translate table name if schema is provisioned
      const actualTable = getTableName(tableName, isSchemaProvisioned ?? false);
      
      const query = client.from(actualTable as any).delete();
      
      // Platform tables and public-only tables don't need tenant filter
      if (isPlatformTable(tableName) || isPublicOnlyTable(tableName)) {
        return query;
      }
      
      if (shouldAddTenantFilter && tenantId) {
        return query.eq('tenant_id', tenantId);
      }
      
      return query;
    },
    [client, shouldAddTenantFilter, tenantId, isSchemaProvisioned]
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

  /**
   * Get the actual table name that will be used (for debugging)
   */
  const getActualTableName = useCallback(
    (tableName: string) => getTableName(tableName, isSchemaProvisioned ?? false),
    [isSchemaProvisioned]
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
    // Helpers
    getActualTableName,
  };
}

/**
 * Standalone function for non-hook contexts
 * Requires tenantId and mode to be passed explicitly
 */
export function buildTenantQuery(
  tableName: string,
  tenantId: string,
  shouldAddFilter: boolean,
  isProvisioned: boolean = false
) {
  const actualTable = getTableName(tableName, isProvisioned);
  const query = supabase.from(actualTable as any).select();
  
  // Platform tables and public-only tables don't need tenant filter
  if (isPlatformTable(tableName) || isPublicOnlyTable(tableName)) {
    return query;
  }
  
  if (shouldAddFilter && tenantId) {
    return query.eq('tenant_id', tenantId);
  }
  
  return query;
}
