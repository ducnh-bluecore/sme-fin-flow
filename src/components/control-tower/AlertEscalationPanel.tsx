import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  ArrowUpCircle, 
  Clock, 
  Users, 
  Mail,
  MessageSquare,
  Smartphone,
  Plus,
  Trash2,
  Edit2,
  Save,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useEscalationRules, useDigestConfig, EscalationRule } from '@/hooks/useAlertEscalation';
import { Skeleton } from '@/components/ui/skeleton';

const severityConfig = {
  critical: { label: 'Nguy cấp', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  warning: { label: 'Cảnh báo', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  info: { label: 'Thông tin', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
};

const roleOptions = [
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'manager', label: 'Quản lý' },
  { value: 'operations', label: 'Vận hành' },
  { value: 'warehouse', label: 'Kho' },
  { value: 'customer_service', label: 'CSKH' },
  { value: 'finance', label: 'Tài chính' },
];

const channelOptions = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'push', label: 'Push', icon: Bell },
  { value: 'sms', label: 'SMS', icon: Smartphone },
  { value: 'slack', label: 'Slack', icon: MessageSquare },
];

function EscalationRuleCard({ rule, onEdit, onDelete, onToggle }: {
  rule: EscalationRule;
  onEdit: (rule: EscalationRule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const severity = severityConfig[rule.severity];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={`bg-slate-900/50 border-slate-800/50 ${!rule.is_active ? 'opacity-60' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${severity.bg}`}>
                <ArrowUpCircle className={`h-5 w-5 ${severity.color}`} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">{rule.name}</h4>
                <Badge className={`${severity.bg} ${severity.color} border ${severity.border} text-xs mt-1`}>
                  {severity.label}
                </Badge>
              </div>
            </div>
            <Switch 
              checked={rule.is_active} 
              onCheckedChange={(checked) => onToggle(rule.id, checked)}
            />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="h-4 w-4" />
              <span>Leo thang sau: <strong className="text-slate-200">{rule.escalate_after_minutes} phút</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="h-4 w-4" />
              <span>Đến: <strong className="text-slate-200">{roleOptions.find(r => r.value === rule.escalate_to_role)?.label || rule.escalate_to_role}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Bell className="h-4 w-4" />
              <div className="flex gap-1">
                {rule.notify_channels.map(channel => {
                  const ch = channelOptions.find(c => c.value === channel);
                  return ch ? (
                    <Badge key={channel} variant="outline" className="text-xs">
                      {ch.label}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/50">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs text-slate-400 hover:text-slate-200"
              onClick={() => onEdit(rule)}
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Sửa
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => onDelete(rule.id)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Xóa
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface DigestConfigLocal {
  daily_enabled: boolean;
  daily_time: string;
  weekly_enabled: boolean;
  weekly_day: number;
  weekly_time: string;
  include_resolved: boolean;
  include_summary: boolean;
}

function DigestSettingsCard({ config, onSave, isSaving }: {
  config: DigestConfigLocal;
  onSave: (config: DigestConfigLocal) => void;
  isSaving?: boolean;
}) {
  const [localConfig, setLocalConfig] = useState(config);

  return (
    <Card className="bg-slate-900/50 border-slate-800/50">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Mail className="h-5 w-5 text-amber-400" />
          Tổng hợp cảnh báo (Digest)
        </CardTitle>
        <CardDescription className="text-slate-400">
          Cấu hình gửi email tổng hợp cảnh báo định kỳ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Daily Digest */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200">Tổng hợp hàng ngày</Label>
              <p className="text-xs text-slate-500">Gửi email tổng hợp mỗi ngày</p>
            </div>
            <Switch 
              checked={localConfig.daily_enabled}
              onCheckedChange={(checked) => setLocalConfig({ ...localConfig, daily_enabled: checked })}
            />
          </div>
          {localConfig.daily_enabled && (
            <div className="flex items-center gap-2 ml-4">
              <Label className="text-sm text-slate-400">Gửi lúc:</Label>
              <Input 
                type="time" 
                value={localConfig.daily_time}
                onChange={(e) => setLocalConfig({ ...localConfig, daily_time: e.target.value })}
                className="w-28 bg-slate-800/50 border-slate-700"
              />
            </div>
          )}
        </div>

        <Separator className="bg-slate-800" />

        {/* Weekly Digest */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200">Tổng hợp hàng tuần</Label>
              <p className="text-xs text-slate-500">Gửi email tổng hợp mỗi tuần</p>
            </div>
            <Switch 
              checked={localConfig.weekly_enabled}
              onCheckedChange={(checked) => setLocalConfig({ ...localConfig, weekly_enabled: checked })}
            />
          </div>
          {localConfig.weekly_enabled && (
            <div className="flex items-center gap-2 ml-4">
              <Select 
                value={String(localConfig.weekly_day)}
                onValueChange={(v) => setLocalConfig({ ...localConfig, weekly_day: parseInt(v) })}
              >
                <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="1">Thứ 2</SelectItem>
                  <SelectItem value="2">Thứ 3</SelectItem>
                  <SelectItem value="3">Thứ 4</SelectItem>
                  <SelectItem value="4">Thứ 5</SelectItem>
                  <SelectItem value="5">Thứ 6</SelectItem>
                  <SelectItem value="6">Thứ 7</SelectItem>
                  <SelectItem value="0">Chủ nhật</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                type="time" 
                value={localConfig.weekly_time}
                onChange={(e) => setLocalConfig({ ...localConfig, weekly_time: e.target.value })}
                className="w-28 bg-slate-800/50 border-slate-700"
              />
            </div>
          )}
        </div>

        <Separator className="bg-slate-800" />

        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-200">Bao gồm cảnh báo đã xử lý</Label>
            <Switch 
              checked={localConfig.include_resolved}
              onCheckedChange={(checked) => setLocalConfig({ ...localConfig, include_resolved: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-slate-200">Bao gồm thống kê tổng hợp</Label>
            <Switch 
              checked={localConfig.include_summary}
              onCheckedChange={(checked) => setLocalConfig({ ...localConfig, include_summary: checked })}
            />
          </div>
        </div>

        <Button 
          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          onClick={() => onSave(localConfig)}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Lưu cài đặt
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AlertEscalationPanel() {
  const { rules, isLoading, createRule, updateRule, deleteRule, toggleRule } = useEscalationRules();
  const { config: digestConfig, isLoading: digestLoading, saveConfig } = useDigestConfig();
  
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState<Partial<EscalationRule>>({
    name: '',
    severity: 'warning',
    escalate_after_minutes: 30,
    escalate_to_role: 'manager',
    notify_channels: ['email', 'push'],
    is_active: true,
  });

  const handleSaveDigest = (config: DigestConfigLocal) => {
    saveConfig.mutate(config);
  };

  const handleToggleRule = (id: string, active: boolean) => {
    toggleRule.mutate({ id, is_active: active });
  };

  const handleDeleteRule = (id: string) => {
    deleteRule.mutate(id);
  };

  const handleSaveRule = () => {
    const ruleData = {
      name: currentRule.name || '',
      severity: currentRule.severity || 'warning',
      escalate_after_minutes: currentRule.escalate_after_minutes || 30,
      escalate_to_role: currentRule.escalate_to_role || 'manager',
      notify_channels: currentRule.notify_channels || ['email', 'push'],
      is_active: currentRule.is_active !== false,
    };

    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, ...ruleData });
    } else {
      createRule.mutate(ruleData as any);
    }
    
    setIsDialogOpen(false);
    setEditingRule(null);
    setNewRule({
      name: '',
      severity: 'warning',
      escalate_after_minutes: 30,
      escalate_to_role: 'manager',
      notify_channels: ['email', 'push'],
      is_active: true,
    });
  };

  const currentRule = editingRule || newRule;
  const setCurrentRule = editingRule ? setEditingRule : setNewRule as any;
  
  const defaultDigestConfig: DigestConfigLocal = {
    daily_enabled: digestConfig?.daily_enabled ?? true,
    daily_time: typeof digestConfig?.daily_time === 'string' ? digestConfig.daily_time : '08:00',
    weekly_enabled: digestConfig?.weekly_enabled ?? true,
    weekly_day: digestConfig?.weekly_day ?? 1,
    weekly_time: typeof digestConfig?.weekly_time === 'string' ? digestConfig.weekly_time : '09:00',
    include_resolved: digestConfig?.include_resolved ?? true,
    include_summary: digestConfig?.include_summary ?? true,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-amber-400" />
            Quy tắc leo thang & Tổng hợp
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Cấu hình tự động leo thang cảnh báo và gửi báo cáo định kỳ
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Thêm quy tắc
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-slate-100">
                {editingRule ? 'Sửa quy tắc' : 'Thêm quy tắc leo thang'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Tên quy tắc</Label>
                <Input
                  value={currentRule.name || ''}
                  onChange={(e) => setCurrentRule({ ...currentRule, name: e.target.value })}
                  placeholder="VD: Critical - Báo ngay"
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Áp dụng cho mức độ</Label>
                <Select 
                  value={currentRule.severity}
                  onValueChange={(v) => setCurrentRule({ ...currentRule, severity: v as any })}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="critical">Nguy cấp (Critical)</SelectItem>
                    <SelectItem value="warning">Cảnh báo (Warning)</SelectItem>
                    <SelectItem value="info">Thông tin (Info)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Leo thang sau (phút)</Label>
                <Input
                  type="number"
                  value={currentRule.escalate_after_minutes || 30}
                  onChange={(e) => setCurrentRule({ ...currentRule, escalate_after_minutes: parseInt(e.target.value) })}
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Leo thang đến</Label>
                <Select 
                  value={currentRule.escalate_to_role}
                  onValueChange={(v) => setCurrentRule({ ...currentRule, escalate_to_role: v })}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {roleOptions.map(role => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Kênh thông báo</Label>
                <div className="flex flex-wrap gap-2">
                  {channelOptions.map(channel => (
                    <Button
                      key={channel.value}
                      type="button"
                      variant={currentRule.notify_channels?.includes(channel.value) ? 'default' : 'outline'}
                      size="sm"
                      className={currentRule.notify_channels?.includes(channel.value) ? 'bg-amber-500 hover:bg-amber-600' : 'border-slate-700'}
                      onClick={() => {
                        const channels = currentRule.notify_channels || [];
                        if (channels.includes(channel.value)) {
                          setCurrentRule({ ...currentRule, notify_channels: channels.filter(c => c !== channel.value) });
                        } else {
                          setCurrentRule({ ...currentRule, notify_channels: [...channels, channel.value] });
                        }
                      }}
                    >
                      <channel.icon className="h-3 w-3 mr-1" />
                      {channel.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button 
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleSaveRule}
              >
                <Save className="h-4 w-4 mr-2" />
                {editingRule ? 'Cập nhật' : 'Tạo quy tắc'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Escalation Rules */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Quy tắc leo thang
          </h3>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-slate-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : rules && rules.length > 0 ? (
            <div className="space-y-4">
              {rules.map(rule => (
                <EscalationRuleCard
                  key={rule.id}
                  rule={rule}
                  onEdit={(r) => {
                    setEditingRule(r);
                    setIsDialogOpen(true);
                  }}
                  onDelete={handleDeleteRule}
                  onToggle={handleToggleRule}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-slate-900/50 border-slate-800/50 p-8 text-center">
              <ArrowUpCircle className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">Chưa có quy tắc</h3>
              <p className="text-sm text-slate-500">Thêm quy tắc để tự động leo thang cảnh báo</p>
            </Card>
          )}
        </div>

        {/* Digest Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Cài đặt tổng hợp
          </h3>
          {digestLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <DigestSettingsCard 
              config={defaultDigestConfig} 
              onSave={handleSaveDigest} 
              isSaving={saveConfig.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}
