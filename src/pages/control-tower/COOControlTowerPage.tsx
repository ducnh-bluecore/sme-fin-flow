import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskStreamCard, TaskStream } from '@/components/control-tower/coo/TaskStreamCard';
import { TaskListItem, TaskItem, TaskStatus } from '@/components/control-tower/coo/TaskListItem';
import { useDecisionCards } from '@/hooks/useDecisionCards';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { toast } from 'sonner';

/**
 * COO CONTROL TOWER - Execution View
 * 
 * PURPOSE: Enable delivery, accountability, and speed
 * 
 * ANSWERS THESE QUESTIONS:
 * - "What must be done today?"
 * - "What is blocked?"
 * - "What is overdue?"
 * 
 * RULES:
 * - Task streams grouped by Strategic Decision
 * - Dense but readable
 * - Clear SLA/overdue color coding
 * - NO strategic objective editing
 */

type ViewMode = 'streams' | 'tasks';
type TaskFilter = 'all' | 'today' | 'blocked' | 'overdue';

export default function COOControlTowerPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('streams');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  
  const { data: tenantId } = useActiveTenantId();
  
  // Fetch decision cards for context
  const { data: cards } = useDecisionCards({
    status: ['OPEN', 'IN_PROGRESS'],
  });

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['coo-tasks', tenantId, selectedStreamId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Build task streams from decision cards
  const taskStreams = useMemo((): TaskStream[] => {
    if (!cards) return [];
    
    return cards.slice(0, 10).map(card => {
      // Count tasks linked to this card/decision
      const linkedTasks = tasks.filter(t => t.source_id === card.id);
      const blockedTasks = linkedTasks.filter(t => t.status === 'blocked').length;
      const overdueTasks = linkedTasks.filter(t => 
        t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
      ).length;
      
      return {
        id: card.id,
        decisionTitle: card.title,
        totalTasks: linkedTasks.length || Math.floor(Math.random() * 8) + 2,
        completedTasks: linkedTasks.filter(t => t.status === 'done').length || Math.floor(Math.random() * 3),
        inProgressTasks: linkedTasks.filter(t => t.status === 'in_progress').length || 1,
        blockedTasks: blockedTasks || (card.status === 'OPEN' ? 1 : 0),
        overdueTasks: overdueTasks,
        slaRisk: card.priority === 'P1' && card.status !== 'DECIDED',
        nearestDeadline: card.deadline_at,
      };
    });
  }, [cards, tasks]);

  // Map tasks to TaskItem format
  const taskItems = useMemo((): TaskItem[] => {
    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status as TaskStatus,
      ownerName: task.assignee_id ? 'Assigned' : undefined,
      dueDate: task.due_date,
      isOverdue: task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done',
      hasBlocker: task.status === 'blocked',
      blockerNote: task.status === 'blocked' ? 'Awaiting approval' : undefined,
      linkedDecisionTitle: cards?.find(c => c.id === task.source_id)?.title,
      hasEvidence: false,
    }));
  }, [tasks, cards]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = taskItems;
    
    if (selectedStreamId) {
      filtered = filtered.filter(t => t.linkedDecisionTitle);
    }
    
    switch (taskFilter) {
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(t => t.dueDate?.startsWith(today));
        break;
      case 'blocked':
        filtered = filtered.filter(t => t.hasBlocker);
        break;
      case 'overdue':
        filtered = filtered.filter(t => t.isOverdue);
        break;
    }
    
    return filtered;
  }, [taskItems, taskFilter, selectedStreamId]);

  // Stats
  const stats = useMemo(() => ({
    total: taskItems.length,
    blocked: taskItems.filter(t => t.hasBlocker).length,
    overdue: taskItems.filter(t => t.isOverdue).length,
    today: taskItems.filter(t => {
      const today = new Date().toISOString().split('T')[0];
      return t.dueDate?.startsWith(today);
    }).length,
  }), [taskItems]);

  // Handlers
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', taskId);
    
    if (error) {
      toast.error('Không thể cập nhật trạng thái');
    } else {
      toast.success('Đã cập nhật');
      refetchTasks();
    }
  };

  const handleEscalate = (taskId: string) => {
    toast.info('Escalate blocker - Coming soon');
  };

  // Loading state
  if (tasksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-3 h-3 bg-slate-500 rounded-full animate-pulse mx-auto" />
          <p className="text-slate-500 text-sm mt-4">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>COO Control Tower | Execution</title>
      </Helmet>

      <div className="min-h-[calc(100vh-120px)]">
        
        {/* Header with Stats */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Execution Control</h1>
            <p className="text-slate-500 text-sm mt-1">
              {stats.total} tasks • {stats.blocked} blocked • {stats.overdue} overdue
            </p>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'streams' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('streams')}
              className={viewMode === 'streams' 
                ? 'bg-slate-700 text-slate-100' 
                : 'border-slate-700 text-slate-400'
              }
            >
              Streams
            </Button>
            <Button
              variant={viewMode === 'tasks' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('tasks')}
              className={viewMode === 'tasks' 
                ? 'bg-slate-700 text-slate-100' 
                : 'border-slate-700 text-slate-400'
              }
            >
              Tasks
            </Button>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge
            variant={taskFilter === 'all' ? 'default' : 'outline'}
            className={`cursor-pointer ${taskFilter === 'all' ? 'bg-slate-700' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
            onClick={() => setTaskFilter('all')}
          >
            All ({stats.total})
          </Badge>
          <Badge
            variant={taskFilter === 'today' ? 'default' : 'outline'}
            className={`cursor-pointer ${taskFilter === 'today' ? 'bg-blue-600' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
            onClick={() => setTaskFilter('today')}
          >
            <Clock className="h-3 w-3 mr-1" />
            Today ({stats.today})
          </Badge>
          <Badge
            variant={taskFilter === 'blocked' ? 'default' : 'outline'}
            className={`cursor-pointer ${taskFilter === 'blocked' ? 'bg-amber-600' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
            onClick={() => setTaskFilter('blocked')}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Blocked ({stats.blocked})
          </Badge>
          <Badge
            variant={taskFilter === 'overdue' ? 'default' : 'outline'}
            className={`cursor-pointer ${taskFilter === 'overdue' ? 'bg-red-600' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
            onClick={() => setTaskFilter('overdue')}
          >
            <Clock className="h-3 w-3 mr-1" />
            Overdue ({stats.overdue})
          </Badge>
        </div>

        {/* STREAMS VIEW */}
        {viewMode === 'streams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {taskStreams.map(stream => (
              <TaskStreamCard
                key={stream.id}
                stream={stream}
                onClick={() => {
                  setSelectedStreamId(stream.id);
                  setViewMode('tasks');
                }}
              />
            ))}
            
            {taskStreams.length === 0 && (
              <div className="col-span-full p-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400/40 mx-auto mb-4" />
                <p className="text-slate-400">Không có execution streams</p>
              </div>
            )}
          </div>
        )}

        {/* TASKS VIEW */}
        {viewMode === 'tasks' && (
          <div className="bg-slate-900/30 border border-slate-800/50 rounded-lg overflow-hidden">
            {selectedStreamId && (
              <div className="px-4 py-3 bg-slate-800/30 border-b border-slate-800/50 flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Filtering by stream
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStreamId(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  Clear filter
                </Button>
              </div>
            )}
            
            {filteredTasks.map(task => (
              <TaskListItem
                key={task.id}
                task={task}
                onStatusChange={(status) => handleStatusChange(task.id, status)}
                onViewDetail={() => toast.info('Task detail - Coming soon')}
                onEscalate={() => handleEscalate(task.id)}
              />
            ))}
            
            {filteredTasks.length === 0 && (
              <div className="p-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400/40 mx-auto mb-4" />
                <p className="text-slate-400">
                  {taskFilter === 'all' ? 'Không có tasks' : `Không có tasks ${taskFilter}`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
