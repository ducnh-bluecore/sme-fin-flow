import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

/**
 * EXECUTION STREAM CARD - COO Control Tower
 * 
 * BLUECORE DESIGN PHILOSOPHY:
 * - Decision > Data > Task (Task is never center)
 * - Language: "Execution Step" not "Task"
 * - Shows execution progress for a strategic decision
 * - Dense but readable, operational clarity
 */

export interface ExecutionStream {
  id: string;
  decisionTitle: string;
  totalSteps: number;
  completedSteps: number;
  inProgressSteps: number;
  blockedSteps: number;
  overdueSteps: number;
  slaRisk: boolean;
  nearestDeadline?: string;
}

interface ExecutionStreamCardProps {
  stream: ExecutionStream;
  onClick?: () => void;
}

export function ExecutionStreamCard({ stream, onClick }: ExecutionStreamCardProps) {
  const progressPercent = stream.totalSteps > 0 
    ? Math.round((stream.completedSteps / stream.totalSteps) * 100) 
    : 0;
  
  const hasIssues = stream.blockedSteps > 0 || stream.overdueSteps > 0 || stream.slaRisk;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all duration-150',
        'hover:bg-[hsl(var(--surface-raised))]',
        hasIssues 
          ? 'bg-[hsl(0,55%,50%,0.05)] border-[hsl(0,55%,50%,0.2)] hover:border-[hsl(0,55%,50%,0.3)]' 
          : 'bg-[hsl(var(--surface-sunken))] border-border/30 hover:border-border/50'
      )}
    >
      {/* Header: Decision Context */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground leading-tight pr-4 line-clamp-2">
          {stream.decisionTitle}
        </h3>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-background rounded-full overflow-hidden mb-3">
        <div 
          className={cn(
            'absolute left-0 top-0 h-full rounded-full transition-all duration-300',
            hasIssues ? 'bg-[hsl(38,60%,50%)]' : 'bg-[hsl(158,55%,42%)]'
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs">
        {/* Progress */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(158,55%,42%)]" />
          <span>{stream.completedSteps}/{stream.totalSteps} resolved</span>
        </div>

        {/* Blockers */}
        {stream.blockedSteps > 0 && (
          <div className="flex items-center gap-1 text-[hsl(0,55%,50%)]">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{stream.blockedSteps} blocked</span>
          </div>
        )}

        {/* Overdue */}
        {stream.overdueSteps > 0 && (
          <div className="flex items-center gap-1 text-[hsl(38,60%,50%)]">
            <Clock className="h-3.5 w-3.5" />
            <span>{stream.overdueSteps} SLA risk</span>
          </div>
        )}

        {/* SLA Risk */}
        {stream.slaRisk && !stream.overdueSteps && (
          <div className="flex items-center gap-1 text-[hsl(38,60%,50%)]">
            <Clock className="h-3.5 w-3.5" />
            <span>Deadline approaching</span>
          </div>
        )}
      </div>
    </button>
  );
}

// Legacy export for backward compatibility
export { ExecutionStreamCard as TaskStreamCard };
export type { ExecutionStream as TaskStream };
