import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Store, TrendingUp, Package, Clock, Layers, DollarSign, Info, Pencil, Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { getTierStyle } from '@/lib/inventory-store-map';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUpdateStoreCapacity } from '@/hooks/inventory/useUpdateStoreCapacity';
import { Progress } from '@/components/ui/progress';

const FALLBACK_UNIT_PRICE = 250000; // VND - fallback for SKUs without sales data (used in DB view)
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

  // Use pre-aggregated DB views instead of raw rows (12k+ demand, 34k+ positions)
  const demandQuery = useQuery({
    queryKey: ['inv-store-directory-demand-agg', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery(
        'v_inv_store_metrics',
        'store_id, total_sold, avg_velocity, active_fcs'
      ).limit(500);
      if (error) throw error;
      return data as any[];
    },
    enabled: isReady,
  });

  const positionsQuery = useQuery({
    queryKey: ['inv-store-directory-positions-agg', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery(
        'v_inv_store_position_metrics',
        'store_id, total_on_hand, total_available, avg_woc'
      ).limit(500);
      if (error) throw error;
      return data as any[];
    },
    enabled: isReady,
  });

  const revenueQuery = useQuery({
    queryKey: ['inv-store-directory-revenue', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery(
        'v_inv_store_revenue',
        'store_id, est_revenue, estimated_pct'
      ).limit(500);
      if (error) throw error;
      return data as any[];
    },
    enabled: isReady,
  });

  const metrics = useMemo(() => {
    if (!storesQuery.data) return [];

    const demandMap = new Map<string, any>();
    for (const d of demandQuery.data || []) demandMap.set(d.store_id, d);

    const posMap = new Map<string, any>();
    for (const p of positionsQuery.data || []) posMap.set(p.store_id, p);

    const revMap = new Map<string, any>();
    for (const r of revenueQuery.data || []) revMap.set(r.store_id, r);

    return storesQuery.data
      .filter((s: any) => s.location_type === 'store')
      .map((s: any): StoreMetrics => {
        const demand = demandMap.get(s.id);
        const pos = posMap.get(s.id);
        const rev = revMap.get(s.id);
        const estPct = Number(rev?.estimated_pct) || 0;
        return {
          id: s.id,
          store_name: s.store_name,
          store_code: s.store_code,
          tier: s.tier || '-',
          region: s.region || '-',
          location_type: s.location_type,
          capacity: Number(s.capacity) || 0,
          total_sold: Number(demand?.total_sold) || 0,
          avg_velocity: Number(demand?.avg_velocity) || 0,
          active_fcs: Number(demand?.active_fcs) || 0,
          total_on_hand: Number(pos?.total_on_hand) || 0,
          total_available: Number(pos?.total_available) || 0,
          avg_woc: Number(pos?.avg_woc) || 0,
          est_revenue: Number(rev?.est_revenue) || 0,
          has_real_prices: estPct < 100,
          estimated_pct: Math.round(estPct),
        };
      });
  }, [storesQuery.data, demandQuery.data, positionsQuery.data, revenueQuery.data]);

  return {
    data: metrics,
    isLoading: storesQuery.isLoading || demandQuery.isLoading || positionsQuery.isLoading || revenueQuery.isLoading,
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

function getCapacityColor(utilization: number): { bar: string; text: string; badge?: string } {
  if (utilization > 0.95) return { bar: 'bg-red-500', text: 'text-red-400', badge: 'Quá tải' };
  if (utilization > 0.85) return { bar: 'bg-amber-500', text: 'text-amber-400', badge: 'Gần đầy' };
  if (utilization < 0.7) return { bar: 'bg-emerald-500', text: 'text-emerald-400' };
  return { bar: 'bg-primary', text: 'text-muted-foreground' };
}

function StoreCard({ store }: { store: StoreMetrics }) {
  const accent = getTierAccent(store.tier);
  const updateCapacity = useUpdateStoreCapacity();
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [capacityValue, setCapacityValue] = useState(String(store.capacity));

  const utilization = store.capacity > 0 ? store.total_on_hand / store.capacity : 0;
  const capColor = getCapacityColor(utilization);

  const handleSaveCapacity = () => {
    const val = parseInt(capacityValue, 10);
    if (!val || val <= 0) return;
    updateCapacity.mutate({ storeId: store.id, capacity: val });
    setEditingCapacity(false);
  };

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
          {capColor.badge && (
            <Badge variant="outline" className={cn("text-[10px] shrink-0 border-current", capColor.text)}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {capColor.badge}
            </Badge>
          )}
        </div>

        {/* Capacity bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Sức chứa</span>
            <div className="flex items-center gap-1.5">
              {editingCapacity ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={capacityValue}
                    onChange={e => setCapacityValue(e.target.value)}
                    className="h-6 w-20 text-xs px-1.5"
                    min={1}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveCapacity(); if (e.key === 'Escape') setEditingCapacity(false); }}
                  />
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleSaveCapacity}>
                    <Check className="h-3 w-3 text-emerald-400" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditingCapacity(false)}>
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className={cn("text-xs font-semibold font-mono", capColor.text)}>
                    {store.total_on_hand.toLocaleString()} / {store.capacity > 0 ? store.capacity.toLocaleString() : '—'}
                  </span>
                  <button onClick={() => { setCapacityValue(String(store.capacity || 0)); setEditingCapacity(true); }} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          </div>
          {store.capacity > 0 && (
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", capColor.bar)}
                style={{ width: `${Math.min(100, utilization * 100)}%` }}
              />
            </div>
          )}
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
