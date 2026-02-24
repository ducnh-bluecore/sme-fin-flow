import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInventoryStores } from '@/hooks/inventory/useInventoryStores';
import { useStoreProfile } from '@/hooks/inventory/useStoreProfile';
import { Store, Palette, Ruler, ShoppingBag, X, Package, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';

const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
const TIER_COLORS: Record<string, string> = {
  S: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  A: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  B: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  C: 'bg-muted text-muted-foreground border-border',
};

const DS_COLORS: Record<string, string> = {
  EverydayComfort: 'bg-emerald-500',
  Travel: 'bg-sky-500',
  FastTrendFashion: 'bg-pink-500',
  LuxuryParty: 'bg-purple-500',
  FestiveCultural: 'bg-amber-500',
  SportActive: 'bg-orange-500',
  WorkProfessional: 'bg-slate-500',
  'Không phân loại': 'bg-muted-foreground',
};

function getBarColor(label: string, type: 'ds' | 'size' | 'color') {
  if (type === 'ds') return DS_COLORS[label] || 'bg-primary';
  if (type === 'size') return 'bg-blue-500';
  return 'bg-violet-500';
}

interface BreakdownItem { label: string; units: number; pct: number; }

function HorizontalBarChart({ items, type, maxItems = 8 }: { items: BreakdownItem[]; type: 'ds' | 'size' | 'color'; maxItems?: number }) {
  const display = items.slice(0, maxItems);
  if (display.length === 0) return <p className="text-sm text-muted-foreground">Không có dữ liệu</p>;

  return (
    <div className="space-y-2">
      {display.map((item) => (
        <div key={item.label} className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="text-foreground font-medium truncate max-w-[55%]">{item.label}</span>
            <span className="text-muted-foreground tabular-nums">{item.units.toLocaleString('vi-VN')} ({item.pct.toFixed(1)}%)</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(item.label, type)}`}
              style={{ width: `${Math.max(item.pct, 1)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, iconClass }: { icon: any; label: string; value: string; sub?: string; iconClass?: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/40">
      <div className={`p-1.5 rounded-md bg-background/80 ${iconClass || ''}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className="text-sm font-semibold tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

const AVG_UNIT_COST = 350_000;

export function StoreIntelligenceTab() {
  const { data: stores = [], isLoading: storesLoading } = useInventoryStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const { data: profile, isLoading: profileLoading } = useStoreProfile(selectedStoreId);

  const sortedStores = useMemo(() => {
    return [...stores].sort((a: any, b: any) => {
      const tierDiff = (TIER_ORDER[a.tier] ?? 4) - (TIER_ORDER[b.tier] ?? 4);
      if (tierDiff !== 0) return tierDiff;
      return (b.total_on_hand || 0) - (a.total_on_hand || 0);
    });
  }, [stores]);

  const selectedStore = useMemo(() => stores.find((s: any) => s.id === selectedStoreId), [stores, selectedStoreId]);

  if (storesLoading) {
    return <div className="py-12 text-center text-muted-foreground">Đang tải dữ liệu cửa hàng...</div>;
  }

  const showDetail = !!selectedStoreId && !!selectedStore;

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: showDetail ? '280px 1fr' : '1fr' }}>
      {/* Left: Store list */}
      <Card className="overflow-hidden">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Store className="h-4 w-4" />
            Cửa hàng ({sortedStores.length})
          </CardTitle>
        </CardHeader>
        <ScrollArea className="h-[calc(100vh-240px)]">
          <div className="px-1">
            {sortedStores.map((s: any) => {
              const isSelected = selectedStoreId === s.id;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 px-3 py-2 mx-1 rounded-md cursor-pointer transition-colors text-sm ${
                    isSelected 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'hover:bg-muted/50 border border-transparent'
                  }`}
                  onClick={() => setSelectedStoreId(isSelected ? null : s.id)}
                >
                  <span className="flex-1 truncate font-medium">{s.store_name}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${TIER_COLORS[s.tier] || TIER_COLORS.C}`}>
                    {s.tier || 'C'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Right: Detail panel */}
      {showDetail && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Header + metrics */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Store className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base leading-tight">{selectedStore.store_name}</CardTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={`text-[10px] ${TIER_COLORS[selectedStore.tier] || TIER_COLORS.C}`}>
                        Tier {selectedStore.tier || 'C'}
                      </Badge>
                      {selectedStore.region && (
                        <span className="text-xs text-muted-foreground">{selectedStore.region}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedStoreId(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-4 gap-2">
                <MetricCard
                  icon={Package}
                  label="Tồn kho"
                  value={`${(selectedStore.total_on_hand || 0).toLocaleString('vi-VN')}`}
                  iconClass="text-blue-400"
                />
                <MetricCard
                  icon={DollarSign}
                  label="Giá trị tồn"
                  value={`${((selectedStore.total_on_hand || 0) * AVG_UNIT_COST / 1_000_000).toFixed(1)}M`}
                  sub={`@${(AVG_UNIT_COST / 1000).toFixed(0)}k/unit`}
                  iconClass="text-amber-400"
                />
                <MetricCard
                  icon={BarChart3}
                  label="Capacity"
                  value={`${(selectedStore.capacity || 0).toLocaleString('vi-VN')}`}
                  sub={`${selectedStore.capacity > 0 ? ((selectedStore.total_on_hand || 0) / selectedStore.capacity * 100).toFixed(0) : 0}% sử dụng`}
                  iconClass="text-emerald-400"
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Đã bán"
                  value={profileLoading ? '...' : `${(profile?.totalSold || 0).toLocaleString('vi-VN')}`}
                  iconClass="text-pink-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Breakdown charts - 2 columns for Demand + Size, Color below or side */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-1.5 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />
                  Demand Space
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {profileLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-5 bg-muted animate-pulse rounded" />)}</div>
                ) : (
                  <HorizontalBarChart items={profile?.demandSpace || []} type="ds" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1.5 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <Ruler className="h-3.5 w-3.5 text-blue-400" />
                  Size Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {profileLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-5 bg-muted animate-pulse rounded" />)}</div>
                ) : (
                  <HorizontalBarChart items={profile?.sizeBreakdown || []} type="size" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1.5 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <Palette className="h-3.5 w-3.5 text-violet-400" />
                  Color Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {profileLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-5 bg-muted animate-pulse rounded" />)}</div>
                ) : profile?.hasColorData ? (
                  <HorizontalBarChart items={profile.colorBreakdown} type="color" />
                ) : (
                  <div className="py-3 text-center">
                    <Palette className="h-6 w-6 mx-auto text-muted-foreground/30 mb-1" />
                    <p className="text-xs text-muted-foreground">Chưa có dữ liệu</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
