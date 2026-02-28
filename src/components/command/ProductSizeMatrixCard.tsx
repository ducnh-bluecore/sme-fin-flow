import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, Package, AlertTriangle, Search, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { formatVNDCompact } from '@/lib/formatters';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useQuery } from '@tanstack/react-query';
import type { SizeHealthDetailRow } from '@/hooks/inventory/useSizeHealthGroups';

interface Props {
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

interface SearchResult {
  id: string;
  fc_name: string;
  fc_code: string;
}

const CURVE_LABELS: Record<string, { label: string; className: string }> = {
  broken: { label: 'Lẻ size', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  out_of_stock: { label: 'Hết hàng', className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
  risk: { label: 'Rủi ro', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  watch: { label: 'Theo dõi', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  healthy: { label: 'Tốt', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

function SizeMatrix({ fcId }: { fcId: string }) {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();

  const { data, isLoading } = useQuery({
    queryKey: ['size-breakdown', tenantId, fcId],
    queryFn: async () => {
      const { data, error } = await callRpc<{ entries: SizeStoreEntry[]; summary: Array<{ size_code: string; total: number }> }>('fn_size_breakdown', {
        p_tenant_id: tenantId!,
        p_fc_id: fcId,
      });
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="p-4"><Skeleton className="h-20 w-full" /></div>;

  const entries = data?.entries || [];
  const summary = data?.summary || [];

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground py-3 px-4">Không có dữ liệu tồn kho cho sản phẩm này.</p>;
  }

  const sizeOrder = summary.map(s => s.size_code);
  const storeMap = new Map<string, Map<string, number>>();
  const storeTotals = new Map<string, number>();

  for (const e of entries) {
    if (!storeMap.has(e.store_name)) storeMap.set(e.store_name, new Map());
    storeMap.get(e.store_name)!.set(e.size_code, (storeMap.get(e.store_name)!.get(e.size_code) || 0) + e.on_hand);
    storeTotals.set(e.store_name, (storeTotals.get(e.store_name) || 0) + e.on_hand);
  }

  const storeNames = Array.from(storeMap.keys()).sort((a, b) => (storeTotals.get(b) || 0) - (storeTotals.get(a) || 0));

  const getStoreStatus = (storeSizes: Map<string, number>, total: number): 'out_of_stock' | 'broken' | 'full' => {
    if (total === 0) return 'out_of_stock';
    const presentCount = sizeOrder.filter(s => (storeSizes.get(s) || 0) > 0).length;
    return presentCount < sizeOrder.length ? 'broken' : 'full';
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
            const status = getStoreStatus(sizes, total);
            return (
              <TableRow key={store} className={status === 'broken' ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                <TableCell className="text-xs font-medium sticky left-0 bg-background z-10">{store}</TableCell>
                {sizeOrder.map(size => {
                  const qty = sizes.get(size) || 0;
                  return (
                    <TableCell key={size} className={`text-center text-xs font-mono ${qty === 0 ? 'text-destructive font-bold' : 'text-foreground'}`}>
                      {qty === 0 ? '✗' : qty}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center text-xs font-mono font-semibold">{total}</TableCell>
                <TableCell className="text-center">
                  {status === 'out_of_stock' ? (
                    <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                      Hết hàng
                    </Badge>
                  ) : status === 'broken' ? (
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
  const [searchTerm, setSearchTerm] = useState('');
  const [createdAfterMonths, setCreatedAfterMonths] = useState<string>('all');
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  // Search all FCs from DB when user types a search term
  const { data: searchResults = [] } = useQuery({
    queryKey: ['fc-search', tenantId, searchTerm],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_family_codes' as any, 'id,fc_name,fc_code')
        .ilike('fc_name', `%${searchTerm}%`)
        .eq('is_active', true)
        .limit(30);
      if (error) throw error;
      return (data || []) as unknown as SearchResult[];
    },
    enabled: isReady && !!tenantId && searchTerm.length >= 2,
    staleTime: 30 * 1000,
  });

  const toggleFc = useCallback((fcId: string) => {
    setExpandedFc(prev => {
      const next = new Set(prev);
      next.has(fcId) ? next.delete(fcId) : next.add(fcId);
      return next;
    });
  }, []);

  // When searching, show search results; otherwise show health-based list
  const isSearching = searchTerm.length >= 2;

  const createdAfterDate = useMemo(() => {
    if (createdAfterMonths === 'all') return null;
    const d = new Date();
    d.setMonth(d.getMonth() - parseInt(createdAfterMonths));
    return d.toISOString().split('T')[0];
  }, [createdAfterMonths]);

  const filtered = useMemo(() => {
    let list = products;
    if (filterState !== 'all') list = list.filter(p => p.curve_state === filterState);
    if (createdAfterDate) list = list.filter(p => p.product_created_date && p.product_created_date >= createdAfterDate);
    return list;
  }, [products, filterState, createdAfterDate]);

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      counts[p.curve_state] = (counts[p.curve_state] || 0) + 1;
    }
    return counts;
  }, [products]);

  const renderProductRow = (id: string, name: string, curveState?: string, healthScore?: number, lostRevenue?: number, cashLocked?: number, createdDate?: string | null) => {
    const isOpen = expandedFc.has(id);
    const curveConfig = curveState ? CURVE_LABELS[curveState] : null;

    return (
      <Collapsible key={id} open={isOpen} onOpenChange={() => toggleFc(id)}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className="font-medium text-sm text-left">{name}</span>
              {curveConfig && <Badge variant="outline" className={`text-[10px] ${curveConfig.className}`}>{curveConfig.label}</Badge>}
              {createdDate && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Calendar className="h-3 w-3" />
                  {createdDate}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs">
              {healthScore != null && (
                <span className="text-muted-foreground">
                  Health: <strong className={healthScore < 60 ? 'text-destructive' : healthScore < 80 ? 'text-amber-600' : 'text-emerald-600'}>
                    {Math.round(healthScore)}
                  </strong>
                </span>
              )}
              {(lostRevenue ?? 0) > 0 && <span className="text-destructive">Lost: {formatVNDCompact(lostRevenue!)}</span>}
              {(cashLocked ?? 0) > 0 && <span className="text-amber-600">Lock: {formatVNDCompact(cashLocked!)}</span>}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-4 mt-1 border rounded-md overflow-hidden">
            <SizeMatrix fcId={id} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Package className="h-4 w-4" />
            Tồn Kho Theo Sản Phẩm — Ma Trận Size × Cửa Hàng
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {isSearching ? `${searchResults.length} kết quả` : `${filtered.length} sản phẩm`}
          </span>
        </div>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm sản phẩm (nhập ít nhất 2 ký tự)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Filter badges + date filter — only show when not searching */}
        {!isSearching && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div className="flex gap-1.5 flex-wrap flex-1">
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
            <Select value={createdAfterMonths} onValueChange={setCreatedAfterMonths}>
              <SelectTrigger className="h-7 w-[150px] text-[10px]">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3" className="text-xs">3 tháng gần đây</SelectItem>
                <SelectItem value="6" className="text-xs">6 tháng gần đây</SelectItem>
                <SelectItem value="12" className="text-xs">12 tháng gần đây</SelectItem>
                <SelectItem value="24" className="text-xs">24 tháng gần đây</SelectItem>
                <SelectItem value="all" className="text-xs">Tất cả thời gian</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        {/* Search results */}
        {isSearching ? (
          searchResults.length > 0 ? (
            searchResults.map(fc => renderProductRow(fc.id, fc.fc_name || fc.fc_code || fc.id))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Không tìm thấy sản phẩm "{searchTerm}"
            </div>
          )
        ) : (
          <>
            {filtered.map(product => renderProductRow(
              product.product_id,
              fcNames?.get(product.product_id) || product.product_name || product.product_id?.slice(0, 12),
              product.curve_state,
              product.size_health_score,
              product.lost_revenue_est,
              product.cash_locked_value,
              product.product_created_date,
            ))}

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
                {createdAfterMonths === 'all'
                  ? 'Không có sản phẩm nào trong nhóm này.'
                  : 'Không có sản phẩm trong khoảng ngày tạo đã chọn. Hãy đổi bộ lọc ngày.'}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
