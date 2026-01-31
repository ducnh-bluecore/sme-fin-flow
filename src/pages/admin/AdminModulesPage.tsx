import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Layers, 
  Plus, 
  Loader2,
  Pencil,
  TrendingUp,
  Target,
  Users,
  Radio,
  Database as DatabaseIcon,
  Package,
  GripVertical,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { usePlatformModules, useUpdateModule, useCreateModule, PlatformModule } from '@/hooks/usePlatformModules';
import { cn } from '@/lib/utils';

const moduleIcons: Record<string, React.ComponentType<any>> = {
  fdp: TrendingUp,
  mdp: Target,
  cdp: Users,
  control_tower: Radio,
  data_warehouse: DatabaseIcon,
};

const iconOptions = [
  { value: 'TrendingUp', label: 'Trending Up', icon: TrendingUp },
  { value: 'Target', label: 'Target', icon: Target },
  { value: 'Users', label: 'Users', icon: Users },
  { value: 'Radio', label: 'Radio', icon: Radio },
  { value: 'Database', label: 'Database', icon: DatabaseIcon },
  { value: 'Package', label: 'Package', icon: Package },
  { value: 'Layers', label: 'Layers', icon: Layers },
];

const colorOptions = [
  { value: 'emerald', label: 'Xanh lá', class: 'bg-emerald-500' },
  { value: 'blue', label: 'Xanh dương', class: 'bg-blue-500' },
  { value: 'violet', label: 'Tím', class: 'bg-violet-500' },
  { value: 'amber', label: 'Vàng cam', class: 'bg-amber-500' },
  { value: 'slate', label: 'Xám', class: 'bg-slate-500' },
  { value: 'rose', label: 'Hồng', class: 'bg-rose-500' },
];

export default function AdminModulesPage() {
  const { data: modules, isLoading } = usePlatformModules();
  const updateModule = useUpdateModule();
  const createModule = useCreateModule();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<PlatformModule | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    icon: 'Package',
    color: 'blue',
    is_core: false,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      icon: 'Package',
      color: 'blue',
      is_core: false,
      is_active: true,
    });
  };

  const handleEdit = (mod: PlatformModule) => {
    setSelectedModule(mod);
    setFormData({
      code: mod.code,
      name: mod.name,
      description: mod.description || '',
      icon: mod.icon || 'Package',
      color: mod.color || 'blue',
      is_core: mod.is_core,
      is_active: mod.is_active,
    });
    setIsEditOpen(true);
  };

  const handleToggleActive = async (mod: PlatformModule) => {
    await updateModule.mutateAsync({
      id: mod.id,
      data: { is_active: !mod.is_active },
    });
  };

  const handleCreate = async () => {
    await createModule.mutateAsync({
      code: formData.code,
      name: formData.name,
      description: formData.description || null,
      icon: formData.icon,
      color: formData.color,
      is_core: formData.is_core,
      is_active: formData.is_active,
    });
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!selectedModule) return;

    await updateModule.mutateAsync({
      id: selectedModule.id,
      data: {
        name: formData.name,
        description: formData.description || null,
        icon: formData.icon,
        color: formData.color,
        is_core: formData.is_core,
        is_active: formData.is_active,
      },
    });
    setIsEditOpen(false);
    setSelectedModule(null);
    resetForm();
  };

  const ModuleFormContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Mã module (code)</Label>
          <Input
            value={formData.code}
            onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
            placeholder="my_module"
            disabled={!!selectedModule}
          />
        </div>
        <div className="space-y-2">
          <Label>Tên module</Label>
          <Input
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="My Module"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Mô tả</Label>
        <Textarea
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Mô tả module..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Icon</Label>
          <Select 
            value={formData.icon} 
            onValueChange={value => setFormData(prev => ({ ...prev, icon: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {iconOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Màu sắc</Label>
          <Select 
            value={formData.color} 
            onValueChange={value => setFormData(prev => ({ ...prev, color: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {colorOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-full', opt.class)} />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_core}
            onCheckedChange={checked => setFormData(prev => ({ ...prev, is_core: checked }))}
          />
          <Label>Module lõi (Core)</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_active}
            onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
          />
          <Label>Đang hoạt động</Label>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Quản lý Sản phẩm/Modules | Admin</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title="Quản lý Sản phẩm"
          subtitle="Cấu hình các module của platform"
          icon={<Layers className="w-5 h-5" />}
          actions={
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={resetForm}>
                  <Plus className="w-4 h-4" />
                  Thêm module mới
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tạo module mới</DialogTitle>
                  <DialogDescription>
                    Điền thông tin để tạo module mới
                  </DialogDescription>
                </DialogHeader>
                <ModuleFormContent />
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={handleCreate} 
                    disabled={createModule.isPending || !formData.code || !formData.name}
                  >
                    {createModule.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Tạo module
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Danh sách Modules</CardTitle>
                <CardDescription>
                  Quản lý các module/sản phẩm của platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead className="text-center">Core</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules?.map((mod, index) => {
                      const Icon = moduleIcons[mod.code] || Package;
                      return (
                        <motion.tr
                          key={mod.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group"
                        >
                          <TableCell>
                            <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-10 h-10 rounded-lg flex items-center justify-center',
                                mod.is_active ? 'bg-primary/10' : 'bg-muted'
                              )}>
                                <Icon className={cn(
                                  'w-5 h-5',
                                  mod.is_active ? 'text-primary' : 'text-muted-foreground'
                                )} />
                              </div>
                              <div>
                                <p className="font-medium">{mod.name}</p>
                                <code className="text-xs text-muted-foreground">{mod.code}</code>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <p className="text-sm text-muted-foreground truncate">
                              {mod.description || '-'}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            {mod.is_core ? (
                              <Badge variant="secondary">Core</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {mod.is_active ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-muted-foreground" />
                              )}
                              <Switch
                                checked={mod.is_active}
                                onCheckedChange={() => handleToggleActive(mod)}
                                disabled={updateModule.isPending}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-1"
                              onClick={() => handleEdit(mod)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Sửa
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa module</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin module {selectedModule?.name}
              </DialogDescription>
            </DialogHeader>
            <ModuleFormContent />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Hủy
              </Button>
              <Button 
                onClick={handleUpdate} 
                disabled={updateModule.isPending}
              >
                {updateModule.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Lưu thay đổi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
