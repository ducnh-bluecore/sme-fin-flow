import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

interface Policy {
  id: string;
  policy_type: string;
  name: string;
  weights: Record<string, number>;
  constraints: Record<string, any>;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
}

interface Props {
  policies: Policy[];
}

const POLICY_TYPES = ['BASE', 'DYNAMIC', 'SCARCITY', 'REPAIR'];

function WeightsEditor({ weights, onChange }: { weights: Record<string, number>; onChange: (w: Record<string, number>) => void }) {
  const [newKey, setNewKey] = useState('');

  const updateKey = (oldKey: string, value: number) => {
    onChange({ ...weights, [oldKey]: value });
  };
  const removeKey = (key: string) => {
    const next = { ...weights };
    delete next[key];
    onChange(next);
  };
  const addKey = () => {
    if (newKey && !(newKey in weights)) {
      onChange({ ...weights, [newKey]: 0 });
      setNewKey('');
    }
  };

  return (
    <div className="space-y-1.5">
      {Object.entries(weights).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded min-w-[80px]">{k}</span>
          <Input
            type="number" step="0.01" min="0" max="1"
            value={v} onChange={(e) => updateKey(k, parseFloat(e.target.value) || 0)}
            className="h-7 w-20 text-xs"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeKey(k)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input placeholder="Thêm key..." value={newKey} onChange={(e) => setNewKey(e.target.value)}
          className="h-7 text-xs w-24" onKeyDown={(e) => e.key === 'Enter' && addKey()} />
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addKey}>
          <Plus className="h-3 w-3 mr-1" /> Thêm
        </Button>
      </div>
    </div>
  );
}

function ConstraintsEditor({ constraints, onChange }: { constraints: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  const [newKey, setNewKey] = useState('');

  const updateVal = (key: string, raw: string) => {
    let parsed: any = raw;
    try { parsed = JSON.parse(raw); } catch { /* keep as string */ }
    onChange({ ...constraints, [key]: parsed });
  };
  const removeKey = (key: string) => {
    const next = { ...constraints };
    delete next[key];
    onChange(next);
  };
  const addKey = () => {
    if (newKey && !(newKey in constraints)) {
      onChange({ ...constraints, [newKey]: '' });
      setNewKey('');
    }
  };

  return (
    <div className="space-y-1.5">
      {Object.entries(constraints).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded min-w-[100px]">{k}</span>
          <Input
            value={typeof v === 'object' ? JSON.stringify(v) : String(v)}
            onChange={(e) => updateVal(k, e.target.value)}
            className="h-7 text-xs flex-1"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeKey(k)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input placeholder="Thêm key..." value={newKey} onChange={(e) => setNewKey(e.target.value)}
          className="h-7 text-xs w-28" onKeyDown={(e) => e.key === 'Enter' && addKey()} />
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addKey}>
          <Plus className="h-3 w-3 mr-1" /> Thêm
        </Button>
      </div>
    </div>
  );
}

export default function PolicyEditor({ policies }: Props) {
  const { buildUpdateQuery, buildInsertQuery, buildDeleteQuery, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Policy>>({});
  const [adding, setAdding] = useState(false);
  const [newPolicy, setNewPolicy] = useState<Partial<Policy>>({
    policy_type: 'BASE', name: '', weights: {}, constraints: {}, is_active: true, effective_from: new Date().toISOString().slice(0, 10),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sem-policies'] });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Policy> }) => {
      const { error } = await buildUpdateQuery('sem_allocation_policies' as any, data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setEditId(null); toast.success('Đã lưu chính sách'); },
    onError: (e: any) => toast.error(e.message),
  });

  const addMutation = useMutation({
    mutationFn: async (data: Partial<Policy>) => {
      const { error } = await buildInsertQuery('sem_allocation_policies' as any, { ...data, tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setAdding(false); setNewPolicy({ policy_type: 'BASE', name: '', weights: {}, constraints: {}, is_active: true, effective_from: new Date().toISOString().slice(0, 10) }); toast.success('Đã thêm chính sách'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await buildDeleteQuery('sem_allocation_policies' as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Đã xóa chính sách'); },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePolicy = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await buildUpdateQuery('sem_allocation_policies' as any, { is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Đã cập nhật'); },
  });

  const startEdit = (p: Policy) => {
    setEditId(p.id);
    setEditData({ name: p.name, policy_type: p.policy_type, weights: { ...p.weights }, constraints: { ...p.constraints }, effective_from: p.effective_from, effective_to: p.effective_to });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4 mr-1" /> Thêm Chính Sách
        </Button>
      </div>

      {adding && (
        <Card className="border-primary">
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Loại</Label>
                <Select value={newPolicy.policy_type} onValueChange={(v) => setNewPolicy({ ...newPolicy, policy_type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{POLICY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tên</Label>
                <Input value={newPolicy.name || ''} onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1 block">Trọng số</Label>
                <WeightsEditor weights={newPolicy.weights || {}} onChange={(w) => setNewPolicy({ ...newPolicy, weights: w })} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Ràng buộc</Label>
                <ConstraintsEditor constraints={newPolicy.constraints || {}} onChange={(c) => setNewPolicy({ ...newPolicy, constraints: c })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Hủy</Button>
              <Button size="sm" onClick={() => addMutation.mutate(newPolicy)} disabled={!newPolicy.name}>
                <Save className="h-3 w-3 mr-1" /> Lưu
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!policies || policies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Chưa cấu hình chính sách phân bổ</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {policies.map((p: any) => (
            <Card key={p.id} className={editId === p.id ? 'border-primary' : ''}>
              <CardContent className="pt-5 pb-4">
                {editId === p.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Loại</Label>
                        <Select value={editData.policy_type} onValueChange={(v) => setEditData({ ...editData, policy_type: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{POLICY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Tên</Label>
                        <Input value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="h-8 text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs mb-1 block">Trọng số</Label>
                        <WeightsEditor weights={editData.weights || {}} onChange={(w) => setEditData({ ...editData, weights: w })} />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Ràng buộc</Label>
                        <ConstraintsEditor constraints={editData.constraints || {}} onChange={(c) => setEditData({ ...editData, constraints: c })} />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEditId(null)}>Hủy</Button>
                      <Button size="sm" onClick={() => saveMutation.mutate({ id: p.id, data: editData })}>
                        <Save className="h-3 w-3 mr-1" /> Lưu
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={p.is_active ? 'default' : 'outline'}>{p.policy_type}</Badge>
                      <div>
                        <p className="font-semibold text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.effective_from} → {p.effective_to || 'liên tục'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.weights && Object.keys(p.weights).length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(p.weights as Record<string, number>).slice(0, 4).map(([k, v]) => (
                            <span key={k} className="text-xs bg-muted px-2 py-0.5 rounded">{k}: {v}</span>
                          ))}
                        </div>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                        if (confirm('Xóa chính sách này?')) deleteMutation.mutate(p.id);
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant={p.is_active ? 'outline' : 'default'} className="h-7 text-xs"
                        onClick={() => togglePolicy.mutate({ id: p.id, is_active: !p.is_active })}
                      >
                        {p.is_active ? 'Tắt' : 'Bật'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
