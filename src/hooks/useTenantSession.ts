/**
 * Tenant Session Hook - Session-based Context Management
 * 
 * Part of Architecture v1.4.1 - Fixes Connection Pool Hell (RISK #2)
 * 
 * This hook initializes tenant session ONCE per connection, not per query.
 * It sets search_path to the correct tenant schema based on tier:
 * - SMB: public schema with RLS
 * - Midmarket: dedicated tenant_xxx schema
 * - Enterprise: dedicated schema with additional features
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { isSessionReady, sessionInfo, initSession } = useTenantSession();
 *   
 *   if (!isSessionReady) return <Loading />;
 *   
 *   // Session is initialized, queries will use correct schema
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

export type TenantTier = 'smb' | 'midmarket' | 'enterprise';

export interface TenantSessionInfo {
  tenantId: string;
  schema: string;
  tier: TenantTier;
  isProvisioned: boolean;
  userRole: string;
}

export interface UseTenantSessionReturn {
  /** Whether session is initialized and ready */
  isSessionReady: boolean;
  /** Whether session is currently being initialized */
  isInitializing: boolean;
  /** Session information after initialization */
  sessionInfo: TenantSessionInfo | null;
  /** Error if session initialization failed */
  sessionError: string | null;
  /** Manually re-initialize session (e.g., after tenant switch) */
  initSession: () => Promise<void>;
  /** Set current organization within tenant */
  setCurrentOrg: (orgId: string) => Promise<void>;
  /** Current organization ID */
  currentOrgId: string | null;
}

/**
 * Hook to manage tenant session lifecycle
 * 
 * Automatically initializes session when tenant changes.
 * Session persists for the connection lifetime.
 */
export function useTenantSession(): UseTenantSessionReturn {
  const { activeTenant, isLoading: tenantLoading } = useTenantContext();
  
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<TenantSessionInfo | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  /**
   * Initialize tenant session via RPC
   */
  const initSession = useCallback(async () => {
    if (!activeTenant?.id) {
      setIsSessionReady(false);
      setSessionInfo(null);
      return;
    }

    setIsInitializing(true);
    setSessionError(null);

    try {
      const { data, error } = await supabase.rpc('init_tenant_session', {
        p_tenant_id: activeTenant.id
      });

      if (error) {
        console.error('[TenantSession] Failed to initialize:', error);
        setSessionError(error.message);
        setIsSessionReady(false);
        return;
      }

      // Cast RPC response to expected shape
      const sessionData = data as unknown as {
        tenant_id: string;
        schema: string;
        tier: string;
        is_provisioned: boolean;
        user_role: string;
      };

      const info: TenantSessionInfo = {
        tenantId: sessionData.tenant_id,
        schema: sessionData.schema,
        tier: sessionData.tier as TenantTier,
        isProvisioned: sessionData.is_provisioned,
        userRole: sessionData.user_role,
      };

      setSessionInfo(info);
      setIsSessionReady(true);
      console.log('[TenantSession] Initialized:', info);

    } catch (err) {
      console.error('[TenantSession] Unexpected error:', err);
      setSessionError(err instanceof Error ? err.message : 'Unknown error');
      setIsSessionReady(false);
    } finally {
      setIsInitializing(false);
    }
  }, [activeTenant?.id]);

  /**
   * Set current organization within the tenant
   */
  const setCurrentOrg = useCallback(async (orgId: string) => {
    if (!isSessionReady) {
      console.warn('[TenantSession] Cannot set org - session not ready');
      return;
    }

    try {
      const { error } = await supabase.rpc('set_current_org', {
        p_org_id: orgId
      });

      if (error) {
        console.error('[TenantSession] Failed to set org:', error);
        throw error;
      }

      setCurrentOrgId(orgId);
      console.log('[TenantSession] Organization set:', orgId);

    } catch (err) {
      console.error('[TenantSession] Error setting org:', err);
      throw err;
    }
  }, [isSessionReady]);

  // Auto-initialize session when tenant changes
  useEffect(() => {
    if (tenantLoading) return;
    
    if (activeTenant?.id) {
      initSession();
    } else {
      // No tenant, reset session
      setIsSessionReady(false);
      setSessionInfo(null);
      setCurrentOrgId(null);
    }
  }, [activeTenant?.id, tenantLoading, initSession]);

  // Reset org when tenant changes
  useEffect(() => {
    setCurrentOrgId(null);
  }, [activeTenant?.id]);

  return {
    isSessionReady,
    isInitializing,
    sessionInfo,
    sessionError,
    initSession,
    setCurrentOrg,
    currentOrgId,
  };
}

/**
 * Hook to check tenant schema status
 */
export function useTenantSchemaStatus(tenantId?: string) {
  const [status, setStatus] = useState<{
    isProvisioned: boolean;
    schemaExists: boolean;
    tableCount: number;
    tier: TenantTier | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('check_tenant_schema_status', {
        p_tenant_id: id
      });

      if (rpcError) throw rpcError;

      // Cast RPC response to expected shape
      const statusData = data as unknown as {
        is_provisioned: boolean;
        schema_exists: boolean;
        table_count: number;
        tier: string;
      };

      setStatus({
        isProvisioned: statusData.is_provisioned,
        schemaExists: statusData.schema_exists,
        tableCount: statusData.table_count,
        tier: statusData.tier as TenantTier,
      });

    } catch (err) {
      console.error('[TenantSchemaStatus] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantId) {
      checkStatus(tenantId);
    }
  }, [tenantId, checkStatus]);

  return { status, isLoading, error, refresh: () => tenantId && checkStatus(tenantId) };
}
