import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Plus, Pencil, Trash2, Shield, Tag, BarChart3, Store, Warehouse, ArrowLeftRight } from 'lucide-react';
import RecallTierRulesEditor from '@/components/command/RecallTierRulesEditor';
import PolicyEditor from '@/components/command/settings/PolicyEditor';
import CriticalityEditor from '@/components/command/settings/CriticalityEditor';
import SizeCurveEditor from '@/components/command/settings/SizeCurveEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

interface InvStoreRow {
  id: string;
  store_code: string;
  store_name: string;
  location_type: string;
  tier: string | null;
  region: string | null;
  is_active: boolean;
  is_transfer_eligible: boolean;
  is_fill_enabled: boolean;
  display_capacity: number;
  storage_capacity: number;
  capacity: number;
}

function InlineCapacityEdit({ store, field, onSave }: { store: InvStoreRow; field: 'display_capacity' | 'storage_capacity'; onSave: (id: string, updates: Partial<InvStoreRow>) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(store[field] || 0));

  if (!editing) {
    return (
      <button
        className="font-mono text-xs hover:bg-muted px-2 py-1 rounded cursor-pointer text-right w-full"
        onClick={() => { setValue(String(store[field] || 0)); setEditing(true); }}
      >
        {(store[field] || 0).toLocaleString()}
      </button>
    );
  }

  const handleSave = () => {
    const num = parseInt(value) || 0;
    const otherField = field === 'display_capacity' ? 'storage_capacity' : 'display_capacity';
    const otherVal = store[otherField] || 0;
    onSave(store.id, { [field]: num, capacity: num + otherVal } as any);
    setEditing(false);
  };

  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
      className="h-7 w-20 text-xs font-mono text-right"
      autoFocus
    />
  );
}

export default function CommandSettingsPage() {
  const { buildQuery, buildUpdateQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const [storeSearch, setStoreSearch] = useState('');

  // === Allocation Policies ===
  const { data: policies } = useQuery({
    queryKey: ['sem-policies', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('sem_allocation_policies' as any)
        .order('policy_type');
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  // === SKU Criticality ===
  const { data: criticalities } = useQuery({
    queryKey: ['sem-criticality', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('sem_sku_criticality' as any)
        .eq('is_current', true)
        .order('criticality_class')
        .limit(100);
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  // === Size Curve Profiles ===
  const { data: curves } = useQuery({
    queryKey: ['sem-curves', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('sem_size_curve_profiles' as any)
        .eq('is_current', true)
        .order('profile_name');
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  // === Constraints (existing inv_constraint_registry) ===
  const { data: constraints } = useQuery({
    queryKey: ['inv-constraints-settings', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('inv_constraint_registry' as any)
        .order('constraint_key');
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  const toggleConstraint = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await buildUpdateQuery('inv_constraint_registry' as any, { is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-constraints-settings'] });
      toast.success('Đã cập nhật ràng buộc');
    },
  });

  const updateConstraintValue = async (id: string, newValue: any) => {
    const { error } = await buildUpdateQuery('inv_constraint_registry' as any, { constraint_value: newValue })
      .eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['inv-constraints-settings'] });
  };


  // === Inventory Stores ===
  const { data: invStores } = useQuery({
    queryKey: ['inv-stores-settings', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('inv_stores' as any)
        .select('id,store_code,store_name,location_type,tier,region,is_active,is_transfer_eligible,is_fill_enabled,display_capacity,storage_capacity,capacity')
        .order('store_name');
      if (error) return [];
      return (data || []) as unknown as InvStoreRow[];
    },
    enabled: !!tenantId && isReady,
  });

  const updateStore = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InvStoreRow> }) => {
      const { error } = await buildUpdateQuery('inv_stores' as any, updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-stores-settings'] });
      queryClient.invalidateQueries({ queryKey: ['inv-store-directory-stores'] });
      queryClient.invalidateQueries({ queryKey: ['inv-stores'] });
      toast.success('Đã cập nhật kho');
    },
    onError: (e: any) => toast.error(`Lỗi: ${e.message}`),
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Cài Đặt</h1>
        <p className="text-sm text-muted-foreground mt-1">Chính sách, ràng buộc, phân loại SKU và biểu đồ size</p>
      </motion.div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stores">Quản Lý Kho</TabsTrigger>
          <TabsTrigger value="policies">Chính Sách Phân Bổ</TabsTrigger>
          <TabsTrigger value="constraints">Ràng Buộc</TabsTrigger>
          <TabsTrigger value="criticality">Phân Loại SKU</TabsTrigger>
          <TabsTrigger value="curves">Biểu Đồ Size</TabsTrigger>
        </TabsList>

        {/* === Allocation Policies === */}
        <TabsContent value="policies" className="space-y-4">
          <PolicyEditor policies={policies || []} />
        </TabsContent>

        {/* === Constraints (inv_constraint_registry) === */}
        <TabsContent value="constraints" className="space-y-4">
          {!constraints || constraints.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Settings className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Chưa cấu hình ràng buộc</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Special editor for recall tier rules */}
              {constraints.filter((c: any) => c.constraint_key === 'fc_recall_tier_rules').map((c: any) => (
                <RecallTierRulesEditor
                  key={c.id}
                  constraintId={c.id}
                  currentValue={c.constraint_value}
                  onSave={updateConstraintValue}
                />
              ))}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã</TableHead>
                        <TableHead>Giá Trị</TableHead>
                        <TableHead>Mô Tả</TableHead>
                        <TableHead className="text-center">Trạng Thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {constraints.filter((c: any) => c.constraint_key !== 'fc_recall_tier_rules').map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs">{c.constraint_key}</TableCell>
                          <TableCell className="font-semibold text-xs max-w-[300px] truncate">{JSON.stringify(c.constraint_value)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.description || '—'}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant={c.is_active ? 'default' : 'outline'}
                              className="h-6 text-xs px-2"
                              onClick={() => toggleConstraint.mutate({ id: c.id, is_active: !c.is_active })}
                            >
                              {c.is_active ? 'BẬT' : 'TẮT'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* === SKU Criticality === */}
        <TabsContent value="criticality" className="space-y-4">
          <CriticalityEditor criticalities={criticalities || []} />
        </TabsContent>

        {/* === Size Curve Profiles === */}
        <TabsContent value="curves" className="space-y-4">
          <SizeCurveEditor curves={curves || []} />
        </TabsContent>

        {/* === Store Management === */}
        <TabsContent value="stores" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Warehouse className="h-4 w-4" />
                  Danh Sách Kho ({invStores?.length || 0})
                </CardTitle>
                <Input
                  placeholder="Tìm kho..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="w-48 h-8 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Mã Kho</TableHead>
                      <TableHead>Tên Kho</TableHead>
                      <TableHead className="w-[140px]">Loại Kho</TableHead>
                      <TableHead className="w-[80px]">Tier</TableHead>
                      <TableHead className="text-right w-[90px]">🏪 Trưng bày</TableHead>
                      <TableHead className="text-right w-[90px]">📦 Kho</TableHead>
                      <TableHead className="text-right w-[80px]">Tổng</TableHead>
                      <TableHead className="text-center w-[100px]">Phủ Nền</TableHead>
                      <TableHead className="text-center w-[120px]">
                        <span className="flex items-center gap-1 justify-center">
                          <ArrowLeftRight className="h-3 w-3" />
                          Điều Chuyển
                        </span>
                      </TableHead>
                      <TableHead className="text-center w-[80px]">Hoạt Động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invStores || [])
                      .filter(s => !storeSearch || s.store_name.toLowerCase().includes(storeSearch.toLowerCase()) || s.store_code.includes(storeSearch))
                      .map((store) => (
                        <TableRow key={store.id} className={!store.is_active ? 'opacity-50' : ''}>
                          <TableCell className="font-mono text-xs">{store.store_code}</TableCell>
                          <TableCell className="font-medium text-sm">{store.store_name}</TableCell>
                          <TableCell>
                            <Select
                              value={store.location_type}
                              onValueChange={(val) => updateStore.mutate({ id: store.id, updates: { location_type: val } })}
                            >
                              <SelectTrigger className="h-7 text-xs w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="central_warehouse">Kho Tổng</SelectItem>
                                <SelectItem value="sub_warehouse">Kho Phụ</SelectItem>
                                <SelectItem value="store">Cửa Hàng</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {store.tier || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <InlineCapacityEdit
                              store={store}
                              field="display_capacity"
                              onSave={(id, updates) => updateStore.mutate({ id, updates })}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <InlineCapacityEdit
                              store={store}
                              field="storage_capacity"
                              onSave={(id, updates) => updateStore.mutate({ id, updates })}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-muted-foreground">
                            {(store.capacity || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={store.is_fill_enabled}
                              onCheckedChange={(checked) => updateStore.mutate({ id: store.id, updates: { is_fill_enabled: checked } })}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={store.is_transfer_eligible}
                              onCheckedChange={(checked) => updateStore.mutate({ id: store.id, updates: { is_transfer_eligible: checked } })}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={store.is_active}
                              onCheckedChange={(checked) => updateStore.mutate({ id: store.id, updates: { is_active: checked } })}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Kho Tổng</p>
                <p className="text-lg font-bold">{invStores?.filter(s => s.location_type === 'central_warehouse').length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Cửa Hàng</p>
                <p className="text-lg font-bold">{invStores?.filter(s => s.location_type === 'store').length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Được Điều Chuyển</p>
                <p className="text-lg font-bold text-primary">{invStores?.filter(s => s.is_transfer_eligible).length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Đã Đóng</p>
                <p className="text-lg font-bold text-destructive">{invStores?.filter(s => !s.is_active).length || 0}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
