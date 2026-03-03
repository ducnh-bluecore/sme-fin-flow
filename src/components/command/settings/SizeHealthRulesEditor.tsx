import { useState, useEffect } from 'react';
import { Save, HeartPulse, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

interface SizeHealthRule {
  id: string;
  tenant_id: string;
  min_stock_threshold: number;
  core_sizes: string[];
  weight_missing_ratio: number;
  weight_core_missing: number;
  weight_curve_deviation: number;
  weight_depth_score: number;
  threshold_critical: number;
  threshold_warning: number;
  shallow_depth_threshold: number;
  max_curve_deviation_pct: number;
  is_active: boolean;
}

const DEFAULTS: Omit<SizeHealthRule, 'id' | 'tenant_id'> = {
  min_stock_threshold: 1,
  core_sizes: ['S', 'M', 'L'],
  weight_missing_ratio: 0.30,
  weight_core_missing: 0.35,
  weight_curve_deviation: 0.20,
  weight_depth_score: 0.15,
  threshold_critical: 30,
  threshold_warning: 60,
  shallow_depth_threshold: 2,
  max_curve_deviation_pct: 0.30,
  is_active: true,
};

function WeightSlider({ label, description, value, onChange }: {
  label: string; description: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-semibold">{label}</Label>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {(value * 100).toFixed(0)}%
        </Badge>
      </div>
      <Slider
        value={[value * 100]}
        onValueChange={([v]) => onChange(v / 100)}
        max={100} min={0} step={5}
        className="w-full"
      />
    </div>
  );
}

function ScorePreview({ thresholdCritical, thresholdWarning }: { thresholdCritical: number; thresholdWarning: number }) {
  return (
    <div className="flex items-center gap-1 h-6 rounded-md overflow-hidden text-[10px] font-semibold">
      <div className="bg-destructive/80 text-destructive-foreground flex items-center justify-center h-full"
        style={{ width: `${thresholdCritical}%` }}>
        {thresholdCritical > 15 && `0–${thresholdCritical}`}
      </div>
      <div className="bg-yellow-500/80 text-black flex items-center justify-center h-full"
        style={{ width: `${thresholdWarning - thresholdCritical}%` }}>
        {(thresholdWarning - thresholdCritical) > 15 && `${thresholdCritical}–${thresholdWarning}`}
      </div>
      <div className="bg-green-500/80 text-white flex items-center justify-center h-full"
        style={{ width: `${100 - thresholdWarning}%` }}>
        {(100 - thresholdWarning) > 15 && `${thresholdWarning}–100`}
      </div>
    </div>
  );
}

export default function SizeHealthRulesEditor() {
  const { buildQuery, buildUpdateQuery, buildInsertQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  const { data: rule, isLoading } = useQuery({
    queryKey: ['sem-size-health-rules', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('sem_size_health_rules' as any)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return (data as any) as SizeHealthRule | null;
    },
    enabled: !!tenantId && isReady,
  });

  const [form, setForm] = useState(DEFAULTS);
  const [coreSizeInput, setCoreSizeInput] = useState('');
  const existingId = rule?.id;

  useEffect(() => {
    if (rule) {
      setForm({
        min_stock_threshold: rule.min_stock_threshold,
        core_sizes: rule.core_sizes || ['S', 'M', 'L'],
        weight_missing_ratio: Number(rule.weight_missing_ratio),
        weight_core_missing: Number(rule.weight_core_missing),
        weight_curve_deviation: Number(rule.weight_curve_deviation),
        weight_depth_score: Number(rule.weight_depth_score),
        threshold_critical: rule.threshold_critical,
        threshold_warning: rule.threshold_warning,
        shallow_depth_threshold: rule.shallow_depth_threshold,
        max_curve_deviation_pct: Number(rule.max_curve_deviation_pct),
        is_active: true,
      });
    }
  }, [rule]);

  const totalWeight = form.weight_missing_ratio + form.weight_core_missing + form.weight_curve_deviation + form.weight_depth_score;
  const isWeightValid = Math.abs(totalWeight - 1) < 0.02;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, tenant_id: tenantId };
      if (existingId) {
        const { error } = await buildUpdateQuery('sem_size_health_rules' as any, payload).eq('id', existingId);
        if (error) throw error;
      } else {
        const { error } = await buildInsertQuery('sem_size_health_rules' as any, payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sem-size-health-rules'] });
      toast.success('Đã lưu quy tắc Size Health');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setWeight = (key: keyof typeof form, value: number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const addCoreSize = () => {
    const s = coreSizeInput.trim().toUpperCase();
    if (s && !form.core_sizes.includes(s)) {
      setForm(prev => ({ ...prev, core_sizes: [...prev.core_sizes, s] }));
      setCoreSizeInput('');
    }
  };

  const removeCoreSize = (size: string) => {
    setForm(prev => ({ ...prev, core_sizes: prev.core_sizes.filter(s => s !== size) }));
  };

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Đang tải...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Formula explanation */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Công thức Size Health Score (0–100):</p>
              <p className="font-mono text-[11px]">
                Score = (1 - missing_ratio) × W₁ + (1 - core_missing_ratio) × W₂ + (1 - curve_deviation) × W₃ + depth_score × W₄
              </p>
              <p>Điểm càng <span className="text-green-600 font-semibold">CAO</span> = size càng <span className="text-green-600 font-semibold">khỏe mạnh</span>. Điểm <span className="text-destructive font-semibold">THẤP</span> = lẻ size nghiêm trọng.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <HeartPulse className="h-4 w-4" />
              Trọng Số Composite
            </CardTitle>
            <CardDescription className="text-xs">Tổng phải = 100%</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <WeightSlider
              label="Tỷ lệ size thiếu"
              description="% size có tồn dưới ngưỡng / tổng size dải"
              value={form.weight_missing_ratio}
              onChange={(v) => setWeight('weight_missing_ratio', v)}
            />
            <WeightSlider
              label="Core size thiếu"
              description="% core size bị thiếu / tổng core size"
              value={form.weight_core_missing}
              onChange={(v) => setWeight('weight_core_missing', v)}
            />
            <WeightSlider
              label="Lệch Size Curve"
              description="Độ lệch tồn thực tế vs tỷ lệ lý tưởng"
              value={form.weight_curve_deviation}
              onChange={(v) => setWeight('weight_curve_deviation', v)}
            />
            <WeightSlider
              label="Độ sâu tồn kho"
              description="Size có tồn nông (shallow) giảm điểm"
              value={form.weight_depth_score}
              onChange={(v) => setWeight('weight_depth_score', v)}
            />
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs font-semibold">Tổng trọng số:</span>
              <Badge variant={isWeightValid ? 'default' : 'destructive'} className="font-mono">
                {(totalWeight * 100).toFixed(0)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Thresholds & Config */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Ngưỡng & Cấu Hình</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Core sizes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Core Sizes (size chủ lực)</Label>
              <div className="flex flex-wrap gap-1.5">
                {form.core_sizes.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs cursor-pointer hover:bg-destructive/20"
                    onClick={() => removeCoreSize(s)}>
                    {s} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Thêm size (VD: XL)"
                  value={coreSizeInput}
                  onChange={(e) => setCoreSizeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCoreSize(); } }}
                  className="h-7 text-xs w-28"
                />
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addCoreSize}>Thêm</Button>
              </div>
            </div>

            {/* Min stock threshold */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Ngưỡng tồn tối thiểu</Label>
                <p className="text-[10px] text-muted-foreground">Size ≤ N → coi như "hết"</p>
                <Input type="number" min={0} value={form.min_stock_threshold}
                  onChange={(e) => setForm(prev => ({ ...prev, min_stock_threshold: parseInt(e.target.value) || 0 }))}
                  className="h-8 text-xs w-20" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Ngưỡng "nông" (shallow)</Label>
                <p className="text-[10px] text-muted-foreground">Size ≤ N → depth thấp</p>
                <Input type="number" min={0} value={form.shallow_depth_threshold}
                  onChange={(e) => setForm(prev => ({ ...prev, shallow_depth_threshold: parseInt(e.target.value) || 0 }))}
                  className="h-8 text-xs w-20" />
              </div>
            </div>

            {/* Curve deviation */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Max Curve Deviation</Label>
              <p className="text-[10px] text-muted-foreground">Chấp nhận lệch tối đa bao nhiêu % so với size curve lý tưởng</p>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={100} step={5}
                  value={Math.round(form.max_curve_deviation_pct * 100)}
                  onChange={(e) => setForm(prev => ({ ...prev, max_curve_deviation_pct: (parseInt(e.target.value) || 0) / 100 }))}
                  className="h-8 text-xs w-20" />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>

            {/* Score thresholds */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-semibold">Ngưỡng phân loại Score</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] text-destructive font-semibold">🔴 Nghiêm trọng (dưới)</p>
                  <Input type="number" min={0} max={100} value={form.threshold_critical}
                    onChange={(e) => setForm(prev => ({ ...prev, threshold_critical: parseInt(e.target.value) || 0 }))}
                    className="h-8 text-xs w-20" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-yellow-600 font-semibold">🟡 Cảnh báo (dưới)</p>
                  <Input type="number" min={0} max={100} value={form.threshold_warning}
                    onChange={(e) => setForm(prev => ({ ...prev, threshold_warning: parseInt(e.target.value) || 0 }))}
                    className="h-8 text-xs w-20" />
                </div>
              </div>
              <ScorePreview thresholdCritical={form.threshold_critical} thresholdWarning={form.threshold_warning} />
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span>🔴 &lt; {form.threshold_critical}: Nghiêm trọng</span>
                <span>🟡 {form.threshold_critical}–{form.threshold_warning}: Cảnh báo</span>
                <span>🟢 &gt; {form.threshold_warning}: Khỏe mạnh</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={!isWeightValid || saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" />
          {saveMutation.isPending ? 'Đang lưu...' : 'Lưu Quy Tắc Size Health'}
        </Button>
      </div>
    </div>
  );
}
