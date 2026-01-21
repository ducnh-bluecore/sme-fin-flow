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
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      label: 'SLA risk',
    };
  }
  
  switch (status) {
    case 'todo':
      return {
        icon: Circle,
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/10',
        label: 'Planned',
      };
    case 'in_progress':
      return {
        icon: Loader2,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        label: 'In execution',
      };
    case 'blocked':
      return {
        icon: AlertTriangle,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        label: 'Blocked',
      };
    case 'done':
      return {
        icon: CheckCircle2,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        label: 'Completed',
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
      'flex items-center gap-4 p-4 border-b border-slate-800/50',
      'hover:bg-slate-900/30 transition-colors',
      task.hasBlocker && 'bg-amber-950/10'
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
          <h4 className="text-sm font-medium text-slate-200 truncate">
            {task.title}
          </h4>
          {task.hasEvidence && (
            <Paperclip className="h-3 w-3 text-slate-500 flex-shrink-0" />
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {/* Owner */}
          {task.ownerName && (
            <span>{task.ownerName}</span>
          )}
          
          {/* Due date */}
          {task.dueDate && (
            <span className={cn(
              task.isOverdue && 'text-red-400'
            )}>
              {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: vi })}
            </span>
          )}
          
          {/* Linked decision */}
          {task.linkedDecisionTitle && (
            <span className="text-slate-600 truncate max-w-[200px]">
              Serving: {task.linkedDecisionTitle}
            </span>
          )}
        </div>
        
        {/* Blocker note */}
        {task.hasBlocker && task.blockerNote && (
          <p className="text-xs text-amber-400/80 mt-1 line-clamp-1">
            ⚠️ This action cannot proceed due to an unresolved dependency.
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
            className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
          >
            Escalate issue
          </Button>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onViewDetail}
          className="text-slate-400 hover:text-slate-200"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
