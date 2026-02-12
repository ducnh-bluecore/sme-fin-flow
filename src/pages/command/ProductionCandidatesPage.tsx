import { useState } from 'react';
import { motion } from 'framer-motion';
import { Factory, DollarSign, Clock, TrendingUp, ChevronDown, Check, X, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

function formatVND(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '₫0';
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `₫${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `₫${(value / 1e6).toFixed(0)}M`;
  return `₫${value?.toFixed(0) || 0}`;
}

type StatusFilter = 'ALL' | 'PROPOSED' | 'APPROVED' | 'REJECTED';

const statusLabels: Record<StatusFilter, string> = {
  ALL: 'Tất Cả',
  PROPOSED: 'Đề Xuất',
  APPROVED: 'Đã Duyệt',
  REJECTED: 'Từ Chối',
};

export default function ProductionCandidatesPage() {
  const { buildQuery, buildUpdateQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['command-production', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('dec_production_candidates' as any)
        .order('urgency_score', { ascending: false })
        .limit(100);
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await buildUpdateQuery('dec_production_candidates' as any, { status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['command-production'] });
      toast.success(`Đã ${status === 'APPROVED' ? 'duyệt' : 'từ chối'}`);
    },
  });

  const filtered = (candidates || []).filter((c: any) =>
    statusFilter === 'ALL' ? true : c.status === statusFilter
  );

  const totalCash = filtered.reduce((s: number, c: any) => s + (c.cash_required || 0), 0);
  const totalMargin = filtered.reduce((s: number, c: any) => s + (c.margin_projection || 0), 0);
  const totalUnits = filtered.reduce((s: number, c: any) => s + (c.recommended_qty || 0), 0);
  const avgPayback = filtered.length > 0
    ? filtered.reduce((s: number, c: any) => s + (c.payback_days || 0), 0) / filtered.length
    : 0;

  const urgencyColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 50) return 'text-orange-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Kế Hoạch Sản Xuất</h1>
        <p className="text-sm text-muted-foreground mt-1">Mẫu cần sản xuất thêm dựa trên phân tích thiếu hụt mạng lưới</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Tổng SL Cần</p>
            <p className="text-2xl font-bold mt-1">{totalUnits.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Vốn Cần</p>
            <p className="text-2xl font-bold mt-1">{formatVND(totalCash)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Biên Lợi Nhuận Dự Kiến</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{formatVND(totalMargin)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Hoàn Vốn TB</p>
            <p className="text-2xl font-bold mt-1">{avgPayback.toFixed(0)} ngày</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        {(['ALL', 'PROPOSED', 'APPROVED', 'REJECTED'] as StatusFilter[]).map(s => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            onClick={() => setStatusFilter(s)}
          >
            {statusLabels[s]} {s !== 'ALL' && `(${(candidates || []).filter((c: any) => c.status === s).length})`}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Đang tải...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Factory className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Không có mẫu cần sản xuất</p>
              <p className="text-xs mt-1">Các đề xuất được tạo từ phân tích thiếu hụt mạng lưới</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mẫu SP</TableHead>
                  <TableHead className="text-right">SL</TableHead>
                  <TableHead className="text-right">Vốn Cần</TableHead>
                  <TableHead className="text-right">Biên LN</TableHead>
                  <TableHead className="text-center">Hoàn Vốn</TableHead>
                  <TableHead className="text-center">Ưu Tiên</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                  <TableHead className="text-right">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <>
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    >
                      <TableCell className="font-semibold">{c.style_id}</TableCell>
                      <TableCell className="text-right">{c.recommended_qty?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatVND(c.cash_required)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatVND(c.margin_projection)}</TableCell>
                      <TableCell className="text-center">{c.payback_days || '—'} ngày</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${urgencyColor(c.urgency_score || 0)}`}>
                          {c.urgency_score?.toFixed(0) || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          c.status === 'APPROVED' ? 'default' :
                          c.status === 'REJECTED' ? 'destructive' : 'secondary'
                        }>
                          {statusLabels[c.status as StatusFilter] || c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status === 'PROPOSED' && (
                          <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                            <Button
                              size="sm" variant="outline" className="h-7 text-emerald-600"
                              onClick={() => updateStatus.mutate({ id: c.id, status: 'APPROVED' })}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm" variant="outline" className="h-7 text-destructive"
                              onClick={() => updateStatus.mutate({ id: c.id, status: 'REJECTED' })}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedId === c.id && c.size_breakdown && (
                      <TableRow key={`${c.id}-detail`}>
                        <TableCell colSpan={8} className="bg-muted/30 px-8 py-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Phân Bổ Theo Size</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(c.size_breakdown as Record<string, number>).map(([size, qty]) => (
                              <div key={size} className="bg-background border rounded px-3 py-1.5 text-xs">
                                <span className="font-semibold">{size}</span>
                                <span className="text-muted-foreground ml-2">{qty} đơn vị</span>
                              </div>
                            ))}
                          </div>
                          {c.as_of_date && (
                            <p className="text-xs text-muted-foreground mt-2">Ngày tạo: {c.as_of_date}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
