import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  notes: string | null;
  performed_by: string | null;
  performed_at: string;
}

export function useAllocationAuditLog() {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-audit-log', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_allocation_audit_log', '*')
        .order('performed_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as AuditLogEntry[];
    },
    enabled: isReady,
  });
}
