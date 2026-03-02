import { useState } from 'react';
import { Plus, Trash2, Save, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
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

export default function CriticalityEditor({ criticalities }: Props) {
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
