import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  Circle,
  Loader2,
  ChevronRight,
  Paperclip
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * EXECUTION ACTION ITEM - COO Control Tower
 * 
 * BLUECORE DESIGN PHILOSOPHY:
 * - "Execution Action" not "Task"
 * - Dense but readable row
 * - Clear status, owner, due date, blocker indicator
 * - Serves a Strategic Decision, not standalone
 */

export type ExecutionStatus = 'planned' | 'in_execution' | 'blocked' | 'completed';

export interface ExecutionAction {
  id: string;
  title: string;
  status: ExecutionStatus;
  ownerName?: string;
  ownerAvatar?: string;
  dueDate?: string;
  isOverdue?: boolean;
  hasBlocker?: boolean;
  blockerNote?: string;
  linkedDecisionTitle?: string;
  hasEvidence?: boolean;
}

interface ExecutionActionItemProps {
  action: ExecutionAction;
  onStatusChange?: (newStatus: ExecutionStatus) => void;
  onViewDetail?: () => void;
  onEscalate?: () => void;
}

const getStatusConfig = (status: ExecutionStatus, isOverdue?: boolean) => {
  if (isOverdue && status !== 'completed') {
    return {
      icon: Clock,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      label: 'SLA risk',
    };
  }
  
  switch (status) {
    case 'planned':
      return {
        icon: Circle,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/30',
        label: 'Planned',
      };
    case 'in_execution':
      return {
        icon: Loader2,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        label: 'In execution',
      };
    case 'blocked':
      return {
        icon: AlertTriangle,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        label: 'Blocked',
      };
    case 'completed':
      return {
        icon: CheckCircle2,
        color: 'text-success',
        bgColor: 'bg-success/10',
        label: 'Resolved',
      };
  }
};

export function ExecutionActionItem({ 
  action, 
  onStatusChange, 
  onViewDetail,
  onEscalate 
}: ExecutionActionItemProps) {
  const statusConfig = getStatusConfig(action.status, action.isOverdue);
  const StatusIcon = statusConfig.icon;

  return (
    <div className={cn(
      'flex items-center gap-4 p-4 border-b border-border/30',
      'hover:bg-[hsl(var(--surface-raised))] transition-colors',
      action.hasBlocker && 'bg-warning/5'
    )}>
      {/* Status Icon */}
      <button
        onClick={() => {
          if (action.status === 'planned') onStatusChange?.('in_execution');
          else if (action.status === 'in_execution') onStatusChange?.('completed');
        }}
        className={cn(
          'p-2 rounded-lg transition-colors',
          statusConfig.bgColor,
          'hover:opacity-80'
        )}
      >
        <StatusIcon className={cn(
          'h-4 w-4',
          statusConfig.color,
          action.status === 'in_execution' && 'animate-spin'
        )} />
      </button>

      {/* Action Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-foreground truncate">
            {action.title}
          </h4>
          {action.hasEvidence && (
            <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {/* Owner */}
          {action.ownerName && (
            <span>{action.ownerName}</span>
          )}
          
          {/* Due date */}
          {action.dueDate && (
            <span className={cn(
              action.isOverdue && 'text-destructive'
            )}>
              {formatDistanceToNow(new Date(action.dueDate), { addSuffix: true, locale: vi })}
            </span>
          )}
          
          {/* Linked decision */}
          {action.linkedDecisionTitle && (
            <span className="text-muted-foreground/60 truncate max-w-[200px]">
              Serving: {action.linkedDecisionTitle}
            </span>
          )}
        </div>
        
        {/* Blocker note */}
        {action.hasBlocker && action.blockerNote && (
          <p className="text-xs text-warning/80 mt-1 line-clamp-1">
            ⚠️ Cannot proceed due to unresolved dependency
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {action.hasBlocker && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onEscalate}
            className="text-warning hover:text-warning hover:bg-warning/10"
          >
            Escalate
          </Button>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onViewDetail}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Legacy exports for backward compatibility
export { ExecutionActionItem as TaskListItem };
export type { ExecutionAction as TaskItem, ExecutionStatus as TaskStatus };
