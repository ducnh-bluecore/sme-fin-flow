import { motion } from 'framer-motion';
import { Target, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export default function DecisionOutcomesPage() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  const { data: outcomes } = useQuery({
    queryKey: ['command-outcomes', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('dec_decision_outcomes' as any)
        .order('evaluation_date', { ascending: false })
        .limit(50);
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  const avgAccuracy = outcomes && outcomes.length > 0
    ? outcomes.reduce((s: number, r: any) => s + (r.accuracy_score || 0), 0) / outcomes.length
    : null;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Decision Outcomes</h1>
        <p className="text-sm text-muted-foreground mt-1">Predicted vs Actual — Trust Score & Learning</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Avg Trust Score</p>
            <p className="text-3xl font-bold mt-1">
              {avgAccuracy !== null ? `${(avgAccuracy * 100).toFixed(1)}%` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Evaluated Decisions</p>
            <p className="text-3xl font-bold mt-1">{outcomes?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {(!outcomes || outcomes.length === 0) ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No outcome evaluations yet</p>
              <p className="text-xs mt-1">Outcomes are evaluated 14/30/60 days after decision execution</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {outcomes.map((o: any) => (
            <Card key={o.id}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Package {(o.package_id as string)?.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">Evaluated: {o.evaluation_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {o.accuracy_score ? `${(o.accuracy_score * 100).toFixed(1)}%` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">accuracy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
