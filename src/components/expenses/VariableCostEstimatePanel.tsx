/**
 * VariableCostEstimatePanel - UI for managing variable cost estimates
 * 
 * Allows CFO to enter monthly budget estimates for variable costs
 * like marketing and logistics, then track actual vs estimated.
 */

import { useState, useMemo } from 'react';
import { Plus, RefreshCw, Lock, TrendingUp, TrendingDown, AlertTriangle, Check } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useExpenseEstimates,
  useCreateExpenseEstimate,
  useUpdateExpenseEstimate,
  useLockExpenseEstimate,
  EstimateCategory,
  ExpenseEstimate,
  estimateCategoryLabels,
  channelLabels,
} from '@/hooks/useExpenseEstimates';

// =============================================================
// MONTH PICKER
// =============================================================

interface MonthPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

function MonthPicker({ value, onChange }: MonthPickerProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(subMonths(value, 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[100px] text-center">
        {format(value, 'MMMM yyyy', { locale: vi })}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(addMonths(value, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// =============================================================
// ADD ESTIMATE DIALOG
// =============================================================

interface AddEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
}

function AddEstimateDialog({ open, onOpenChange, year, month }: AddEstimateDialogProps) {
  const createMutation = useCreateExpenseEstimate();
  
  const [formData, setFormData] = useState({
    category: 'marketing' as EstimateCategory,
    channel: 'shopee',
    estimatedAmount: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createMutation.mutateAsync({
      year,
      month,
      category: formData.category,
      channel: formData.channel || null,
      estimatedAmount: parseFloat(formData.estimatedAmount) || 0,
      notes: formData.notes || null,
    });
    
    setFormData({ category: 'marketing', channel: 'shopee', estimatedAmount: '', notes: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Thêm tạm tính chi phí</DialogTitle>
          <DialogDescription>
            Nhập ngân sách dự kiến cho tháng {month}/{year}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Loại chi phí</Label>
            <Select
              value={formData.category}
              onValueChange={(v) => setFormData(d => ({ ...d, category: v as EstimateCategory }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(estimateCategoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.category === 'marketing' && (
            <div className="space-y-2">
              <Label>Kênh</Label>
              <Select
                value={formData.channel}
                onValueChange={(v) => setFormData(d => ({ ...d, channel: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(channelLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Số tiền tạm tính (₫)</Label>
            <Input
              type="number"
              value={formData.estimatedAmount}
              onChange={(e) => setFormData(d => ({ ...d, estimatedAmount: e.target.value }))}
              placeholder="200000000"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Đang lưu...' : 'Thêm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================
// ESTIMATE ROW
// =============================================================

interface EstimateRowProps {
  estimate: ExpenseEstimate;
  onUpdateActual: (id: string, amount: number) => void;
}

function EstimateRow({ estimate, onUpdateActual }: EstimateRowProps) {
  const [editing, setEditing] = useState(false);
  const [actualValue, setActualValue] = useState(estimate.actualAmount?.toString() || '');

  const variancePercent = estimate.estimatedAmount > 0 && estimate.actualAmount !== null
    ? ((estimate.actualAmount - estimate.estimatedAmount) / estimate.estimatedAmount) * 100
    : null;

  const handleSave = () => {
    onUpdateActual(estimate.id, parseFloat(actualValue) || 0);
    setEditing(false);
  };

  const channelLabel = estimate.channel ? channelLabels[estimate.channel] || estimate.channel : 'Tổng';

  return (
    <TableRow>
      <TableCell className="font-medium">{channelLabel}</TableCell>
      <TableCell className="text-right">{formatCurrency(estimate.estimatedAmount)}</TableCell>
      <TableCell className="text-right">
        {editing ? (
          <div className="flex items-center gap-1 justify-end">
            <Input
              type="number"
              value={actualValue}
              onChange={(e) => setActualValue(e.target.value)}
              className="w-32 h-7 text-right"
              autoFocus
            />
            <Button size="icon" className="h-7 w-7" onClick={handleSave}>
              <Check className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span
            className={cn(
              "cursor-pointer hover:underline",
              estimate.actualAmount === null && "text-muted-foreground italic"
            )}
            onClick={() => setEditing(true)}
          >
            {estimate.actualAmount !== null ? formatCurrency(estimate.actualAmount) : 'Nhập số thực'}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {variancePercent !== null && (
          <div className={cn(
            "flex items-center justify-end gap-1",
            variancePercent > 10 ? "text-destructive" :
            variancePercent > 0 ? "text-amber-500" :
            "text-green-600"
          )}>
            {variancePercent > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%</span>
            {Math.abs(variancePercent) > 10 && <AlertTriangle className="h-3 w-3" />}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

// =============================================================
// MAIN COMPONENT
// =============================================================

export function VariableCostEstimatePanel() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  const {
    estimates,
    totalEstimated,
    totalActual,
    totalVariance,
    variancePercent,
    byCategory,
    dataCompleteness,
    isLoading,
  } = useExpenseEstimates(year, month);

  const updateMutation = useUpdateExpenseEstimate();
  const lockMutation = useLockExpenseEstimate();
  
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleUpdateActual = async (id: string, amount: number) => {
    await updateMutation.mutateAsync({ id, actualAmount: amount });
  };

  const marketingEstimates = byCategory.marketing;
  const logisticsEstimates = byCategory.logistics;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tạm tính chi phí biến đổi
            </CardTitle>
            <CardDescription>Marketing, vận chuyển theo tháng</CardDescription>
          </div>
          <MonthPicker value={selectedDate} onChange={setSelectedDate} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : estimates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Chưa có tạm tính cho tháng này</p>
            <Button size="sm" className="mt-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Thêm tạm tính
            </Button>
          </div>
        ) : (
          <>
            {/* Marketing Section */}
            {marketingEstimates.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="secondary">Marketing</Badge>
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kênh</TableHead>
                      <TableHead className="text-right">Tạm tính</TableHead>
                      <TableHead className="text-right">Thực tế</TableHead>
                      <TableHead className="text-right">Chênh lệch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketingEstimates.map((est) => (
                      <EstimateRow
                        key={est.id}
                        estimate={est}
                        onUpdateActual={handleUpdateActual}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Logistics Section */}
            {logisticsEstimates.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="secondary">Vận chuyển</Badge>
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loại</TableHead>
                      <TableHead className="text-right">Tạm tính</TableHead>
                      <TableHead className="text-right">Thực tế</TableHead>
                      <TableHead className="text-right">Chênh lệch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logisticsEstimates.map((est) => (
                      <EstimateRow
                        key={est.id}
                        estimate={est}
                        onUpdateActual={handleUpdateActual}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Summary */}
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tổng biến phí:</span>
              <div className="flex items-center gap-4">
                <span>Tạm tính <strong>{formatCurrency(totalEstimated)}</strong></span>
                <span>Thực tế <strong>{formatCurrency(totalActual)}</strong></span>
                <Badge variant={variancePercent > 10 ? 'destructive' : variancePercent > 0 ? 'secondary' : 'default'}>
                  {variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%
                </Badge>
              </div>
            </div>

            {/* Data Completeness */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Mức độ hoàn thành dữ liệu</span>
                <span>{dataCompleteness.toFixed(0)}%</span>
              </div>
              <Progress value={dataCompleteness} className="h-1" />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Thêm
              </Button>
              <Button variant="outline" size="sm" disabled>
                <RefreshCw className="h-4 w-4 mr-1" />
                Đồng bộ thực tế
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Lock className="h-4 w-4 mr-1" />
                Khóa tháng
              </Button>
            </div>
          </>
        )}

        <Separator />
        <p className="text-xs text-muted-foreground">
          ⚠ Chênh lệch &gt;10% được đánh dấu cảnh báo • ✓ Chênh lệch ≤10% được đánh dấu OK
        </p>
      </CardContent>

      <AddEstimateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        year={year}
        month={month}
      />
    </Card>
  );
}
