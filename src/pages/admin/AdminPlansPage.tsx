import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, 
  Plus, 
  Loader2,
  TrendingUp,
  Target,
  Users,
  Radio,
  Database as DatabaseIcon
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PlanCard } from '@/components/admin/PlanCard';
import { usePlatformPlansWithModules, useCreatePlan, useUpdatePlan, useUpdatePlanModules } from '@/hooks/usePlatformPlans';
import { usePlatformModules } from '@/hooks/usePlatformModules';

const moduleIcons: Record<string, React.ComponentType<any>> = {
  fdp: TrendingUp,
  mdp: Target,
  cdp: Users,
  control_tower: Radio,
  data_warehouse: DatabaseIcon,
};

export default function AdminPlansPage() {
  const { data: plans, isLoading } = usePlatformPlansWithModules();
  const { data: modules } = usePlatformModules();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const updatePlanModules = useUpdatePlanModules();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    price_monthly: '',
    price_yearly: '',
    max_users: '',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      price_monthly: '',
      price_yearly: '',
      max_users: '',
      is_active: true,
    });
    setSelectedModuleIds([]);
  };

  const handleCreate = async () => {
    const plan = await createPlan.mutateAsync({
      code: formData.code,
      name: formData.name,
      description: formData.description || null,
      price_monthly: formData.price_monthly ? Number(formData.price_monthly) : 0,
      price_yearly: formData.price_yearly ? Number(formData.price_yearly) : 0,
      max_users: formData.max_users ? Number(formData.max_users) : null,
      is_active: formData.is_active,
    });

    if (plan && selectedModuleIds.length > 0) {
      await updatePlanModules.mutateAsync({
        planId: plan.id,
        moduleIds: selectedModuleIds,
      });
    }

    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = (plan: any) => {
    setSelectedPlan(plan);
    setFormData({
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      price_monthly: plan.price_monthly?.toString() || '',
      price_yearly: plan.price_yearly?.toString() || '',
      max_users: plan.max_users?.toString() || '',
      is_active: plan.is_active,
    });
    setSelectedModuleIds(plan.modules?.map((m: any) => m.module_id) || []);
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedPlan) return;

    await updatePlan.mutateAsync({
      id: selectedPlan.id,
      data: {
        name: formData.name,
        description: formData.description || null,
        price_monthly: formData.price_monthly ? Number(formData.price_monthly) : 0,
        price_yearly: formData.price_yearly ? Number(formData.price_yearly) : 0,
        max_users: formData.max_users ? Number(formData.max_users) : null,
        is_active: formData.is_active,
      },
    });

    await updatePlanModules.mutateAsync({
      planId: selectedPlan.id,
      moduleIds: selectedModuleIds,
    });

    setIsEditOpen(false);
    setSelectedPlan(null);
    resetForm();
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModuleIds(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const PlanFormContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Mã gói (code)</Label>
          <Input
            value={formData.code}
            onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
            placeholder="starter"
            disabled={!!selectedPlan}
          />
        </div>
        <div className="space-y-2">
          <Label>Tên gói</Label>
          <Input
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Starter"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Mô tả</Label>
        <Textarea
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Mô tả gói dịch vụ..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Giá tháng (VND)</Label>
          <Input
            type="number"
            value={formData.price_monthly}
            onChange={e => setFormData(prev => ({ ...prev, price_monthly: e.target.value }))}
            placeholder="2000000"
          />
        </div>
        <div className="space-y-2">
          <Label>Giá năm (VND)</Label>
          <Input
            type="number"
            value={formData.price_yearly}
            onChange={e => setFormData(prev => ({ ...prev, price_yearly: e.target.value }))}
            placeholder="20000000"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Giới hạn người dùng</Label>
          <Input
            type="number"
            value={formData.max_users}
            onChange={e => setFormData(prev => ({ ...prev, max_users: e.target.value }))}
            placeholder="Để trống = không giới hạn"
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch
            checked={formData.is_active}
            onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
          />
          <Label>Đang bán</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Modules bao gồm</Label>
        <ScrollArea className="h-48 border rounded-lg p-3">
          <div className="space-y-2">
            {modules?.map(mod => {
              const Icon = moduleIcons[mod.code] || Package;
              return (
                <div 
                  key={mod.id} 
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedModuleIds.includes(mod.id)}
                    onCheckedChange={() => toggleModule(mod.id)}
                  />
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <span className="font-medium">{mod.name}</span>
                    {mod.is_core && (
                      <Badge variant="secondary" className="ml-2 text-xs">Core</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Quản lý Gói dịch vụ | Admin</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title="Quản lý Gói dịch vụ"
          subtitle="Cấu hình các gói dịch vụ của platform"
          icon={<Package className="w-5 h-5" />}
          actions={
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={resetForm}>
                  <Plus className="w-4 h-4" />
                  Thêm gói mới
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tạo gói dịch vụ mới</DialogTitle>
                  <DialogDescription>
                    Điền thông tin để tạo gói dịch vụ mới
                  </DialogDescription>
                </DialogHeader>
                <PlanFormContent />
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={handleCreate} 
                    disabled={createPlan.isPending || !formData.code || !formData.name}
                  >
                    {createPlan.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Tạo gói
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans?.map((plan, index) => (
              <PlanCard 
                key={plan.id} 
                plan={plan} 
                index={index}
                onEdit={() => handleEdit(plan)} 
              />
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa gói dịch vụ</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin gói {selectedPlan?.name}
              </DialogDescription>
            </DialogHeader>
            <PlanFormContent />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Hủy
              </Button>
              <Button 
                onClick={handleUpdate} 
                disabled={updatePlan.isPending}
              >
                {updatePlan.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Lưu thay đổi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
