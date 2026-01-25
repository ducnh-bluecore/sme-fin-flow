import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, X, Sparkles, ChevronDown, Info, Users, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface Scenario {
  name: string;
  // Core LTV levers
  retention_boost: number;
  aov_boost: number;
  discount_adjust: number;
  // Extended parameters
  frequency_boost: number;      // Thay đổi tần suất mua
  churn_reduction: number;      // Giảm tỷ lệ rời bỏ
  margin_adjust: number;        // Thay đổi biên lợi nhuận
  cac_adjust: number;           // Thay đổi chi phí CAC
  // Scope & Horizon
  time_horizon: '6m' | '12m' | '24m';
  population_scope: 'all' | 'top20' | 'at_risk' | 'new_customers' | 'repeat';
}

interface ScenarioBuilderProps {
  scenarios: Scenario[];
  onScenariosChange: (scenarios: Scenario[]) => void;
  maxScenarios?: number;
}

const DEFAULT_SCENARIO: Scenario = {
  name: '',
  retention_boost: 0,
  aov_boost: 0,
  discount_adjust: 0,
  frequency_boost: 0,
  churn_reduction: 0,
  margin_adjust: 0,
  cac_adjust: 0,
  time_horizon: '12m',
  population_scope: 'all',
};

const PRESET_SCENARIOS: Partial<Scenario>[] = [
  { 
    name: 'Tăng Retention 10%', 
    retention_boost: 0.10, 
    churn_reduction: 0.05,
    cac_adjust: 0.05 // Chi phí tăng nhẹ để giữ khách
  },
  { 
    name: 'Tăng AOV 15%', 
    aov_boost: 0.15, 
    margin_adjust: -0.02 // Margin có thể giảm nhẹ do upsell
  },
  { 
    name: 'Tăng tần suất mua', 
    frequency_boost: 0.20, 
    retention_boost: 0.05,
    cac_adjust: 0.03
  },
  { 
    name: 'Tối ưu Combo', 
    retention_boost: 0.08, 
    aov_boost: 0.10, 
    frequency_boost: 0.05,
    discount_adjust: -0.01 
  },
  { 
    name: 'Focus Top 20%', 
    population_scope: 'top20' as const,
    retention_boost: 0.15,
    aov_boost: 0.10
  },
  { 
    name: 'Kịch bản rủi ro', 
    retention_boost: -0.10, 
    aov_boost: -0.05, 
    churn_reduction: -0.15,
    discount_adjust: 0.03 
  },
];

const POPULATION_OPTIONS = [
  { value: 'all', label: 'Tất cả khách hàng' },
  { value: 'top20', label: 'Top 20% (Khách VIP)' },
  { value: 'at_risk', label: 'Khách có nguy cơ rời' },
  { value: 'new_customers', label: 'Khách mới (< 90 ngày)' },
  { value: 'repeat', label: 'Khách mua lại' },
];

const TIME_HORIZON_OPTIONS = [
  { value: '6m', label: '6 tháng' },
  { value: '12m', label: '12 tháng' },
  { value: '24m', label: '24 tháng' },
];

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onChangeCommitted?: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  tooltip?: string;
  icon?: React.ReactNode;
}

function SliderField({ label, value, onChange, onChangeCommitted, min, max, step = 1, tooltip, icon }: SliderFieldProps) {
  const formatPercent = (v: number) => {
    const percent = (v * 100).toFixed(step < 1 ? 1 : 0);
    return v >= 0 ? `+${percent}%` : `${percent}%`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon}
          <Label className="text-xs">{label}</Label>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <span className="text-xs font-medium tabular-nums">{formatPercent(value)}</span>
      </div>
      <Slider
        value={[value * 100]}
        onValueChange={([v]) => onChange(v / 100)}
        onValueCommit={([v]) => onChangeCommitted?.(v / 100)}
        min={min}
        max={max}
        step={step}
        className="cursor-pointer"
      />
    </div>
  );
}

export function ScenarioBuilder({ 
  scenarios, 
  onScenariosChange, 
  maxScenarios = 4 
}: ScenarioBuilderProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  // Local state for immediate slider feedback (no API calls)
  const [localScenarios, setLocalScenarios] = useState<Scenario[]>(scenarios);
  
  // Sync local state when parent scenarios change
  if (scenarios.length !== localScenarios.length) {
    setLocalScenarios(scenarios);
  }

  const addScenario = (preset?: Partial<Scenario>) => {
    if (scenarios.length >= maxScenarios) return;
    
    const newScenario: Scenario = {
      ...DEFAULT_SCENARIO,
      ...preset,
      name: preset?.name || `Kịch bản ${scenarios.length + 1}`,
    };
    
    const updated = [...scenarios, newScenario];
    setLocalScenarios(updated);
    onScenariosChange(updated);
    setExpandedIndex(scenarios.length);
  };

  const removeScenario = (index: number) => {
    const updated = scenarios.filter((_, i) => i !== index);
    setLocalScenarios(updated);
    onScenariosChange(updated);
    if (expandedIndex === index) setExpandedIndex(null);
  };

  // Update local state immediately (no API call)
  const updateLocalScenario = useCallback((index: number, updates: Partial<Scenario>) => {
    setLocalScenarios(prev => 
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  }, []);

  // Commit to parent (triggers API call) only on slider release or select change
  const commitScenario = useCallback((index: number, updates: Partial<Scenario>) => {
    const updated = localScenarios.map((s, i) => (i === index ? { ...s, ...updates } : s));
    setLocalScenarios(updated);
    onScenariosChange(updated);
  }, [localScenarios, onScenariosChange]);

  // For non-slider changes (select, input), update immediately
  const updateScenario = (index: number, updates: Partial<Scenario>) => {
    const updated = localScenarios.map((s, i) => (i === index ? { ...s, ...updates } : s));
    setLocalScenarios(updated);
    onScenariosChange(updated);
  };

  const formatPercent = (value: number) => {
    const percent = (value * 100).toFixed(0);
    return value >= 0 ? `+${percent}%` : `${percent}%`;
  };

  const getPopulationLabel = (scope: string) => {
    return POPULATION_OPTIONS.find(o => o.value === scope)?.label || scope;
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Xây dựng Kịch bản What-If
        </CardTitle>
        <CardDescription>
          Tạo các kịch bản với đầy đủ tham số để so sánh tác động lên Customer Equity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset buttons */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Kịch bản mẫu:</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_SCENARIOS.map((preset, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={scenarios.length >= maxScenarios}
                onClick={() => addScenario(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Active scenarios */}
        {scenarios.length > 0 && (
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Kịch bản đang so sánh:</Label>
            {localScenarios.map((scenario, index) => (
              <Collapsible 
                key={index}
                open={expandedIndex === index}
                onOpenChange={(open) => setExpandedIndex(open ? index : null)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedIndex === index ? 'rotate-180' : ''}`} />
                        <Input
                          value={scenario.name}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateScenario(index, { name: e.target.value });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-7 text-sm font-medium max-w-[160px] border-none bg-transparent p-0 focus-visible:ring-0"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {scenario.time_horizon}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          Ret: {formatPercent(scenario.retention_boost)}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          AOV: {formatPercent(scenario.aov_boost)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeScenario(index);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-3 pb-4 pt-2 border-t bg-muted/30 space-y-5">
                      {/* Scope & Horizon */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-1.5">
                            <Users className="h-3 w-3" />
                            Phạm vi áp dụng
                          </Label>
                          <Select
                            value={scenario.population_scope}
                            onValueChange={(v) => updateScenario(index, { population_scope: v as Scenario['population_scope'] })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {POPULATION_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            Thời gian dự báo
                          </Label>
                          <Select
                            value={scenario.time_horizon}
                            onValueChange={(v) => updateScenario(index, { time_horizon: v as Scenario['time_horizon'] })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_HORIZON_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      {/* Core Levers */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                          <TrendingUp className="h-3 w-3" />
                          Đòn bẩy giá trị khách hàng
                        </p>
                        <div className="grid gap-4">
                          <SliderField
                            label="Retention Rate"
                            value={scenario.retention_boost}
                            onChange={(v) => updateLocalScenario(index, { retention_boost: v })}
                            onChangeCommitted={(v) => commitScenario(index, { retention_boost: v })}
                            min={-30}
                            max={40}
                            tooltip="Tỷ lệ khách hàng quay lại mua sau kỳ đầu tiên"
                          />
                          <SliderField
                            label="AOV (Giá trị đơn TB)"
                            value={scenario.aov_boost}
                            onChange={(v) => updateLocalScenario(index, { aov_boost: v })}
                            onChangeCommitted={(v) => commitScenario(index, { aov_boost: v })}
                            min={-30}
                            max={50}
                            tooltip="Thay đổi giá trị trung bình mỗi đơn hàng"
                          />
                          <SliderField
                            label="Purchase Frequency"
                            value={scenario.frequency_boost}
                            onChange={(v) => updateLocalScenario(index, { frequency_boost: v })}
                            onChangeCommitted={(v) => commitScenario(index, { frequency_boost: v })}
                            min={-30}
                            max={50}
                            tooltip="Số lần mua hàng trung bình trong kỳ"
                          />
                          <SliderField
                            label="Churn Reduction"
                            value={scenario.churn_reduction}
                            onChange={(v) => updateLocalScenario(index, { churn_reduction: v })}
                            onChangeCommitted={(v) => commitScenario(index, { churn_reduction: v })}
                            min={-20}
                            max={30}
                            tooltip="Giảm tỷ lệ khách hàng rời bỏ (churn)"
                          />
                        </div>
                      </div>

                      <Separator className="my-3" />

                      {/* Financial Adjustments */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                          <DollarSign className="h-3 w-3" />
                          Điều chỉnh tài chính
                        </p>
                        <div className="grid gap-4">
                          <SliderField
                            label="Biên lợi nhuận"
                            value={scenario.margin_adjust}
                            onChange={(v) => updateLocalScenario(index, { margin_adjust: v })}
                            onChangeCommitted={(v) => commitScenario(index, { margin_adjust: v })}
                            min={-20}
                            max={20}
                            step={0.5}
                            tooltip="Thay đổi Gross Margin do chi phí hoặc định giá"
                          />
                          <SliderField
                            label="Chi phí CAC"
                            value={scenario.cac_adjust}
                            onChange={(v) => updateLocalScenario(index, { cac_adjust: v })}
                            onChangeCommitted={(v) => commitScenario(index, { cac_adjust: v })}
                            min={-30}
                            max={50}
                            tooltip="Chi phí thu hút/giữ chân khách hàng thay đổi"
                          />
                          <SliderField
                            label="Discount Rate"
                            value={scenario.discount_adjust}
                            onChange={(v) => updateLocalScenario(index, { discount_adjust: v })}
                            onChangeCommitted={(v) => commitScenario(index, { discount_adjust: v })}
                            min={-5}
                            max={10}
                            step={0.5}
                            tooltip="Tỷ lệ chiết khấu dòng tiền tương lai (risk adjustment)"
                          />
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-medium">Tóm tắt kịch bản:</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Đối tượng:</span>
                          <span className="font-medium text-foreground">{getPopulationLabel(scenario.population_scope)}</span>
                          <span>Thời gian:</span>
                          <span className="font-medium text-foreground">{scenario.time_horizon === '6m' ? '6 tháng' : scenario.time_horizon === '12m' ? '12 tháng' : '24 tháng'}</span>
                          <span>Retention:</span>
                          <span className={`font-medium ${scenario.retention_boost >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(scenario.retention_boost)}</span>
                          <span>AOV:</span>
                          <span className={`font-medium ${scenario.aov_boost >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(scenario.aov_boost)}</span>
                          <span>Frequency:</span>
                          <span className={`font-medium ${scenario.frequency_boost >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(scenario.frequency_boost)}</span>
                          <span>CAC:</span>
                          <span className={`font-medium ${scenario.cac_adjust <= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(scenario.cac_adjust)}</span>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Add custom scenario */}
        {scenarios.length < maxScenarios && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => addScenario()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm kịch bản tùy chỉnh
          </Button>
        )}

        {scenarios.length >= maxScenarios && (
          <p className="text-xs text-muted-foreground text-center">
            Đã đạt giới hạn {maxScenarios} kịch bản
          </p>
        )}

        {/* Info note */}
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Lưu ý về ước tính</p>
            <p className="text-amber-700 dark:text-amber-300">
              Kết quả What-If dựa trên mô hình LTV với các giả định. Thực tế có thể khác do yếu tố thị trường và hành vi khách hàng.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
