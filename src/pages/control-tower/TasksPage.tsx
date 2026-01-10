import { useState } from 'react';
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
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: { name: string; avatar?: string };
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate: string;
  department: string;
  progress: number;
  subtasks?: { total: number; completed: number };
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
    department: 'Kho',
    progress: 65,
    subtasks: { total: 10, completed: 6 }
  },
  { 
    id: '2', 
    title: 'Đối soát công nợ nhà cung cấp', 
    description: 'Đối soát công nợ với 15 NCC trong tháng',
    assignee: { name: 'Trần Thị B' },
    status: 'todo',
    priority: 'high',
    dueDate: 'Ngày mai',
    department: 'Kế toán',
    progress: 0,
    subtasks: { total: 15, completed: 0 }
  },
  { 
    id: '3', 
    title: 'Setup cửa hàng mới Quận 9', 
    description: 'Chuẩn bị và setup toàn bộ thiết bị cho cửa hàng mới',
    assignee: { name: 'Phạm Văn C' },
    status: 'in-progress',
    priority: 'high',
    dueDate: '3 ngày nữa',
    department: 'Operations',
    progress: 45,
    subtasks: { total: 20, completed: 9 }
  },
  { 
    id: '4', 
    title: 'Báo cáo doanh số tuần', 
    description: 'Tổng hợp và phân tích doanh số các cửa hàng',
    assignee: { name: 'Lê Thị D' },
    status: 'review',
    priority: 'medium',
    dueDate: 'Thứ 6',
    department: 'Bán hàng',
    progress: 90,
  },
  { 
    id: '5', 
    title: 'Training nhân viên mới', 
    description: 'Đào tạo 5 nhân viên mới về quy trình bán hàng',
    assignee: { name: 'Hoàng Văn E' },
    status: 'done',
    priority: 'medium',
    dueDate: 'Hoàn thành',
    department: 'HR',
    progress: 100,
  },
  { 
    id: '6', 
    title: 'Cập nhật giá sản phẩm', 
    description: 'Cập nhật giá mới cho 200 SKU theo chính sách mới',
    assignee: { name: 'Mai Thị F' },
    status: 'done',
    priority: 'low',
    dueDate: 'Hoàn thành',
    department: 'Marketing',
    progress: 100,
  },
];

const statusConfig = {
  'todo': { label: 'Chờ xử lý', color: 'bg-slate-500', textColor: 'text-slate-400' },
  'in-progress': { label: 'Đang làm', color: 'bg-amber-500', textColor: 'text-amber-400' },
  'review': { label: 'Đang review', color: 'bg-blue-500', textColor: 'text-blue-400' },
  'done': { label: 'Hoàn thành', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
};

const priorityConfig = {
  'urgent': { label: 'Khẩn cấp', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  'high': { label: 'Cao', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  'medium': { label: 'Trung bình', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  'low': { label: 'Thấp', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
};

function TaskCard({ task }: { task: Task }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`text-xs border ${priorityConfig[task.priority].color}`}>
              {priorityConfig[task.priority].label}
            </Badge>
            <Badge className="text-xs bg-slate-700/50 text-slate-400 border-slate-600/30">
              {task.department}
            </Badge>
          </div>
          <h3 className="text-sm font-medium text-slate-100 group-hover:text-white transition-colors">
            {task.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-300">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
            <DropdownMenuItem className="text-slate-300 focus:bg-slate-800">Xem chi tiết</DropdownMenuItem>
            <DropdownMenuItem className="text-slate-300 focus:bg-slate-800">Chỉnh sửa</DropdownMenuItem>
            <DropdownMenuItem className="text-red-400 focus:bg-red-500/10">Xóa</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress */}
      {task.status !== 'done' && task.progress > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500">Tiến độ</span>
            <span className="text-slate-400">{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-1.5" />
        </div>
      )}

      {/* Subtasks */}
      {task.subtasks && (
        <div className="flex items-center gap-1 mt-3 text-xs text-slate-500">
          <CheckSquare className="h-3 w-3" />
          <span>{task.subtasks.completed}/{task.subtasks.total} subtasks</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/30">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
              {task.assignee.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-slate-400">{task.assignee.name}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          <span>{task.dueDate}</span>
        </div>
      </div>
    </motion.div>
  );
}

function TaskColumn({ title, status, tasks, count }: { 
  title: string; 
  status: Task['status']; 
  tasks: Task[];
  count: number;
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
        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-300">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-3">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
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
  const [tasks] = useState(mockTasks);

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const reviewTasks = tasks.filter(t => t.status === 'review');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const stats = {
    total: tasks.length,
    completed: doneTasks.length,
    overdue: 2,
    urgent: tasks.filter(t => t.priority === 'urgent').length,
  };

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
          <TaskColumn title="Chờ xử lý" status="todo" tasks={todoTasks} count={todoTasks.length} />
          <TaskColumn title="Đang làm" status="in-progress" tasks={inProgressTasks} count={inProgressTasks.length} />
          <TaskColumn title="Đang review" status="review" tasks={reviewTasks} count={reviewTasks.length} />
          <TaskColumn title="Hoàn thành" status="done" tasks={doneTasks} count={doneTasks.length} />
        </div>
      </div>
    </>
  );
}
