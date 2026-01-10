import { useState } from 'react';
import { Plus, Calendar, Clock, Trash2, Edit2, Bell, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useScheduledNotifications,
  useCreateScheduledNotification,
  useUpdateScheduledNotification,
  useDeleteScheduledNotification,
  useToggleScheduledNotification,
  ScheduledNotification,
  ScheduledNotificationInput,
} from '@/hooks/useScheduledNotifications';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const scheduleTypeLabels: Record<string, string> = {
  once: 'Một lần',
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
};

const dayOfWeekLabels = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function ScheduledNotificationsManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduledNotification | null>(null);
  const [formData, setFormData] = useState<Partial<ScheduledNotificationInput>>({
    schedule_type: 'daily',
    schedule_time: '09:00',
  });

  const { data: schedules = [], isLoading } = useScheduledNotifications();
  const createSchedule = useCreateScheduledNotification();
  const updateSchedule = useUpdateScheduledNotification();
  const deleteSchedule = useDeleteScheduledNotification();
  const toggleSchedule = useToggleScheduledNotification();

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      message: '',
      schedule_type: 'daily',
      schedule_time: '09:00',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: ScheduledNotification) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      message: item.message || '',
      schedule_type: item.schedule_type,
      schedule_time: item.schedule_time,
      schedule_day_of_week: item.schedule_day_of_week ?? undefined,
      schedule_day_of_month: item.schedule_day_of_month ?? undefined,
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.schedule_type || !formData.schedule_time) return;

    const input: ScheduledNotificationInput = {
      title: formData.title,
      message: formData.message,
      schedule_type: formData.schedule_type as ScheduledNotificationInput['schedule_type'],
      schedule_time: formData.schedule_time,
      schedule_day_of_week: formData.schedule_day_of_week,
      schedule_day_of_month: formData.schedule_day_of_month,
      is_active: formData.is_active ?? true,
    };

    if (editingItem) {
      await updateSchedule.mutateAsync({ id: editingItem.id, ...input });
    } else {
      await createSchedule.mutateAsync(input);
    }

    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa thông báo này?')) {
      await deleteSchedule.mutateAsync(id);
    }
  };

  const handleToggle = (id: string, is_active: boolean) => {
    toggleSchedule.mutate({ id, is_active });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Thông báo định kỳ
            </CardTitle>
            <CardDescription>
              Tạo và quản lý các thông báo tự động
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo mới
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Chưa có thông báo định kỳ nào</p>
            <Button variant="link" onClick={handleOpenCreate}>
              Tạo thông báo đầu tiên
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-4">
                  <Switch
                    checked={schedule.is_active}
                    onCheckedChange={(checked) => handleToggle(schedule.id, checked)}
                  />
                  <div>
                    <h4 className="font-medium">{schedule.title}</h4>
                    {schedule.message && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {schedule.message}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">
                        {scheduleTypeLabels[schedule.schedule_type]}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {schedule.schedule_time}
                      </span>
                      {schedule.schedule_type === 'weekly' && schedule.schedule_day_of_week !== null && (
                        <span className="text-xs text-muted-foreground">
                          • {dayOfWeekLabels[schedule.schedule_day_of_week]}
                        </span>
                      )}
                      {schedule.schedule_type === 'monthly' && schedule.schedule_day_of_month !== null && (
                        <span className="text-xs text-muted-foreground">
                          • Ngày {schedule.schedule_day_of_month}
                        </span>
                      )}
                    </div>
                    {schedule.next_run_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Lần chạy tiếp: {format(new Date(schedule.next_run_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(schedule)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(schedule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Chỉnh sửa thông báo' : 'Tạo thông báo định kỳ'}
            </DialogTitle>
            <DialogDescription>
              Thiết lập nội dung và lịch gửi thông báo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nhập tiêu đề thông báo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Nội dung (tùy chọn)</Label>
              <Textarea
                id="message"
                value={formData.message || ''}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Nhập nội dung thông báo"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loại lịch</Label>
                <Select
                  value={formData.schedule_type}
                  onValueChange={(value) => setFormData({ ...formData, schedule_type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Một lần</SelectItem>
                    <SelectItem value="daily">Hàng ngày</SelectItem>
                    <SelectItem value="weekly">Hàng tuần</SelectItem>
                    <SelectItem value="monthly">Hàng tháng</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Giờ gửi</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.schedule_time || '09:00'}
                  onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                />
              </div>
            </div>

            {formData.schedule_type === 'weekly' && (
              <div className="space-y-2">
                <Label>Ngày trong tuần</Label>
                <Select
                  value={String(formData.schedule_day_of_week ?? 1)}
                  onValueChange={(value) => setFormData({ ...formData, schedule_day_of_week: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOfWeekLabels.map((label, index) => (
                      <SelectItem key={index} value={String(index)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.schedule_type === 'monthly' && (
              <div className="space-y-2">
                <Label>Ngày trong tháng</Label>
                <Select
                  value={String(formData.schedule_day_of_month ?? 1)}
                  onValueChange={(value) => setFormData({ ...formData, schedule_day_of_month: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        Ngày {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.title || createSchedule.isPending || updateSchedule.isPending}
            >
              {editingItem ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
