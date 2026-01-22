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
 * TASK LIST ITEM - COO Control Tower
 * Light Professional Theme
 * 
 * Dense but readable task row
 * Clear status, owner, due date, blocker indicator
 */

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';

export interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  ownerName?: string;
  ownerAvatar?: string;
  dueDate?: string;
  isOverdue?: boolean;
  hasBlocker?: boolean;
  blockerNote?: string;
  linkedDecisionTitle?: string;
  hasEvidence?: boolean;
}

interface TaskListItemProps {
  task: TaskItem;
  onStatusChange?: (newStatus: TaskStatus) => void;
  onViewDetail?: () => void;
  onEscalate?: () => void;
}

const getStatusConfig = (status: TaskStatus, isOverdue?: boolean) => {
  if (isOverdue && status !== 'done') {
    return {
      icon: Clock,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      label: 'Quá hạn',
    };
  }
  
  switch (status) {
    case 'todo':
      return {
        icon: Circle,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        label: 'Chưa làm',
      };
    case 'in_progress':
      return {
        icon: Loader2,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        label: 'Đang làm',
      };
    case 'blocked':
      return {
        icon: AlertTriangle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        label: 'Bị chặn',
      };
    case 'done':
      return {
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        label: 'Hoàn thành',
      };
  }
};

export function TaskListItem({ 
  task, 
  onStatusChange, 
  onViewDetail,
  onEscalate 
}: TaskListItemProps) {
  const statusConfig = getStatusConfig(task.status, task.isOverdue);
  const StatusIcon = statusConfig.icon;

  return (
    <div className={cn(
      'flex items-center gap-4 p-4 border-b border-border',
      'hover:bg-muted/50 transition-colors',
      task.hasBlocker && 'bg-amber-50/50'
    )}>
      {/* Status Icon */}
      <button
        onClick={() => {
          if (task.status === 'todo') onStatusChange?.('in_progress');
          else if (task.status === 'in_progress') onStatusChange?.('done');
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
          task.status === 'in_progress' && 'animate-spin'
        )} />
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-foreground truncate">
            {task.title}
          </h4>
          {task.hasEvidence && (
            <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {/* Owner */}
          {task.ownerName && (
            <span>{task.ownerName}</span>
          )}
          
          {/* Due date */}
          {task.dueDate && (
            <span className={cn(
              task.isOverdue && 'text-destructive font-medium'
            )}>
              {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: vi })}
            </span>
          )}
          
          {/* Linked decision */}
          {task.linkedDecisionTitle && (
            <span className="text-muted-foreground/70 truncate max-w-[200px]">
              → {task.linkedDecisionTitle}
            </span>
          )}
        </div>
        
        {/* Blocker note */}
        {task.hasBlocker && task.blockerNote && (
          <p className="text-xs text-amber-600 mt-1 line-clamp-1">
            ⚠️ {task.blockerNote}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {task.hasBlocker && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onEscalate}
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
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
