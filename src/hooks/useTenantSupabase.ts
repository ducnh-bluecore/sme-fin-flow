/**
 * Re-export tenant-aware Supabase hooks
 * 
 * This file provides a convenient import path for tenant-aware database access.
 * Part of Schema-per-Tenant Architecture v1.4.1.
 * 
 * @example
 * import { useTenantSupabaseCompat } from '@/hooks/useTenantSupabase';
 * 
 * function MyComponent() {
 *   const { client, isReady, tenantId, isSchemaProvisioned } = useTenantSupabaseCompat();
 *   // Queries automatically use correct schema + table names via useTenantQueryBuilder
 * }
 */

export {
  // Core hooks
  useTenantSupabase,
  useTenantSupabaseCompat,
  // Schema management functions
  setTenantSchema,
  getTenantSupabase,
  isTenantSchemaProvisioned,
  getTenantSchemaStats,
  // New v1.4.1 functions
  initTenantSession,
  // Types
  type TenantQueryOptions,
  type TenantSessionState,
  type TenantTier,
} from '@/integrations/supabase/tenantClient';
