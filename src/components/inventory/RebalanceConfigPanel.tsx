import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Settings2, Save, Sliders, ToggleLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { useConstraintRegistry, useUpdateConstraint } from '@/hooks/inventory/useConstraintRegistry';
import type { ConstraintItem } from '@/hooks/inventory/useConstraintRegistry';

const CONSTRAINT_META: Record<string, { label: string; tooltip: string; valueKey: string; unit?: string; type: 'number' | 'boolean'; group: 'threshold' | 'advanced' | 'toggle' }> = {
  // Group 1: Ngưỡng & Tham số
  min_cover_weeks: { label: 'Tuần cover tối thiểu', tooltip: 'Store nào có cover < ngưỡng này sẽ được ưu tiên nhận hàng', valueKey: 'weeks', unit: 'tuần', type: 'number', group: 'threshold' },
  max_cover_weeks: { label: 'Tuần cover tối đa (surplus)', tooltip: 'Store nào có cover > ngưỡng này sẽ được coi là thừa hàng, có thể chuyển lateral', valueKey: 'weeks', unit: 'tuần', type: 'number', group: 'threshold' },
  stockout_threshold: { label: 'Ngưỡng sắp hết hàng (P1)', tooltip: 'Store nào có cover < ngưỡng này sẽ được đánh dấu P1 — ưu tiên cao nhất', valueKey: 'weeks', unit: 'tuần', type: 'number', group: 'threshold' },
  min_cntt: { label: 'Tối thiểu giữ lại kho tổng', tooltip: 'Số lượng tối thiểu phải giữ lại tại kho tổng sau khi push', valueKey: 'qty', unit: 'units', type: 'number', group: 'threshold' },
  min_lateral_net_benefit: { label: 'Net benefit tối thiểu (lateral)', tooltip: 'Chỉ đề xuất chuyển ngang khi lợi ích ròng > ngưỡng này', valueKey: 'amount', unit: 'VND', type: 'number', group: 'threshold' },

  // Group 2: Logic phân bổ nâng cao
  use_destination_velocity: { label: 'Tính theo tốc độ bán kho đích', tooltip: 'Khi bật, hệ thống phân bổ hàng dựa trên tốc độ bán thực tế của kho đích — kho bán nhanh hơn sẽ được ưu tiên nhận nhiều hơn', valueKey: 'enabled', type: 'boolean', group: 'advanced' },
  use_catalog_revenue_weight: { label: 'Tính tỷ trọng doanh thu catalog', tooltip: 'Khi bật, hệ thống xếp hạng ưu tiên dựa trên tỷ trọng doanh thu của dòng SP trong catalog — dòng SP chiếm tỷ trọng cao hơn sẽ được ưu tiên phân bổ trước', valueKey: 'enabled', type: 'boolean', group: 'advanced' },
  velocity_lookback_days: { label: 'Số ngày tính tốc độ bán', tooltip: 'Khoảng thời gian nhìn lại để tính tốc độ bán trung bình. 7 ngày = phản ứng nhanh, 30 ngày = ổn định hơn', valueKey: 'days', unit: 'ngày', type: 'number', group: 'advanced' },
  seasonal_safety_factor: { label: 'Hệ số an toàn theo mùa', tooltip: 'Nhân hệ số này với safety stock. VD: 1.5x trong mùa cao điểm = giữ thêm 50% tồn kho an toàn', valueKey: 'factor', unit: 'x', type: 'number', group: 'advanced' },
  priority_weight_customer_orders: { label: 'Trọng số: Đơn khách đặt', tooltip: 'Trọng số ưu tiên cho đơn hàng khách đã đặt (0-100). Càng cao = store có nhiều đơn chờ sẽ được ưu tiên nhận hàng', valueKey: 'weight', unit: '%', type: 'number', group: 'advanced' },
  priority_weight_sales_velocity: { label: 'Trọng số: Tốc độ bán', tooltip: 'Trọng số ưu tiên cho tốc độ bán hàng (0-100). Càng cao = store bán nhanh sẽ được ưu tiên nhận hàng', valueKey: 'weight', unit: '%', type: 'number', group: 'advanced' },
  priority_weight_store_tier: { label: 'Trọng số: Hạng store', tooltip: 'Trọng số ưu tiên cho tier/hạng của store (0-100). Càng cao = store tier cao sẽ được ưu tiên nhận hàng', valueKey: 'weight', unit: '%', type: 'number', group: 'advanced' },
  max_transfer_pct: { label: '% tồn kho tối đa chuyển đi', tooltip: 'Giới hạn % tồn kho tối đa có thể chuyển đi từ 1 store. VD: 60% = store luôn giữ lại ít nhất 40% hàng', valueKey: 'pct', unit: '%', type: 'number', group: 'advanced' },

  // Group 3: Bật/Tắt tính năng
  no_broken_size: { label: 'Không chia lẻ size run', tooltip: 'Khi bật, hệ thống sẽ không chia lẻ các size trong cùng Family Code', valueKey: 'enabled', type: 'boolean', group: 'toggle' },
  lateral_enabled: { label: 'Cho phép chuyển ngang', tooltip: 'Bật/tắt đề xuất chuyển hàng giữa các store với nhau (Phase 2)', valueKey: 'enabled', type: 'boolean', group: 'toggle' },
  push_priority: { label: 'Ưu tiên Push trước Lateral', tooltip: 'Khi bật, hệ thống sẽ push hết từ kho tổng trước, rồi mới lateral', valueKey: 'enabled', type: 'boolean', group: 'toggle' },
};

export function RebalanceConfigPanel() {
  const { data: constraints = [], isLoading } = useConstraintRegistry();
  const updateConstraint = useUpdateConstraint();
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (constraints.length > 0) {
      const vals: Record<string, any> = {};
      constraints.forEach(c => {
        const meta = CONSTRAINT_META[c.constraint_key];
        if (meta) {
          vals[c.id] = c.constraint_value[meta.valueKey];
        }
      });
      setEditValues(vals);
    }
  }, [constraints]);

  const handleSave = (constraint: ConstraintItem) => {
    const meta = CONSTRAINT_META[constraint.constraint_key];
    if (!meta) return;
    
    const newVal = editValues[constraint.id];
    const newConstraintValue = { ...constraint.constraint_value, [meta.valueKey]: meta.type === 'number' ? Number(newVal) : newVal };
    
    updateConstraint.mutate({ id: constraint.id, constraint_value: newConstraintValue });
  };

  const handleToggle = (constraint: ConstraintItem, checked: boolean) => {
    const meta = CONSTRAINT_META[constraint.constraint_key];
    if (!meta) return;

    if (meta.type === 'boolean') {
      const newConstraintValue = { ...constraint.constraint_value, [meta.valueKey]: checked };
      updateConstraint.mutate({ id: constraint.id, constraint_value: newConstraintValue });
    } else {
      updateConstraint.mutate({ id: constraint.id, is_active: checked });
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Đang tải cấu hình...</div>;
  }

  const getGroup = (group: string) => constraints.filter(c => CONSTRAINT_META[c.constraint_key]?.group === group);
  const thresholdConstraints = getGroup('threshold');
  const advancedConstraints = getGroup('advanced');
  const toggleConstraints = getGroup('toggle');

  // Split advanced into number and boolean types
  const advancedNumbers = advancedConstraints.filter(c => CONSTRAINT_META[c.constraint_key]?.type === 'number');
  const advancedBooleans = advancedConstraints.filter(c => CONSTRAINT_META[c.constraint_key]?.type === 'boolean');

  const renderNumberField = (c: ConstraintItem) => {
    const meta = CONSTRAINT_META[c.constraint_key];
    if (!meta) return null;
    const currentVal = editValues[c.id] ?? '';
    const originalVal = c.constraint_value[meta.valueKey];
    const hasChanged = String(currentVal) !== String(originalVal);

    return (
      <div key={c.id} className="flex flex-col gap-1.5 p-3 rounded-lg border border-border">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">{meta.label}</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px] text-xs">{meta.tooltip}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={currentVal}
            onChange={e => setEditValues(prev => ({ ...prev, [c.id]: e.target.value }))}
            className="h-8 w-32"
          />
          {meta.unit && <span className="text-xs text-muted-foreground">{meta.unit}</span>}
          {hasChanged && (
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => handleSave(c)} disabled={updateConstraint.isPending}>
              <Save className="h-3.5 w-3.5" />
              Lưu
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{c.description}</p>
      </div>
    );
  };

  const renderToggleField = (c: ConstraintItem) => {
    const meta = CONSTRAINT_META[c.constraint_key];
    if (!meta) return null;
    const isEnabled = c.constraint_value[meta.valueKey] === true;

    return (
      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium">{meta.label}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] text-xs">{meta.tooltip}</TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground">{c.description}</p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => handleToggle(c, checked)}
          disabled={updateConstraint.isPending}
        />
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Card 1: Ngưỡng & Tham số */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="h-5 w-5" />
              Ngưỡng & Tham số
            </CardTitle>
            <CardDescription>Điều chỉnh các ngưỡng ảnh hưởng đến logic phân bổ và cân bằng kho</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {thresholdConstraints.map(renderNumberField)}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Logic phân bổ nâng cao */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sliders className="h-5 w-5" />
              Logic phân bổ nâng cao
            </CardTitle>
            <CardDescription>Cấu hình thuật toán phân bổ: tốc độ bán, tỷ trọng doanh thu, trọng số ưu tiên, hệ số mùa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Advanced toggles */}
            {advancedBooleans.length > 0 && (
              <div className="grid gap-3">
                {advancedBooleans.map(renderToggleField)}
              </div>
            )}
            {/* Advanced numbers */}
            {advancedNumbers.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {advancedNumbers.map(renderNumberField)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Bật/Tắt tính năng */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ToggleLeft className="h-5 w-5" />
              Bật/Tắt tính năng
            </CardTitle>
            <CardDescription>Điều khiển các tính năng chính của engine phân bổ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {toggleConstraints.map(renderToggleField)}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
