import { useState, useEffect } from 'react';
import { Loader2, Target, Zap, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  IntelligentAlertRule,
  severityLabels,
  salesChannelLabels,
  SalesChannel,
} from '@/hooks/useIntelligentAlertRules';

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
  const [thresholdCritical, setThresholdCritical] = useState<number | undefined>();
  const [thresholdWarning, setThresholdWarning] = useState<number | undefined>();

  // Reset form when rule changes
  useEffect(() => {
    if (rule) {
      setSeverity(rule.severity);
      setPriority(rule.priority);
      setDescription(rule.description || '');
      setCooldownHours(rule.cooldown_hours);
      setThresholdCritical(rule.threshold_config?.critical);
      setThresholdWarning(rule.threshold_config?.warning);
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
        critical: thresholdCritical,
        warning: thresholdWarning,
      },
    });
  };

  if (!rule) return null;

  const sevConfig = severityLabels[rule.severity];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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

          {/* Thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4 text-red-500" />
                Ngưỡng nguy cấp
              </Label>
              <Input
                type="number"
                value={thresholdCritical ?? ''}
                onChange={(e) => setThresholdCritical(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder={`Mặc định: ${rule.threshold_config?.critical ?? 'N/A'}`}
              />
              {rule.threshold_config?.unit && (
                <p className="text-xs text-muted-foreground">
                  Đơn vị: {rule.threshold_config.unit}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4 text-yellow-500" />
                Ngưỡng cảnh báo
              </Label>
              <Input
                type="number"
                value={thresholdWarning ?? ''}
                onChange={(e) => setThresholdWarning(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder={`Mặc định: ${rule.threshold_config?.warning ?? 'N/A'}`}
              />
            </div>
          </div>

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
              1 = Cao nhất, 10 = Thấp nhất
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
