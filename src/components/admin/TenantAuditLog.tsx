/**
 * TenantAuditLog - Admin component to view tenant audit logs
 * 
 * @architecture Control Plane - Cross-tenant admin view
 * Uses direct supabase client for admin queries with explicit tenant_id filter
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  History, 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  LogIn,
  Settings,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TenantAuditLogProps {
  tenantId: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'create': Plus,
  'update': Pencil,
  'delete': Trash2,
  'view': Eye,
  'login': LogIn,
  'settings': Settings,
};

const actionColors: Record<string, string> = {
  'create': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'update': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'delete': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'view': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  'login': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function getActionType(action: string): string {
  if (action.includes('create') || action.includes('insert') || action.includes('add')) return 'create';
  if (action.includes('update') || action.includes('edit') || action.includes('modify')) return 'update';
  if (action.includes('delete') || action.includes('remove')) return 'delete';
  if (action.includes('view') || action.includes('read') || action.includes('get')) return 'view';
  if (action.includes('login') || action.includes('auth')) return 'login';
  return 'settings';
}

export function TenantAuditLog({ tenantId }: TenantAuditLogProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['tenant-audit-logs', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: !!tenantId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Lịch sử hoạt động
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Lịch sử hoạt động
        </CardTitle>
        <CardDescription>
          50 hoạt động gần nhất của tenant
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Chưa có hoạt động nào được ghi nhận</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => {
                const actionType = getActionType(log.action);
                const Icon = actionIcons[actionType] || Settings;
                const colorClass = actionColors[actionType] || actionColors.settings;

                return (
                  <div 
                    key={log.id} 
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{log.action}</span>
                        {log.entity_type && (
                          <Badge variant="outline" className="text-xs">
                            {log.entity_type}
                          </Badge>
                        )}
                      </div>
                      {log.entity_id && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          ID: {log.entity_id}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                        </span>
                        {log.ip_address && (
                          <>
                            <span>•</span>
                            <span>{log.ip_address}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
