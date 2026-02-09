import { CheckCircle2, XCircle, RefreshCw, Package, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAllocationAuditLog, type AuditLogEntry } from '@/hooks/inventory/useAllocationAuditLog';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const ACTION_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  approved: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Đã duyệt' },
  rejected: { icon: XCircle, color: 'text-red-400', label: 'Đã từ chối' },
  executed: { icon: RefreshCw, color: 'text-blue-400', label: 'Đã thực hiện' },
  created: { icon: Package, color: 'text-muted-foreground', label: 'Đã tạo' },
};

export function RebalanceAuditLog() {
  const { data: logs = [], isLoading } = useAllocationAuditLog();

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Đang tải...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Chưa có lịch sử hành động nào</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {logs.map((log) => {
          const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.created;
          const Icon = config.icon;
          const newVals = log.new_values || {};

          return (
            <div key={log.id} className="flex gap-4 relative">
              {/* Timeline dot */}
              <div className={cn("z-10 p-1.5 rounded-full bg-background border-2 border-border shrink-0")}>
                <Icon className={cn("h-4 w-4", config.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{config.label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {log.entity_type} • {log.entity_id.slice(0, 8)}...
                  </span>
                </div>

                {/* Details from new_values */}
                {(newVals.fc_name || newVals.qty) && (
                  <p className="text-sm mt-1">
                    {newVals.fc_name && <span className="font-medium">{newVals.fc_name}</span>}
                    {newVals.qty && <span> • {newVals.qty} units</span>}
                    {newVals.from_location_name && newVals.to_location_name && (
                      <span className="text-muted-foreground"> ({newVals.from_location_name} → {newVals.to_location_name})</span>
                    )}
                  </p>
                )}

                {log.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{log.notes}"</p>
                )}

                <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(log.performed_at), { addSuffix: true, locale: vi })}
                  </span>
                  {log.performed_by && (
                    <span> • {log.performed_by.slice(0, 8)}...</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
