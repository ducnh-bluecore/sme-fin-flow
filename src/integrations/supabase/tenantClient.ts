/**
 * Tenant-aware Supabase Client Wrapper
 * 
 * Part of Schema-per-Tenant Architecture v1.4.1
 * 
 * This module provides:
 * 1. useTenantSupabase() - Hook that auto-sets schema for React components
 * 2. useTenantSupabaseCompat() - Backward-compatible hook with session integration
 * 3. getTenantSupabase() - Async function for non-React code
 * 4. setTenantSchema() - Direct schema switching function
 * 
 * Migration Phase 3: Now integrates with init_tenant_session() for better connection pooling.
 * 
 * Usage:
 * - In React components: const { client, isReady } = useTenantSupabaseCompat()
 * - In async functions: const supabase = await getTenantSupabase(tenantId)
 */

import { useEffect, useCallback, useState, useMemo } from 'react';
import { supabase } from './client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

// =====================================================
// Schema Management Functions
// =====================================================

/**
 * Set the database search_path to the tenant's schema
 * Must be called before any queries to ensure data isolation
 * 
 * @deprecated Prefer init_tenant_session() which sets search_path + session vars
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
 * Initialize tenant session (v1.4.1)
 * Sets search_path AND session variables in one call
 * Preferred over setTenantSchema for better connection pool efficiency
 */
export async function initTenantSession(tenantId: string): Promise<{
  success: boolean;
  data?: {
    tenant_id: string;
    schema: string;
    tier: 'smb' | 'midmarket' | 'enterprise';
    is_provisioned: boolean;
    user_role: string;
  };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('init_tenant_session', { 
      p_tenant_id: tenantId 
    });
    
    if (error) {
      console.error('[TenantClient] Failed to init tenant session:', error);
      return { success: false, error: error.message };
    }
    
    // Cast RPC response
    const sessionData = data as unknown as {
      tenant_id: string;
      schema: string;
      tier: string;
      is_provisioned: boolean;
      user_role: string;
    };
    
    return { 
      success: true, 
      data: {
        tenant_id: sessionData.tenant_id,
        schema: sessionData.schema,
        tier: sessionData.tier as 'smb' | 'midmarket' | 'enterprise',
        is_provisioned: sessionData.is_provisioned,
        user_role: sessionData.user_role,
      }
    };
  } catch (err) {
    console.error('[TenantClient] Error initializing session:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Check if tenant schema is provisioned
 */
export async function isTenantSchemaProvisioned(tenantId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('schema_provisioned')
      .eq('id', tenantId)
      .single();
    
    if (error) {
      console.error('[TenantClient] Failed to check schema provisioned:', error);
      return false;
    }
    
    return data?.schema_provisioned === true;
  } catch (err) {
    console.error('[TenantClient] Error checking schema:', err);
    return false;
  }
}

/**
 * Get tenant schema statistics
 */
export async function getTenantSchemaStats(tenantId: string) {
  const { data, error } = await supabase.rpc('check_tenant_schema_status', {
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
  // Use new session-based init
  await initTenantSession(tenantId);
  return supabase;
}

// =====================================================
// Session State Types
// =====================================================

export interface TenantSessionState {
  tenantId: string | null;
  schema: string | null;
  tier: 'smb' | 'midmarket' | 'enterprise' | null;
  isProvisioned: boolean;
  userRole: string | null;
  isSessionInit: boolean;
}

// =====================================================
// Main Hook: useTenantSupabase
// =====================================================

/**
 * Hook to get tenant-aware Supabase client
 * 
 * Automatically initializes session when tenant changes.
 * Returns the supabase client and session status.
 * 
 * @example
 * function MyComponent() {
 *   const { client, isSessionInit, sessionState } = useTenantSupabase();
 *   
 *   if (!isSessionInit) return <Loading />;
 *   
 *   // Use client for queries - session is already initialized
 *   const { data } = await client.from('master_orders').select('*');
 * }
 */
export function useTenantSupabase() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const [sessionState, setSessionState] = useState<TenantSessionState>({
    tenantId: null,
    schema: null,
    tier: null,
    isProvisioned: false,
    userRole: null,
    isSessionInit: false,
  });
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize session when tenant changes
  useEffect(() => {
    let cancelled = false;

    async function initSession() {
      if (!tenantId) {
        setSessionState({
          tenantId: null,
          schema: null,
          tier: null,
          isProvisioned: false,
          userRole: null,
          isSessionInit: false,
        });
        return;
      }

      setIsInitializing(true);

      try {
        const result = await initTenantSession(tenantId);
        
        if (cancelled) return;
        
        if (!result.success || !result.data) {
          setSessionError(result.error || 'Session init failed');
          // Fallback: try old method for backward compat
          const provisioned = await isTenantSchemaProvisioned(tenantId);
          setSessionState({
            tenantId,
            schema: provisioned ? `tenant_${tenantId.substring(0, 8)}` : 'public',
            tier: 'midmarket',
            isProvisioned: provisioned,
            userRole: null,
            isSessionInit: false,
          });
          return;
        }

        setSessionState({
          tenantId: result.data.tenant_id,
          schema: result.data.schema,
          tier: result.data.tier,
          isProvisioned: result.data.is_provisioned,
          userRole: result.data.user_role,
          isSessionInit: true,
        });
        setSessionError(null);

      } catch (err) {
        if (cancelled) return;
        setSessionError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    initSession();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  // Function to manually refresh session
  const refreshSession = useCallback(async () => {
    if (!tenantId) return false;
    const result = await initTenantSession(tenantId);
    if (result.success && result.data) {
      setSessionState({
        tenantId: result.data.tenant_id,
        schema: result.data.schema,
        tier: result.data.tier,
        isProvisioned: result.data.is_provisioned,
        userRole: result.data.user_role,
        isSessionInit: true,
      });
    }
    return result.success;
  }, [tenantId]);

  // Backward compat: map to old property names
  const isSchemaSet = sessionState.isSessionInit;
  const isSchemaProvisioned = sessionState.isProvisioned;

  return {
    client: supabase,
    tenantId,
    isLoading: tenantLoading || isInitializing,
    isSchemaSet,
    isSchemaProvisioned,
    schemaError: sessionError,
    refreshSchema: refreshSession,
    // New v1.4.1 properties
    sessionState,
    isSessionInit: sessionState.isSessionInit,
    refreshSession,
  };
}

// =====================================================
// Compat Hook: useTenantSupabaseCompat
// =====================================================

/**
 * Hook for backward compatibility during migration
 * 
 * Uses schema-per-tenant if provisioned, otherwise falls back to shared DB + RLS
 * This allows gradual migration of tenants
 * 
 * v1.4.1: Now uses init_tenant_session() for session-based context
 */
export function useTenantSupabaseCompat() {
  const { 
    client, 
    tenantId, 
    isLoading, 
    isSchemaSet, 
    isSchemaProvisioned,
    sessionState,
    isSessionInit,
  } = useTenantSupabase();

  // During migration: if schema is not provisioned, queries still work
  // because they'll use public schema with RLS
  const shouldAddTenantFilter = !isSchemaProvisioned;

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    client,
    tenantId,
    isLoading,
    isSchemaSet,
    isSchemaProvisioned,
    // Helper: should we add .eq('tenant_id', tenantId) to queries?
    shouldAddTenantFilter,
    // Ready when we have tenant and either:
    // - Session is initialized (schema-per-tenant mode)
    // - Schema is not provisioned (shared DB mode with RLS)
    isReady: !isLoading && !!tenantId && (isSessionInit || !isSchemaProvisioned),
    // New v1.4.1 properties
    sessionState,
    tier: sessionState.tier,
    userRole: sessionState.userRole,
  }), [
    client,
    tenantId,
    isLoading,
    isSchemaSet,
    isSchemaProvisioned,
    shouldAddTenantFilter,
    isSessionInit,
    sessionState,
  ]);
}

// =====================================================
// Type Exports
// =====================================================

/**
 * Type for tenant-aware query options
 */
export interface TenantQueryOptions {
  /** Tenant ID for the query */
  tenantId: string;
  /** Whether to add tenant_id filter (for backward compat during migration) */
  addTenantFilter?: boolean;
}

export type TenantTier = 'smb' | 'midmarket' | 'enterprise';
