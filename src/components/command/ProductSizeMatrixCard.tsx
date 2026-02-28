import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, Package, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { formatVNDCompact } from '@/lib/formatters';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useQuery } from '@tanstack/react-query';
import type { SizeHealthDetailRow } from '@/hooks/inventory/useSizeHealthGroups';

interface Props {
  /** All broken/risk products from health groups */
  products: SizeHealthDetailRow[];
  fcNames?: Map<string, string>;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
}

interface SizeStoreEntry {
  sku: string;
  size_code: string;
  store_name: string;
  on_hand: number;
}

const CURVE_LABELS: Record<string, { label: string; className: string }> = {
  broken: { label: 'Lẻ size', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  risk: { label: 'Rủi ro', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  watch: { label: 'Theo dõi', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  healthy: { label: 'Tốt', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

function SizeMatrix({ fcId }: { fcId: string }) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  const { data, isLoading } = useQuery({
    queryKey: ['size-breakdown', tenantId, fcId],
    queryFn: async () => {
      const { data, error } = await client.rpc('fn_size_breakdown' as any, {
        p_tenant_id: tenantId!,
        p_fc_id: fcId,
      });
      if (error) throw error;
      return data as any as { entries: SizeStoreEntry[]; summary: Array<{ size_code: string; total: number }> };
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  const entries = data?.entries || [];
  const summary = data?.summary || [];

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground py-3 px-4">Không có dữ liệu tồn kho cho sản phẩm này.</p>;
  }

  // Build matrix: rows = stores, cols = sizes
  const sizeOrder = summary.map(s => s.size_code);
  const storeMap = new Map<string, Map<string, number>>();
  const storeTotals = new Map<string, number>();

  for (const e of entries) {
    if (!storeMap.has(e.store_name)) storeMap.set(e.store_name, new Map());
    storeMap.get(e.store_name)!.set(e.size_code, (storeMap.get(e.store_name)!.get(e.size_code) || 0) + e.on_hand);
    storeTotals.set(e.store_name, (storeTotals.get(e.store_name) || 0) + e.on_hand);
  }

  // Sort stores by total desc
  const storeNames = Array.from(storeMap.keys()).sort((a, b) => (storeTotals.get(b) || 0) - (storeTotals.get(a) || 0));

  // Detect broken sizes per store (store has some sizes but missing others)
  const hasBrokenSize = (storeSizes: Map<string, number>) => {
    const presentCount = sizeOrder.filter(s => (storeSizes.get(s) || 0) > 0).length;
    return presentCount > 0 && presentCount < sizeOrder.length;
  };

  return (
    <ScrollArea className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs sticky left-0 bg-background z-10 min-w-[140px]">Cửa hàng</TableHead>
            {sizeOrder.map(size => (
              <TableHead key={size} className="text-xs text-center min-w-[50px]">{size}</TableHead>
            ))}
            <TableHead className="text-xs text-center font-semibold min-w-[60px]">Tổng</TableHead>
            <TableHead className="text-xs text-center min-w-[70px]">Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {storeNames.map(store => {
            const sizes = storeMap.get(store)!;
            const total = storeTotals.get(store) || 0;
            const isBroken = hasBrokenSize(sizes);
            return (
              <TableRow key={store} className={isBroken ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                <TableCell className="text-xs font-medium sticky left-0 bg-background z-10">
                  {store}
                </TableCell>
                {sizeOrder.map(size => {
                  const qty = sizes.get(size) || 0;
                  return (
                    <TableCell key={size} className={`text-center text-xs font-mono ${qty === 0 ? 'text-red-500 font-bold' : 'text-foreground'}`}>
                      {qty === 0 ? '✗' : qty}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center text-xs font-mono font-semibold">{total}</TableCell>
                <TableCell className="text-center">
                  {isBroken ? (
                    <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      <AlertTriangle className="h-3 w-3 mr-0.5" /> Lẻ size
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Đủ size
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {/* Summary row */}
          <TableRow className="bg-muted/50 font-semibold">
            <TableCell className="text-xs sticky left-0 bg-muted/50 z-10">Tổng hệ thống</TableCell>
            {sizeOrder.map(size => {
              const s = summary.find(x => x.size_code === size);
              return <TableCell key={size} className="text-center text-xs font-mono">{s?.total || 0}</TableCell>;
            })}
            <TableCell className="text-center text-xs font-mono">{summary.reduce((a, b) => a + b.total, 0)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

export default function ProductSizeMatrixCard({ products, fcNames, onLoadMore, isLoadingMore, hasMore }: Props) {
  const [expandedFc, setExpandedFc] = useState<Set<string>>(new Set());
  const [filterState, setFilterState] = useState<string>('all');

  const toggleFc = useCallback((fcId: string) => {
    setExpandedFc(prev => {
      const next = new Set(prev);
      next.has(fcId) ? next.delete(fcId) : next.add(fcId);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    if (filterState === 'all') return products;
    return products.filter(p => p.curve_state === filterState);
  }, [products, filterState]);

  // Count by state
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      counts[p.curve_state] = (counts[p.curve_state] || 0) + 1;
    }
    return counts;
  }, [products]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Package className="h-4 w-4" />
            Tồn Kho Theo Sản Phẩm — Ma Trận Size × Cửa Hàng
          </CardTitle>
          <span className="text-xs text-muted-foreground">{filtered.length} sản phẩm</span>
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          <Badge
            variant={filterState === 'all' ? 'default' : 'outline'}
            className="cursor-pointer text-[10px]"
            onClick={() => setFilterState('all')}
          >
            Tất cả ({products.length})
          </Badge>
          {Object.entries(CURVE_LABELS).map(([state, cfg]) => (
            stateCounts[state] ? (
              <Badge
                key={state}
                variant="outline"
                className={`cursor-pointer text-[10px] ${filterState === state ? cfg.className + ' ring-1 ring-offset-1' : ''}`}
                onClick={() => setFilterState(state)}
              >
                {cfg.label} ({stateCounts[state]})
              </Badge>
            ) : null
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        {filtered.map(product => {
          const isOpen = expandedFc.has(product.product_id);
          const name = fcNames?.get(product.product_id) || product.product_name || product.product_id?.slice(0, 12);
          const curveConfig = CURVE_LABELS[product.curve_state] || CURVE_LABELS.watch;

          return (
            <Collapsible key={product.product_id} open={isOpen} onOpenChange={() => toggleFc(product.product_id)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-medium text-sm text-left">{name}</span>
                    <Badge variant="outline" className={`text-[10px] ${curveConfig.className}`}>{curveConfig.label}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">
                      Health: <strong className={product.size_health_score < 60 ? 'text-red-600' : product.size_health_score < 80 ? 'text-amber-600' : 'text-emerald-600'}>
                        {Math.round(product.size_health_score)}
                      </strong>
                    </span>
                    {product.lost_revenue_est > 0 && (
                      <span className="text-red-600">Lost: {formatVNDCompact(product.lost_revenue_est)}</span>
                    )}
                    {product.cash_locked_value > 0 && (
                      <span className="text-amber-600">Lock: {formatVNDCompact(product.cash_locked_value)}</span>
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 mt-1 border rounded-md overflow-hidden">
                  <SizeMatrix fcId={product.product_id} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {hasMore && (
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="w-full py-2 text-xs text-primary hover:underline disabled:opacity-50"
          >
            {isLoadingMore ? 'Đang tải...' : 'Tải thêm sản phẩm'}
          </button>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Không có sản phẩm nào trong nhóm này.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
