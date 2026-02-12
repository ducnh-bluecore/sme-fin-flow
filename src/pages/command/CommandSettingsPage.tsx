import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Plus, Pencil, Trash2, Shield, Tag, BarChart3, Store } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

export default function CommandSettingsPage() {
  const { buildQuery, buildUpdateQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

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

  const togglePolicy = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await buildUpdateQuery('sem_allocation_policies' as any, { is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sem-policies'] });
      toast.success('Đã cập nhật chính sách');
    },
  });

  const classColor: Record<string, string> = {
    CORE: 'default',
    HERO: 'secondary',
    LONGTAIL: 'outline',
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Cài Đặt</h1>
        <p className="text-sm text-muted-foreground mt-1">Chính sách, ràng buộc, phân loại SKU và biểu đồ size</p>
      </motion.div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="policies">Chính Sách Phân Bổ</TabsTrigger>
          <TabsTrigger value="constraints">Ràng Buộc</TabsTrigger>
          <TabsTrigger value="criticality">Phân Loại SKU</TabsTrigger>
          <TabsTrigger value="curves">Biểu Đồ Size</TabsTrigger>
        </TabsList>

        {/* === Allocation Policies === */}
        <TabsContent value="policies" className="space-y-4">
          {!policies || policies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Chưa cấu hình chính sách phân bổ</p>
                <p className="text-xs mt-1">Chính sách định nghĩa trọng số và ràng buộc cho các loại phân bổ BASE, DYNAMIC, SCARCITY, REPAIR</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {policies.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="pt-5 pb-4">
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
                          <div className="flex gap-1">
                            {Object.entries(p.weights as Record<string, number>).slice(0, 4).map(([k, v]) => (
                              <span key={k} className="text-xs bg-muted px-2 py-0.5 rounded">{k}: {v}</span>
                            ))}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant={p.is_active ? 'outline' : 'default'}
                          className="h-7 text-xs"
                          onClick={() => togglePolicy.mutate({ id: p.id, is_active: !p.is_active })}
                        >
                          {p.is_active ? 'Tắt' : 'Bật'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
                    {constraints.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.constraint_key}</TableCell>
                        <TableCell className="font-semibold">{JSON.stringify(c.constraint_value)}</TableCell>
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
          )}
        </TabsContent>

        {/* === SKU Criticality === */}
        <TabsContent value="criticality" className="space-y-4">
          {!criticalities || criticalities.length === 0 ? (
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
                      <TableHead>SKU</TableHead>
                      <TableHead>Mẫu</TableHead>
                      <TableHead>Phân Loại</TableHead>
                      <TableHead>Hiệu Lực Từ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {criticalities.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.sku_id}</TableCell>
                        <TableCell>{c.style_id || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={classColor[c.criticality_class] as any || 'secondary'}>
                            {c.criticality_class}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.effective_from}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* === Size Curve Profiles === */}
        <TabsContent value="curves" className="space-y-4">
          {!curves || curves.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Chưa có biểu đồ size</p>
                <p className="text-xs mt-1">Thiết lập tỷ lệ size lý tưởng theo danh mục để giám sát sức khỏe cơ cấu</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {curves.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-sm">{c.profile_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[c.category_id, c.brand_id, c.season_code].filter(Boolean).join(' · ') || 'Tất cả danh mục'}
                        </p>
                      </div>
                      <Badge variant={c.is_current ? 'default' : 'outline'}>
                        {c.is_current ? 'Đang dùng' : 'Không dùng'}
                      </Badge>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
