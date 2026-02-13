import { useState } from 'react';
import { motion } from 'framer-motion';
import { ListChecks, Package, ChevronRight, Check, X, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';
import { formatVNDCompact } from '@/lib/formatters';

type StatusFilter = 'ALL' | 'PROPOSED' | 'APPROVED' | 'REJECTED';

const statusLabels: Record<StatusFilter, string> = {
  ALL: 'Tất Cả',
  PROPOSED: 'Đề Xuất',
  APPROVED: 'Đã Duyệt',
  REJECTED: 'Từ Chối',
};

export default function DecisionQueuePage() {
  const { buildQuery, buildUpdateQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const { data: packages, isLoading } = useQuery({
    queryKey: ['command-packages', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('dec_decision_packages' as any)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  const { data: packageLines } = useQuery({
    queryKey: ['command-package-lines', expandedPkg],
    queryFn: async () => {
      if (!expandedPkg) return [];
      const { data, error } = await buildQuery('dec_decision_package_lines' as any)
        .eq('package_id', expandedPkg)
        .limit(200);
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: !!expandedPkg && !!tenantId && isReady,
  });

  const approveMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const { error } = await buildUpdateQuery('dec_decision_packages' as any, { status: 'APPROVED' })
        .eq('id', packageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['command-packages'] });
      toast.success('Đã duyệt gói quyết định');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const { error } = await buildUpdateQuery('dec_decision_packages' as any, { status: 'REJECTED' })
        .eq('id', packageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['command-packages'] });
      toast.success('Đã từ chối gói quyết định');
    },
  });

  const riskColors: Record<string, string> = {
    HIGH: 'destructive',
    MED: 'secondary',
    LOW: 'outline',
  };

  // Filter packages
  const filtered = (packages || []).filter((pkg: any) => {
    if (statusFilter !== 'ALL' && pkg.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const desc = ((pkg.scope_summary as any)?.description || '').toLowerCase();
      const type = (pkg.package_type || '').toLowerCase();
      if (!desc.includes(q) && !type.includes(q)) return false;
    }
    return true;
  });

  const statusCounts = (packages || []).reduce((acc: Record<string, number>, pkg: any) => {
    acc[pkg.status] = (acc[pkg.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Hàng Đợi Quyết Định</h1>
        <p className="text-sm text-muted-foreground mt-1">Xem xét và phê duyệt các gói quyết định tồn kho</p>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm gói quyết định..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'PROPOSED', 'APPROVED', 'REJECTED'] as StatusFilter[]).map(s => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
            >
              {statusLabels[s]}
              {s !== 'ALL' && statusCounts[s] ? ` (${statusCounts[s]})` : ''}
            </Button>
          ))}
        </div>
      </div>

      {(!filtered || filtered.length === 0) ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{search || statusFilter !== 'ALL' ? 'Không tìm thấy gói nào khớp bộ lọc' : 'Không có gói quyết định nào'}</p>
              <p className="text-xs mt-1">Các gói được tạo từ engine phân bổ tồn kho</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((pkg: any) => (
            <Card key={pkg.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div 
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedPkg(expandedPkg === pkg.id ? null : pkg.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronRight className={`h-4 w-4 transition-transform ${expandedPkg === pkg.id ? 'rotate-90' : ''}`} />
                      <Badge variant={riskColors[pkg.risk_level] as any || 'secondary'}>
                        {pkg.package_type}
                      </Badge>
                      <div>
                        <p className="text-sm font-semibold">
                          {(pkg.scope_summary as any)?.description || `Gói ${pkg.package_type}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(pkg.scope_summary as any)?.units?.toLocaleString() || '—'} đơn vị · {(pkg.scope_summary as any)?.skus || '—'} SKU
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right mr-4">
                        <p className="text-sm font-semibold">{formatVNDCompact((pkg.impact_summary as any)?.revenue_protected || 0)}</p>
                        <p className="text-xs text-muted-foreground">doanh thu bảo vệ</p>
                      </div>
                      <Badge variant={pkg.status === 'APPROVED' ? 'default' : pkg.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                        {statusLabels[pkg.status as StatusFilter] || pkg.status}
                      </Badge>
                      {pkg.status === 'PROPOSED' && (
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-emerald-600"
                            onClick={(e) => { e.stopPropagation(); approveMutation.mutate(pkg.id); }}
                          >
                            <Check className="h-3 w-3 mr-1" /> Duyệt
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-7 text-destructive"
                            onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(pkg.id); }}
                          >
                            <X className="h-3 w-3 mr-1" /> Từ Chối
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {expandedPkg === pkg.id && packageLines && packageLines.length > 0 && (
                  <div className="border-t px-4 py-3 bg-muted/20">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="text-left py-1 pr-3">SKU</th>
                            <th className="text-left py-1 pr-3">Mẫu</th>
                            <th className="text-left py-1 pr-3">Từ</th>
                            <th className="text-left py-1 pr-3">Đến</th>
                            <th className="text-right py-1 pr-3">Đề Xuất</th>
                            <th className="text-right py-1 pr-3">Đã Duyệt</th>
                            <th className="text-left py-1">Lý Do</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(packageLines as any[]).map((line: any) => (
                            <tr key={line.id} className="border-t border-border/50">
                              <td className="py-1.5 pr-3 font-mono">{line.sku_id || '—'}</td>
                              <td className="py-1.5 pr-3">{line.fc_id || '—'}</td>
                              <td className="py-1.5 pr-3">{(line.from_location_id as string)?.slice(0, 8) || '—'}</td>
                              <td className="py-1.5 pr-3">{(line.to_location_id as string)?.slice(0, 8) || '—'}</td>
                              <td className="py-1.5 pr-3 text-right">{line.qty_suggested || 0}</td>
                              <td className="py-1.5 pr-3 text-right">{line.qty_approved ?? '—'}</td>
                              <td className="py-1.5">{line.reason_code || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
