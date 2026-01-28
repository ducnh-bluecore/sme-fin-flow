import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ExecutionItemProps {
  id: string;
  actionSummary: string;
  owner: string;
  deadlineAt: string;
  escalationPath?: string;
  escalationInHours?: number;
  priority: 'P1' | 'P2' | 'P3';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED';
  onClick?: () => void;
}

const statusConfig = {
  PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  ESCALATED: { label: 'Escalated', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function ExecutionItem({
  id,
  actionSummary,
  owner,
  deadlineAt,
  escalationPath,
  escalationInHours,
  priority,
  status,
  onClick,
}: ExecutionItemProps) {
  const deadline = new Date(deadlineAt);
  const now = new Date();
  const hoursRemaining = differenceInHours(deadline, now);
  const isOverdue = deadline < now;
  const isUrgent = hoursRemaining <= 24 && !isOverdue;

  const timeRemaining = formatDistanceToNow(deadline, { addSuffix: false, locale: vi });

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-all duration-200",
        isOverdue && "border-destructive/50",
        isUrgent && !isOverdue && "border-amber-400"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Action Summary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="outline" 
                className={cn("text-[10px] font-semibold", statusConfig[status].className)}
              >
                {statusConfig[status].label}
              </Badge>
              {isUrgent && !isOverdue && (
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                  Urgent
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive" className="text-[10px]">
                  Overdue
                </Badge>
              )}
            </div>
            
            <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
              {actionSummary}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {owner}
              </span>
              <span className={cn(
                "flex items-center gap-1",
                isOverdue && "text-destructive"
              )}>
                <Clock className="h-3 w-3" />
                {isOverdue ? 'Overdue' : timeRemaining}
              </span>
            </div>
          </div>

          {/* Right: Escalation Path */}
          <div className="flex flex-col items-end gap-2">
            {escalationPath && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span>→ {escalationPath}</span>
                {escalationInHours !== undefined && (
                  <span className="text-muted-foreground">in {escalationInHours}h</span>
                )}
              </div>
            )}
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
