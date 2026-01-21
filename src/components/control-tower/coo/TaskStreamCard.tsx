import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

/**
 * TASK STREAM CARD - COO Control Tower
 * 
 * Shows execution progress for a strategic decision
 * Dense but readable, operational clarity
 */

export interface TaskStream {
  id: string;
  decisionTitle: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  slaRisk: boolean;
  nearestDeadline?: string;
}

interface TaskStreamCardProps {
  stream: TaskStream;
  onClick?: () => void;
}

export function TaskStreamCard({ stream, onClick }: TaskStreamCardProps) {
  const progressPercent = stream.totalTasks > 0 
    ? Math.round((stream.completedTasks / stream.totalTasks) * 100) 
    : 0;
  
  const hasIssues = stream.blockedTasks > 0 || stream.overdueTasks > 0 || stream.slaRisk;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all duration-150',
        'hover:bg-slate-800/50',
        hasIssues 
          ? 'bg-red-950/10 border-red-500/20 hover:border-red-500/30' 
          : 'bg-slate-900/50 border-slate-800/50 hover:border-slate-700/50'
      )}
    >
      {/* Header: Decision Context */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-200 leading-tight pr-4 line-clamp-2">
          {stream.decisionTitle}
        </h3>
        <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
        <div 
          className={cn(
            'absolute left-0 top-0 h-full rounded-full transition-all duration-300',
            hasIssues ? 'bg-amber-500' : 'bg-emerald-500'
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs">
        {/* Progress */}
        <div className="flex items-center gap-1 text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>{stream.completedTasks}/{stream.totalTasks}</span>
        </div>

        {/* Blockers */}
        {stream.blockedTasks > 0 && (
          <div className="flex items-center gap-1 text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{stream.blockedTasks} blocked</span>
          </div>
        )}

        {/* Overdue */}
        {stream.overdueTasks > 0 && (
          <div className="flex items-center gap-1 text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{stream.overdueTasks} overdue</span>
          </div>
        )}

        {/* SLA Risk */}
        {stream.slaRisk && !stream.overdueTasks && (
          <div className="flex items-center gap-1 text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            <span>SLA risk</span>
          </div>
        )}
      </div>
    </button>
  );
}
