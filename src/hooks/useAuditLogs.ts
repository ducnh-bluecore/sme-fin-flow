import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

/**
 * DB-First: Uses RPC get_audit_log_stats to aggregate in database
 * Avoids 1000 row limit issue
 */
export function useAuditLogStats() {
  return useQuery({
    queryKey: ['audit-log-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_audit_log_stats', { p_tenant_id: null });

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
  });
}
