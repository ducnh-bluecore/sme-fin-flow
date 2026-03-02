import { useState } from 'react';
import { Pencil, Save, X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface TierRange {
  max_fc: number;
  tiers: string[];
}

interface RecallTierRulesEditorProps {
  constraintId: string;
  currentValue: { ranges: TierRange[] };
  onSave: (id: string, newValue: any) => Promise<void>;
}

const ALL_TIERS = ['S', 'A', 'B', 'C'];

export default function RecallTierRulesEditor({ constraintId, currentValue, onSave }: RecallTierRulesEditorProps) {
  const [editing, setEditing] = useState(false);
  const [ranges, setRanges] = useState<TierRange[]>(currentValue?.ranges || []);
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setRanges(JSON.parse(JSON.stringify(currentValue?.ranges || [])));
    setEditing(true);
  };

  const handleSave = async () => {
    // Validate: max_fc must be ascending
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i].max_fc <= ranges[i - 1].max_fc) {
        toast.error('Ngưỡng FC phải tăng dần');
        return;
      }
    }
    setSaving(true);
    try {
      await onSave(constraintId, { ranges });
      setEditing(false);
      toast.success('Đã cập nhật quy tắc thu hồi');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateRange = (idx: number, field: 'max_fc', value: number) => {
    const updated = [...ranges];
    updated[idx] = { ...updated[idx], [field]: value };
    setRanges(updated);
  };

  const toggleTier = (idx: number, tier: string) => {
    const updated = [...ranges];
    const tiers = updated[idx].tiers.includes(tier)
      ? updated[idx].tiers.filter(t => t !== tier)
      : [...updated[idx].tiers, tier].sort((a, b) => ALL_TIERS.indexOf(a) - ALL_TIERS.indexOf(b));
    updated[idx] = { ...updated[idx], tiers };
    setRanges(updated);
  };

  const addRange = () => {
    const lastMax = ranges.length > 0 ? ranges[ranges.length - 1].max_fc : 0;
    setRanges([...ranges, { max_fc: lastMax + 50, tiers: [] }]);
  };

  const removeRange = (idx: number) => {
    setRanges(ranges.filter((_, i) => i !== idx));
  };

  if (!editing) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Quy tắc thu hồi theo Tier</CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleEdit}>
            <Pencil className="h-3 w-3" /> Chỉnh sửa
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            {(currentValue?.ranges || []).map((r, i) => {
              const prevMax = i > 0 ? currentValue.ranges[i - 1].max_fc + 1 : 0;
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-muted-foreground w-28">
                    FC {prevMax}–{r.max_fc >= 99999 ? '∞' : r.max_fc}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  {r.tiers.length > 0 ? (
                    r.tiers.map(t => (
                      <Badge key={t} variant="secondary" className="text-[10px] h-5 px-1.5">
                        {t}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-destructive text-[10px]">Không thu hồi</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Chỉnh sửa quy tắc thu hồi</CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving}>
            <Save className="h-3 w-3" /> Lưu
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <p className="text-[10px] text-muted-foreground mb-2">
          Nếu tổng FC hệ thống ≤ ngưỡng → thu hồi từ các tier được chọn. Ngưỡng phải tăng dần.
        </p>
        {ranges.map((r, i) => {
          const prevMax = i > 0 ? ranges[i - 1].max_fc + 1 : 0;
          return (
            <div key={i} className="flex items-center gap-2 bg-background rounded-md p-2 border">
              <span className="text-xs text-muted-foreground whitespace-nowrap">FC ≤</span>
              <Input
                type="number"
                value={r.max_fc >= 99999 ? '' : r.max_fc}
                placeholder="∞"
                onChange={(e) => updateRange(i, 'max_fc', parseInt(e.target.value) || 99999)}
                className="h-7 w-20 text-xs font-mono"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <div className="flex gap-1.5">
                {ALL_TIERS.map(tier => (
                  <label key={tier} className="flex items-center gap-1 cursor-pointer">
                    <Checkbox
                      checked={r.tiers.includes(tier)}
                      onCheckedChange={() => toggleTier(i, tier)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs font-medium">{tier}</span>
                  </label>
                ))}
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={() => removeRange(i)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          );
        })}
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full" onClick={addRange}>
          <Plus className="h-3 w-3" /> Thêm ngưỡng
        </Button>
      </CardContent>
    </Card>
  );
}
