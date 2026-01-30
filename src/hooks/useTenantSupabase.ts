/**
 * Re-export tenant-aware Supabase hooks
 * 
 * This file provides a convenient import path for tenant-aware database access.
 * Part of Schema-per-Tenant Architecture.
 * 
 * @example
 * import { useTenantSupabase } from '@/hooks/useTenantSupabase';
 * 
 * function MyComponent() {
 *   const { client, isReady, tenantId } = useTenantSupabase();
 *   // ...
 * }
 */

export {
  useTenantSupabase,
  useTenantSupabaseCompat,
  setTenantSchema,
  getTenantSupabase,
  isTenantSchemaProvisioned,
  getTenantSchemaStats,
  type TenantQueryOptions,
} from '@/integrations/supabase/tenantClient';
