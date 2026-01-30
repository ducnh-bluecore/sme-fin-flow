/**
 * Tenant-aware Supabase Client Wrapper
 * 
 * Part of Schema-per-Tenant Architecture
 * 
 * This module provides:
 * 1. useTenantSupabase() - Hook that auto-sets schema for React components
 * 2. getTenantSupabase() - Async function for non-React code
 * 3. setTenantSchema() - Direct schema switching function
 * 
 * Usage:
 * - In React components: const supabase = useTenantSupabase()
 * - In async functions: const supabase = await getTenantSupabase(tenantId)
 */

import { useEffect, useCallback, useState } from 'react';
import { supabase } from './client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

/**
 * Set the database search_path to the tenant's schema
 * Must be called before any queries to ensure data isolation
 */
export async function setTenantSchema(tenantId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('set_tenant_schema', { 
      p_tenant_id: tenantId 
    });
    
    if (error) {
      console.error('[TenantClient] Failed to set tenant schema:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('[TenantClient] Error setting tenant schema:', err);
    return false;
  }
}

/**
 * Check if tenant schema is provisioned
 */
export async function isTenantSchemaProvisioned(tenantId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_tenant_schema_provisioned', {
      p_tenant_id: tenantId
    });
    
    if (error) {
      console.error('[TenantClient] Failed to check schema provisioned:', error);
      return false;
    }
    
    return data === true;
  } catch (err) {
    console.error('[TenantClient] Error checking schema:', err);
    return false;
  }
}

/**
 * Get tenant schema statistics
 */
export async function getTenantSchemaStats(tenantId: string) {
  const { data, error } = await supabase.rpc('get_tenant_schema_stats', {
    p_tenant_id: tenantId
  });
  
  if (error) {
    console.error('[TenantClient] Failed to get schema stats:', error);
    return null;
  }
  
  return data;
}

/**
 * Get the Supabase client with tenant schema set
 * For use in non-React async contexts
 */
export async function getTenantSupabase(tenantId: string) {
  await setTenantSchema(tenantId);
  return supabase;
}

/**
 * Hook to get tenant-aware Supabase client
 * 
 * Automatically sets the schema when tenant changes.
 * Returns the supabase client and schema status.
 * 
 * @example
 * function MyComponent() {
 *   const { client, isSchemaSet, isSchemaProvisioned } = useTenantSupabase();
 *   
 *   if (!isSchemaSet) return <Loading />;
 *   
 *   // Use client for queries - schema is already set
 *   const { data } = await client.from('products').select('*');
 * }
 */
export function useTenantSupabase() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const [isSchemaSet, setIsSchemaSet] = useState(false);
  const [isSchemaProvisioned, setIsSchemaProvisioned] = useState<boolean | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Set schema when tenant changes
  useEffect(() => {
    let cancelled = false;

    async function initSchema() {
      if (!tenantId) {
        setIsSchemaSet(false);
        setIsSchemaProvisioned(null);
        return;
      }

      try {
        // First check if schema is provisioned
        const provisioned = await isTenantSchemaProvisioned(tenantId);
        
        if (cancelled) return;
        
        setIsSchemaProvisioned(provisioned);
        
        if (!provisioned) {
          // Schema not provisioned - still using shared DB mode
          // This is expected during migration period
          setIsSchemaSet(false);
          setSchemaError('Schema not provisioned - using shared DB mode');
          return;
        }

        // Set the schema
        const success = await setTenantSchema(tenantId);
        
        if (cancelled) return;
        
        setIsSchemaSet(success);
        setSchemaError(success ? null : 'Failed to set schema');
      } catch (err) {
        if (cancelled) return;
        setSchemaError(err instanceof Error ? err.message : 'Unknown error');
        setIsSchemaSet(false);
      }
    }

    initSchema();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  // Function to manually refresh schema
  const refreshSchema = useCallback(async () => {
    if (!tenantId) return false;
    const success = await setTenantSchema(tenantId);
    setIsSchemaSet(success);
    return success;
  }, [tenantId]);

  return {
    client: supabase,
    tenantId,
    isLoading: tenantLoading,
    isSchemaSet,
    isSchemaProvisioned,
    schemaError,
    refreshSchema,
  };
}

/**
 * Hook for backward compatibility during migration
 * 
 * Uses schema-per-tenant if provisioned, otherwise falls back to shared DB + RLS
 * This allows gradual migration of tenants
 */
export function useTenantSupabaseCompat() {
  const { 
    client, 
    tenantId, 
    isLoading, 
    isSchemaSet, 
    isSchemaProvisioned 
  } = useTenantSupabase();

  // During migration: if schema is not provisioned, queries still work
  // because they'll use public schema with RLS
  const shouldAddTenantFilter = !isSchemaProvisioned;

  return {
    client,
    tenantId,
    isLoading,
    isSchemaSet,
    isSchemaProvisioned,
    // Helper: should we add .eq('tenant_id', tenantId) to queries?
    shouldAddTenantFilter,
    // Ready when we have tenant and either:
    // - Schema is set (schema-per-tenant mode)
    // - Schema is not provisioned (shared DB mode with RLS)
    isReady: !isLoading && !!tenantId && (isSchemaSet || !isSchemaProvisioned),
  };
}

/**
 * Type for tenant-aware query options
 */
export interface TenantQueryOptions {
  /** Tenant ID for the query */
  tenantId: string;
  /** Whether to add tenant_id filter (for backward compat during migration) */
  addTenantFilter?: boolean;
}
