import { useState, useEffect } from 'react';
import { Loader2, Database, Target, Package, Store, Wallet, Users, Truck, Activity, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAlertDataSources, AlertDataSource } from '@/hooks/useAlertDataSources';
import { useAlertObjects, AlertObject, AlertObjectType } from '@/hooks/useAlertObjects';
import { 
  useIntelligentAlertRules, 
  ruleCategoryLabels, 
  salesChannelLabels, 
  alertGroupLabels,
  SalesChannel,
  AlertGroup 
} from '@/hooks/useIntelligentAlertRules';

// Object type icons mapping
const objectTypeIcons: Record<AlertObjectType, typeof Package> = {
  product: Package,
  order: Truck,
  customer: Users,
  store: Store,
  inventory: Database,
  cashflow: Wallet,
  kpi: Target,
  channel: Activity,
};

const objectTypeLabels: Record<AlertObjectType, string> = {
  product: 'Sản phẩm',
  order: 'Đơn hàng',
  customer: 'Khách hàng',
  store: 'Cửa hàng',
  inventory: 'Tồn kho',
  cashflow: 'Dòng tiền',
  kpi: 'KPI',
  channel: 'Kênh bán',
};

interface CreateRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateRuleDialog({ open, onOpenChange }: CreateRuleDialogProps) {
  const { createRule } = useIntelligentAlertRules();
  const { data: dataSources = [], isLoading: isLoadingDataSources } = useAlertDataSources();
  
  // Form state
  const [formStep, setFormStep] = useState<'basic' | 'target' | 'threshold'>('basic');
  const [newRule, setNewRule] = useState({
    rule_code: '',
    rule_name: '',
    description: '',
    rule_category: 'inventory',
    severity: 'warning',
    applicable_channels: [] as SalesChannel[],
    alert_group: 'general' as AlertGroup,
  });
  
  // Target selection state
  const [selectedObjectType, setSelectedObjectType] = useState<AlertObjectType | ''>('');
  const [applyMode, setApplyMode] = useState<'all' | 'specific'>('all');
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>('');
  
  // Threshold state
  const [thresholdConfig, setThresholdConfig] = useState({
    critical: 0,
    warning: 0,
    operator: 'less_than', // less_than, greater_than, equals, between
    unit: 'count',
  });
  
  // Fetch objects based on selected type and data source
  const { data: alertObjects = [], isLoading: isLoadingObjects } = useAlertObjects({
    object_type: selectedObjectType || undefined,
    data_source_id: selectedDataSourceId || undefined,
    is_monitored: true,
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormStep('basic');
      setNewRule({
        rule_code: '',
        rule_name: '',
        description: '',
        rule_category: 'inventory',
        severity: 'warning',
        applicable_channels: [],
        alert_group: 'general',
      });
      setSelectedObjectType('');
      setApplyMode('all');
      setSelectedObjectIds([]);
      setSelectedDataSourceId('');
      setThresholdConfig({
        critical: 0,
        warning: 0,
        operator: 'less_than',
        unit: 'count',
      });
    }
  }, [open]);

  // Toggle channel selection
  const toggleChannel = (channel: SalesChannel) => {
    setNewRule(prev => ({
      ...prev,
      applicable_channels: prev.applicable_channels.includes(channel)
        ? prev.applicable_channels.filter(c => c !== channel)
        : [...prev.applicable_channels, channel]
    }));
  };

  // Toggle object selection
  const toggleObjectSelection = (objectId: string) => {
    setSelectedObjectIds(prev => 
      prev.includes(objectId) 
        ? prev.filter(id => id !== objectId) 
        : [...prev, objectId]
    );
  };

  // Select all objects
  const selectAllObjects = () => {
    setSelectedObjectIds(alertObjects.map(obj => obj.id));
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedObjectIds([]);
  };

  // Validate current step
  const validateStep = (step: string): boolean => {
    switch (step) {
      case 'basic':
        if (!newRule.rule_code || !newRule.rule_name) {
          toast.error('Vui lòng nhập mã và tên rule');
          return false;
        }
        return true;
      case 'target':
        if (!selectedObjectType) {
          toast.error('Vui lòng chọn loại đối tượng');
          return false;
        }
        if (applyMode === 'specific' && selectedObjectIds.length === 0) {
          toast.error('Vui lòng chọn ít nhất một đối tượng');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  // Handle step navigation
  const goToNextStep = () => {
    if (formStep === 'basic' && validateStep('basic')) {
      setFormStep('target');
    } else if (formStep === 'target' && validateStep('target')) {
      setFormStep('threshold');
    }
  };

  const goToPrevStep = () => {
    if (formStep === 'threshold') setFormStep('target');
    else if (formStep === 'target') setFormStep('basic');
  };

  // Handle submit
  const handleSubmit = () => {
    if (!validateStep('target')) return;

    // Build calculation formula with target info
    const calculationFormula = JSON.stringify({
      type: 'threshold_check',
      object_type: selectedObjectType,
      apply_mode: applyMode,
      target_object_ids: applyMode === 'specific' ? selectedObjectIds : [],
      data_source_id: selectedDataSourceId || null,
    });

    createRule.mutate({
      rule_code: newRule.rule_code,
      rule_name: newRule.rule_name,
      description: newRule.description,
      rule_category: newRule.rule_category,
      severity: newRule.severity,
      applicable_channels: newRule.applicable_channels,
      alert_group: newRule.alert_group,
      threshold_config: thresholdConfig,
      calculation_formula: calculationFormula,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Tạo Rule cảnh báo mới</DialogTitle>
          <DialogDescription>
            Thiết lập quy tắc cảnh báo với nguồn dữ liệu và đối tượng giám sát
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {['basic', 'target', 'threshold'].map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  formStep === step 
                    ? 'bg-primary text-primary-foreground' 
                    : idx < ['basic', 'target', 'threshold'].indexOf(formStep)
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {idx < ['basic', 'target', 'threshold'].indexOf(formStep) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < 2 && (
                <div className={`w-12 h-0.5 ${
                  idx < ['basic', 'target', 'threshold'].indexOf(formStep) 
                    ? 'bg-green-500' 
                    : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-8 text-xs text-muted-foreground mb-2">
          <span>Thông tin cơ bản</span>
          <span>Chọn đối tượng</span>
          <span>Ngưỡng cảnh báo</span>
        </div>

        <Separator />

        {/* Form Content */}
        <ScrollArea className="flex-1 pr-4">
          <div className="py-4 space-y-4">
            {/* Step 1: Basic Info */}
            {formStep === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mã rule *</Label>
                    <Input
                      value={newRule.rule_code}
                      onChange={(e) => setNewRule(prev => ({ 
                        ...prev, 
                        rule_code: e.target.value.toUpperCase().replace(/\s/g, '_') 
                      }))}
                      placeholder="VD: LOW_STOCK_ALERT"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mức độ *</Label>
                    <Select 
                      value={newRule.severity} 
                      onValueChange={(v) => setNewRule(prev => ({ ...prev, severity: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">🔴 Nguy cấp</SelectItem>
                        <SelectItem value="high">🟠 Cao</SelectItem>
                        <SelectItem value="warning">🟡 Cảnh báo</SelectItem>
                        <SelectItem value="medium">🟢 Trung bình</SelectItem>
                        <SelectItem value="low">🔵 Thấp</SelectItem>
                        <SelectItem value="info">⚪ Thông tin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tên rule *</Label>
                  <Input
                    value={newRule.rule_name}
                    onChange={(e) => setNewRule(prev => ({ ...prev, rule_name: e.target.value }))}
                    placeholder="VD: Cảnh báo tồn kho thấp"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Danh mục *</Label>
                    <Select 
                      value={newRule.rule_category} 
                      onValueChange={(v) => setNewRule(prev => ({ ...prev, rule_category: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ruleCategoryLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nhóm cảnh báo</Label>
                    <Select 
                      value={newRule.alert_group} 
                      onValueChange={(v) => setNewRule(prev => ({ ...prev, alert_group: v as AlertGroup }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(alertGroupLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea
                    value={newRule.description}
                    onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Mô tả chi tiết về rule này..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kênh áp dụng</Label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(salesChannelLabels) as [SalesChannel, string][]).map(([key, label]) => (
                      <Badge
                        key={key}
                        variant={newRule.applicable_channels.includes(key) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleChannel(key)}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Không chọn = áp dụng cho tất cả kênh
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Target Selection */}
            {formStep === 'target' && (
              <div className="space-y-4">
                {/* Data Source Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Nguồn dữ liệu
                  </Label>
                  <Select 
                    value={selectedDataSourceId} 
                    onValueChange={setSelectedDataSourceId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nguồn dữ liệu (tùy chọn)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tất cả nguồn</SelectItem>
                      {dataSources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {source.source_type}
                            </Badge>
                            {source.source_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isLoadingDataSources && (
                    <p className="text-xs text-muted-foreground">Đang tải nguồn dữ liệu...</p>
                  )}
                </div>

                <Separator />

                {/* Object Type Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Loại đối tượng giám sát *
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.entries(objectTypeLabels) as [AlertObjectType, string][]).map(([type, label]) => {
                      const Icon = objectTypeIcons[type];
                      const isSelected = selectedObjectType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setSelectedObjectType(type);
                            setSelectedObjectIds([]);
                          }}
                          className={`p-3 rounded-lg border text-center transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/10 text-primary' 
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }`}
                        >
                          <Icon className="h-5 w-5 mx-auto mb-1" />
                          <span className="text-xs font-medium">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedObjectType && (
                  <>
                    <Separator />

                    {/* Apply Mode */}
                    <div className="space-y-3">
                      <Label>Phạm vi áp dụng</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="applyMode"
                            checked={applyMode === 'all'}
                            onChange={() => setApplyMode('all')}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Tất cả {objectTypeLabels[selectedObjectType]}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="applyMode"
                            checked={applyMode === 'specific'}
                            onChange={() => setApplyMode('specific')}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Chọn cụ thể</span>
                        </label>
                      </div>
                    </div>

                    {/* Specific Object Selection */}
                    {applyMode === 'specific' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Chọn đối tượng ({selectedObjectIds.length} đã chọn)</Label>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={selectAllObjects}>
                              Chọn tất cả
                            </Button>
                            <Button variant="outline" size="sm" onClick={clearAllSelections}>
                              Bỏ chọn
                            </Button>
                          </div>
                        </div>
                        
                        {isLoadingObjects ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : alertObjects.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Chưa có đối tượng nào thuộc loại này</p>
                            <p className="text-xs mt-1">
                              Hãy thêm đối tượng giám sát tại trang "Đối tượng cảnh báo"
                            </p>
                          </div>
                        ) : (
                          <div className="border rounded-lg max-h-48 overflow-y-auto">
                            {alertObjects.map((obj) => (
                              <label
                                key={obj.id}
                                className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                                  selectedObjectIds.includes(obj.id) ? 'bg-primary/5' : ''
                                }`}
                              >
                                <Checkbox
                                  checked={selectedObjectIds.includes(obj.id)}
                                  onCheckedChange={() => toggleObjectSelection(obj.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{obj.object_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {obj.external_id && `ID: ${obj.external_id}`}
                                    {obj.object_category && ` • ${obj.object_category}`}
                                  </p>
                                </div>
                                <Badge 
                                  variant={obj.alert_status === 'normal' ? 'secondary' : 'destructive'}
                                  className="text-xs"
                                >
                                  {obj.alert_status}
                                </Badge>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 3: Threshold Config */}
            {formStep === 'threshold' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Điều kiện kích hoạt</Label>
                  <Select 
                    value={thresholdConfig.operator} 
                    onValueChange={(v) => setThresholdConfig(prev => ({ ...prev, operator: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="less_than">Nhỏ hơn (&lt;)</SelectItem>
                      <SelectItem value="less_than_or_equal">Nhỏ hơn hoặc bằng (≤)</SelectItem>
                      <SelectItem value="greater_than">Lớn hơn (&gt;)</SelectItem>
                      <SelectItem value="greater_than_or_equal">Lớn hơn hoặc bằng (≥)</SelectItem>
                      <SelectItem value="equals">Bằng (=)</SelectItem>
                      <SelectItem value="not_equals">Khác (≠)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Đơn vị</Label>
                  <Select 
                    value={thresholdConfig.unit} 
                    onValueChange={(v) => setThresholdConfig(prev => ({ ...prev, unit: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Số lượng</SelectItem>
                      <SelectItem value="percentage">Phần trăm (%)</SelectItem>
                      <SelectItem value="amount">Số tiền (VND)</SelectItem>
                      <SelectItem value="days">Số ngày</SelectItem>
                      <SelectItem value="hours">Số giờ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-red-500">Ngưỡng nguy cấp (Critical)</Label>
                    <Input
                      type="number"
                      value={thresholdConfig.critical}
                      onChange={(e) => setThresholdConfig(prev => ({ 
                        ...prev, 
                        critical: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-yellow-500">Ngưỡng cảnh báo (Warning)</Label>
                    <Input
                      type="number"
                      value={thresholdConfig.warning}
                      onChange={(e) => setThresholdConfig(prev => ({ 
                        ...prev, 
                        warning: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <Label className="text-sm font-medium">Xem trước điều kiện:</Label>
                  <p className="text-sm text-muted-foreground">
                    {applyMode === 'all' 
                      ? `Tất cả ${objectTypeLabels[selectedObjectType as AlertObjectType] || 'đối tượng'}` 
                      : `${selectedObjectIds.length} đối tượng đã chọn`}
                    {' '}có giá trị{' '}
                    <span className="font-medium">
                      {thresholdConfig.operator === 'less_than' && '< '}
                      {thresholdConfig.operator === 'less_than_or_equal' && '≤ '}
                      {thresholdConfig.operator === 'greater_than' && '> '}
                      {thresholdConfig.operator === 'greater_than_or_equal' && '≥ '}
                      {thresholdConfig.operator === 'equals' && '= '}
                      {thresholdConfig.operator === 'not_equals' && '≠ '}
                      {thresholdConfig.warning}
                      {thresholdConfig.unit === 'percentage' && '%'}
                      {thresholdConfig.unit === 'amount' && ' VND'}
                      {thresholdConfig.unit === 'days' && ' ngày'}
                      {thresholdConfig.unit === 'hours' && ' giờ'}
                    </span>
                    {' '}→ Cảnh báo
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {formStep !== 'basic' && (
              <Button variant="outline" onClick={goToPrevStep}>
                Quay lại
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            {formStep !== 'threshold' ? (
              <Button onClick={goToNextStep}>
                Tiếp theo
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={createRule.isPending}>
                {createRule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Tạo rule
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
