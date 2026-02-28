import { motion } from 'framer-motion';
import { Target, BarChart3, RefreshCw, TrendingUp, ArrowDown, ArrowUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatVNDCompact } from '@/lib/formatters';

export default function DecisionOutcomesPage() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  const { data: outcomes, isLoading } = useQuery({
    queryKey: ['command-outcomes-detail', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('dec_decision_outcomes' as any)
        .order('evaluation_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  const { data: packages } = useQuery({
    queryKey: ['command-outcome-packages', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('dec_decision_packages' as any)
        .in('status', ['APPROVED', 'EXECUTED'] as any)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  const { data: approvals } = useQuery({
    queryKey: ['command-override-learning', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('dec_decision_approvals' as any)
        .not('override_summary', 'is', null)
        .order('approved_at', { ascending: false })
        .limit(100);
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  const runEvaluator = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('inventory-outcome-evaluator', {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Đã đánh giá ${data.evaluated} quyết định. Độ chính xác TB: ${data.avg_accuracy ? (Number(data.avg_accuracy) * 100).toFixed(1) + '%' : 'N/A'}`);
      queryClient.invalidateQueries({ queryKey: ['command-outcomes'] });
      queryClient.invalidateQueries({ queryKey: ['command-outcomes-detail'] });
    },
    onError: (err: any) => toast.error(`Đánh giá thất bại: ${err.message}`),
  });

  const pkgMap = new Map((packages || []).map((p: any) => [p.id, p]));

  // Summary from DB RPC — NO client-side .reduce()
  const { data: outcomesSummary } = useQuery({
    queryKey: ['command-outcomes-summary', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_decision_outcomes_summary', { p_tenant_id: tenantId });
      if (error || !data) return { avg_accuracy: 0, high_accuracy_count: 0, total_predicted_revenue: 0, total_actual_revenue: 0 };
      return data as any;
    },
    enabled: !!tenantId && isReady,
  });

  const avgAccuracy = outcomesSummary ? (Number(outcomesSummary.avg_accuracy) || null) : null;
  const highAccuracy = Number(outcomesSummary?.high_accuracy_count) || 0;
  const totalPredictedRevenue = Number(outcomesSummary?.total_predicted_revenue) || 0;
  const totalActualRevenue = Number(outcomesSummary?.total_actual_revenue) || 0;

  const overridePatterns = (() => {
    if (!approvals || approvals.length === 0) return [];
    const patternMap = new Map<string, { count: number; avgDelta: number; direction: string }>();
    approvals.forEach((a: any) => {
      const summary = a.override_summary as any;
      if (!summary) return;
      const key = summary.reason || summary.type || 'điều_chỉnh_thủ_công';
      const existing = patternMap.get(key) || { count: 0, avgDelta: 0, direction: 'mixed' };
      existing.count++;
      if (summary.qty_delta) {
        existing.avgDelta = (existing.avgDelta * (existing.count - 1) + summary.qty_delta) / existing.count;
        existing.direction = existing.avgDelta > 0 ? 'increase' : existing.avgDelta < 0 ? 'decrease' : 'mixed';
      }
      patternMap.set(key, existing);
    });
    return Array.from(patternMap.entries())
      .map(([pattern, data]) => ({ pattern, ...data }))
      .sort((a, b) => b.count - a.count);
  })();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kết Quả Quyết Định</h1>
          <p className="text-sm text-muted-foreground mt-1">Dự đoán vs Thực tế — Xây dựng niềm tin qua minh bạch</p>
        </div>
        <Button onClick={() => runEvaluator.mutate()} disabled={runEvaluator.isPending} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${runEvaluator.isPending ? 'animate-spin' : ''}`} />
          {runEvaluator.isPending ? 'Đang đánh giá...' : 'Chạy Đánh Giá'}
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Độ Tin Cậy</p>
            <p className="text-3xl font-bold mt-1">{avgAccuracy !== null ? `${(avgAccuracy * 100).toFixed(1)}%` : '—'}</p>
            <p className="text-xs text-muted-foreground">trung bình</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Đã Đánh Giá</p>
            <p className="text-3xl font-bold mt-1">{outcomes?.length || 0}</p>
            <p className="text-xs text-muted-foreground">quyết định</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Chính Xác Cao (≥85%)</p>
            <p className="text-3xl font-bold mt-1 text-emerald-600">{highAccuracy}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">DT Thực Đạt</p>
            <p className="text-xl font-bold mt-1">{formatVNDCompact(totalActualRevenue)}</p>
            <p className="text-xs text-muted-foreground">trên {formatVNDCompact(totalPredictedRevenue)} dự kiến</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="replay" className="space-y-4">
        <TabsList>
          <TabsTrigger value="replay">Phát Lại Quyết Định</TabsTrigger>
          <TabsTrigger value="overrides">Học Từ Điều Chỉnh ({approvals?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="replay">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Dự Đoán vs Thực Tế
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
              ) : !outcomes || outcomes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Chưa có đánh giá kết quả</p>
                  <p className="text-xs mt-1">Kết quả được đánh giá sau 14/30/60 ngày thực thi quyết định</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gói</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Ngày ĐG</TableHead>
                      <TableHead className="text-right">Dự Đoán</TableHead>
                      <TableHead className="text-right">Thực Tế</TableHead>
                      <TableHead className="text-center">Chính Xác</TableHead>
                      <TableHead>Kết Luận</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outcomes.map((o: any) => {
                      const pkg = pkgMap.get(o.package_id);
                      const predicted = (o.predicted_impact as any)?.revenue_protected || 0;
                      const actual = (o.actual_impact as any)?.revenue_protected || 0;
                      const acc = o.accuracy_score || 0;
                      const verdict = acc >= 0.9 ? 'Xuất sắc' : acc >= 0.75 ? 'Tốt' : acc >= 0.5 ? 'Trung bình' : 'Kém';
                      const verdictColor = acc >= 0.9 ? 'text-emerald-600' : acc >= 0.75 ? 'text-blue-600' : acc >= 0.5 ? 'text-orange-600' : 'text-red-600';

                      return (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">{(o.package_id as string)?.slice(0, 8)}</TableCell>
                          <TableCell><Badge variant="secondary">{pkg?.package_type || '—'}</Badge></TableCell>
                          <TableCell className="text-sm">{o.evaluation_date}</TableCell>
                          <TableCell className="text-right text-sm">{formatVNDCompact(predicted)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatVNDCompact(actual)}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${verdictColor}`}>{(acc * 100).toFixed(1)}%</span>
                          </TableCell>
                          <TableCell><span className={`text-sm font-medium ${verdictColor}`}>{verdict}</span></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overrides" className="space-y-4">
          {overridePatterns.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Mẫu Điều Chỉnh
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {overridePatterns.map((p) => (
                    <div key={p.pattern} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.direction === 'increase' ? (
                          <ArrowUp className="h-4 w-4 text-emerald-600" />
                        ) : p.direction === 'decrease' ? (
                          <ArrowDown className="h-4 w-4 text-orange-500" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{p.pattern}</p>
                          <p className="text-xs text-muted-foreground">
                            Planner thường {p.direction === 'increase' ? 'tăng' : p.direction === 'decrease' ? 'giảm' : 'điều chỉnh'} SL
                            {p.avgDelta !== 0 && ` TB ${Math.abs(p.avgDelta).toFixed(0)} đơn vị`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{p.count}x</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lịch Sử Điều Chỉnh</CardTitle>
            </CardHeader>
            <CardContent>
              {!approvals || approvals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Chưa có điều chỉnh nào</p>
                  <p className="text-xs mt-1">Khi planner sửa số lượng đề xuất, hệ thống sẽ học tại đây</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gói</TableHead>
                      <TableHead>Quyết Định</TableHead>
                      <TableHead>Điều Chỉnh</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Ghi Chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvals.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{(a.package_id as string)?.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant={a.decision === 'APPROVE' ? 'default' : a.decision === 'PARTIAL' ? 'secondary' : 'destructive'}>
                            {a.decision === 'APPROVE' ? 'Duyệt' : a.decision === 'PARTIAL' ? 'Một Phần' : 'Từ Chối'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {JSON.stringify(a.override_summary)?.slice(0, 60)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.approved_at ? new Date(a.approved_at).toLocaleDateString('vi-VN') : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
