import { motion } from 'framer-motion';
import { Target, TrendingUp, CheckCircle2, AlertTriangle, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

function formatVND(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '₫0';
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `₫${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `₫${(value / 1e6).toFixed(0)}M`;
  return `₫${value?.toFixed(0) || 0}`;
}

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

  // Fetch associated packages for context
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

  const runEvaluator = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('inventory-outcome-evaluator', {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Evaluated ${data.evaluated} decisions. Avg accuracy: ${data.avg_accuracy ? (Number(data.avg_accuracy) * 100).toFixed(1) + '%' : 'N/A'}`);
      queryClient.invalidateQueries({ queryKey: ['command-outcomes'] });
      queryClient.invalidateQueries({ queryKey: ['command-outcomes-detail'] });
    },
    onError: (err: any) => toast.error(`Evaluation failed: ${err.message}`),
  });

  const pkgMap = new Map((packages || []).map((p: any) => [p.id, p]));

  const avgAccuracy = outcomes && outcomes.length > 0
    ? outcomes.reduce((s: number, r: any) => s + (r.accuracy_score || 0), 0) / outcomes.length
    : null;

  const highAccuracy = outcomes?.filter((o: any) => (o.accuracy_score || 0) >= 0.85).length || 0;
  const totalPredictedRevenue = outcomes?.reduce((s: number, o: any) => {
    const predicted = o.predicted_impact as any;
    return s + (predicted?.revenue_protected || 0);
  }, 0) || 0;
  const totalActualRevenue = outcomes?.reduce((s: number, o: any) => {
    const actual = o.actual_impact as any;
    return s + (actual?.revenue_protected || 0);
  }, 0) || 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Decision Outcomes</h1>
          <p className="text-sm text-muted-foreground mt-1">Predicted vs Actual — Build trust through transparency</p>
        </div>
        <Button onClick={() => runEvaluator.mutate()} disabled={runEvaluator.isPending} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${runEvaluator.isPending ? 'animate-spin' : ''}`} />
          {runEvaluator.isPending ? 'Evaluating...' : 'Run Evaluator'}
        </Button>
      </motion.div>

      {/* Trust Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Trust Score</p>
            <p className="text-3xl font-bold mt-1">
              {avgAccuracy !== null ? `${(avgAccuracy * 100).toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">avg accuracy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Evaluated</p>
            <p className="text-3xl font-bold mt-1">{outcomes?.length || 0}</p>
            <p className="text-xs text-muted-foreground">decisions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">High Accuracy (≥85%)</p>
            <p className="text-3xl font-bold mt-1 text-emerald-600">{highAccuracy}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Revenue Captured</p>
            <p className="text-xl font-bold mt-1">{formatVND(totalActualRevenue)}</p>
            <p className="text-xs text-muted-foreground">of {formatVND(totalPredictedRevenue)} predicted</p>
          </CardContent>
        </Card>
      </div>

      {/* Outcomes Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Decision Replay
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !outcomes || outcomes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No outcome evaluations yet</p>
              <p className="text-xs mt-1">Outcomes are evaluated 14/30/60 days after decision execution</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Evaluated</TableHead>
                  <TableHead className="text-right">Predicted</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-center">Accuracy</TableHead>
                  <TableHead>Verdict</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outcomes.map((o: any) => {
                  const pkg = pkgMap.get(o.package_id);
                  const predicted = (o.predicted_impact as any)?.revenue_protected || 0;
                  const actual = (o.actual_impact as any)?.revenue_protected || 0;
                  const acc = o.accuracy_score || 0;
                  const verdict = acc >= 0.9 ? 'Excellent' : acc >= 0.75 ? 'Good' : acc >= 0.5 ? 'Fair' : 'Poor';
                  const verdictColor = acc >= 0.9 ? 'text-emerald-600' : acc >= 0.75 ? 'text-blue-600' : acc >= 0.5 ? 'text-orange-600' : 'text-red-600';

                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{(o.package_id as string)?.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{pkg?.package_type || '—'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{o.evaluation_date}</TableCell>
                      <TableCell className="text-right text-sm">{formatVND(predicted)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatVND(actual)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${verdictColor}`}>{(acc * 100).toFixed(1)}%</span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${verdictColor}`}>{verdict}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
