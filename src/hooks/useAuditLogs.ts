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

export function useAuditLogStats() {
  return useQuery({
    queryKey: ['audit-log-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const logs = data || [];
      const uniqueUsers = new Set(logs.map(log => log.user_id)).size;
      const criticalActions = logs.filter(log => 
        ['delete', 'update'].includes(log.action.toLowerCase())
      ).length;

      return {
        totalToday: logs.length,
        uniqueUsers,
        criticalActions,
      };
    },
  });
}
