/**
 * FixedCostDefinitionPanel - UI for managing fixed cost baselines
 * 
 * Allows CFO to define recurring fixed costs like salary, rent, utilities
 * that form the baseline for expense forecasting.
 */

import { useState } from 'react';
import { Plus, Pencil, Trash2, Building, Users, Zap, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useExpenseBaselines,
  useCreateExpenseBaseline,
  useUpdateExpenseBaseline,
  useDeleteExpenseBaseline,
  BaselineCategory,
  ExpenseBaseline,
  baselineCategoryLabels,
} from '@/hooks/useExpenseBaselines';

// =============================================================
// CATEGORY ICONS
// =============================================================

const categoryIcons: Record<BaselineCategory, React.ReactNode> = {
  salary: <Users className="h-4 w-4" />,
  rent: <Building className="h-4 w-4" />,
  utilities: <Zap className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

// =============================================================
// ADD/EDIT DIALOG
// =============================================================

interface BaselineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseline?: ExpenseBaseline | null;
}

function BaselineDialog({ open, onOpenChange, baseline }: BaselineDialogProps) {
  const createMutation = useCreateExpenseBaseline();
  const updateMutation = useUpdateExpenseBaseline();
  
  const [formData, setFormData] = useState({
    category: baseline?.category || 'salary' as BaselineCategory,
    name: baseline?.name || '',
    monthlyAmount: baseline?.monthlyAmount?.toString() || '',
    effectiveFrom: baseline?.effectiveFrom || format(new Date(), 'yyyy-MM-dd'),
    effectiveTo: baseline?.effectiveTo || '',
    notes: baseline?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const input = {
      category: formData.category,
      name: formData.name,
      monthlyAmount: parseFloat(formData.monthlyAmount) || 0,
      effectiveFrom: formData.effectiveFrom,
      effectiveTo: formData.effectiveTo || null,
      notes: formData.notes || null,
    };

    if (baseline) {
      await updateMutation.mutateAsync({ id: baseline.id, ...input });
    } else {
      await createMutation.mutateAsync(input);
    }
    
    onOpenChange(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {baseline ? 'Sửa chi phí cố định' : 'Thêm chi phí cố định'}
          </DialogTitle>
          <DialogDescription>
            Định nghĩa chi phí định kỳ hàng tháng như lương, tiền thuê, điện nước
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Danh mục</Label>
            <Select
              value={formData.category}
              onValueChange={(v) => setFormData(d => ({ ...d, category: v as BaselineCategory }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(baselineCategoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Tên chi phí</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
              placeholder="VD: Lương văn phòng, Mặt bằng Q1..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Số tiền/tháng (₫)</Label>
            <Input
              id="amount"
              type="number"
              value={formData.monthlyAmount}
              onChange={(e) => setFormData(d => ({ ...d, monthlyAmount: e.target.value }))}
              placeholder="150000000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from">Từ ngày</Label>
              <Input
                id="from"
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => setFormData(d => ({ ...d, effectiveFrom: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">Đến ngày (tùy chọn)</Label>
              <Input
                id="to"
                type="date"
                value={formData.effectiveTo}
                onChange={(e) => setFormData(d => ({ ...d, effectiveTo: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(d => ({ ...d, notes: e.target.value }))}
              placeholder="Ghi chú thêm..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang lưu...' : (baseline ? 'Cập nhật' : 'Thêm mới')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================
// CATEGORY GROUP
// =============================================================

interface CategoryGroupProps {
  category: BaselineCategory;
  baselines: ExpenseBaseline[];
  total: number;
  onEdit: (baseline: ExpenseBaseline) => void;
  onDelete: (id: string) => void;
}

function CategoryGroup({ category, baselines, total, onEdit, onDelete }: CategoryGroupProps) {
  if (baselines.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {categoryIcons[category]}
        <span>{baselineCategoryLabels[category]}</span>
        <Badge variant="secondary" className="ml-auto">{formatCurrency(total)}</Badge>
      </div>
      <div className="space-y-1 pl-6">
        {baselines.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 group"
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm truncate">{b.name}</span>
              {b.effectiveTo && (
                <span className="text-xs text-muted-foreground ml-2">
                  (đến {format(new Date(b.effectiveTo), 'dd/MM/yyyy', { locale: vi })})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{formatCurrency(b.monthlyAmount)}</span>
              <div className="hidden group-hover:flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(b)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(b.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================
// MAIN COMPONENT
// =============================================================

export function FixedCostDefinitionPanel() {
  const { activeBaselines, totalMonthlyFixed, byCategory, categoryTotals, isLoading } = useExpenseBaselines();
  const deleteMutation = useDeleteExpenseBaseline();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBaseline, setEditingBaseline] = useState<ExpenseBaseline | null>(null);

  const handleEdit = (baseline: ExpenseBaseline) => {
    setEditingBaseline(baseline);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa chi phí này?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingBaseline(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Chi phí cố định hàng tháng
            </CardTitle>
            <CardDescription>Lương, thuê mặt bằng, điện nước...</CardDescription>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Thêm
          </Button>
        </div>
        {!isLoading && (
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(totalMonthlyFixed)}
            <span className="text-sm font-normal text-muted-foreground">/tháng</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        ) : activeBaselines.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Chưa có chi phí cố định nào</p>
            <p className="text-sm">Nhấn "Thêm" để định nghĩa chi phí định kỳ</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(['salary', 'rent', 'utilities', 'other'] as BaselineCategory[]).map((cat) => (
              <CategoryGroup
                key={cat}
                category={cat}
                baselines={byCategory[cat]}
                total={categoryTotals[cat]}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <Separator className="my-4" />
        
        <p className="text-xs text-muted-foreground">
          ⓘ Chi phí cố định được sử dụng để dự báo dòng tiền và tính EBITDA. 
          Thay đổi sẽ áp dụng từ ngày hiệu lực.
        </p>
      </CardContent>

      <BaselineDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        baseline={editingBaseline}
      />
    </Card>
  );
}
