import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';
import type { SizeHealthDetailRow } from '@/hooks/inventory/useSizeHealthGroups';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

interface DecisionFeedProps {
  brokenDetails: SizeHealthDetailRow[];
}

export default function DecisionFeed({ brokenDetails }: DecisionFeedProps) {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  // Top 5 critical signals: broken + core missing, sorted by lost revenue
  const signals = brokenDetails
    .filter(r => r.core_size_missing || r.lost_revenue_est > 0)
    .sort((a, b) => (b.lost_revenue_est || 0) - (a.lost_revenue_est || 0))
    .slice(0, 5);

  const productIds = signals.map(s => s.product_id);

  // Fetch missing + present sizes for these products
  const { data: sizeDataMap } = useQuery({
    queryKey: ['decision-feed-size-data', tenantId, productIds.join(',')],
    queryFn: async () => {
      if (productIds.length === 0) return new Map<string, { missing: string[]; present: string[] }>();
      const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
      const sortSizes = (arr: string[]) => arr.sort((a, b) => {
        const ia = order.indexOf(a), ib = order.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });

      // Fetch missing sizes
      const { data: compData } = await buildQuery('kpi_size_completeness' as any)
        .select('style_id,missing_sizes')
        .in('style_id', productIds)
        .neq('status', 'HEALTHY')
        .limit(500);

      const missingMap = new Map<string, Set<string>>();
      for (const row of (compData || []) as any[]) {
        const sizes = row.missing_sizes as string[];
        if (!sizes || sizes.length === 0) continue;
        if (!missingMap.has(row.style_id)) missingMap.set(row.style_id, new Set());
        for (const s of sizes) missingMap.get(row.style_id)!.add(s);
      }

      // Fetch all expected sizes
      const { data: skuData } = await buildQuery('inv_sku_fc_mapping' as any)
        .select('fc_id,size')
        .in('fc_id', productIds)
        .eq('is_active', true)
        .limit(500);

      const allSizesMap = new Map<string, Set<string>>();
      for (const row of (skuData || []) as any[]) {
        if (!row.size) continue;
        if (!allSizesMap.has(row.fc_id)) allSizesMap.set(row.fc_id, new Set());
        allSizesMap.get(row.fc_id)!.add(row.size);
      }

      const result = new Map<string, { missing: string[]; present: string[] }>();
      for (const pid of productIds) {
        const missing = missingMap.has(pid) ? sortSizes([...missingMap.get(pid)!]) : [];
        const allSizes = allSizesMap.has(pid) ? [...allSizesMap.get(pid)!] : [];
        const missingSet = new Set(missing);
        const present = sortSizes(allSizes.filter(s => !missingSet.has(s)));
        if (missing.length > 0 || present.length > 0) {
          result.set(pid, { missing, present });
        }
      }
      return result;
    },
    enabled: !!tenantId && isReady && productIds.length > 0,
  });

  if (signals.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Tín Hiệu Quan Trọng
          <Badge variant="secondary" className="text-[10px]">Top {signals.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {signals.map((signal) => {
          const severity = signal.size_health_score < 30 ? 'critical' :
            signal.size_health_score < 50 ? 'high' : 'medium';
          const sizeData = sizeDataMap?.get(signal.product_id);
          
          return (
            <div
              key={signal.product_id}
              className={`rounded-lg border-l-4 p-3 ${
                severity === 'critical' ? 'border-l-destructive bg-destructive/5' :
                severity === 'high' ? 'border-l-orange-500 bg-orange-500/5' :
                'border-l-amber-400 bg-amber-400/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <ShieldAlert className={`h-3.5 w-3.5 shrink-0 ${
                      severity === 'critical' ? 'text-destructive' :
                      severity === 'high' ? 'text-orange-600' : 'text-amber-600'
                    }`} />
                    <span className="text-sm font-semibold truncate">{signal.product_name}</span>
                    {signal.core_size_missing && (
                      <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30 shrink-0">
                        Size core thiếu
                      </Badge>
                    )}
                  </div>
                  {/* Size map display: present + missing */}
                  {sizeData && (sizeData.present.length > 0 || sizeData.missing.length > 0) && (
                    <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                      {sizeData.present.map(size => (
                        <Badge key={`p-${size}`} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium text-emerald-700 border-emerald-500/40 bg-emerald-500/10">
                          {size}
                        </Badge>
                      ))}
                      {sizeData.missing.map(size => (
                        <Badge key={`m-${size}`} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-bold text-destructive border-destructive/40 bg-destructive/5 line-through">
                          {size}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {signal.lost_revenue_est > 0 && (
                      <span>Mất: <span className="font-semibold text-destructive">{formatVNDCompact(signal.lost_revenue_est)}</span></span>
                    )}
                    {signal.cash_locked_value > 0 && (
                      <span>Khóa: <span className="font-semibold text-orange-600">{formatVNDCompact(signal.cash_locked_value)}</span></span>
                    )}
                    {signal.markdown_eta_days && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {signal.markdown_eta_days}d → MD
                      </span>
                    )}
                  </div>
                </div>
                <div className={`text-2xl font-black tabular-nums ${
                  signal.size_health_score < 30 ? 'text-destructive' :
                  signal.size_health_score < 50 ? 'text-orange-600' : 'text-amber-600'
                }`}>
                  {Math.round(signal.size_health_score)}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}