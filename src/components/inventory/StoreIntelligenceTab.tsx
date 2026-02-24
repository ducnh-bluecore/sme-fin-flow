import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-2.5">
      {display.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-foreground font-medium truncate max-w-[55%]">{item.label}</span>
            <span className="text-muted-foreground tabular-nums">{item.units.toLocaleString('vi-VN')} ({item.pct.toFixed(1)}%)</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
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
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
      <div className={`p-2 rounded-md bg-background ${iconClass || ''}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
      </div>
    </div>
  );
}

const AVG_UNIT_COST = 350_000; // ước tính giá vốn trung bình/unit

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
    <div className="flex gap-4 min-h-[500px]">
      {/* Left: Store list */}
      <div className={`transition-all duration-300 ${showDetail ? 'w-[340px] shrink-0' : 'w-full'}`}>
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4" />
              Cửa hàng ({sortedStores.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-card z-10">Tên CH</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 w-14 text-center">Tier</TableHead>
                  {!showDetail && <TableHead className="sticky top-0 bg-card z-10 text-right">Tồn kho</TableHead>}
                  {!showDetail && <TableHead className="sticky top-0 bg-card z-10 text-right">Capacity</TableHead>}
                  <TableHead className="sticky top-0 bg-card z-10 text-right w-16">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStores.map((s: any) => {
                  const util = s.capacity > 0 ? ((s.total_on_hand || 0) / s.capacity * 100) : 0;
                  const isSelected = selectedStoreId === s.id;
                  return (
                    <TableRow
                      key={s.id}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}
                      onClick={() => setSelectedStoreId(isSelected ? null : s.id)}
                    >
                      <TableCell className="font-medium text-sm py-2">{s.store_name}</TableCell>
                      <TableCell className="text-center py-2">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TIER_COLORS[s.tier] || TIER_COLORS.C}`}>
                          {s.tier || 'C'}
                        </Badge>
                      </TableCell>
                      {!showDetail && <TableCell className="text-right text-sm tabular-nums py-2">{(s.total_on_hand || 0).toLocaleString('vi-VN')}</TableCell>}
                      {!showDetail && <TableCell className="text-right text-sm tabular-nums py-2">{(s.capacity || 0).toLocaleString('vi-VN')}</TableCell>}
                      <TableCell className="text-right text-sm py-2">
                        <span className={util > 90 ? 'text-red-400' : util > 70 ? 'text-amber-400' : 'text-emerald-400'}>
                          {util.toFixed(0)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Right: Detail panel */}
      {showDetail && (
        <div className="flex-1 min-w-0 space-y-4 animate-in slide-in-from-right-4 duration-300">
          {/* Store header */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{selectedStore.store_name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-xs ${TIER_COLORS[selectedStore.tier] || TIER_COLORS.C}`}>
                        Tier {selectedStore.tier || 'C'}
                      </Badge>
                      {selectedStore.region && (
                        <span className="text-xs text-muted-foreground">{selectedStore.region}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedStoreId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Key metrics row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard
                  icon={Package}
                  label="Tồn kho"
                  value={`${(selectedStore.total_on_hand || 0).toLocaleString('vi-VN')} units`}
                  iconClass="text-blue-400"
                />
                <MetricCard
                  icon={DollarSign}
                  label="Giá trị tồn (ước tính)"
                  value={`${((selectedStore.total_on_hand || 0) * AVG_UNIT_COST / 1_000_000).toFixed(1)}M`}
                  sub={`@${(AVG_UNIT_COST / 1000).toFixed(0)}k/unit`}
                  iconClass="text-amber-400"
                />
                <MetricCard
                  icon={BarChart3}
                  label="Capacity"
                  value={`${(selectedStore.capacity || 0).toLocaleString('vi-VN')} units`}
                  sub={`${selectedStore.capacity > 0 ? ((selectedStore.total_on_hand || 0) / selectedStore.capacity * 100).toFixed(0) : 0}% sử dụng`}
                  iconClass="text-emerald-400"
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Đã bán (tổng)"
                  value={profileLoading ? '...' : `${(profile?.totalSold || 0).toLocaleString('vi-VN')} units`}
                  iconClass="text-pink-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Breakdown charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-emerald-400" />
                  Demand Space
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {profileLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-6 bg-muted animate-pulse rounded" />)}</div>
                ) : (
                  <HorizontalBarChart items={profile?.demandSpace || []} type="ds" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-blue-400" />
                  Size Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {profileLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-6 bg-muted animate-pulse rounded" />)}</div>
                ) : (
                  <HorizontalBarChart items={profile?.sizeBreakdown || []} type="size" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Palette className="h-4 w-4 text-violet-400" />
                  Color Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {profileLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-6 bg-muted animate-pulse rounded" />)}</div>
                ) : profile?.hasColorData ? (
                  <HorizontalBarChart items={profile.colorBreakdown} type="color" />
                ) : (
                  <div className="py-4 text-center">
                    <Palette className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu màu sắc</p>
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
