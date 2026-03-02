import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

interface SizeCurve {
  id: string;
  profile_name: string;
  category_id: string | null;
  brand_id: string | null;
  season_code: string | null;
  size_ratios: Record<string, number>;
  is_current: boolean;
  effective_from: string;
}

interface Props {
  curves: SizeCurve[];
}

function SizeRatiosEditor({ ratios, onChange }: { ratios: Record<string, number>; onChange: (r: Record<string, number>) => void }) {
  const [newSize, setNewSize] = useState('');
  const total = Object.values(ratios).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {Object.entries(ratios).map(([size, ratio]) => (
          <div key={size} className="flex items-center gap-1 bg-muted rounded px-2 py-1">
            <span className="font-semibold text-xs">{size}</span>
            <Input
              type="number" step="0.01" min="0" max="1"
              value={ratio} onChange={(e) => onChange({ ...ratios, [size]: parseFloat(e.target.value) || 0 })}
              className="h-6 w-16 text-xs"
            />
            <span className="text-xs text-muted-foreground">{(ratio * 100).toFixed(0)}%</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
              const next = { ...ratios }; delete next[size]; onChange(next);
            }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input placeholder="Size mới (S, M, L...)" value={newSize} onChange={(e) => setNewSize(e.target.value.toUpperCase())}
          className="h-7 text-xs w-32" onKeyDown={(e) => {
            if (e.key === 'Enter' && newSize && !(newSize in ratios)) { onChange({ ...ratios, [newSize]: 0 }); setNewSize(''); }
          }} />
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
          if (newSize && !(newSize in ratios)) { onChange({ ...ratios, [newSize]: 0 }); setNewSize(''); }
        }}>
          <Plus className="h-3 w-3 mr-1" /> Thêm Size
        </Button>
        <span className={`text-xs ml-auto ${Math.abs(total - 1) < 0.01 ? 'text-green-600' : 'text-destructive'}`}>
          Tổng: {(total * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export default function SizeCurveEditor({ curves }: Props) {
  const { buildUpdateQuery, buildInsertQuery, buildDeleteQuery, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<SizeCurve>>({});
  const [adding, setAdding] = useState(false);
  const [newCurve, setNewCurve] = useState<Partial<SizeCurve>>({
    profile_name: '', category_id: '', size_ratios: {}, is_current: true,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sem-curves'] });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SizeCurve> }) => {
      const { error } = await buildUpdateQuery('sem_size_curve_profiles' as any, data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setEditId(null); toast.success('Đã lưu biểu đồ size'); },
    onError: (e: any) => toast.error(e.message),
  });

  const addMutation = useMutation({
    mutationFn: async (data: Partial<SizeCurve>) => {
      const { error } = await buildInsertQuery('sem_size_curve_profiles' as any, {
        ...data, tenant_id: tenantId, is_current: true, effective_from: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setAdding(false); setNewCurve({ profile_name: '', category_id: '', size_ratios: {}, is_current: true }); toast.success('Đã thêm biểu đồ size'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await buildDeleteQuery('sem_size_curve_profiles' as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Đã xóa'); },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (c: SizeCurve) => {
    setEditId(c.id);
    setEditData({ profile_name: c.profile_name, category_id: c.category_id, brand_id: c.brand_id, season_code: c.season_code, size_ratios: { ...c.size_ratios } });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4 mr-1" /> Thêm Biểu Đồ
        </Button>
      </div>

      {adding && (
        <Card className="border-primary">
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Tên Profile</Label>
                <Input value={newCurve.profile_name || ''} onChange={(e) => setNewCurve({ ...newCurve, profile_name: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Danh mục</Label>
                <Input value={newCurve.category_id || ''} onChange={(e) => setNewCurve({ ...newCurve, category_id: e.target.value })} className="h-8 text-xs" placeholder="VD: DAM, AO" />
              </div>
              <div>
                <Label className="text-xs">Mùa</Label>
                <Input value={newCurve.season_code || ''} onChange={(e) => setNewCurve({ ...newCurve, season_code: e.target.value })} className="h-8 text-xs" placeholder="VD: SS25" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Tỷ lệ Size</Label>
              <SizeRatiosEditor ratios={newCurve.size_ratios || {}} onChange={(r) => setNewCurve({ ...newCurve, size_ratios: r })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Hủy</Button>
              <Button size="sm" onClick={() => addMutation.mutate(newCurve)} disabled={!newCurve.profile_name}>
                <Save className="h-3 w-3 mr-1" /> Lưu
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!curves || curves.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Chưa có biểu đồ size</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {curves.map((c: any) => (
            <Card key={c.id} className={editId === c.id ? 'border-primary' : ''}>
              <CardContent className="pt-5 pb-4">
                {editId === c.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Tên Profile</Label>
                        <Input value={editData.profile_name || ''} onChange={(e) => setEditData({ ...editData, profile_name: e.target.value })} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Danh mục</Label>
                        <Input value={editData.category_id || ''} onChange={(e) => setEditData({ ...editData, category_id: e.target.value })} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Mùa</Label>
                        <Input value={editData.season_code || ''} onChange={(e) => setEditData({ ...editData, season_code: e.target.value })} className="h-8 text-xs" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Tỷ lệ Size</Label>
                      <SizeRatiosEditor ratios={editData.size_ratios || {}} onChange={(r) => setEditData({ ...editData, size_ratios: r })} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEditId(null)}>Hủy</Button>
                      <Button size="sm" onClick={() => saveMutation.mutate({ id: c.id, data: editData })}>
                        <Save className="h-3 w-3 mr-1" /> Lưu
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-sm">{c.profile_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[c.category_id, c.brand_id, c.season_code].filter(Boolean).join(' · ') || 'Tất cả danh mục'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={c.is_current ? 'default' : 'outline'}>
                          {c.is_current ? 'Đang dùng' : 'Không dùng'}
                        </Badge>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                          if (confirm('Xóa biểu đồ size này?')) deleteMutation.mutate(c.id);
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {c.size_ratios && Object.keys(c.size_ratios).length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(c.size_ratios as Record<string, number>).map(([size, ratio]) => (
                          <div key={size} className="bg-muted rounded px-3 py-1 text-xs">
                            <span className="font-semibold">{size}</span>
                            <span className="text-muted-foreground ml-1">{(Number(ratio) * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
