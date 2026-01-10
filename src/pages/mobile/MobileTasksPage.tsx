import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  Circle,
  Loader2,
  Plus,
  Filter
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: { name: string };
  status: 'todo' | 'in-progress' | 'done';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate: string;
  progress: number;
}

const mockTasks: Task[] = [
  { 
    id: '1', 
    title: 'Kiểm kê tồn kho cuối tháng', 
    description: 'Kiểm kê toàn bộ hàng hóa tại kho trung tâm',
    assignee: { name: 'Nguyễn Văn A' },
    status: 'in-progress',
    priority: 'urgent',
    dueDate: 'Hôm nay',
    progress: 65,
  },
  { 
    id: '2', 
    title: 'Đối soát công nợ nhà cung cấp', 
    description: 'Đối soát công nợ với 15 NCC',
    assignee: { name: 'Trần Thị B' },
    status: 'todo',
    priority: 'high',
    dueDate: 'Ngày mai',
    progress: 0,
  },
  { 
    id: '3', 
    title: 'Setup cửa hàng mới Quận 9', 
    description: 'Chuẩn bị thiết bị cho cửa hàng mới',
    assignee: { name: 'Phạm Văn C' },
    status: 'in-progress',
    priority: 'high',
    dueDate: '3 ngày nữa',
    progress: 45,
  },
  { 
    id: '4', 
    title: 'Báo cáo doanh số tuần', 
    description: 'Tổng hợp doanh số các cửa hàng',
    assignee: { name: 'Lê Thị D' },
    status: 'done',
    priority: 'medium',
    dueDate: 'Hoàn thành',
    progress: 100,
  },
];

const priorityConfig = {
  'urgent': { label: 'Khẩn cấp', color: 'bg-red-500/10 text-red-400 border-red-500/30', dot: 'bg-red-400' },
  'high': { label: 'Cao', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  'medium': { label: 'Trung bình', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  'low': { label: 'Thấp', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
};

const statusConfig = {
  'todo': { label: 'Chờ làm', color: 'text-slate-400', icon: Circle },
  'in-progress': { label: 'Đang làm', color: 'text-amber-400', icon: Clock },
  'done': { label: 'Hoàn thành', color: 'text-emerald-400', icon: CheckCircle },
};

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
}

function TaskItem({ task, onToggle }: TaskItemProps) {
  const priorityConf = priorityConfig[task.priority];
  const statusConf = statusConfig[task.status];
  const StatusIcon = statusConf.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'p-4 rounded-xl border transition-all',
        task.status === 'done' 
          ? 'bg-slate-900/30 border-slate-800/50'
          : 'bg-slate-800/30 border-slate-700/30'
      )}
    >
      <div className="flex items-start gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onToggle(task.id)}
          className={cn(
            'mt-0.5 p-1 rounded-full transition-colors',
            task.status === 'done'
              ? 'bg-emerald-500/20'
              : 'bg-slate-700/50 hover:bg-slate-600/50'
          )}
        >
          <StatusIcon className={cn('h-4 w-4', statusConf.color)} />
        </motion.button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={cn('text-[10px] border', priorityConf.color)}>
              {priorityConf.label}
            </Badge>
          </div>
          
          <h3 className={cn(
            'text-sm font-medium',
            task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-100'
          )}>
            {task.title}
          </h3>
          
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
            {task.description}
          </p>

          {/* Progress */}
          {task.status !== 'done' && task.progress > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-slate-500">Tiến độ</span>
                <span className="text-slate-400">{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-1" />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <User className="h-3 w-3" />
              {task.assignee.name}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <Clock className="h-3 w-3" />
              {task.dueDate}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function MobileTasksPage() {
  const [tasks, setTasks] = useState(mockTasks);

  const handleToggle = (id: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        return { ...task, status: newStatus, progress: newStatus === 'done' ? 100 : 0 };
      }
      return task;
    }));
  };

  const handleRefresh = async () => {
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const todoTasks = useMemo(() => tasks.filter(t => t.status === 'todo'), [tasks]);
  const inProgressTasks = useMemo(() => tasks.filter(t => t.status === 'in-progress'), [tasks]);
  const doneTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);

  const urgentCount = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;

  return (
    <>
      <Helmet>
        <title>Công việc | Mobile App</title>
      </Helmet>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {urgentCount > 0 && (
                <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse">
                  {urgentCount} khẩn cấp
                </Badge>
              )}
              <Badge className="bg-slate-700/50 text-slate-400 border-slate-600/30">
                {tasks.length} công việc
              </Badge>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl bg-amber-500 text-white"
            >
              <Plus className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
              <p className="text-lg font-bold text-slate-100">{todoTasks.length}</p>
              <p className="text-[10px] text-slate-500">Chờ làm</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
              <p className="text-lg font-bold text-amber-400">{inProgressTasks.length}</p>
              <p className="text-[10px] text-slate-500">Đang làm</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <p className="text-lg font-bold text-emerald-400">{doneTasks.length}</p>
              <p className="text-[10px] text-slate-500">Hoàn thành</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="todo" className="w-full">
            <TabsList className="w-full bg-slate-900/50 border border-slate-800/50 p-1">
              <TabsTrigger value="todo" className="flex-1 text-xs data-[state=active]:bg-slate-800">
                Chờ làm ({todoTasks.length})
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="flex-1 text-xs data-[state=active]:bg-slate-800">
                Đang làm ({inProgressTasks.length})
              </TabsTrigger>
              <TabsTrigger value="done" className="flex-1 text-xs data-[state=active]:bg-slate-800">
                Xong ({doneTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="todo" className="mt-4 space-y-3">
              <AnimatePresence>
                {todoTasks.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Không có việc chờ làm</p>
                  </motion.div>
                ) : (
                  todoTasks.map((task) => (
                    <TaskItem key={task.id} task={task} onToggle={handleToggle} />
                  ))
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="in-progress" className="mt-4 space-y-3">
              <AnimatePresence>
                {inProgressTasks.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <Clock className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Không có việc đang làm</p>
                  </motion.div>
                ) : (
                  inProgressTasks.map((task) => (
                    <TaskItem key={task.id} task={task} onToggle={handleToggle} />
                  ))
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="done" className="mt-4 space-y-3">
              <AnimatePresence>
                {doneTasks.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <CheckSquare className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Chưa có việc hoàn thành</p>
                  </motion.div>
                ) : (
                  doneTasks.map((task) => (
                    <TaskItem key={task.id} task={task} onToggle={handleToggle} />
                  ))
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </PullToRefresh>
    </>
  );
}
