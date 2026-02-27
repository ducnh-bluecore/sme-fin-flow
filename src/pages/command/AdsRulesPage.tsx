import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useAdsRules, useSaveAdsRule, useDeleteAdsRule } from '@/hooks/useAdsCommandCenter';

const METRICS = [
  { value: 'roas', label: 'ROAS' },
  { value: 'cpa', label: 'CPA' },
  { value: 'ctr', label: 'CTR' },
  { value: 'spend', label: 'Spend' },
  { value: 'cvr', label: 'CVR' },
  { value: 'acos', label: 'ACOS' },
  { value: 'cpc', label: 'CPC' },
];

const OPERATORS = [
  { value: '<', label: '<' },
  { value: '<=', label: '≤' },
  { value: '>', label: '>' },
  { value: '>=', label: '≥' },
  { value: '=', label: '=' },
];

const RULE_TYPES = [
  { value: 'pause', label: 'Tạm dừng' },
  { value: 'increase_budget', label: 'Tăng Budget' },
  { value: 'decrease_budget', label: 'Giảm Budget' },
  { value: 'scale', label: 'Scale Up' },
  { value: 'kill', label: 'Dừng hẳn' },
];

const PLATFORMS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'meta', label: 'Meta' },
  { value: 'google', label: 'Google' },
  { value: 'shopee', label: 'Shopee' },
];

export default function AdsRulesPage() {
  const { data: rules = [], isLoading } = useAdsRules();
  const saveRule = useSaveAdsRule();
  const deleteRule = useDeleteAdsRule();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rules Engine</h1>
          <p className="text-muted-foreground">Thiết lập quy tắc tự động cho quảng cáo</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Tạo Rule</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tạo Rule mới</DialogTitle>
            </DialogHeader>
            <RuleForm
              onSave={(data) => {
                saveRule.mutate(data, { onSuccess: () => setDialogOpen(false) });
              }}
              isSaving={saveRule.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : rules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Chưa có rule nào. Nhấn "Tạo Rule" để bắt đầu.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên Rule</TableHead>
                  <TableHead>Nền tảng</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Điều kiện</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule: any) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.rule_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{rule.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{RULE_TYPES.find(t => t.value === rule.rule_type)?.label || rule.rule_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                      {(rule.conditions || []).map((c: any) =>
                        `${c.metric} ${c.operator} ${c.value} (${c.lookback_days}d)`
                      ).join(', ')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? 'Bật' : 'Tắt'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRule.mutate(rule.id)}
                        disabled={deleteRule.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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

function RuleForm({ onSave, isSaving }: { onSave: (data: any) => void; isSaving: boolean }) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('all');
  const [ruleType, setRuleType] = useState('pause');
  const [metric, setMetric] = useState('roas');
  const [operator, setOperator] = useState('<');
  const [threshold, setThreshold] = useState('');
  const [lookbackDays, setLookbackDays] = useState('3');
  const [actionValue, setActionValue] = useState('20');
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = () => {
    if (!name || !threshold) return;

    onSave({
      rule_name: name,
      platform,
      rule_type: ruleType,
      conditions: [{
        metric,
        operator,
        value: Number(threshold),
        lookback_days: Number(lookbackDays),
      }],
      actions: {
        action_type: ruleType,
        value: Number(actionValue),
        notify_before_execute: true,
      },
      is_active: isActive,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tên Rule</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Tắt ads ROAS thấp" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nền tảng</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Hành động</Label>
          <Select value={ruleType} onValueChange={setRuleType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-3 bg-muted rounded-lg space-y-3">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Điều kiện</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {METRICS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={operator} onValueChange={setOperator}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="Giá trị" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Lookback (ngày)</Label>
            <Input type="number" value={lookbackDays} onChange={e => setLookbackDays(e.target.value)} />
          </div>
          {(ruleType === 'increase_budget' || ruleType === 'decrease_budget' || ruleType === 'scale') && (
            <div className="space-y-1">
              <Label className="text-xs">Giá trị thay đổi (%)</Label>
              <Input type="number" value={actionValue} onChange={e => setActionValue(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label className="text-sm">Kích hoạt ngay</Label>
        </div>
        <Button onClick={handleSubmit} disabled={isSaving || !name || !threshold}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Lưu Rule
        </Button>
      </div>
    </div>
  );
}
