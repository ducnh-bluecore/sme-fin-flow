import { useState } from 'react';
import { Plus, Trash2, Save, Tag, Zap, Settings2, RefreshCw, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Criticality {
  id: string;
  sku_id: string;
  style_id: string | null;
  criticality_class: string;
  min_presence_rule: any;
  is_current: boolean;
  effective_from: string;
}

interface Props {
  criticalities: Criticality[];
}

const CLASSES = ['CORE', 'HERO', 'LONGTAIL'];
const classColor: Record<string, string> = { CORE: 'default', HERO: 'secondary', LONGTAIL: 'outline' };

// === Auto-Classification Rules Tab ===
function AutoClassifyRulesPanel({ tenantId }: { tenantId: string }) {
  const { buildQuery, buildUpdateQuery, buildInsertQuery } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  const { data: rule, isLoading } = useQuery({
    queryKey: ['sem-criticality-rules', tenantId],
    queryFn: async () => {
      const { data } = await buildQuery('sem_criticality_rules' as any)
        .eq('is_active', true)
        .limit(1);
      return (data && (data as any[])[0]) as any || null;
    },
    enabled: !!tenantId,
  });

  const [weights, setWeights] = useState<{ revenue: number; units: number; velocity: number; margin: number } | null>(null);
  const [cutoffs, setCutoffs] = useState<{ core: number; hero: number } | null>(null);
  const [lookback, setLookback] = useState<number | null>(null);
  const [minRules, setMinRules] = useState<any>(null);

  // Initialize state from rule
  const w = weights ?? {
    revenue: Number(rule?.weight_revenue ?? 0.35),
    units: Number(rule?.weight_units_sold ?? 0.25),
    velocity: Number(rule?.weight_velocity ?? 0.25),
    margin: Number(rule?.weight_margin ?? 0.15),
  };
  const c = cutoffs ?? {
    core: Number(rule?.core_percentile ?? 80),
    hero: Number(rule?.hero_percentile ?? 50),
  };
  const lb = lookback ?? (rule?.lookback_days ?? 30);
  const mr = minRules ?? {
    core_min_stores: rule?.core_min_stores ?? 20,
    core_min_sizes: rule?.core_min_sizes ?? 4,
    hero_min_stores: rule?.hero_min_stores ?? 10,
    hero_min_sizes: rule?.hero_min_sizes ?? 3,
    longtail_min_stores: rule?.longtail_min_stores ?? 5,
    longtail_min_sizes: rule?.longtail_min_sizes ?? 2,
  };

  const totalWeight = w.revenue + w.units + w.velocity + w.margin;
  const isBalanced = Math.abs(totalWeight - 1) < 0.01;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        tenant_id: tenantId,
        rule_name: 'Default Classification',
        is_active: true,
        weight_revenue: w.revenue,
        weight_units_sold: w.units,
        weight_velocity: w.velocity,
        weight_margin: w.margin,
        core_percentile: c.core,
        hero_percentile: c.hero,
        lookback_days: lb,
        ...mr,
        updated_at: new Date().toISOString(),
      };
      if (rule?.id) {
        const { error } = await buildUpdateQuery('sem_criticality_rules' as any, payload).eq('id', rule.id);
        if (error) throw error;
      } else {
        const { error } = await buildInsertQuery('sem_criticality_rules' as any, payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sem-criticality-rules'] });
      toast.success('Đã lưu công thức phân loại');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('fn_auto_classify_criticality' as any, { p_tenant_id: tenantId });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['sem-criticality'] });
      queryClient.invalidateQueries({ queryKey: ['sem-criticality-rules'] });
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`Đã phân loại ${data?.total || 0} SKU: ${data?.core || 0} CORE, ${data?.hero || 0} HERO, ${data?.longtail || 0} LONGTAIL`);
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setWeight = (key: keyof typeof w, val: number) => {
    setWeights({ ...w, [key]: val });
  };

  if (isLoading) return <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Đang tải...</CardContent></Card>;

  return (
    <div className="space-y-4">
      {/* Formula definition */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            Công Thức Composite Score
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Score = Revenue × W₁ + Units × W₂ + Velocity × W₃ + Margin × W₄ (percentile rank)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Weight sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { key: 'revenue' as const, label: '💰 Doanh thu', desc: 'Tổng doanh thu trong lookback' },
              { key: 'units' as const, label: '📦 Sản lượng', desc: 'Tổng số lượng bán' },
              { key: 'velocity' as const, label: '⚡ Velocity', desc: 'Đơn vị/ngày (tốc độ bán)' },
              { key: 'margin' as const, label: '📊 Contribution Margin', desc: 'Doanh thu - Giá vốn' },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{label}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {(w[key] * 100).toFixed(0)}%
                  </Badge>
                </div>
                <Slider
                  value={[w[key] * 100]}
                  min={0} max={60} step={5}
                  onValueChange={([v]) => setWeight(key, v / 100)}
                  className="py-1"
                />
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Tổng trọng số:</span>
            <Badge variant={isBalanced ? 'default' : 'destructive'} className="text-[10px]">
              {(totalWeight * 100).toFixed(0)}%
            </Badge>
            {!isBalanced && <span className="text-destructive text-[10px]">Phải bằng 100%</span>}
          </div>

          <Separator />

          {/* Percentile cutoffs */}
          <div>
            <p className="text-xs font-medium mb-3">📐 Ngưỡng phân loại (Percentile)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs">CORE ≥ P</span>
                  <Badge variant="default" className="text-[10px] font-mono">{c.core}</Badge>
                </div>
                <Slider
                  value={[c.core]}
                  min={50} max={95} step={5}
                  onValueChange={([v]) => setCutoffs({ ...c, core: v })}
                />
                <p className="text-[10px] text-muted-foreground">Top {100 - c.core}% SKU</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs">HERO ≥ P</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">{c.hero}</Badge>
                </div>
                <Slider
                  value={[c.hero]}
                  min={20} max={c.core - 5} step={5}
                  onValueChange={([v]) => setCutoffs({ ...c, hero: v })}
                />
                <p className="text-[10px] text-muted-foreground">Tiếp {c.core - c.hero}% SKU</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs">LONGTAIL</span>
                <div className="h-5 flex items-center">
                  <Badge variant="outline" className="text-[10px] font-mono">Còn lại {c.hero}%</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">SKU dưới P{c.hero}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Lookback & min presence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium mb-2">🕐 Lookback (ngày)</p>
              <div className="flex items-center gap-2">
                <Slider value={[lb]} min={7} max={90} step={7} onValueChange={([v]) => setLookback(v)} className="flex-1" />
                <Badge variant="outline" className="font-mono text-[10px] w-12 text-center">{lb}d</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-2">🏪 Min Presence Rules</p>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                {(['core', 'hero', 'longtail'] as const).map(cls => (
                  <div key={cls} className="space-y-1">
                    <span className="uppercase font-semibold">{cls}</span>
                    <div className="flex gap-1">
                      <Input
                        type="number" className="h-6 text-[10px] w-12" placeholder="Stores"
                        value={mr[`${cls}_min_stores`]}
                        onChange={e => setMinRules({ ...mr, [`${cls}_min_stores`]: parseInt(e.target.value) || 0 })}
                      />
                      <Input
                        type="number" className="h-6 text-[10px] w-12" placeholder="Sizes"
                        value={mr[`${cls}_min_sizes`]}
                        onChange={e => setMinRules({ ...mr, [`${cls}_min_sizes`]: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex gap-1 text-muted-foreground">
                      <span>CH</span><span>Size</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Last run info */}
          {rule?.last_run_at && (
            <div className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2">
              Lần chạy cuối: {new Date(rule.last_run_at).toLocaleString('vi-VN')} — {rule.last_run_count || 0} SKU
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => saveMutation.mutate()} disabled={!isBalanced || saveMutation.isPending}>
              <Save className="h-3.5 w-3.5 mr-1" />
              Lưu Công Thức
            </Button>
            <Button size="sm" onClick={() => {
              if (!isBalanced) { toast.error('Tổng trọng số phải bằng 100%'); return; }
              saveMutation.mutate();
              setTimeout(() => runMutation.mutate(), 500);
            }} disabled={!isBalanced || runMutation.isPending}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${runMutation.isPending ? 'animate-spin' : ''}`} />
              {runMutation.isPending ? 'Đang chạy...' : 'Chạy Phân Loại'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// === Manual Table (existing) ===
function ManualCriticalityTable({ criticalities }: Props) {
  const { buildUpdateQuery, buildInsertQuery, buildDeleteQuery, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ sku_id: '', style_id: '', criticality_class: 'CORE' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editClass, setEditClass] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sem-criticality'] });

  const addMutation = useMutation({
    mutationFn: async () => {
      const minRule = newItem.criticality_class === 'CORE' ? { min_stores: 20, min_sizes: 4 }
        : newItem.criticality_class === 'HERO' ? { min_stores: 10, min_sizes: 3 }
        : { min_stores: 5, min_sizes: 2 };
      const { error } = await buildInsertQuery('sem_sku_criticality' as any, {
        tenant_id: tenantId, sku_id: newItem.sku_id, style_id: newItem.style_id || null,
        criticality_class: newItem.criticality_class, min_presence_rule: minRule,
        is_current: true, effective_from: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setAdding(false); setNewItem({ sku_id: '', style_id: '', criticality_class: 'CORE' }); toast.success('Đã thêm'); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, criticality_class }: { id: string; criticality_class: string }) => {
      const minRule = criticality_class === 'CORE' ? { min_stores: 20, min_sizes: 4 }
        : criticality_class === 'HERO' ? { min_stores: 10, min_sizes: 3 }
        : { min_stores: 5, min_sizes: 2 };
      const { error } = await buildUpdateQuery('sem_sku_criticality' as any, { criticality_class, min_presence_rule: minRule }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setEditingId(null); toast.success('Đã cập nhật'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await buildDeleteQuery('sem_sku_criticality' as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Đã xóa'); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (criticalities || []).filter(c =>
    !search || c.sku_id.toLowerCase().includes(search.toLowerCase()) || (c.style_id || '').toLowerCase().includes(search.toLowerCase())
  );

  const counts = { CORE: 0, HERO: 0, LONGTAIL: 0 };
  for (const c of criticalities || []) {
    if (c.criticality_class in counts) counts[c.criticality_class as keyof typeof counts]++;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {CLASSES.map(cls => (
            <Badge key={cls} variant={classColor[cls] as any}>{cls}: {counts[cls as keyof typeof counts]}</Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Tìm SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48 h-8 text-xs" />
          <Button size="sm" onClick={() => setAdding(!adding)}>
            <Plus className="h-4 w-4 mr-1" /> Thêm
          </Button>
        </div>
      </div>

      {adding && (
        <Card className="border-primary">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Mã SKU / FC</label>
                <Input value={newItem.sku_id} onChange={(e) => setNewItem({ ...newItem, sku_id: e.target.value })} className="h-8 text-xs" placeholder="VD: DAM001" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Tên mẫu</label>
                <Input value={newItem.style_id} onChange={(e) => setNewItem({ ...newItem, style_id: e.target.value })} className="h-8 text-xs" placeholder="Tùy chọn" />
              </div>
              <div className="w-32">
                <label className="text-xs text-muted-foreground">Phân loại</label>
                <Select value={newItem.criticality_class} onValueChange={(v) => setNewItem({ ...newItem, criticality_class: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button size="sm" className="h-8" onClick={() => addMutation.mutate()} disabled={!newItem.sku_id}>
                <Save className="h-3 w-3 mr-1" /> Lưu
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => setAdding(false)}>Hủy</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Tag className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Chưa phân loại SKU</p>
            <p className="text-xs mt-1">Phân loại CORE, HERO, LONGTAIL để ưu tiên phân bổ</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU / FC Code</TableHead>
                  <TableHead>Tên Mẫu</TableHead>
                  <TableHead>Phân Loại</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Min Stores</TableHead>
                  <TableHead>Min Sizes</TableHead>
                  <TableHead>Hiệu Lực Từ</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.sku_id}</TableCell>
                    <TableCell className="text-sm">{c.style_id || '—'}</TableCell>
                    <TableCell>
                      {editingId === c.id ? (
                        <div className="flex items-center gap-1">
                          <Select value={editClass} onValueChange={setEditClass}>
                            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{CLASSES.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateMutation.mutate({ id: c.id, criticality_class: editClass })}>
                            <Save className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Badge
                          variant={classColor[c.criticality_class] as any || 'secondary'}
                          className="cursor-pointer"
                          onClick={() => { setEditingId(c.id); setEditClass(c.criticality_class); }}
                        >
                          {c.criticality_class}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {c.min_presence_rule?.score != null ? c.min_presence_rule.score.toFixed(1) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{c.min_presence_rule?.min_stores || '—'}</TableCell>
                    <TableCell className="text-xs">{c.min_presence_rule?.min_sizes || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.effective_from}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                        if (confirm('Xóa phân loại này?')) deleteMutation.mutate(c.id);
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CriticalityEditor({ criticalities }: Props) {
  const { tenantId } = useTenantQueryBuilder();

  return (
    <Tabs defaultValue="auto" className="space-y-4">
      <TabsList>
        <TabsTrigger value="auto" className="gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          Tự Động
        </TabsTrigger>
        <TabsTrigger value="manual" className="gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Thủ Công
        </TabsTrigger>
      </TabsList>

      <TabsContent value="auto">
        {tenantId && <AutoClassifyRulesPanel tenantId={tenantId} />}
      </TabsContent>

      <TabsContent value="manual">
        <ManualCriticalityTable criticalities={criticalities} />
      </TabsContent>
    </Tabs>
  );
}
