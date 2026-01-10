import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, User, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MobileTaskItemProps {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  assignee?: string;
  onClick?: () => void;
  onToggleComplete?: () => void;
}

export function MobileTaskItem({
  title,
  description,
  priority,
  status,
  dueDate,
  assignee,
  onClick,
  onToggleComplete,
}: MobileTaskItemProps) {
  const priorityConfig = {
    high: { badge: 'bg-destructive/10 text-destructive', label: 'Cao' },
    medium: { badge: 'bg-warning/10 text-warning', label: 'TB' },
    low: { badge: 'bg-muted text-muted-foreground', label: 'Thấp' },
  };

  const statusConfig = {
    pending: { color: 'text-muted-foreground', label: 'Chờ' },
    in_progress: { color: 'text-primary', label: 'Đang làm' },
    completed: { color: 'text-success', label: 'Xong' },
  };

  const isCompleted = status === 'completed';

  const handleCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComplete?.();
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'bg-card rounded-xl border border-border p-4 cursor-pointer',
        'flex items-start gap-3 transition-all',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Checkbox */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={handleCheckClick}
        className="mt-0.5 flex-shrink-0"
      >
        {isCompleted ? (
          <CheckCircle2 className="h-6 w-6 text-success" />
        ) : (
          <Circle className={cn('h-6 w-6', statusConfig[status].color)} />
        )}
      </motion.button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className={cn('text-sm font-medium', isCompleted && 'line-through')}>
            {title}
          </h4>
          <Badge className={cn('text-[10px] px-1.5 py-0', priorityConfig[priority].badge)}>
            {priorityConfig[priority].label}
          </Badge>
        </div>
        {description && (
          <p className={cn('text-xs text-muted-foreground line-clamp-2 mt-1', isCompleted && 'line-through')}>
            {description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {dueDate && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{dueDate}</span>
            </div>
          )}
          {assignee && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{assignee}</span>
            </div>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
    </motion.div>
  );
}
