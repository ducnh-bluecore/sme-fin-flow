/**
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 */
import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  CheckSquare, 
  Loader2, 
  User, 
  Calendar,
  AlertTriangle,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { AlertInstance } from '@/hooks/useNotificationCenter';

interface CreateTaskFromAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: AlertInstance | null;
}

const priorityOptions = [
  { value: 'urgent', label: 'Khẩn cấp', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { value: 'high', label: 'Cao', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  { value: 'medium', label: 'Trung bình', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { value: 'low', label: 'Thấp', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
];

export function CreateTaskFromAlertDialog({
  open,
  onOpenChange,
  alert,
}: CreateTaskFromAlertDialogProps) {
  const { buildInsertQuery, client, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('high');
  const [assigneeId, setAssigneeId] = useState('');
  const [department, setDepartment] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Fetch team members using the hook
  const { data: teamMembers = [], isLoading: isLoadingMembers } = useTeamMembers();

  // Get unique departments from team members
  const departments = useMemo(() => {
    const deptSet = new Set(teamMembers.map(m => m.department).filter(Boolean));
    return Array.from(deptSet).sort();
  }, [teamMembers]);

  // Filter team members by selected department
  const filteredMembers = useMemo(() => {
    if (!department) return teamMembers;
    return teamMembers.filter(m => m.department === department);
  }, [teamMembers, department]);

  // Get selected member info
  const selectedMember = useMemo(() => {
    return teamMembers.find(m => m.id === assigneeId);
  }, [teamMembers, assigneeId]);

  // Reset form when alert changes
  const resetForm = () => {
    if (alert) {
      setTitle(`[${alert.category.toUpperCase()}] ${alert.title}`);
      setDescription(alert.message || alert.title);
      setPriority(alert.severity === 'critical' ? 'urgent' : alert.severity === 'warning' ? 'high' : 'medium');
    } else {
      setTitle('');
      setDescription('');
      setPriority('high');
    }
    setAssigneeId('');
    setDepartment('');
    setDueDate('');
  };

  // Reset assignee when department changes
  const handleDepartmentChange = (value: string) => {
    setDepartment(value);
    setAssigneeId(''); // Clear assignee when department changes
  };

  // Create task mutation
  const createTask = useMutation({
    mutationFn: async () => {
      if (!tenantId || !alert) throw new Error('Missing data');

      const { data: userData } = await client.auth.getUser();
      
      const { error } = await buildInsertQuery('tasks', {
        title,
        description,
        status: 'todo',
        priority,
        assignee_id: assigneeId || null,
        assignee_name: selectedMember?.name || null,
        department: department || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        source_type: 'alert',
        source_id: alert.id,
        source_alert_type: alert.alert_type,
        created_by: userData.user?.id || null,
        metadata: {
          alert_title: alert.title,
          alert_severity: alert.severity,
          alert_category: alert.category,
          current_value: alert.current_value,
          threshold_value: alert.threshold_value,
          assignee_email: selectedMember?.email || null,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Đã tạo công việc mới');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error('Không thể tạo công việc');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề công việc');
      return;
    }
    createTask.mutate();
  };

  // Set initial values when dialog opens
  if (open && alert && !title) {
    resetForm();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <CheckSquare className="h-5 w-5 text-blue-400" />
            Tạo công việc từ cảnh báo
          </DialogTitle>
        </DialogHeader>

        {alert && (
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`h-4 w-4 ${
                alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
              }`} />
              <Badge className={`text-xs ${
                alert.severity === 'critical' 
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {alert.severity === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo'}
              </Badge>
            </div>
            <p className="text-sm text-slate-300">{alert.title}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-300">Tiêu đề công việc *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề công việc..."
              className="bg-slate-800/50 border-slate-700 text-slate-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">Mô tả</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết công việc..."
              rows={3}
              className="bg-slate-800/50 border-slate-700 text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Mức độ ưu tiên</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {priorityOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <Badge className={`text-xs border ${opt.color}`}>
                        {opt.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Phòng ban
              </Label>
              <Select value={department} onValueChange={handleDepartmentChange}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Chọn phòng ban" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="">Tất cả phòng ban</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-1">
                <User className="h-3 w-3" />
                Người thực hiện
              </Label>
              <Select value={assigneeId} onValueChange={setAssigneeId} disabled={isLoadingMembers}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
                  <SelectValue placeholder={isLoadingMembers ? "Đang tải..." : "Chọn người thực hiện"} />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                  {filteredMembers.length === 0 ? (
                    <div className="p-2 text-sm text-slate-400 text-center">
                      {department ? 'Không có nhân sự trong phòng ban này' : 'Chưa có nhân sự'}
                    </div>
                  ) : (
                    filteredMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <span>{member.name}</span>
                          <span className="text-xs text-slate-400">- {member.role}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedMember && (
                <p className="text-xs text-slate-400">{selectedMember.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-slate-300 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Hạn hoàn thành
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={createTask.isPending || !title.trim()}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {createTask.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Tạo công việc
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
