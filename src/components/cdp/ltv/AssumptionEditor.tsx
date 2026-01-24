import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Settings, Trash2, Check, Edit2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { 
  useLTVModels, 
  useCreateLTVModel, 
  useUpdateLTVModel, 
  useDeleteLTVModel,
  useSetActiveModel,
  type LTVModelAssumption,
  type CreateLTVModelInput 
} from '@/hooks/useCDPLTVEngine';

interface AssumptionSliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
}

function AssumptionSlider({ 
  label, 
  description, 
  value, 
  onChange, 
  min, 
  max, 
  step,
  format = (v) => `${(v * 100).toFixed(0)}%`
}: AssumptionSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary" className="font-mono">
          {format(value)}
        </Badge>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}

interface ModelFormProps {
  model?: LTVModelAssumption;
  onSave: (input: CreateLTVModelInput) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

function ModelForm({ model, onSave, onCancel, isLoading }: ModelFormProps) {
  const [formData, setFormData] = useState<CreateLTVModelInput>({
    model_name: model?.model_name || '',
    description: model?.description || '',
    is_active: model?.is_active || false,
    retention_year_1: model?.retention_year_1 || 0.60,
    retention_year_2: model?.retention_year_2 || 0.45,
    retention_year_3: model?.retention_year_3 || 0.35,
    aov_growth_rate: model?.aov_growth_rate || 0,
    discount_rate: model?.discount_rate || 0.12,
    risk_multiplier: model?.risk_multiplier || 1.0,
    margin_proxy: model?.margin_proxy || 0.45,
  });

  const handleSubmit = async () => {
    if (!formData.model_name.trim()) {
      toast.error('Vui lòng nhập tên mô hình');
      return;
    }
    await onSave(formData);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="model_name">Tên mô hình *</Label>
          <Input
            id="model_name"
            value={formData.model_name}
            onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
            placeholder="VD: Conservative, Growth, etc."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Mô tả</Label>
          <Input
            id="description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Mô tả ngắn về mô hình"
          />
        </div>
      </div>

      {/* Retention Curve */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Đường cong Retention</CardTitle>
          <CardDescription>Tỷ lệ khách hàng quay lại theo năm</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AssumptionSlider
            label="Retention Năm 1"
            description="% khách hàng mua lại trong năm đầu"
            value={formData.retention_year_1!}
            onChange={(v) => setFormData({ ...formData, retention_year_1: v })}
            min={0.1}
            max={0.95}
            step={0.05}
          />
          <AssumptionSlider
            label="Retention Năm 2"
            description="% của năm 1 tiếp tục mua năm 2"
            value={formData.retention_year_2!}
            onChange={(v) => setFormData({ ...formData, retention_year_2: v })}
            min={0.1}
            max={0.9}
            step={0.05}
          />
          <AssumptionSlider
            label="Retention Năm 3"
            description="% của năm 2 tiếp tục mua năm 3"
            value={formData.retention_year_3!}
            onChange={(v) => setFormData({ ...formData, retention_year_3: v })}
            min={0.1}
            max={0.85}
            step={0.05}
          />
        </CardContent>
      </Card>

      {/* Financial Assumptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Giả định Tài chính</CardTitle>
          <CardDescription>Các hệ số điều chỉnh giá trị</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AssumptionSlider
            label="AOV Growth Rate"
            description="Tăng trưởng giá trị đơn hàng hàng năm"
            value={formData.aov_growth_rate!}
            onChange={(v) => setFormData({ ...formData, aov_growth_rate: v })}
            min={-0.20}
            max={0.30}
            step={0.01}
            format={(v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`}
          />
          <AssumptionSlider
            label="Discount Rate (NPV)"
            description="Tỷ lệ chiết khấu để tính giá trị hiện tại"
            value={formData.discount_rate!}
            onChange={(v) => setFormData({ ...formData, discount_rate: v })}
            min={0.05}
            max={0.25}
            step={0.01}
          />
          <AssumptionSlider
            label="Risk Multiplier"
            description="Hệ số điều chỉnh rủi ro (1.0 = không điều chỉnh)"
            value={formData.risk_multiplier!}
            onChange={(v) => setFormData({ ...formData, risk_multiplier: v })}
            min={0.5}
            max={1.2}
            step={0.05}
            format={(v) => `${v.toFixed(2)}x`}
          />
          <AssumptionSlider
            label="Margin Proxy"
            description="Tỷ lệ lợi nhuận gộp ước tính (khi thiếu COGS)"
            value={formData.margin_proxy!}
            onChange={(v) => setFormData({ ...formData, margin_proxy: v })}
            min={0.20}
            max={0.70}
            step={0.05}
          />
        </CardContent>
      </Card>

      {/* Active Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label>Đặt làm mô hình Active</Label>
          <p className="text-xs text-muted-foreground">
            Mô hình active sẽ được dùng để tính LTV mặc định
          </p>
        </div>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {model ? 'Cập nhật' : 'Tạo mới'}
        </Button>
      </div>
    </div>
  );
}

export function AssumptionEditor() {
  const { data: models, isLoading } = useLTVModels();
  const createModel = useCreateLTVModel();
  const updateModel = useUpdateLTVModel();
  const deleteModel = useDeleteLTVModel();
  const setActive = useSetActiveModel();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<LTVModelAssumption | undefined>();

  const handleCreate = async (input: CreateLTVModelInput) => {
    try {
      await createModel.mutateAsync(input);
      toast.success('Đã tạo mô hình mới');
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(`Lỗi: ${error.message}`);
    }
  };

  const handleUpdate = async (input: CreateLTVModelInput) => {
    if (!editingModel) return;
    try {
      await updateModel.mutateAsync({ id: editingModel.id, ...input });
      toast.success('Đã cập nhật mô hình');
      setDialogOpen(false);
      setEditingModel(undefined);
    } catch (error: any) {
      toast.error(`Lỗi: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa mô hình này?')) return;
    try {
      await deleteModel.mutateAsync(id);
      toast.success('Đã xóa mô hình');
    } catch (error: any) {
      toast.error(`Lỗi: ${error.message}`);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await setActive.mutateAsync(id);
      toast.success('Đã đặt làm mô hình active');
    } catch (error: any) {
      toast.error(`Lỗi: ${error.message}`);
    }
  };

  const openEditDialog = (model: LTVModelAssumption) => {
    setEditingModel(model);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingModel(undefined);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Mô hình LTV</h3>
          <p className="text-sm text-muted-foreground">
            Tạo và quản lý các giả định để tính toán LTV
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo mô hình mới
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingModel ? 'Chỉnh sửa mô hình' : 'Tạo mô hình mới'}
              </DialogTitle>
              <DialogDescription>
                Thiết lập các giả định để tính toán LTV khách hàng
              </DialogDescription>
            </DialogHeader>
            <ModelForm
              model={editingModel}
              onSave={editingModel ? handleUpdate : handleCreate}
              onCancel={() => setDialogOpen(false)}
              isLoading={createModel.isPending || updateModel.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Models Table */}
      <Card>
        <CardContent className="pt-6">
          {!models || models.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có mô hình nào. Tạo mô hình đầu tiên để bắt đầu.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên mô hình</TableHead>
                  <TableHead>Retention Y1</TableHead>
                  <TableHead>AOV Growth</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">
                      {model.model_name}
                      {model.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {model.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{(model.retention_year_1 * 100).toFixed(0)}%</TableCell>
                    <TableCell>
                      {model.aov_growth_rate >= 0 ? '+' : ''}
                      {(model.aov_growth_rate * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell>{(model.discount_rate * 100).toFixed(0)}%</TableCell>
                    <TableCell>{model.risk_multiplier.toFixed(2)}x</TableCell>
                    <TableCell>{(model.margin_proxy * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-center">
                      {model.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetActive(model.id)}
                          disabled={setActive.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Kích hoạt
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(model)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(model.id)}
                          disabled={deleteModel.isPending || model.is_active}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
