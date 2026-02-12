import { motion } from 'framer-motion';
import { Factory, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export default function ProductionCandidatesPage() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  const { data: candidates } = useQuery({
    queryKey: ['command-production', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('dec_production_candidates' as any)
        .order('urgency_score', { ascending: false })
        .limit(50);
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Production Candidates</h1>
        <p className="text-sm text-muted-foreground mt-1">Styles that need additional production based on network gap</p>
      </motion.div>

      {(!candidates || candidates.length === 0) ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Factory className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No production candidates yet</p>
              <p className="text-xs mt-1">Candidates are generated from Network Gap analysis</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {candidates.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{c.style_id}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.recommended_qty?.toLocaleString()} units · Payback {c.payback_days || '—'} days
                    </p>
                  </div>
                  <Badge variant={c.status === 'APPROVED' ? 'default' : 'secondary'}>
                    {c.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
