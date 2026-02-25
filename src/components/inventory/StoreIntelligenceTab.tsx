import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInventoryStores } from '@/hooks/inventory/useInventoryStores';
import { useStoreProfile } from '@/hooks/inventory/useStoreProfile';
import { useStoreCustomerKpis } from '@/hooks/inventory/useStoreCustomerKpis';
import { useStoreMetricsTrend } from '@/hooks/inventory/useStoreMetricsTrend';
import { Store, Palette, Ruler, ShoppingBag, X, Package, DollarSign, TrendingUp, TrendingDown, BarChart3, Users, RotateCcw, ShoppingCart, Layers } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

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

interface BreakdownItem { label: string; units: number; pct: number; deltaPct?: number | null; }

function DeltaBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const isPositive = value > 0;
  const isNeutral = value === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium tabular-nums ${
      isNeutral ? 'text-muted-foreground' : isPositive ? 'text-emerald-400' : 'text-red-400'
    }`}>
      {isPositive ? '↑' : isNeutral ? '→' : '↓'}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function HorizontalBarChart({ items, type, maxItems = 8 }: { items: BreakdownItem[]; type: 'ds' | 'size' | 'color'; maxItems?: number }) {
  const display = items.slice(0, maxItems);
  if (display.length === 0) return <p className="text-sm text-muted-foreground">Không có dữ liệu</p>;

  return (
    <div className="space-y-2">
      {display.map((item) => (
        <div key={item.label} className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="text-foreground font-medium truncate max-w-[45%]">{item.label}</span>
            <span className="text-muted-foreground tabular-nums flex items-center gap-1.5">
              {item.units.toLocaleString('vi-VN')} ({item.pct.toFixed(1)}%)
              <DeltaBadge value={item.deltaPct} />
            </span>
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

function MetricCard({ icon: Icon, label, value, sub, iconClass, delta }: { icon: any; label: string; value: string; sub?: string; iconClass?: string; delta?: number | null }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/40">
      <div className={`p-1.5 rounded-md bg-background/80 ${iconClass || ''}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold tabular-nums leading-tight">{value}</p>
          <DeltaBadge value={delta} />
        </div>
        {sub && <p className="text-[10px] text-muted-foreground/60 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

const AVG_UNIT_COST = 350_000;

function MiniTrendChart({ 
  data, 
  dataKey, 
  label, 
  color, 
  formatValue 
}: { 
  data: any[]; 
  dataKey: string; 
  label: string; 
  color: string; 
  formatValue?: (v: number) => string;
}) {
  const fmt = formatValue || ((v: number) => v.toLocaleString('vi-VN'));
  
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      <div className="h-[80px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 8 }} 
              interval={Math.max(Math.floor(data.length / 5) - 1, 0)}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '11px',
                padding: '6px 10px',
              }}
              formatter={(value: number) => [fmt(value), label]}
              labelStyle={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))' }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function StoreIntelligenceTab() {
  const { data: stores = [], isLoading: storesLoading } = useInventoryStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const { data: profile, isLoading: profileLoading } = useStoreProfile(selectedStoreId);
  const { data: customerKpis, isLoading: kpisLoading } = useStoreCustomerKpis(selectedStoreId);
  const { data: trendData = [], isLoading: trendLoading } = useStoreMetricsTrend(selectedStoreId);

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
    <div className="grid gap-4 h-[calc(100vh-220px)]" style={{ gridTemplateColumns: showDetail ? '300px 1fr' : '1fr' }}>
      {/* Left: Store list */}
      <Card className="overflow-hidden flex flex-col min-h-0">
        <CardHeader className="py-3 px-4 shrink-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <Store className="h-4 w-4" />
            Cửa hàng ({sortedStores.length})
          </CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-1 pb-2">
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
        <ScrollArea className="min-h-0">
          <div className="space-y-3 animate-in fade-in duration-200 pr-2">
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
                  <MetricCard icon={Package} label="Tồn kho" value={`${(selectedStore.total_on_hand || 0).toLocaleString('vi-VN')}`} iconClass="text-blue-400" />
                  <MetricCard icon={DollarSign} label="Giá trị tồn" value={`${((selectedStore.total_on_hand || 0) * AVG_UNIT_COST / 1_000_000).toFixed(1)}M`} sub={`@${(AVG_UNIT_COST / 1000).toFixed(0)}k/unit`} iconClass="text-amber-400" />
                  <MetricCard icon={BarChart3} label="Capacity" value={`${(selectedStore.capacity || 0).toLocaleString('vi-VN')}`} sub={`${selectedStore.capacity > 0 ? ((selectedStore.total_on_hand || 0) / selectedStore.capacity * 100).toFixed(0) : 0}% sử dụng`} iconClass="text-emerald-400" />
                  <MetricCard 
                    icon={TrendingUp} 
                    label="Đã bán" 
                    value={profileLoading ? '...' : `${(profile?.totalSold || 0).toLocaleString('vi-VN')}`} 
                    sub={profileLoading ? '' : (profile?.periodStart && profile?.periodEnd 
                      ? `${format(parseISO(profile.periodStart), 'dd/MM')} - ${format(parseISO(profile.periodEnd), 'dd/MM')}`
                      : 'Chưa có dữ liệu'
                    )}
                    iconClass="text-pink-400" 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Customer KPIs */}
            <Card>
              <CardHeader className="pb-1.5 pt-3 px-4">
                <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-cyan-400" />
                  Customer Metrics
                  {customerKpis?.daysCounted ? (
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground/60">
                      {customerKpis.periodStart && customerKpis.periodEnd
                        ? `${format(parseISO(customerKpis.periodStart), 'dd/MM')} - ${format(parseISO(customerKpis.periodEnd), 'dd/MM')}`
                        : `${customerKpis.daysCounted} ngày`}
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-1">
                {kpisLoading ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[1,2,3,4].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
                  </div>
                ) : customerKpis && customerKpis.daysCounted > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    <MetricCard icon={Users} label="Khách hàng" value={customerKpis.customerCount.toLocaleString('vi-VN')} sub={`~${customerKpis.dailyAvgCustomers}/ngày`} iconClass="text-cyan-400" delta={customerKpis.deltaCustomers} />
                    <MetricCard icon={ShoppingCart} label="AOV" value={`${(customerKpis.avgOrderValue / 1000).toFixed(0)}K`} sub={`${customerKpis.totalTransactions.toLocaleString('vi-VN')} đơn`} iconClass="text-amber-400" delta={customerKpis.deltaAov} />
                    <MetricCard icon={Layers} label="IPT" value={`${customerKpis.itemsPerTransaction}`} sub="SP/đơn" iconClass="text-emerald-400" />
                    <MetricCard icon={RotateCcw} label="Tỷ lệ quay lại" value={`${customerKpis.returnRate}%`} sub={customerKpis.returnRate > 0 ? 'Khách mua ≥2 lần' : 'Chưa đủ dữ liệu'} iconClass="text-pink-400" />
                  </div>
                ) : (
                  <div className="py-2 text-center">
                    <Users className="h-5 w-5 mx-auto text-muted-foreground/30 mb-1" />
                    <p className="text-xs text-muted-foreground">Chưa có dữ liệu khách hàng</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Metrics Trends */}
            {trendData.length > 3 && (
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-4">
                  <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    Xu hướng Customer Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <MiniTrendChart data={trendData} dataKey="customers" label="Khách hàng / ngày" color="hsl(var(--primary))" />
                    <MiniTrendChart data={trendData} dataKey="aov" label="AOV" color="hsl(45, 93%, 47%)" formatValue={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <MiniTrendChart data={trendData} dataKey="ipt" label="IPT (SP/đơn)" color="hsl(142, 71%, 45%)" formatValue={(v) => v.toFixed(1)} />
                    <MiniTrendChart data={trendData} dataKey="repeatRate" label="Tỷ lệ quay lại (%)" color="hsl(330, 81%, 60%)" formatValue={(v) => `${v.toFixed(1)}%`} />
                  </div>
                </CardContent>
              </Card>
            )}
            {trendLoading && (
              <Card>
                <CardContent className="py-4">
                  <div className="h-32 bg-muted animate-pulse rounded-lg" />
                </CardContent>
              </Card>
            )}

            {/* Breakdown charts */}
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
        </ScrollArea>
      )}
    </div>
  );
}
