import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Store, TrendingUp, Package, Clock, Layers, DollarSign, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { getTierStyle } from '@/lib/inventory-store-map';
import { useAvgUnitPrices } from '@/hooks/inventory/useAvgUnitPrices';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const FALLBACK_UNIT_PRICE = 250000; // VND - fallback for SKUs without sales data
const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };

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
  est_revenue: number;
  has_real_prices: boolean; // true if revenue uses actual SKU prices
  estimated_pct: number; // % of sold qty using fallback price
}

function useStoreMetrics() {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();
  const { data: priceMap } = useAvgUnitPrices();

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

  const demandQuery = useQuery({
    queryKey: ['inv-store-directory-demand', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_state_demand', 'store_id, sku, total_sold, sales_velocity, fc_id').limit(1000);
      if (error) throw error;
      return data as any[];
    },
    enabled: isReady,
  });

  const positionsQuery = useQuery({
    queryKey: ['inv-store-directory-positions', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_state_positions', 'store_id, on_hand, available, weeks_of_cover, fc_id').limit(1000);
      if (error) throw error;
      return data as any[];
    },
    enabled: isReady,
  });

  const metrics = useMemo(() => {
    if (!storesQuery.data) return [];
    const prices = priceMap || new Map<string, number>();

    // Group demand by store, computing revenue per SKU
    const demandByStore = new Map<string, {
      totalSold: number; velocitySum: number; velocityCount: number;
      fcSet: Set<string>; revenue: number; fallbackQty: number;
    }>();
    for (const d of demandQuery.data || []) {
      const entry = demandByStore.get(d.store_id) || {
        totalSold: 0, velocitySum: 0, velocityCount: 0,
        fcSet: new Set(), revenue: 0, fallbackQty: 0,
      };
      const sold = Number(d.total_sold) || 0;
      const unitPrice = prices.get(d.sku);
      entry.totalSold += sold;
      entry.revenue += sold * (unitPrice ?? FALLBACK_UNIT_PRICE);
      if (!unitPrice) entry.fallbackQty += sold;
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
        const totalSold = demand?.totalSold || 0;
        const estimatedPct = totalSold > 0 ? ((demand?.fallbackQty || 0) / totalSold) * 100 : 0;
        return {
          id: s.id,
          store_name: s.store_name,
          store_code: s.store_code,
          tier: s.tier || '-',
          region: s.region || '-',
          location_type: s.location_type,
          capacity: Number(s.capacity) || 0,
          total_sold: totalSold,
          avg_velocity: demand ? (demand.velocitySum / (demand.velocityCount || 1)) : 0,
          active_fcs: demand?.fcSet.size || 0,
          total_on_hand: pos?.onHand || 0,
          total_available: pos?.available || 0,
          avg_woc: pos ? (pos.wocSum / (pos.wocCount || 1)) : 0,
          est_revenue: demand?.revenue || 0,
          has_real_prices: estimatedPct < 100,
          estimated_pct: Math.round(estimatedPct),
        };
      });
  }, [storesQuery.data, demandQuery.data, positionsQuery.data, priceMap]);

  return {
    data: metrics,
    isLoading: storesQuery.isLoading || demandQuery.isLoading || positionsQuery.isLoading,
  };
}

const TIER_ACCENT: Record<string, { border: string; gradient: string; badge: string; text: string }> = {
  S: { border: 'border-purple-500/40', gradient: 'from-purple-500/10 to-transparent', badge: 'bg-purple-500 text-white', text: 'text-purple-400' },
  A: { border: 'border-blue-500/40', gradient: 'from-blue-500/10 to-transparent', badge: 'bg-blue-500 text-white', text: 'text-blue-400' },
  B: { border: 'border-amber-500/40', gradient: 'from-amber-500/10 to-transparent', badge: 'bg-amber-500 text-white', text: 'text-amber-400' },
  C: { border: 'border-muted', gradient: 'from-muted/50 to-transparent', badge: 'bg-muted text-muted-foreground', text: 'text-muted-foreground' },
};

function formatRevenue(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} triệu`;
  return v.toLocaleString() + 'đ';
}

function getTierAccent(tier: string) {
  return TIER_ACCENT[tier?.toUpperCase()] || TIER_ACCENT.C;
}

function MetricItem({ icon: Icon, label, value, sub, className }: { icon: any; label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className={cn("text-sm font-semibold font-mono leading-tight", className)}>{value}</div>
        <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
      </div>
    </div>
  );
}

function StoreCard({ store }: { store: StoreMetrics }) {
  const accent = getTierAccent(store.tier);

  return (
    <div className={cn(
      "relative rounded-xl border bg-card overflow-hidden transition-all hover:shadow-md hover:scale-[1.01]",
      accent.border
    )}>
      {/* Tier gradient accent */}
      <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", accent.gradient)} />

      <div className="relative p-4 space-y-3">
        {/* Header: Tier badge + Store name */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center text-lg font-black shrink-0 shadow-sm",
            accent.badge
          )}>
            {store.tier}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm leading-tight truncate">{store.store_name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground font-mono">{store.store_code}</span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{store.region}</span>
            </div>
          </div>
        </div>

        {/* Revenue highlight */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold font-mono">{formatRevenue(store.est_revenue)}</div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>Doanh thu {store.has_real_prices ? '' : 'ước tính'}</span>
              {store.estimated_pct > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-amber-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    {store.estimated_pct}% sản lượng dùng giá ước tính (250k). 
                    Phần còn lại dùng giá bán thực từ đơn hàng.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <MetricItem
            icon={TrendingUp}
            label="Đã bán"
            value={store.total_sold.toLocaleString()}
          />
          <MetricItem
            icon={Package}
            label="Tồn kho"
            value={store.total_on_hand.toLocaleString()}
          />
          <MetricItem
            icon={Clock}
            label="Avg WoC"
            value={`${store.avg_woc.toFixed(1)}w`}
            className={cn(
              store.avg_woc < 2 && 'text-red-400',
              store.avg_woc >= 2 && store.avg_woc < 4 && 'text-amber-400',
              store.avg_woc >= 4 && 'text-emerald-400',
            )}
          />
          <MetricItem
            icon={Layers}
            label="FC hoạt động"
            value={String(store.active_fcs)}
          />
        </div>

        {/* Velocity bar */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Velocity</span>
            <span className={cn("text-xs font-semibold font-mono", accent.text)}>
              {(store.avg_velocity * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", accent.badge.split(' ')[0])}
              style={{ width: `${Math.min(100, store.avg_velocity * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StoreDirectoryTab() {
  const { data: stores, isLoading } = useStoreMetrics();
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('tier');

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
      if (sortBy === 'tier') {
        const ta = TIER_ORDER[a.tier] ?? 99, tb = TIER_ORDER[b.tier] ?? 99;
        return ta !== tb ? ta - tb : b.est_revenue - a.est_revenue;
      }
      if (sortBy === 'avg_woc') {
        return a.avg_woc - b.avg_woc; // low WoC first
      }
      const av = (a as any)[sortBy], bv = (b as any)[sortBy];
      if (typeof av === 'string') return (av as string).localeCompare(bv as string);
      return (bv as number) - (av as number);
    });
    return result;
  }, [stores, search, filterTier, filterRegion, sortBy]);

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
      {/* Summary */}
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
          <Input placeholder="Tìm cửa hàng..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả Tier</SelectItem>
            {['S', 'A', 'B', 'C'].map(t => <SelectItem key={t} value={t}>Tier {t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Khu vực" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả KV</SelectItem>
            {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Sắp xếp" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tier">Theo Tier</SelectItem>
            <SelectItem value="est_revenue">Doanh thu cao</SelectItem>
            <SelectItem value="avg_velocity">Velocity cao</SelectItem>
            <SelectItem value="total_on_hand">Tồn kho nhiều</SelectItem>
            <SelectItem value="avg_woc">WoC thấp</SelectItem>
            <SelectItem value="store_name">Tên A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(s => <StoreCard key={s.id} store={s} />)}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">Không tìm thấy cửa hàng</div>
      )}
    </div>
  );
}
