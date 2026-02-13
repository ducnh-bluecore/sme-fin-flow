import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';
import type { SizeHealthDetailRow } from '@/hooks/inventory/useSizeHealthGroups';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

interface PrioritizedBreakdownProps {
  details: SizeHealthDetailRow[];
  isLoading: boolean;
  hasMore: boolean;
  totalCount: number;
  onLoadMore: () => void;
  onViewEvidence?: (productId: string) => void;
}

function getFixability(row: SizeHealthDetailRow): { label: string; stars: number; className: string } {
  if (row.markdown_risk_score >= 80) return { label: 'Sẽ giảm giá', stars: 1, className: 'text-destructive bg-destructive/10' };
  if (row.lost_revenue_est > 0 && row.cash_locked_value < row.lost_revenue_est * 0.3) return { label: 'Dễ', stars: 4, className: 'text-emerald-700 bg-emerald-500/10' };
  if (row.markdown_risk_score >= 40 && row.markdown_risk_score < 80) return { label: 'Trung bình', stars: 3, className: 'text-amber-700 bg-amber-500/10' };
  if (row.cash_locked_value > 0) return { label: 'Khó', stars: 2, className: 'text-orange-700 bg-orange-500/10' };
  return { label: 'Trung bình', stars: 3, className: 'text-amber-700 bg-amber-500/10' };
}

export default function PrioritizedBreakdown({
  details, isLoading, hasMore, totalCount, onLoadMore, onViewEvidence,
}: PrioritizedBreakdownProps) {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  // Sort by financial damage score
  const sorted = useMemo(() => {
    return [...details].sort((a, b) => {
      const damageA = (a.lost_revenue_est || 0) + (a.cash_locked_value || 0) + (a.margin_leak_value || 0);
      const damageB = (b.lost_revenue_est || 0) + (b.cash_locked_value || 0) + (b.margin_leak_value || 0);
      return damageB - damageA;
    });
  }, [details]);

  const productIds = useMemo(() => sorted.map(s => s.product_id), [sorted]);

  // Fetch missing sizes for all displayed products
  const { data: sizeDataMap } = useQuery({
    queryKey: ['breakdown-size-data', tenantId, productIds.join(',')],
    queryFn: async () => {
      if (productIds.length === 0) return new Map<string, { missing: string[]; present: string[]; partial: string[] }>();
      const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
      const sortSizes = (arr: string[]) => arr.sort((a, b) => {
        const ia = order.indexOf(a), ib = order.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });

      // Fetch missing sizes per store
      const { data: compData } = await buildQuery('kpi_size_completeness' as any)
        .select('style_id,store_id,missing_sizes')
        .in('style_id', productIds)
        .limit(5000);

      // Count: how many stores carry each product, and how many stores each size is missing in
      const storeCountMap = new Map<string, number>(); // product -> total stores
      const sizeMissCountMap = new Map<string, Map<string, number>>(); // product -> size -> miss count
      for (const row of (compData || []) as any[]) {
        const pid = row.style_id as string;
        storeCountMap.set(pid, (storeCountMap.get(pid) || 0) + 1);
        const sizes = row.missing_sizes as string[];
        if (!sizes || sizes.length === 0) continue;
        if (!sizeMissCountMap.has(pid)) sizeMissCountMap.set(pid, new Map());
        const sizeMap = sizeMissCountMap.get(pid)!;
        for (const s of sizes) sizeMap.set(s, (sizeMap.get(s) || 0) + 1);
      }

      // Fetch all expected sizes from inv_sku_fc_mapping
      const { data: skuData } = await buildQuery('inv_sku_fc_mapping' as any)
        .select('fc_id,size')
        .in('fc_id', productIds)
        .eq('is_active', true)
        .limit(5000);

      const allSizesMap = new Map<string, Set<string>>();
      for (const row of (skuData || []) as any[]) {
        if (!row.size) continue;
        if (!allSizesMap.has(row.fc_id)) allSizesMap.set(row.fc_id, new Set());
        allSizesMap.get(row.fc_id)!.add(row.size);
      }

      const result = new Map<string, { missing: string[]; present: string[]; partial: string[] }>();
      for (const pid of productIds) {
        const allSizes = allSizesMap.has(pid) ? [...allSizesMap.get(pid)!] : [];
        const totalStores = storeCountMap.get(pid) || 1;
        const sizeMap = sizeMissCountMap.get(pid) || new Map();
        
        const missing: string[] = []; // missing in ALL stores
        const partial: string[] = []; // missing in some stores (true "lẻ size")
        const present: string[] = []; // available in all stores
        
        for (const size of allSizes) {
          const missCount = sizeMap.get(size) || 0;
          if (missCount >= totalStores) missing.push(size);
          else if (missCount > 0) partial.push(size);
          else present.push(size);
        }
        
        if (missing.length > 0 || partial.length > 0 || present.length > 0) {
          result.set(pid, {
            missing: sortSizes(missing),
            present: sortSizes(present),
            partial: sortSizes(partial),
          });
        }
      }
      return result;
    },
    enabled: !!tenantId && isReady && productIds.length > 0,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" /> Mẫu Lẻ Size — Ưu Tiên Theo Thiệt Hại
            <Badge variant="destructive" className="text-[10px]">{totalCount} mẫu</Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading && sorted.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải...
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs">Không có mẫu lẻ size</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[180px]">Mẫu SP</TableHead>
                    <TableHead className="text-xs">Size Map</TableHead>
                    <TableHead className="text-center text-xs">Sức Khỏe</TableHead>
                    <TableHead className="text-right text-xs">DT Mất</TableHead>
                    <TableHead className="text-right text-xs">Vốn Khóa</TableHead>
                    <TableHead className="text-right text-xs">Rò Biên</TableHead>
                    <TableHead className="text-center text-xs">Khả Năng Fix</TableHead>
                    <TableHead className="text-center text-xs">MD ETA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((row, i) => {
                    const fix = getFixability(row);
                    const totalDamage = (row.lost_revenue_est || 0) + (row.cash_locked_value || 0) + (row.margin_leak_value || 0);
                    return (
                      <TableRow
                        key={row.product_id}
                        className={`cursor-pointer hover:bg-muted/50 ${i < 3 ? 'bg-destructive/5' : ''}`}
                        onClick={() => onViewEvidence?.(row.product_id)}
                      >
                        <TableCell className="text-xs font-medium max-w-[180px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground font-bold text-[10px] w-4">{i + 1}</span>
                            <span className="truncate">{row.product_name}</span>
                            {row.core_size_missing && (
                              <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30 shrink-0">core</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {(() => {
                            const sizeData = sizeDataMap?.get(row.product_id);
                            if (!sizeData || (sizeData.missing.length === 0 && sizeData.present.length === 0 && sizeData.partial.length === 0)) return <span className="text-muted-foreground">—</span>;
                            return (
                              <div className="flex items-center gap-0.5 flex-wrap">
                                {sizeData.present.map(size => (
                                  <Badge key={`p-${size}`} variant="outline" className="text-[9px] px-1 py-0 h-4 font-medium text-emerald-700 border-emerald-500/40 bg-emerald-500/10">
                                    {size}
                                  </Badge>
                                ))}
                                {sizeData.partial.map(size => (
                                  <Badge key={`w-${size}`} variant="outline" className="text-[9px] px-1 py-0 h-4 font-semibold text-amber-700 border-amber-500/40 bg-amber-500/10">
                                    {size}
                                  </Badge>
                                ))}
                                {sizeData.missing.map(size => (
                                  <Badge key={`m-${size}`} variant="outline" className="text-[9px] px-1 py-0 h-4 font-bold text-destructive border-destructive/40 bg-destructive/5 line-through">
                                    {size}
                                  </Badge>
                                ))}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold text-sm ${
                            row.size_health_score >= 80 ? 'text-emerald-600' :
                            row.size_health_score >= 60 ? 'text-amber-600' :
                            row.size_health_score >= 40 ? 'text-orange-600' : 'text-destructive'
                          }`}>
                            {Math.round(row.size_health_score)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {row.lost_revenue_est > 0 ? <span className="text-destructive">{formatVNDCompact(row.lost_revenue_est)}</span> : '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {row.cash_locked_value > 0 ? <span className="text-orange-600">{formatVNDCompact(row.cash_locked_value)}</span> : '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {row.margin_leak_value > 0 ? <span className="text-red-600">{formatVNDCompact(row.margin_leak_value)}</span> : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-[10px] ${fix.className}`}>
                            {fix.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {row.markdown_eta_days ? `${row.markdown_eta_days}d` : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {(hasMore || isLoading) && (
              <div className="flex justify-center py-3 border-t">
                <Button variant="ghost" size="sm" disabled={isLoading} onClick={onLoadMore}>
                  {isLoading ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Đang tải...</> : <>Tải thêm ({sorted.length}/{totalCount})</>}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
