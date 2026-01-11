import { useState, useEffect } from 'react';
import { Loader2, Target, Zap, Clock, Activity, HelpCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  IntelligentAlertRule,
  severityLabels,
  salesChannelLabels,
  SalesChannel,
} from '@/hooks/useIntelligentAlertRules';

// Unit labels in Vietnamese
const unitLabels: Record<string, { singular: string; plural: string; description: string }> = {
  days: { singular: 'ngày', plural: 'ngày', description: 'Số ngày' },
  hours: { singular: 'giờ', plural: 'giờ', description: 'Số giờ' },
  count: { singular: 'đơn vị', plural: 'đơn vị', description: 'Số lượng' },
  percentage: { singular: '%', plural: '%', description: 'Phần trăm' },
  amount: { singular: 'VND', plural: 'VND', description: 'Số tiền' },
  items: { singular: 'sản phẩm', plural: 'sản phẩm', description: 'Số sản phẩm' },
  orders: { singular: 'đơn hàng', plural: 'đơn hàng', description: 'Số đơn hàng' },
  times: { singular: 'lần', plural: 'lần', description: 'Số lần' },
  rate: { singular: '%', plural: '%', description: 'Tỷ lệ' },
};

// Metric labels in Vietnamese
const metricLabels: Record<string, string> = {
  days_of_stock: 'Số ngày tồn kho (dự kiến bán hết sau bao nhiêu ngày)',
  delivery_sla_days: 'Số ngày vượt SLA giao hàng',
  hours_since_confirmed: 'Số giờ kể từ khi xác nhận đơn',
  days_since_return: 'Số ngày kể từ khi đơn hoàn',
  orders_per_hour_ratio: 'Tỷ lệ đơn/giờ so với năng lực (%)',
  shipping_cost_change: 'Mức thay đổi chi phí ship (%)',
  carrier_delay_rate: 'Tỷ lệ giao trễ của ĐVVC (%)',
  days_since_delivered: 'Số ngày kể từ khi giao',
  failed_delivery_rate: 'Tỷ lệ giao thất bại (%)',
  stock_sync_diff: 'Chênh lệch tồn kho',
  dead_stock_days: 'Số ngày hàng không bán được',
  stock_turnover_rate: 'Vòng quay tồn kho',
  return_rate: 'Tỷ lệ hoàn hàng (%)',
  cancel_rate: 'Tỷ lệ hủy đơn (%)',
  daily_revenue: 'Doanh thu ngày',
  margin_percentage: 'Biên lợi nhuận (%)',
  ad_roas: 'ROAS quảng cáo',
  rating_score: 'Điểm đánh giá',
  negative_review_rate: 'Tỷ lệ đánh giá tiêu cực (%)',
  response_time_hours: 'Thời gian phản hồi (giờ)',
  chat_response_time_minutes: 'Thời gian trả lời chat (phút)',
};

// Operator labels in Vietnamese
const operatorLabels: Record<string, string> = {
  less_than: 'nhỏ hơn (<)',
  less_than_or_equal: 'nhỏ hơn hoặc bằng (≤)',
  greater_than: 'lớn hơn (>)',
  greater_than_or_equal: 'lớn hơn hoặc bằng (≥)',
  equals: 'bằng (=)',
  not_equals: 'khác (≠)',
};

// Get threshold explanation based on rule context
function getThresholdExplanation(rule: IntelligentAlertRule): string {
  const config = rule.threshold_config || {};
  const metric = config.metric || '';
  const operator = config.operator || 'less_than';
  const unit = config.unit || 'count';
  const unitInfo = unitLabels[unit] || { singular: '', plural: '', description: 'Giá trị' };
  
  const operatorText = operatorLabels[operator] || operator;
  const metricText = metricLabels[metric] || metric;
  
  return `Khi "${metricText}" ${operatorText} ngưỡng → Kích hoạt cảnh báo`;
}

// Get rule-specific context explanation
function getRuleContextExplanation(rule: IntelligentAlertRule): string {
  const config = rule.threshold_config || {};
  const metric = config.metric || '';
  const unit = config.unit || 'count';
  const unitInfo = unitLabels[unit] || { singular: '', plural: '', description: 'Giá trị' };
  
  // Return metric-based explanation
  if (metricLabels[metric]) {
    return metricLabels[metric];
  }
  
  // Fallback: Generate explanation based on rule code patterns
  const code = rule.rule_code?.toLowerCase() || '';
  
  if (code.includes('stock') || code.includes('inventory') || code.includes('ton_kho')) {
    return `Số ngày tồn kho còn lại trước khi hết hàng. VD: 7 = còn đủ hàng bán trong 7 ngày`;
  }
  if (code.includes('delivery') || code.includes('ship') || code.includes('giao_hang')) {
    return `Thời gian giao hàng (${unitInfo.description.toLowerCase()}). VD: 5 = giao trong 5 ${unitInfo.plural}`;
  }
  if (code.includes('return') || code.includes('hoan')) {
    return `Tỷ lệ hoàn hàng (%). VD: 10 = 10% đơn hàng bị hoàn`;
  }
  if (code.includes('cancel') || code.includes('huy')) {
    return `Tỷ lệ hủy đơn (%). VD: 5 = 5% đơn hàng bị hủy`;
  }
  if (code.includes('rating') || code.includes('review') || code.includes('danh_gia')) {
    return `Điểm đánh giá trung bình (thang 5 sao). VD: 4.0 = rating 4 sao`;
  }
  if (code.includes('margin') || code.includes('profit') || code.includes('loi_nhuan')) {
    return `Biên lợi nhuận (%). VD: 20 = lợi nhuận 20% trên doanh thu`;
  }
  if (code.includes('revenue') || code.includes('doanh_thu')) {
    return `Giá trị doanh thu (VND). VD: 10000000 = 10 triệu đồng`;
  }
  
  // Default based on unit
  return `${unitInfo.description}. Giá trị tính theo: ${unitInfo.plural}`;
}

interface EditRuleParamsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: IntelligentAlertRule | null;
  onSave: (updates: {
    id: string;
    severity?: string;
    priority?: number;
    description?: string;
    threshold_config?: Record<string, any>;
    cooldown_hours?: number;
  }) => void;
  isPending?: boolean;
}

export default function EditRuleParamsDialog({ 
  open, 
  onOpenChange, 
  rule,
  onSave,
  isPending = false,
}: EditRuleParamsDialogProps) {
  const [severity, setSeverity] = useState('warning');
  const [priority, setPriority] = useState(5);
  const [description, setDescription] = useState('');
  const [cooldownHours, setCooldownHours] = useState(4);
  const [thresholdValue, setThresholdValue] = useState<number | undefined>();
  const [thresholdCritical, setThresholdCritical] = useState<number | undefined>();
  const [thresholdWarning, setThresholdWarning] = useState<number | undefined>();

  // Reset form when rule changes
  useEffect(() => {
    if (rule) {
      setSeverity(rule.severity);
      setPriority(rule.priority);
      setDescription(rule.description || '');
      setCooldownHours(rule.cooldown_hours);
      // Read value from threshold_config - can be 'value' (templates) or 'critical/warning' (custom)
      const config = rule.threshold_config || {};
      setThresholdValue(config.value);
      setThresholdCritical(config.critical ?? config.value);
      setThresholdWarning(config.warning ?? (config.value ? config.value * 1.5 : undefined));
    }
  }, [rule]);

  const handleSave = () => {
    if (!rule) return;

    onSave({
      id: rule.id,
      severity,
      priority,
      description,
      cooldown_hours: cooldownHours,
      threshold_config: {
        ...rule.threshold_config,
        value: thresholdCritical, // Update main value
        critical: thresholdCritical,
        warning: thresholdWarning,
      },
    });
  };

  if (!rule) return null;

  const sevConfig = severityLabels[rule.severity];
  const config = rule.threshold_config || {};
  const unit = config.unit || 'count';
  const metric = config.metric || '';
  const operator = config.operator || 'less_than';
  const unitInfo = unitLabels[unit] || { singular: '', plural: '', description: 'Giá trị' };
  const metricText = metricLabels[metric] || metric || 'Giá trị đo lường';
  const operatorText = operatorLabels[operator] || operator;
  const contextExplanation = getRuleContextExplanation(rule);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Chỉnh tham số Rule
          </DialogTitle>
          <DialogDescription>
            Điều chỉnh các tham số cho rule: <strong>{rule.rule_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rule Info */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {rule.rule_code}
              </Badge>
              <Badge variant="secondary" className={sevConfig?.color}>
                {sevConfig?.label}
              </Badge>
            </div>
            {rule.applicable_channels && rule.applicable_channels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {rule.applicable_channels.map((channel) => (
                  <Badge key={channel} variant="outline" className="text-xs">
                    {salesChannelLabels[channel as SalesChannel]}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Severity */}
          <div className="space-y-2">
            <Label>Mức độ nghiêm trọng</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">🔴 Nguy cấp (Critical)</SelectItem>
                <SelectItem value="high">🟠 Cao (High)</SelectItem>
                <SelectItem value="warning">🟡 Cảnh báo (Warning)</SelectItem>
                <SelectItem value="medium">🟢 Trung bình (Medium)</SelectItem>
                <SelectItem value="low">🔵 Thấp (Low)</SelectItem>
                <SelectItem value="info">⚪ Thông tin (Info)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Threshold Explanation Box */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  📊 Metric đang đo:
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  {metricText}
                </p>
                <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                  {contextExplanation}
                </p>
              </div>
            </div>
            <Separator className="bg-blue-200 dark:bg-blue-800" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-600 dark:text-blue-400">Điều kiện:</span>
                <p className="font-medium text-blue-700 dark:text-blue-300">{operatorText}</p>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-400">Đơn vị:</span>
                <p className="font-medium text-blue-700 dark:text-blue-300">{unitInfo.plural}</p>
              </div>
            </div>
          </div>

          {/* Thresholds */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Cấu hình ngưỡng cảnh báo</Label>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Critical Threshold */}
              <div className="space-y-2 p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50/50 dark:bg-red-950/20">
                <Label className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Ngưỡng nguy cấp
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={thresholdCritical ?? ''}
                    onChange={(e) => setThresholdCritical(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder={String(rule.threshold_config?.critical ?? '')}
                    className="border-red-200 dark:border-red-800"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {unitInfo.plural}
                  </span>
                </div>
                <p className="text-xs text-red-600/80 dark:text-red-400/80">
                  Vượt ngưỡng này → Cảnh báo NGUY CẤP
                </p>
              </div>
              
              {/* Warning Threshold */}
              <div className="space-y-2 p-3 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50/50 dark:bg-yellow-950/20">
                <Label className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="h-4 w-4" />
                  Ngưỡng cảnh báo
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={thresholdWarning ?? ''}
                    onChange={(e) => setThresholdWarning(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder={String(rule.threshold_config?.warning ?? '')}
                    className="border-yellow-200 dark:border-yellow-800"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {unitInfo.plural}
                  </span>
                </div>
                <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80">
                  Vượt ngưỡng này → Cảnh báo thường
                </p>
              </div>
            </div>

            {/* Visual Example */}
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-2">📊 Ví dụ cách hoạt động:</p>
              <div className="space-y-1 text-muted-foreground">
                {operator.includes('less') ? (
                  <>
                    <p>
                      • Nếu {metricText} ≤ <span className="text-red-500 font-medium">{thresholdCritical ?? config.value ?? '?'}</span> {unitInfo.plural} 
                      → <span className="text-red-500">🔴 Cảnh báo NGUY CẤP</span>
                    </p>
                    <p>
                      • Nếu {metricText} ≤ <span className="text-yellow-500 font-medium">{thresholdWarning ?? (config.value ? config.value * 1.5 : '?')}</span> {unitInfo.plural} 
                      → <span className="text-yellow-500">🟡 Cảnh báo thường</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      • Nếu {metricText} ≥ <span className="text-red-500 font-medium">{thresholdCritical ?? config.value ?? '?'}</span> {unitInfo.plural} 
                      → <span className="text-red-500">🔴 Cảnh báo NGUY CẤP</span>
                    </p>
                    <p>
                      • Nếu {metricText} ≥ <span className="text-yellow-500 font-medium">{thresholdWarning ?? (config.value ? config.value * 0.7 : '?')}</span> {unitInfo.plural} 
                      → <span className="text-yellow-500">🟡 Cảnh báo thường</span>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Priority */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Độ ưu tiên: {priority}
            </Label>
            <Slider
              value={[priority]}
              onValueChange={([v]) => setPriority(v)}
              min={1}
              max={10}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              1 = Ưu tiên cao nhất (xử lý trước), 10 = Ưu tiên thấp nhất
            </p>
          </div>

          {/* Cooldown */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Thời gian chờ giữa các cảnh báo
            </Label>
            <Select value={String(cooldownHours)} onValueChange={(v) => setCooldownHours(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 giờ</SelectItem>
                <SelectItem value="2">2 giờ</SelectItem>
                <SelectItem value="4">4 giờ</SelectItem>
                <SelectItem value="8">8 giờ</SelectItem>
                <SelectItem value="12">12 giờ</SelectItem>
                <SelectItem value="24">24 giờ</SelectItem>
                <SelectItem value="48">48 giờ</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Tránh gửi cảnh báo liên tục cho cùng một vấn đề
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Mô tả tùy chỉnh</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú thêm về rule này..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
