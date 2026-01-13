import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  User,
  Clock,
  MoreVertical,
  Loader2,
  MessageSquare,
  FileText
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { format, formatDistanceToNow, isPast, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  status: 'todo' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  due_date: string | null;
  department: string | null;
  progress: number | null;
  resolution_notes: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; textColor: string }> = {
  'todo': { label: 'Chờ xử lý', color: 'bg-slate-500', textColor: 'text-slate-400' },
  'pending': { label: 'Chờ xử lý', color: 'bg-slate-500', textColor: 'text-slate-400' },
  'in_progress': { label: 'Đang làm', color: 'bg-amber-500', textColor: 'text-amber-400' },
  'completed': { label: 'Hoàn thành', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
  'cancelled': { label: 'Đã hủy', color: 'bg-red-500', textColor: 'text-red-400' },
};

const priorityConfig = {
  'urgent': { label: 'Khẩn cấp', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  'high': { label: 'Cao', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  'medium': { label: 'Trung bình', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  'low': { label: 'Thấp', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
};

function TaskCard({ 
  task, 
  onStatusChange,
  onAddNote,
}: { 
  task: Task; 
  onStatusChange: (id: string, status: Task['status']) => void;
  onAddNote: (task: Task) => void;
}) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'completed';
  
  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      return format(date, 'dd/MM/yyyy', { locale: vi });
    } catch {
      return dateStr;
    }
  };

  const getDaysRemaining = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  const daysRemaining = getDaysRemaining(task.due_date);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg bg-slate-800/30 border transition-all group ${
        isOverdue ? 'border-red-500/50' : 'border-slate-700/30 hover:border-slate-600/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={`text-xs border ${priorityConfig[task.priority]?.color || priorityConfig.medium.color}`}>
              {priorityConfig[task.priority]?.label || 'Trung bình'}
            </Badge>
            {task.department && (
              <Badge className="text-xs bg-slate-700/50 text-slate-400 border-slate-600/30">
                {task.department}
              </Badge>
            )}
            {isOverdue && (
              <Badge className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                Quá hạn
              </Badge>
            )}
          </div>
          <h3 className="text-sm font-medium text-slate-100 group-hover:text-white transition-colors">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-300">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
            <DropdownMenuItem 
              className="text-slate-300 focus:bg-slate-800"
              onClick={() => onAddNote(task)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Thêm ghi chú / kết quả
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem 
              className="text-slate-300 focus:bg-slate-800"
              onClick={() => onStatusChange(task.id, 'in_progress')}
            >
              Bắt đầu làm
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-emerald-400 focus:bg-emerald-500/10"
              onClick={() => onStatusChange(task.id, 'completed')}
            >
              Đánh dấu hoàn thành
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-400 focus:bg-red-500/10"
              onClick={() => onStatusChange(task.id, 'cancelled')}
            >
              Hủy công việc
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Deadline Section */}
      {task.due_date && (
        <div className={`mt-3 p-2 rounded flex items-center justify-between ${
          isOverdue 
            ? 'bg-red-500/10 border border-red-500/30' 
            : daysRemaining !== null && daysRemaining <= 3 
              ? 'bg-amber-500/10 border border-amber-500/30'
              : 'bg-slate-700/30 border border-slate-600/30'
        }`}>
          <div className="flex items-center gap-2">
            <Calendar className={`h-4 w-4 ${
              isOverdue ? 'text-red-400' : daysRemaining !== null && daysRemaining <= 3 ? 'text-amber-400' : 'text-slate-400'
            }`} />
            <div>
              <span className={`text-xs font-medium ${
                isOverdue ? 'text-red-400' : daysRemaining !== null && daysRemaining <= 3 ? 'text-amber-400' : 'text-slate-300'
              }`}>
                Deadline: {formatDueDate(task.due_date)}
              </span>
            </div>
          </div>
          <div className={`text-xs font-medium ${
            isOverdue ? 'text-red-400' : daysRemaining !== null && daysRemaining <= 3 ? 'text-amber-400' : 'text-slate-400'
          }`}>
            {isOverdue ? (
              <span>Quá hạn {Math.abs(daysRemaining || 0)} ngày</span>
            ) : daysRemaining === 0 ? (
              <span>Hôm nay</span>
            ) : daysRemaining === 1 ? (
              <span>Còn 1 ngày</span>
            ) : (
              <span>Còn {daysRemaining} ngày</span>
            )}
          </div>
        </div>
      )}

      {/* Resolution Notes */}
      {task.resolution_notes && (
        <div className="mt-3 p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-1 text-xs text-emerald-400 mb-1">
            <FileText className="h-3 w-3" />
            <span>Báo cáo kết quả:</span>
          </div>
          <p className="text-xs text-slate-300 whitespace-pre-wrap line-clamp-3">{task.resolution_notes}</p>
        </div>
      )}

      {/* Progress */}
      {task.status !== 'completed' && task.progress && task.progress > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500">Tiến độ</span>
            <span className="text-slate-400">{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-1.5" />
        </div>
      )}

      {/* Footer with Report Button */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/30">
        <div className="flex items-center gap-2">
          {task.assignee_name ? (
            <>
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                  {task.assignee_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-slate-400">{task.assignee_name}</span>
            </>
          ) : (
            <span className="text-xs text-slate-500">Chưa phân công</span>
          )}
        </div>
        
        {task.status !== 'completed' && task.status !== 'cancelled' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddNote(task)}
            className="h-7 text-xs border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
          >
            <FileText className="h-3 w-3 mr-1" />
            Báo cáo
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function TaskColumn({ title, status, tasks, count, onStatusChange, onAddNote }: { 
  title: string; 
  status: Task['status']; 
  tasks: Task[];
  count: number;
  onStatusChange: (id: string, status: Task['status']) => void;
  onAddNote: (task: Task) => void;
}) {
  const config = statusConfig[status];

  return (
    <div className="flex-1 min-w-[300px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${config.color}`} />
          <h3 className="text-sm font-medium text-slate-200">{title}</h3>
          <Badge className="bg-slate-800 text-slate-400 border-slate-700">{count}</Badge>
        </div>
      </div>
      <div className="space-y-3">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} onAddNote={onAddNote} />
        ))}
        {tasks.length === 0 && (
          <div className="p-8 rounded-lg border border-dashed border-slate-700/50 text-center">
            <p className="text-sm text-slate-500">Không có công việc</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [noteText, setNoteText] = useState('');
  const { activeTenant } = useTenantContext();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('tenant_id', activeTenant.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (!tasksData || tasksData.length === 0) return [];
      
      // Get unique assignee IDs
      const assigneeIds = [...new Set(tasksData.map(t => t.assignee_id).filter(Boolean))];
      
      // Fetch profiles for assignees
      let profilesMap: Record<string, string> = {};
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', assigneeIds);
        
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || 'Chưa đặt tên';
          return acc;
        }, {} as Record<string, string>);
      }
      
      // Map assignee names
      return tasksData.map(task => ({
        ...task,
        assignee_name: task.assignee_id ? profilesMap[task.assignee_id] || null : null,
      })) as Task[];
    },
    enabled: !!activeTenant?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Task['status'] }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks-count'] });
      toast.success('Đã cập nhật trạng thái công việc');
    },
    onError: () => {
      toast.error('Không thể cập nhật trạng thái');
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ resolution_notes: notes, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Đã lưu ghi chú');
      setNoteDialogOpen(false);
      setSelectedTask(null);
      setNoteText('');
    },
    onError: () => {
      toast.error('Không thể lưu ghi chú');
    },
  });

  const handleStatusChange = (id: string, status: Task['status']) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleAddNote = (task: Task) => {
    setSelectedTask(task);
    setNoteText(task.resolution_notes || '');
    setNoteDialogOpen(true);
  };

  const handleSaveNote = () => {
    if (!selectedTask) return;
    updateNoteMutation.mutate({ id: selectedTask.id, notes: noteText });
  };

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.description?.toLowerCase().includes(q) ||
      t.assignee_name?.toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending' || t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const stats = useMemo(() => {
    const overdue = tasks.filter(t => 
      t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'completed' && t.status !== 'cancelled'
    ).length;
    
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue,
      urgent: tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
    };
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Đang tải công việc...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Công việc | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-blue-400" />
              Quản lý công việc
            </h1>
            <p className="text-slate-400 text-sm mt-1">Theo dõi và phân công công việc cho đội ngũ</p>
          </div>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Tạo công việc
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
            <div className="text-xs text-slate-400">Tổng công việc</div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="text-2xl font-bold text-emerald-400">{stats.completed}</div>
            <div className="text-xs text-slate-400">Đã hoàn thành</div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="text-2xl font-bold text-red-400">{stats.overdue}</div>
            <div className="text-xs text-slate-400">Quá hạn</div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="text-2xl font-bold text-amber-400">{stats.urgent}</div>
            <div className="text-xs text-slate-400">Khẩn cấp</div>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="bg-slate-900/50 border-slate-800/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Tìm kiếm công việc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700/50 text-slate-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
                  <Filter className="h-4 w-4 mr-2" />
                  Lọc
                </Button>
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
                  <User className="h-4 w-4 mr-2" />
                  Người thực hiện
                </Button>
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
                  <Calendar className="h-4 w-4 mr-2" />
                  Ngày
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          <TaskColumn 
            title="Chờ xử lý" 
            status="pending" 
            tasks={pendingTasks} 
            count={pendingTasks.length} 
            onStatusChange={handleStatusChange}
            onAddNote={handleAddNote}
          />
          <TaskColumn 
            title="Đang làm" 
            status="in_progress" 
            tasks={inProgressTasks} 
            count={inProgressTasks.length}
            onStatusChange={handleStatusChange}
            onAddNote={handleAddNote}
          />
          <TaskColumn 
            title="Hoàn thành" 
            status="completed" 
            tasks={completedTasks} 
            count={completedTasks.length}
            onStatusChange={handleStatusChange}
            onAddNote={handleAddNote}
          />
        </div>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="text-center py-16">
            <CheckSquare className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">Chưa có công việc nào</h3>
            <p className="text-sm text-slate-500 mb-4">Tạo công việc đầu tiên để bắt đầu quản lý</p>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Tạo công việc
            </Button>
          </div>
        )}
      </div>

      {/* Add Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              Ghi chú / Kết quả công việc
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTask && (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <p className="text-sm font-medium text-slate-200">{selectedTask.title}</p>
                {selectedTask.description && (
                  <p className="text-xs text-slate-400 mt-1">{selectedTask.description}</p>
                )}
              </div>
            )}
            <div>
              <label className="text-sm text-slate-300 mb-2 block">
                Nhập kết quả hoặc ghi chú:
              </label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ví dụ: Đã hoàn thành kiểm kê, phát hiện 5 sản phẩm thiếu..."
                className="bg-slate-800/50 border-slate-700/50 text-slate-200 min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteDialogOpen(false)}
              className="border-slate-700 text-slate-300"
            >
              Hủy
            </Button>
            <Button
              onClick={handleSaveNote}
              disabled={updateNoteMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {updateNoteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Lưu ghi chú'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
