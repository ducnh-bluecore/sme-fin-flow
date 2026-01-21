import { cn } from '@/lib/utils';
import { Circle, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * EXECUTION ACTION - Simple action row (not "task")
 * 
 * Minimal icons, no boxes
 * States: Planned, In execution, Blocked, Completed
 */

export type ExecutionState = 'planned' | 'in_execution' | 'blocked' | 'completed';

export interface ExecutionActionData {
  id: string;
  title: string;
  state: ExecutionState;
  owner?: string;
  dueLabel?: string;
  isOverdue?: boolean;
}

interface ExecutionActionProps {
  action: ExecutionActionData;
  onStateChange?: (state: ExecutionState) => void;
}

const stateConfig = {
  planned: {
    icon: Circle,
    label: 'Planned',
    iconColor: 'text-muted-foreground',
  },
  in_execution: {
    icon: Loader2,
    label: 'In execution',
    iconColor: 'text-[hsl(40,60%,55%)]',
    animate: true,
  },
  blocked: {
    icon: AlertTriangle,
    label: 'Blocked',
    iconColor: 'text-[hsl(0,60%,55%)]',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    iconColor: 'text-[hsl(160,40%,45%)]',
  },
};

export function ExecutionAction({ action, onStateChange }: ExecutionActionProps) {
  const config = stateConfig[action.state];
  const StateIcon = config.icon;
  
  const handleClick = () => {
    if (action.state === 'planned') onStateChange?.('in_execution');
    else if (action.state === 'in_execution') onStateChange?.('completed');
  };
  
  return (
    <div className={cn(
      'flex items-center gap-4 py-3 px-4',
      'border-b border-border/20 last:border-0',
      action.state === 'blocked' && 'bg-[hsl(0,60%,55%/0.03)]'
    )}>
      {/* State Icon */}
      <button
        onClick={handleClick}
        disabled={action.state === 'completed' || action.state === 'blocked'}
        className={cn(
          'p-1 rounded transition-colors',
          'hover:bg-secondary/50 disabled:cursor-default'
        )}
      >
        <StateIcon className={cn(
          'h-4 w-4',
          config.iconColor,
          (config as any).animate && 'animate-spin'
        )} />
      </button>
      
      {/* Title */}
      <span className={cn(
        'flex-1 text-sm',
        action.state === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'
      )}>
        {action.title}
      </span>
      
      {/* Owner */}
      {action.owner && (
        <span className="text-xs text-muted-foreground">
          {action.owner}
        </span>
      )}
      
      {/* Due */}
      {action.dueLabel && (
        <span className={cn(
          'text-xs',
          action.isOverdue ? 'text-[hsl(0,60%,55%)]' : 'text-muted-foreground'
        )}>
          {action.dueLabel}
        </span>
      )}
    </div>
  );
}
