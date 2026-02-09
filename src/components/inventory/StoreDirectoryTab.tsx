import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Store, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { getTierStyle } from '@/lib/inventory-store-map';

interface StoreMetrics {
  id: string;
  store_name: string;
  store_code: string;
  tier: string;
  region: string;
  location_type: string;
  capacity: number;
  total_sold: number;
  avg_velocity: number;
  active_fcs: number;
  total_on_hand: number;
  total_available: number;
  avg_woc: number;
}

type SortKey = 'store_name' | 'tier' | 'region' | 'total_sold' | 'avg_velocity' | 'total_on_hand' | 'avg_woc' | 'active_fcs';

function useStoreMetrics() {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  // Fetch stores
  const storesQuery = useQuery({
    queryKey: ['inv-store-directory-stores', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_stores', '*')
        .eq('is_active', true)
        .order('store_name', { ascending: true })
        .limit(500);
      if (error) throw error;
      return data as any[];
    },
    enabled: isReady,
  });

  // Fetch demand aggregates
  const demandQuery = useQuery({
    queryKey: ['inv-store-directory-demand', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery(
        'inv_state_demand',
        'store_id, total_sold, sales_velocity, fc_id'
      ).limit(1000);
      if (error) throw error;
      return data as any[];
    },
    enabled: isReady,
  });

  // Fetch position aggregates
  const positionsQuery = useQuery({
    queryKey: ['inv-store-directory-positions', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery(
        'inv_state_positions',
        'store_id, on_hand, available, weeks_of_cover, fc_id'
      ).limit(1000);
      if (error) throw error;
      return data as any[];
    },
    enabled: isReady,
  });

  const metrics = useMemo(() => {
    if (!storesQuery.data) return [];

    const demandByStore = new Map<string, { totalSold: number; velocitySum: number; velocityCount: number; fcSet: Set<string> }>();
    for (const d of demandQuery.data || []) {
      const entry = demandByStore.get(d.store_id) || { totalSold: 0, velocitySum: 0, velocityCount: 0, fcSet: new Set() };
      entry.totalSold += Number(d.total_sold) || 0;
      entry.velocitySum += Number(d.sales_velocity) || 0;
      entry.velocityCount++;
      if (d.fc_id) entry.fcSet.add(d.fc_id);
      demandByStore.set(d.store_id, entry);
    }

    const posByStore = new Map<string, { onHand: number; available: number; wocSum: number; wocCount: number }>();
    for (const p of positionsQuery.data || []) {
      const entry = posByStore.get(p.store_id) || { onHand: 0, available: 0, wocSum: 0, wocCount: 0 };
      entry.onHand += Number(p.on_hand) || 0;
      entry.available += Number(p.available) || 0;
      const woc = Number(p.weeks_of_cover) || 0;
      if (woc < 999) { entry.wocSum += woc; entry.wocCount++; }
      posByStore.set(p.store_id, entry);
    }

    return storesQuery.data
      .filter((s: any) => s.location_type === 'store')
      .map((s: any): StoreMetrics => {
        const demand = demandByStore.get(s.id);
        const pos = posByStore.get(s.id);
        return {
          id: s.id,
          store_name: s.store_name,
          store_code: s.store_code,
          tier: s.tier || '-',
          region: s.region || '-',
          location_type: s.location_type,
          capacity: Number(s.capacity) || 0,
          total_sold: demand?.totalSold || 0,
          avg_velocity: demand ? (demand.velocitySum / (demand.velocityCount || 1)) : 0,
          active_fcs: demand?.fcSet.size || 0,
          total_on_hand: pos?.onHand || 0,
          total_available: pos?.available || 0,
          avg_woc: pos ? (pos.wocSum / (pos.wocCount || 1)) : 0,
        };
      });
  }, [storesQuery.data, demandQuery.data, positionsQuery.data]);

  return {
    data: metrics,
    isLoading: storesQuery.isLoading || demandQuery.isLoading || positionsQuery.isLoading,
  };
}

export function StoreDirectoryTab() {
  const { data: stores, isLoading } = useStoreMetrics();
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('total_sold');
  const [sortAsc, setSortAsc] = useState(false);

  const regions = useMemo(() => {
    const set = new Set(stores.map(s => s.region));
    return [...set].sort();
  }, [stores]);

  const filtered = useMemo(() => {
    let result = stores;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.store_name.toLowerCase().includes(q) || s.store_code.includes(q));
    }
    if (filterTier !== 'all') result = result.filter(s => s.tier === filterTier);
    if (filterRegion !== 'all') result = result.filter(s => s.region === filterRegion);

    result.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') return sortAsc ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return result;
  }, [stores, search, filterTier, filterRegion, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  // Summary
  const summary = useMemo(() => {
    const tierCounts: Record<string, number> = {};
    stores.forEach(s => { tierCounts[s.tier] = (tierCounts[s.tier] || 0) + 1; });
    return { total: stores.length, tierCounts };
  }, [stores]);

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Đang tải dữ liệu cửa hàng...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Store className="h-4 w-4" />
          <span>{summary.total} cửa hàng</span>
        </div>
        {['S', 'A', 'B', 'C'].map(t => {
          const count = summary.tierCounts[t] || 0;
          if (!count) return null;
          const ts = getTierStyle(t);
          return (
            <Badge key={t} variant="outline" className={cn("text-xs", ts.bg, ts.text)}>
              Tier {t}: {count}
            </Badge>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm cửa hàng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả Tier</SelectItem>
            {['S', 'A', 'B', 'C'].map(t => (
              <SelectItem key={t} value={t}>Tier {t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Khu vực" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả KV</SelectItem>
            {regions.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-[200px]">
                <SortButton label="Cửa hàng" sortKey="store_name" current={sortKey} asc={sortAsc} onClick={handleSort} />
              </TableHead>
              <TableHead className="text-xs w-[60px]">
                <SortButton label="Tier" sortKey="tier" current={sortKey} asc={sortAsc} onClick={handleSort} />
              </TableHead>
              <TableHead className="text-xs w-[100px]">
                <SortButton label="Khu vực" sortKey="region" current={sortKey} asc={sortAsc} onClick={handleSort} />
              </TableHead>
              <TableHead className="text-xs text-right">
                <SortButton label="Tồn kho" sortKey="total_on_hand" current={sortKey} asc={sortAsc} onClick={handleSort} />
              </TableHead>
              <TableHead className="text-xs text-right">
                <SortButton label="Đã bán" sortKey="total_sold" current={sortKey} asc={sortAsc} onClick={handleSort} />
              </TableHead>
              <TableHead className="text-xs text-right">
                <SortButton label="Velocity" sortKey="avg_velocity" current={sortKey} asc={sortAsc} onClick={handleSort} />
              </TableHead>
              <TableHead className="text-xs text-right">
                <SortButton label="Avg WoC" sortKey="avg_woc" current={sortKey} asc={sortAsc} onClick={handleSort} />
              </TableHead>
              <TableHead className="text-xs text-right">
                <SortButton label="FC actives" sortKey="active_fcs" current={sortKey} asc={sortAsc} onClick={handleSort} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(s => {
              const ts = getTierStyle(s.tier);
              return (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">
                    <div className="font-medium">{s.store_name}</div>
                    <div className="text-xs text-muted-foreground">{s.store_code}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", ts.bg, ts.text)}>{s.tier}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.region}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{s.total_on_hand.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{s.total_sold.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {(s.avg_velocity * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    <span className={cn(
                      s.avg_woc < 2 && 'text-red-400',
                      s.avg_woc >= 2 && s.avg_woc < 4 && 'text-amber-400',
                      s.avg_woc >= 4 && 'text-emerald-400',
                    )}>
                      {s.avg_woc.toFixed(1)}w
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{s.active_fcs}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy cửa hàng
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SortButton({ label, sortKey, current, asc, onClick }: {
  label: string; sortKey: SortKey; current: SortKey; asc: boolean; onClick: (k: SortKey) => void;
}) {
  const isActive = current === sortKey;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-auto p-0 font-medium text-xs hover:bg-transparent", isActive && "text-foreground")}
      onClick={() => onClick(sortKey)}
    >
      {label}
      <ArrowUpDown className={cn("ml-1 h-3 w-3", isActive ? 'opacity-100' : 'opacity-40')} />
    </Button>
  );
}
