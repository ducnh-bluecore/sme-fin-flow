import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Mail, 
  Phone, 
  Slack, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  User,
  Shield,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  useNotificationRecipients, 
  useSaveNotificationRecipient, 
  useDeleteNotificationRecipient,
  NotificationRecipient,
  NotificationRecipientInput 
} from '@/hooks/useNotificationRecipients';
import { Loader2 } from 'lucide-react';

const roleConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  cfo: { label: 'CFO', icon: Shield, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  controller: { label: 'Controller', icon: User, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  accountant: { label: 'Kế toán', icon: User, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  manager: { label: 'Quản lý', icon: User, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  analyst: { label: 'Phân tích', icon: User, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  other: { label: 'Khác', icon: User, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
};

function RecipientForm({ 
  recipient, 
  onSave, 
  onCancel,
  isLoading 
}: { 
  recipient?: NotificationRecipient | null;
  onSave: (data: NotificationRecipientInput & { id?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<NotificationRecipientInput>({
    name: recipient?.name || '',
    email: recipient?.email || '',
    phone: recipient?.phone || '',
    slack_user_id: recipient?.slack_user_id || '',
    role: recipient?.role || 'other',
    is_active: recipient?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: recipient?.id });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Tên người nhận *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Nguyễn Văn A"
          required
          className="bg-slate-800/50 border-slate-700"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Vai trò</Label>
        <Select 
          value={formData.role} 
          onValueChange={(value) => setFormData({ ...formData, role: value })}
        >
          <SelectTrigger className="bg-slate-800/50 border-slate-700">
            <SelectValue placeholder="Chọn vai trò" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(roleConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  <config.icon className="h-4 w-4" />
                  {config.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@company.com"
            className="pl-10 bg-slate-800/50 border-slate-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Số điện thoại</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            id="phone"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="0901234567"
            className="pl-10 bg-slate-800/50 border-slate-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slack">Slack User ID</Label>
        <div className="relative">
          <Slack className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            id="slack"
            value={formData.slack_user_id || ''}
            onChange={(e) => setFormData({ ...formData, slack_user_id: e.target.value })}
            placeholder="U0123456789"
            className="pl-10 bg-slate-800/50 border-slate-700"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="active">Đang hoạt động</Label>
        <Switch
          id="active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" disabled={isLoading || !formData.name}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {recipient ? 'Cập nhật' : 'Thêm mới'}
        </Button>
      </div>
    </form>
  );
}

function RecipientCard({ 
  recipient, 
  onEdit, 
  onDelete 
}: { 
  recipient: NotificationRecipient;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const role = roleConfig[recipient.role] || roleConfig.other;
  const RoleIcon = role.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600/50 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${role.color.split(' ').slice(1).join(' ')}`}>
            <RoleIcon className={`h-5 w-5 ${role.color.split(' ')[0]}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-slate-100">{recipient.name}</h4>
              {!recipient.is_active && (
                <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-400">
                  Tạm dừng
                </Badge>
              )}
            </div>
            <Badge className={`mt-1 text-xs ${role.color}`}>
              {role.label}
            </Badge>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 text-slate-400 hover:text-slate-100">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-slate-400 hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-slate-400">
        {recipient.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" />
            <span>{recipient.email}</span>
          </div>
        )}
        {recipient.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" />
            <span>{recipient.phone}</span>
          </div>
        )}
        {recipient.slack_user_id && (
          <div className="flex items-center gap-2">
            <Slack className="h-3.5 w-3.5" />
            <span>{recipient.slack_user_id}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function NotificationRecipientsPanel() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<NotificationRecipient | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: recipients, isLoading } = useNotificationRecipients();
  const saveRecipient = useSaveNotificationRecipient();
  const deleteRecipient = useDeleteNotificationRecipient();

  const handleSave = (data: NotificationRecipientInput & { id?: string }) => {
    saveRecipient.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setEditingRecipient(null);
      },
    });
  };

  const handleEdit = (recipient: NotificationRecipient) => {
    setEditingRecipient(recipient);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteRecipient.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRecipient(null);
  };

  // Group recipients by role
  const groupedRecipients = recipients?.reduce((acc, r) => {
    const role = r.role || 'other';
    if (!acc[role]) acc[role] = [];
    acc[role].push(r);
    return acc;
  }, {} as Record<string, NotificationRecipient[]>) || {};

  const activeCount = recipients?.filter(r => r.is_active).length || 0;

  return (
    <Card className="bg-slate-900/50 border-slate-800/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <Bell className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-100">Người nhận thông báo</CardTitle>
              <p className="text-sm text-slate-400 mt-0.5">
                {recipients?.length || 0} người nhận • {activeCount} đang hoạt động
              </p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Thêm người nhận
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-slate-100">
                  {editingRecipient ? 'Chỉnh sửa người nhận' : 'Thêm người nhận mới'}
                </DialogTitle>
              </DialogHeader>
              <RecipientForm
                recipient={editingRecipient}
                onSave={handleSave}
                onCancel={handleCloseDialog}
                isLoading={saveRecipient.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : !recipients?.length ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-2">Chưa có người nhận nào</p>
            <p className="text-sm text-slate-500">Thêm người nhận để nhận thông báo cảnh báo</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(roleConfig).map(([roleKey, config]) => {
              const roleRecipients = groupedRecipients[roleKey];
              if (!roleRecipients?.length) return null;
              
              return (
                <div key={roleKey}>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <config.icon className="h-4 w-4" />
                    {config.label} ({roleRecipients.length})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roleRecipients.map((recipient) => (
                      <RecipientCard
                        key={recipient.id}
                        recipient={recipient}
                        onEdit={() => handleEdit(recipient)}
                        onDelete={() => setDeleteId(recipient.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Bạn có chắc chắn muốn xóa người nhận này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteRecipient.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
