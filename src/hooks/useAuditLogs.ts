/**
 * useAuditLogs - Audit logs access
 * 
 * @architecture Schema-per-Tenant
 * @domain Core/Audit
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';

export interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  ip_address: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  user_name?: string;
}

export function useAuditLogs() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['audit-logs', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!tenantId && isReady,
  });
}

/**
 * DB-First: Uses RPC get_audit_log_stats to aggregate in database
 * Avoids 1000 row limit issue
 */
export function useAuditLogStats() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['audit-log-stats', tenantId],
    queryFn: async () => {
      const { data, error } = await client
        .rpc('get_audit_log_stats', { p_tenant_id: tenantId });

      if (error) {
        console.error('[useAuditLogStats] RPC error:', error);
        return {
          totalToday: 0,
          uniqueUsers: 0,
          criticalActions: 0,
        };
      }

      // RPC returns array with single row
      const stats = Array.isArray(data) ? data[0] : data;
      
      return {
        totalToday: stats?.total_today ?? 0,
        uniqueUsers: stats?.unique_users ?? 0,
        criticalActions: stats?.critical_actions ?? 0,
      };
    },
    enabled: !!tenantId && isReady,
  });
}
