import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShieldAlert, Loader2, Search, ChevronLeft, ChevronRight, AlertTriangle, Wrench, Eye } from 'lucide-react';
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

type TierKey = 'urgent' | 'action' | 'monitor';
type SortType = 'damage' | 'health' | 'md_eta';

const ITEMS_PER_PAGE = 20;

function getFixability(row: SizeHealthDetailRow): { label: string; stars: number; className: string } {
  if (row.markdown_risk_score >= 80) return { label: 'Sẽ giảm giá', stars: 1, className: 'text-destructive bg-destructive/10' };
  if (row.lost_revenue_est > 0 && row.cash_locked_value < row.lost_revenue_est * 0.3) return { label: 'Dễ', stars: 4, className: 'text-emerald-700 bg-emerald-500/10' };
  if (row.markdown_risk_score >= 40 && row.markdown_risk_score < 80) return { label: 'Trung bình', stars: 3, className: 'text-amber-700 bg-amber-500/10' };
  if (row.cash_locked_value > 0) return { label: 'Khó', stars: 2, className: 'text-orange-700 bg-orange-500/10' };
  return { label: 'Trung bình', stars: 3, className: 'text-amber-700 bg-amber-500/10' };
}

function getTierCategory(row: SizeHealthDetailRow): TierKey {
  if ((row.markdown_risk_score || 0) >= 80) return 'urgent';
  const fix = getFixability(row);
  if (fix.label === 'Khó' || fix.label === 'Trung bình') return 'action';
  return 'monitor';
}

function getDamageScore(row: SizeHealthDetailRow): number {
  return (row.lost_revenue_est || 0) + (row.cash_locked_value || 0) + (row.margin_leak_value || 0);
}

const TIER_CONFIG: Record<TierKey, { label: string; icon: typeof AlertTriangle; activeClass: string }> = {
  urgent: { label: 'Khẩn cấp', icon: AlertTriangle, activeClass: 'data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground' },
  action: { label: 'Cần xử lý', icon: Wrench, activeClass: 'data-[state=active]:bg-orange-600 data-[state=active]:text-white' },
  monitor: { label: 'Theo dõi', icon: Eye, activeClass: 'data-[state=active]:bg-amber-500 data-[state=active]:text-white' },
};

/* ── Paginated table for a single tier ── */
function TierTable({
  items,
  isLoading,
  onViewEvidence,
  sizeDataMap,
}: {
  items: SizeHealthDetailRow[];
  isLoading: boolean;
  onViewEvidence?: (productId: string) => void;
  sizeDataMap?: Map<string, { missing: string[]; present: string[]; partial: string[] }>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('damage');
  const [currentPage, setCurrentPage] = useState(1);

  const sorted = useMemo(() => {
    let list = [...items];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(r => r.product_name.toLowerCase().includes(term));
    }
    list.sort((a, b) => {
      if (sortBy === 'damage') return getDamageScore(b) - getDamageScore(a);
      if (sortBy === 'health') return (a.size_health_score || 0) - (b.size_health_score || 0);
      if (sortBy === 'md_eta') return (a.markdown_eta_days ?? 999) - (b.markdown_eta_days ?? 999);
      return 0;
    });
    return list;
  }, [items, sortBy, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  if (items.length === 0) {
    return <div className="text-center py-6 text-muted-foreground text-xs">Không có mẫu trong nhóm này</div>;
  }

  return (
    <div className="space-y-3">
      {/* Search + Sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm sản phẩm..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Select value={sortBy} onValueChange={v => { setSortBy(v as SortType); setCurrentPage(1); }}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="damage">Thiệt hại cao nhất</SelectItem>
            <SelectItem value="health">Sức khỏe thấp nhất</SelectItem>
            <SelectItem value="md_eta">MD ETA gần nhất</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{sorted.length} mẫu</span>
      </div>

      {/* Table */}
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
            {paginated.map((row, i) => {
              const fix = getFixability(row);
              const globalIndex = (safePage - 1) * ITEMS_PER_PAGE + i;
              return (
                <TableRow
                  key={row.product_id}
                  className={`cursor-pointer hover:bg-muted/50 ${globalIndex < 3 ? 'bg-destructive/5' : ''}`}
                  onClick={() => onViewEvidence?.(row.product_id)}
                >
                  <TableCell className="text-xs font-medium max-w-[180px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground font-bold text-[10px] w-4">{globalIndex + 1}</span>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-2 border-t">
          <span className="text-xs text-muted-foreground">
            Trang {safePage}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (safePage <= 3) page = i + 1;
              else if (safePage >= totalPages - 2) page = totalPages - 4 + i;
              else page = safePage - 2 + i;
              return (
                <Button key={page} variant={safePage === page ? 'default' : 'outline'} size="icon" className="h-7 w-7 text-xs" onClick={() => setCurrentPage(page)}>
                  {page}
                </Button>
              );
            })}
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */
export default function PrioritizedBreakdown({
  details, isLoading, hasMore, totalCount, onLoadMore, onViewEvidence,
}: PrioritizedBreakdownProps) {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  // Tier categorization
  const tiers = useMemo(() => {
    const urgent: SizeHealthDetailRow[] = [];
    const action: SizeHealthDetailRow[] = [];
    const monitor: SizeHealthDetailRow[] = [];
    for (const row of details) {
      const cat = getTierCategory(row);
      if (cat === 'urgent') urgent.push(row);
      else if (cat === 'action') action.push(row);
      else monitor.push(row);
    }
    return {
      urgent: { items: urgent, totalDamage: urgent.reduce((s, r) => s + getDamageScore(r), 0) },
      action: { items: action, totalDamage: action.reduce((s, r) => s + getDamageScore(r), 0) },
      monitor: { items: monitor, totalDamage: monitor.reduce((s, r) => s + getDamageScore(r), 0) },
    };
  }, [details]);

  const productIds = useMemo(() => details.map(s => s.product_id), [details]);

  // Fetch missing sizes for all products
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

      const { data: compData } = await buildQuery('kpi_size_completeness' as any)
        .select('style_id,store_id,missing_sizes')
        .in('style_id', productIds)
        .limit(5000);

      const storeCountMap = new Map<string, number>();
      const sizeMissCountMap = new Map<string, Map<string, number>>();
      for (const row of (compData || []) as any[]) {
        const pid = row.style_id as string;
        storeCountMap.set(pid, (storeCountMap.get(pid) || 0) + 1);
        const sizes = row.missing_sizes as string[];
        if (!sizes || sizes.length === 0) continue;
        if (!sizeMissCountMap.has(pid)) sizeMissCountMap.set(pid, new Map());
        const sizeMap = sizeMissCountMap.get(pid)!;
        for (const s of sizes) sizeMap.set(s, (sizeMap.get(s) || 0) + 1);
      }

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
        const missing: string[] = [];
        const partial: string[] = [];
        const present: string[] = [];
        for (const size of allSizes) {
          const missCount = sizeMap.get(size) || 0;
          if (missCount >= totalStores) missing.push(size);
          else if (missCount > 0) partial.push(size);
          else present.push(size);
        }
        if (missing.length > 0 || partial.length > 0 || present.length > 0) {
          result.set(pid, { missing: sortSizes(missing), present: sortSizes(present), partial: sortSizes(partial) });
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
        {isLoading && details.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải...
          </div>
        ) : details.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs">Không có mẫu lẻ size</div>
        ) : (
          <Tabs defaultValue="urgent" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-auto p-1">
              {(['urgent', 'action', 'monitor'] as TierKey[]).map(key => {
                const config = TIER_CONFIG[key];
                const tier = tiers[key];
                const Icon = config.icon;
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className={`flex items-center gap-1.5 text-xs py-2 ${config.activeClass}`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{config.label}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-0.5">
                      {tier.items.length}
                    </Badge>
                    {tier.totalDamage > 0 && (
                      <span className="text-[10px] opacity-70 hidden sm:inline">
                        • {formatVNDCompact(tier.totalDamage)}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {(['urgent', 'action', 'monitor'] as TierKey[]).map(key => (
              <TabsContent key={key} value={key} className="mt-3">
                <TierTable
                  items={tiers[key].items}
                  isLoading={isLoading}
                  onViewEvidence={onViewEvidence}
                  sizeDataMap={sizeDataMap}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Load more from server */}
        {hasMore && (
          <div className="flex justify-center py-2 border-t mt-3">
            <Button variant="ghost" size="sm" disabled={isLoading} onClick={onLoadMore} className="text-xs">
              {isLoading ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Đang tải...</> : <>Tải thêm từ server ({details.length}/{totalCount})</>}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
