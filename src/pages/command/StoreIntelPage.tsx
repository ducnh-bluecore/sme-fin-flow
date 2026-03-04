import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useInventoryStores } from '@/hooks/inventory/useInventoryStores';
import { useStoreProfile } from '@/hooks/inventory/useStoreProfile';
import { useStoreCustomerKpis } from '@/hooks/inventory/useStoreCustomerKpis';
import { useStoreMetricsTrend } from '@/hooks/inventory/useStoreMetricsTrend';
import { useStoreTopFC } from '@/hooks/inventory/useStoreTopFC';
import { useStoreTopCollections } from '@/hooks/inventory/useStoreTopCollections';
import { useStoreKpiTarget, useUpsertStoreKpiTarget, computeKpiComparison, getCurrentPeriodValue, useStoreKpiTargetHistory } from '@/hooks/inventory/useStoreKpiTargets';
import { useStoreMonthlyRevenue, useAllStoresMonthlyRevenue } from '@/hooks/inventory/useStoreMonthlyRevenue';
import { useStorePerformanceBenchmark } from '@/hooks/inventory/useStorePerformanceBenchmark';
import { useStoreProductMix, type PriceSegment, type CategoryMix, type CollectionMix, type ProductRank } from '@/hooks/inventory/useStoreProductMix';
import {
  Store, Palette, Ruler, ShoppingBag, X, Package, DollarSign,
  TrendingUp, TrendingDown, BarChart3, Users, RotateCcw, ShoppingCart,
  Layers, Calendar, Star, FolderOpen, Target, Save, CheckCircle2,
  AlertTriangle, XCircle, ArrowLeft, ArrowUpDown, GitCompareArrows,
  Trophy, ChevronRight, Activity, Gauge,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine, ComposedChart, Area,
} from 'recharts';
import { toast } from 'sonner';

// ─── Constants ───────────────────────────────────────────────────────

const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
const TIER_COLORS: Record<string, string> = {
  S: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  A: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  B: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  C: 'bg-muted text-muted-foreground border-border',
};

const DS_COLORS: Record<string, string> = {
  EverydayComfort: 'bg-emerald-500', Travel: 'bg-sky-500', FastTrendFashion: 'bg-pink-500',
  LuxuryParty: 'bg-purple-500', FestiveCultural: 'bg-amber-500', SportActive: 'bg-orange-500',
  WorkProfessional: 'bg-slate-500', 'Không phân loại': 'bg-muted-foreground',
};

const STATUS_CONFIG = {
  exceeded: { label: 'Vượt', icon: CheckCircle2, class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  on_track: { label: 'Đúng hướng', icon: TrendingUp, class: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  at_risk: { label: 'Cần theo dõi', icon: AlertTriangle, class: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  behind: { label: 'Dưới KPI', icon: XCircle, class: 'text-red-400 bg-red-500/10 border-red-500/30' },
  no_target: { label: '—', icon: Target, class: 'text-muted-foreground' },
};

const COMPARE_COLORS = ['hsl(var(--primary))', 'hsl(45, 93%, 47%)', 'hsl(330, 81%, 60%)'];

/** Smart VND formatter: auto-switch M/B based on magnitude */
function fmtVnd(v: number, forceUnit?: 'M' | 'B'): string {
  if (!v && v !== 0) return '—';
  const abs = Math.abs(v);
  if (forceUnit === 'B' || (!forceUnit && abs >= 1_000_000_000)) {
    return `${(v / 1_000_000_000).toFixed(2)}B`;
  }
  if (forceUnit === 'M' || (!forceUnit && abs >= 1_000_000)) {
    return `${(v / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString('vi-VN');
}

// ─── Sub-components ──────────────────────────────────────────────────

function DeltaBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const isPositive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium tabular-nums ${
      value === 0 ? 'text-muted-foreground' : isPositive ? 'text-emerald-400' : 'text-red-400'
    }`}>
      {isPositive ? '↑' : value === 0 ? '→' : '↓'}{Math.abs(value).toFixed(1)}%
    </span>
  );
}

function getBarColor(label: string, type: 'ds' | 'size' | 'color') {
  if (type === 'ds') return DS_COLORS[label] || 'bg-primary';
  return type === 'size' ? 'bg-blue-500' : 'bg-violet-500';
}

interface BreakdownItem { label: string; units: number; pct: number; deltaPct?: number | null; }

function HorizontalBarChart({ items, type, maxItems = 8 }: { items: BreakdownItem[]; type: 'ds' | 'size' | 'color'; maxItems?: number }) {
  const display = items.slice(0, maxItems);
  if (!display.length) return <p className="text-sm text-muted-foreground">Không có dữ liệu</p>;
  return (
    <div className="space-y-2">
      {display.map((item) => (
        <div key={item.label} className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className="text-foreground font-medium truncate max-w-[45%]">{item.label}</span>
            <span className="text-muted-foreground tabular-nums flex items-center gap-1.5">
              {item.units.toLocaleString('vi-VN')} ({item.pct.toFixed(1)}%)<DeltaBadge value={item.deltaPct} />
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(item.label, type)}`} style={{ width: `${Math.max(item.pct, 1)}%` }} />
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

function MiniTrendChart({ data, dataKey, label, color, formatValue }: { data: any[]; dataKey: string; label: string; color: string; formatValue?: (v: number) => string }) {
  const fmt = formatValue || ((v: number) => v.toLocaleString('vi-VN'));
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      <div className="h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis dataKey="label" tick={{ fontSize: 8 }} interval={Math.max(Math.floor(data.length / 5) - 1, 0)} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px', padding: '6px 10px' }} formatter={(value: number) => [fmt(value), label]} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0, fill: color }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiProgressCard({ label, actual, target, unit, icon: Icon, iconClass }: {
  label: string; actual: number; target: number; unit: string; icon: any; iconClass: string;
}) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 150) : 0;
  const displayPct = target > 0 ? (actual / target) * 100 : 0;
  const statusColor = displayPct >= 100 ? 'text-emerald-400' : displayPct >= 80 ? 'text-blue-400' : displayPct >= 60 ? 'text-amber-400' : 'text-red-400';
  const formatVal = (v: number) => {
    if (unit === 'M' || unit === 'K') return fmtVnd(v);
    return v.toLocaleString('vi-VN');
  };
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-2">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-md bg-background/80 ${iconClass}`}><Icon className="h-3.5 w-3.5" /></div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-bold tabular-nums">{formatVal(actual)}</p>
          <p className="text-[10px] text-muted-foreground">/ {formatVal(target)}</p>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${statusColor}`}>{displayPct.toFixed(0)}%</span>
      </div>
      <Progress value={Math.min(pct, 100)} className="h-1.5" />
    </div>
  );
}

// ─── Revenue Chart 6 Months vs Target ────────────────────────────────

function RevenueVsTargetChart({ storeId, storeName }: { storeId: string; storeName: string }) {
  const { data: monthlyData = [] } = useStoreMonthlyRevenue(storeId, 6);
  const { data: targetHistory = [] } = useStoreKpiTargetHistory(storeId);

  const chartData = useMemo(() => {
    const targetMap = new Map(targetHistory.map(t => [t.period_value, t.revenue_target]));
    return monthlyData.map(m => ({
      month: m.month_value,
      revenue: m.total_revenue,
      target: targetMap.get(m.month_value) || 0,
      transactions: m.total_transactions,
      aov: m.avg_aov,
    }));
  }, [monthlyData, targetHistory]);

  if (!chartData.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Chưa có dữ liệu doanh thu hàng tháng
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Doanh thu 6 tháng — {storeName}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmtVnd(v)} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number, name: string) => {
                  const label = name === 'revenue' ? 'Doanh thu' : name === 'target' ? 'Mục tiêu' : name;
                  return [fmtVnd(value), label];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="revenue" name="Doanh thu" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="target" name="Mục tiêu" stroke="hsl(0, 84%, 60%)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── KPI Target Form ────────────────────────────────────────────────

function generateMonthOptions(): string[] {
  const months: string[] = [];
  const now = new Date();
  // From Jan 2024 to current month + 1
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 2; // +1 for 0-index, +1 for next month
  for (let y = 2024; y <= endYear + 1; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y * 12 + m > endYear * 12 + endMonth) break;
      if (y === 2024 && m < 1) continue;
      months.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  }
  return months;
}

function KpiTargetForm({ storeId, storeName }: { storeId: string; storeName: string }) {
  const allMonths = useMemo(() => generateMonthOptions(), []);
  const currentPeriod = getCurrentPeriodValue();

  // Range mode: from → to
  const [fromMonth, setFromMonth] = useState(currentPeriod);
  const [toMonth, setToMonth] = useState(currentPeriod);
  const { data: existingTarget } = useStoreKpiTarget(storeId, fromMonth);
  const upsert = useUpsertStoreKpiTarget();

  const [revenue, setRevenue] = useState('');

  useMemo(() => {
    if (existingTarget) {
      setRevenue(String(existingTarget.revenue_target || ''));
    } else {
      setRevenue('');
    }
  }, [existingTarget]);

  const isRange = fromMonth !== toMonth && toMonth > fromMonth;
  const monthsInRange = useMemo(() => {
    return allMonths.filter(m => m >= fromMonth && m <= toMonth);
  }, [allMonths, fromMonth, toMonth]);

  const navigateMonth = (direction: -1 | 1) => {
    const idx = allMonths.indexOf(fromMonth);
    const newIdx = Math.max(0, Math.min(allMonths.length - 1, idx + direction));
    setFromMonth(allMonths[newIdx]);
    if (!isRange) setToMonth(allMonths[newIdx]);
  };

  const handleSave = async () => {
    try {
      const targets = isRange ? monthsInRange : [fromMonth];
      for (const period of targets) {
        await upsert.mutateAsync({
          store_id: storeId, period_value: period,
          revenue_target: Number(revenue) || 0, orders_target: 0,
          customers_target: 0, aov_target: 0,
        });
      }
      toast.success(`Đã lưu mục tiêu doanh thu cho ${storeName} (${targets.length} tháng)`);
    } catch (e: any) {
      toast.error('Lỗi khi lưu: ' + (e.message || ''));
    }
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Mục tiêu doanh thu
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {/* Month range selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(-1)}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-1.5">
            <Select value={fromMonth} onValueChange={v => { setFromMonth(v); if (toMonth < v) setToMonth(v); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allMonths.map(m => (
                  <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">→</span>
            <Select value={toMonth} onValueChange={setToMonth}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allMonths.filter(m => m >= fromMonth).map(m => (
                  <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          {isRange && (
            <Badge variant="secondary" className="text-xs">{monthsInRange.length} tháng</Badge>
          )}
        </div>

        {/* Revenue target */}
        <div className="flex items-end gap-3">
          <div className="space-y-1 flex-1 max-w-xs">
            <label className="text-xs text-muted-foreground">Doanh thu mục tiêu (VNĐ)</label>
            <Input type="number" value={revenue} onChange={e => setRevenue(e.target.value)} placeholder="0" className="h-9 text-sm" />
          </div>
          <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2 h-9" size="sm">
            <Save className="h-3.5 w-3.5" />
            {upsert.isPending ? 'Đang lưu...' : isRange ? `Áp dụng ${monthsInRange.length} tháng` : 'Lưu mục tiêu'}
          </Button>
        </div>

        {isRange && (
          <p className="text-xs text-muted-foreground">
            💡 Cùng một mức doanh thu sẽ được áp dụng cho {monthsInRange.length} tháng từ {fromMonth} đến {toMonth}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Store Benchmark Panel ──────────────────────────────────────────

function BenchmarkMetric({ label, storeVal, chainVal, tierVal, format: fmt }: {
  label: string; storeVal: number; chainVal: number; tierVal: number; format: (v: number) => string;
}) {
  const vsChain = chainVal > 0 ? ((storeVal - chainVal) / chainVal * 100) : 0;
  const vsTier = tierVal > 0 ? ((storeVal - tierVal) / tierVal * 100) : 0;
  const DeltaBadge = ({ pct }: { pct: number }) => (
    <span className={`text-[10px] font-medium tabular-nums ${pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground w-32">{label}</span>
      <span className="text-xs font-semibold tabular-nums w-24 text-right">{fmt(storeVal)}</span>
      <div className="flex items-center gap-1.5 w-44 justify-end">
        <span className="text-[10px] text-muted-foreground">vs chuỗi:</span>
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">{fmt(chainVal)}</span>
        <DeltaBadge pct={vsChain} />
      </div>
      <div className="flex items-center gap-1.5 w-44 justify-end">
        <span className="text-[10px] text-muted-foreground">vs tier:</span>
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">{fmt(tierVal)}</span>
        <DeltaBadge pct={vsTier} />
      </div>
    </div>
  );
}

function StoreBenchmarkPanel({ storeId, storeTier }: { storeId: string; storeTier: string }) {
  const { data: benchmark, isLoading } = useStorePerformanceBenchmark(storeId);

  if (isLoading) return (
    <Card><CardContent className="py-6"><div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-6 bg-muted animate-pulse rounded" />)}</div></CardContent></Card>
  );

  if (!benchmark || !benchmark.store) return null;

  const s = benchmark.store;
  const c = benchmark.chain_avg;
  const t = benchmark.same_tier_avg;

  // Identify weakest metrics vs tier
  const metrics = [
    { key: 'revenue', label: 'Doanh thu/ngày', gap: t.avg_daily_revenue > 0 ? (s.avg_daily_revenue - t.avg_daily_revenue) / t.avg_daily_revenue * 100 : 0 },
    { key: 'txn', label: 'Số đơn/ngày', gap: t.avg_daily_txn > 0 ? (s.avg_daily_txn - t.avg_daily_txn) / t.avg_daily_txn * 100 : 0 },
    { key: 'aov', label: 'AOV', gap: t.avg_aov > 0 ? (s.avg_aov - t.avg_aov) / t.avg_aov * 100 : 0 },
    { key: 'customers', label: 'Khách/ngày', gap: t.avg_daily_customers > 0 ? (s.avg_daily_customers - t.avg_daily_customers) / t.avg_daily_customers * 100 : 0 },
    { key: 'rpc', label: 'Revenue/Khách', gap: t.revenue_per_customer > 0 ? (s.revenue_per_customer - t.revenue_per_customer) / t.revenue_per_customer * 100 : 0 },
  ];

  const weakMetrics = metrics.filter(m => m.gap < -10).sort((a, b) => a.gap - b.gap);
  const strongMetrics = metrics.filter(m => m.gap > 10).sort((a, b) => b.gap - a.gap);

  // Monthly gap analysis
  const monthlyGap = benchmark.monthly_gap || [];
  const underperformingMonths = monthlyGap.filter(m => m.achievement_pct !== null && m.achievement_pct < 100);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Phân tích chuyên sâu
          <Badge variant="outline" className="text-[10px] ml-auto">vs {c.store_count} stores · Tier {storeTier} ({t.store_count} stores)</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-4">
        {/* Benchmark comparison table */}
        <div>
          <BenchmarkMetric label="Doanh thu/ngày" storeVal={s.avg_daily_revenue} chainVal={c.avg_daily_revenue} tierVal={t.avg_daily_revenue} format={v => fmtVnd(v)} />
          <BenchmarkMetric label="Số đơn/ngày" storeVal={s.avg_daily_txn} chainVal={c.avg_daily_txn} tierVal={t.avg_daily_txn} format={v => v.toFixed(1)} />
          <BenchmarkMetric label="AOV" storeVal={s.avg_aov} chainVal={c.avg_aov} tierVal={t.avg_aov} format={v => `${(v/1000).toFixed(0)}K`} />
          <BenchmarkMetric label="Khách/ngày" storeVal={s.avg_daily_customers} chainVal={c.avg_daily_customers} tierVal={t.avg_daily_customers} format={v => v.toFixed(1)} />
          <BenchmarkMetric label="Revenue/Khách" storeVal={s.revenue_per_customer} chainVal={c.revenue_per_customer} tierVal={t.revenue_per_customer} format={v => fmtVnd(v)} />
        </div>

        {/* Diagnosis */}
        {(weakMetrics.length > 0 || strongMetrics.length > 0) && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5 text-primary" />Chẩn đoán hiệu suất</h4>
            {weakMetrics.length > 0 && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                  <TrendingDown className="h-3.5 w-3.5" />Điểm yếu so với Tier {storeTier}
                </div>
                {weakMetrics.map(m => (
                  <div key={m.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="text-red-400 font-medium tabular-nums">{m.gap.toFixed(1)}% so với TB tier</span>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-red-500/10">
                  {weakMetrics.some(m => m.key === 'customers') && weakMetrics.some(m => m.key === 'txn')
                    ? '💡 Lượng khách & đơn thấp → cần xem xét vị trí, marketing địa phương, hoặc giờ mở cửa.'
                    : weakMetrics.some(m => m.key === 'aov') || weakMetrics.some(m => m.key === 'rpc')
                    ? '💡 Giá trị đơn thấp → cần review merchandising, upsell strategy, hoặc mix sản phẩm tại cửa hàng.'
                    : weakMetrics.some(m => m.key === 'customers')
                    ? '💡 Ít khách → cần đánh giá traffic nguồn, visibility, và chương trình thu hút khách.'
                    : '💡 Cần phân tích thêm nguyên nhân để có hành động cụ thể.'
                  }
                </p>
              </div>
            )}
            {strongMetrics.length > 0 && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5" />Điểm mạnh
                </div>
                {strongMetrics.map(m => (
                  <div key={m.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="text-emerald-400 font-medium tabular-nums">+{m.gap.toFixed(1)}% so với TB tier</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Monthly gap table */}
        {monthlyGap.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary" />Gap theo tháng</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tháng</TableHead>
                  <TableHead className="text-xs text-right">Thực tế</TableHead>
                  <TableHead className="text-xs text-right">Mục tiêu</TableHead>
                  <TableHead className="text-xs text-right">Đạt %</TableHead>
                  <TableHead className="text-xs text-right">Đơn</TableHead>
                  <TableHead className="text-xs text-right">AOV</TableHead>
                  <TableHead className="text-xs text-right">Khách</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyGap.map(m => (
                  <TableRow key={m.month}>
                    <TableCell className="text-xs font-medium">{m.month}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{fmtVnd(m.actual_revenue)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{m.target_revenue ? fmtVnd(m.target_revenue) : '—'}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {m.achievement_pct !== null ? (
                        <span className={m.achievement_pct >= 100 ? 'text-emerald-400' : m.achievement_pct >= 80 ? 'text-amber-400' : 'text-red-400'}>
                          {m.achievement_pct}%
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{m.total_txn.toLocaleString('vi-VN')}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{`${(m.avg_aov/1000).toFixed(0)}K`}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{m.total_customers.toLocaleString('vi-VN')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Revenue decomposition insight */}
        {underperformingMonths.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400 mb-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />Phân tích nguyên nhân không đạt target
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Revenue = Số khách × Đơn/khách × AOV. 
              {(() => {
                const avgAchieve = underperformingMonths.reduce((sum, m) => sum + (m.achievement_pct || 0), 0) / underperformingMonths.length;
                const revenueGapPct = (100 - avgAchieve).toFixed(0);
                
                // Check which component is weakest vs tier
                const txnGap = t.avg_daily_txn > 0 ? (s.avg_daily_txn - t.avg_daily_txn) / t.avg_daily_txn * 100 : 0;
                const aovGap = t.avg_aov > 0 ? (s.avg_aov - t.avg_aov) / t.avg_aov * 100 : 0;
                const custGap = t.avg_daily_customers > 0 ? (s.avg_daily_customers - t.avg_daily_customers) / t.avg_daily_customers * 100 : 0;

                const factors: string[] = [];
                if (custGap < -10) factors.push(`khách hàng thấp hơn TB tier ${Math.abs(custGap).toFixed(0)}%`);
                if (txnGap < -10) factors.push(`số đơn thấp hơn ${Math.abs(txnGap).toFixed(0)}%`);
                if (aovGap < -10) factors.push(`AOV thấp hơn ${Math.abs(aovGap).toFixed(0)}%`);

                return factors.length > 0
                  ? ` Store thiếu ~${revenueGapPct}% target, nguyên nhân chính: ${factors.join(', ')}.`
                  : ` Store thiếu ~${revenueGapPct}% target. Các chỉ số gần mức trung bình tier — cần review lại target hoặc yếu tố bên ngoài.`;
              })()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Product Mix Panel ──────────────────────────────────────────────

function MixRow({ label, storePct, chainPct, tierPct, storeRev, storeQty }: {
  label: string; storePct: number; chainPct: number; tierPct?: number; storeRev?: number; storeQty?: number;
}) {
  const DeltaBadge = ({ pct }: { pct: number }) => (
    <span className={`text-[10px] font-medium tabular-nums ${pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}pp
    </span>
  );
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground w-28 truncate" title={label}>{label}</span>
      <span className="text-xs font-semibold tabular-nums w-16 text-right">{storePct.toFixed(1)}%</span>
      {storeRev !== undefined && <span className="text-[10px] text-muted-foreground/60 tabular-nums w-20 text-right">{fmtVnd(storeRev)}</span>}
      <div className="flex items-center gap-1.5 w-36 justify-end">
        <span className="text-[10px] text-muted-foreground">chuỗi:</span>
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">{chainPct.toFixed(1)}%</span>
        <DeltaBadge pct={storePct - chainPct} />
      </div>
      {tierPct !== undefined && (
        <div className="flex items-center gap-1.5 w-36 justify-end">
          <span className="text-[10px] text-muted-foreground">tier:</span>
          <span className="text-[10px] text-muted-foreground/60 tabular-nums">{tierPct.toFixed(1)}%</span>
          <DeltaBadge pct={storePct - tierPct} />
        </div>
      )}
    </div>
  );
}

function ProductMixPanel({ storeId }: { storeId: string }) {
  const { data: mix, isLoading } = useStoreProductMix(storeId);

  if (isLoading) return (
    <Card><CardContent className="py-6"><div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-6 bg-muted animate-pulse rounded" />)}</div></CardContent></Card>
  );
  if (!mix) return null;

  const { price_segments, categories, collections, top_products, bottom_products } = mix;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          Phân tích sản phẩm bán ra
          <Badge variant="outline" className="text-[10px] ml-auto">3 tháng gần nhất</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-5">

        {/* Price Segments */}
        {price_segments.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-primary" />Phân khúc giá (% doanh thu)</h4>
            {price_segments.map(seg => (
              <MixRow key={seg.band} label={seg.band} storePct={seg.store_pct} chainPct={seg.chain_pct} tierPct={seg.tier_pct} storeRev={seg.store_revenue} />
            ))}
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-primary" />Loại sản phẩm (% doanh thu)</h4>
            {categories.slice(0, 8).map(cat => (
              <MixRow key={cat.category} label={cat.category || 'Khác'} storePct={cat.store_pct} chainPct={cat.chain_pct} tierPct={cat.tier_pct} storeRev={cat.store_revenue} />
            ))}
          </div>
        )}

        {/* Collections */}
        {collections.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 text-primary" />Nhóm SP - BST (% doanh thu)</h4>
            {collections.map(col => (
              <MixRow key={col.collection} label={col.collection} storePct={col.store_pct} chainPct={col.chain_pct} storeRev={col.store_revenue} />
            ))}
          </div>
        )}

        {/* Top & Bottom Products */}
        {(top_products.length > 0 || bottom_products.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {top_products.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-emerald-500" />Top 5 SP bán chạy</h4>
                {top_products.map((p, i) => (
                  <div key={p.sku} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
                    <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" title={p.product_name}>{p.product_name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.sku} · {p.qty} sp · {fmtVnd(p.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {bottom_products.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5 text-red-400" />5 SP bán yếu nhất</h4>
                {bottom_products.map((p, i) => (
                  <div key={p.sku} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
                    <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" title={p.product_name}>{p.product_name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.sku} · {p.qty} sp · {fmtVnd(p.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Ranking View ───────────────────────────────────────────────────

function StoreRankingView({ stores, onSelect, compareIds, onToggleCompare }: {
  stores: any[];
  onSelect: (id: string) => void;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
}) {
  const [sortBy, setSortBy] = useState<'revenue' | 'on_hand' | 'tier'>('tier');
  const { data: allMonthly = [] } = useAllStoresMonthlyRevenue(1);

  // Build revenue map from latest month
  const revenueMap = useMemo(() => {
    const map = new Map<string, number>();
    allMonthly.forEach(m => {
      map.set(m.store_id, (map.get(m.store_id) || 0) + m.total_revenue);
    });
    return map;
  }, [allMonthly]);

  const txnMap = useMemo(() => {
    const map = new Map<string, number>();
    allMonthly.forEach(m => {
      map.set(m.store_id, (map.get(m.store_id) || 0) + m.total_transactions);
    });
    return map;
  }, [allMonthly]);

  const sorted = useMemo(() => {
    return [...stores].sort((a, b) => {
      if (sortBy === 'revenue') return (revenueMap.get(b.id) || 0) - (revenueMap.get(a.id) || 0);
      if (sortBy === 'on_hand') return (b.total_on_hand || 0) - (a.total_on_hand || 0);
      const tierDiff = (TIER_ORDER[a.tier] ?? 4) - (TIER_ORDER[b.tier] ?? 4);
      return tierDiff !== 0 ? tierDiff : (revenueMap.get(b.id) || 0) - (revenueMap.get(a.id) || 0);
    });
  }, [stores, sortBy, revenueMap]);

  const maxRevenue = useMemo(() => Math.max(...sorted.map(s => revenueMap.get(s.id) || 0), 1), [sorted, revenueMap]);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Xếp hạng chi nhánh ({stores.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            {compareIds.length >= 2 && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                <GitCompareArrows className="h-3 w-3 mr-1" />
                So sánh {compareIds.length} store
              </Badge>
            )}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[130px] h-7 text-xs">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tier">Theo Tier</SelectItem>
                <SelectItem value="revenue">Theo Doanh thu</SelectItem>
                <SelectItem value="on_hand">Theo Tồn kho</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[32px] text-xs">#</TableHead>
              <TableHead className="w-[32px] text-xs">
                <GitCompareArrows className="h-3 w-3" />
              </TableHead>
              <TableHead className="text-xs">Chi nhánh</TableHead>
              <TableHead className="text-xs">Tier</TableHead>
              <TableHead className="text-xs text-right">Doanh thu (tháng)</TableHead>
              <TableHead className="text-xs text-right">Đơn hàng</TableHead>
              <TableHead className="text-xs text-right">Tồn kho</TableHead>
              <TableHead className="text-xs text-right">Giá trị tồn</TableHead>
              <TableHead className="text-xs w-[120px]">Doanh thu</TableHead>
              <TableHead className="text-xs w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((s, idx) => {
              const rev = revenueMap.get(s.id) || 0;
              const txn = txnMap.get(s.id) || 0;
              const revPct = (rev / maxRevenue) * 100;
              const isCompare = compareIds.includes(s.id);
              return (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(s.id)}>
                  <TableCell className="text-xs font-medium text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="px-1" onClick={e => { e.stopPropagation(); onToggleCompare(s.id); }}>
                    <Checkbox checked={isCompare} className="h-4 w-4" disabled={!isCompare && compareIds.length >= 3} />
                  </TableCell>
                  <TableCell className="text-xs font-medium">{s.store_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TIER_COLORS[s.tier] || TIER_COLORS.C}`}>
                      {s.tier || 'C'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-medium">
                    {rev > 0 ? fmtVnd(rev) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{txn > 0 ? txn.toLocaleString('vi-VN') : '—'}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{(s.total_on_hand || 0).toLocaleString('vi-VN')}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {s.inventory_value ? fmtVnd(s.inventory_value) : '—'}
                  </TableCell>
                  <TableCell className="px-1">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden w-full">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(revPct, 1)}%` }} />
                    </div>
                  </TableCell>
                  <TableCell className="px-1">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Comparison View ─────────────────────────────────────────────────

function StoreComparisonView({ storeIds, stores }: { storeIds: string[]; stores: any[] }) {
  const storeMap = useMemo(() => new Map(stores.map((s: any) => [s.id, s])), [stores]);

  // Fetch monthly revenue for comparison
  const { data: allMonthly = [] } = useAllStoresMonthlyRevenue(6);

  const chartData = useMemo(() => {
    // Group by month, each store as a separate key
    const monthMap = new Map<string, any>();
    allMonthly
      .filter(m => storeIds.includes(m.store_id))
      .forEach(m => {
        if (!monthMap.has(m.month_value)) monthMap.set(m.month_value, { month: m.month_value });
        const entry = monthMap.get(m.month_value)!;
        const store = storeMap.get(m.store_id);
        const key = store?.store_name || m.store_id;
        entry[key] = m.total_revenue;
      });
    return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [allMonthly, storeIds, storeMap]);

  const storeNames = storeIds.map(id => storeMap.get(id)?.store_name || id);

  if (storeIds.length < 2) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-primary" />
          So sánh chi nhánh
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-4">
        {/* Metrics comparison */}
        <div className="grid grid-cols-1 gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Chỉ số</TableHead>
                {storeIds.map((id, i) => (
                  <TableHead key={id} className="text-xs text-right">
                    <span style={{ color: COMPARE_COLORS[i] }}>{storeMap.get(id)?.store_name || id}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-xs font-medium">Tier</TableCell>
                {storeIds.map(id => (
                  <TableCell key={id} className="text-xs text-right">
                    <Badge variant="outline" className={`text-[10px] ${TIER_COLORS[storeMap.get(id)?.tier] || TIER_COLORS.C}`}>
                      {storeMap.get(id)?.tier || 'C'}
                    </Badge>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs font-medium">Tồn kho</TableCell>
                {storeIds.map(id => (
                  <TableCell key={id} className="text-xs text-right tabular-nums">{(storeMap.get(id)?.total_on_hand || 0).toLocaleString('vi-VN')}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs font-medium">Giá trị tồn</TableCell>
                {storeIds.map(id => (
                  <TableCell key={id} className="text-xs text-right tabular-nums">
                    {storeMap.get(id)?.inventory_value ? fmtVnd(storeMap.get(id)!.inventory_value) : '—'}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs font-medium">Sức chứa</TableCell>
                {storeIds.map(id => {
                  const s = storeMap.get(id);
                  const fillPct = s?.capacity > 0 ? ((s.total_on_hand || 0) / s.capacity * 100).toFixed(0) : '—';
                  return <TableCell key={id} className="text-xs text-right tabular-nums">{(s?.capacity || 0).toLocaleString('vi-VN')} ({fillPct}%)</TableCell>;
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Revenue trend comparison */}
        {chartData.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2">Doanh thu 6 tháng so sánh</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => fmtVnd(v)} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} formatter={(v: number) => [fmtVnd(v)]} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {storeNames.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={COMPARE_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Store Detail View ──────────────────────────────────────────────

function StoreDetailView({ store, lookbackDays, onBack }: { store: any; lookbackDays: number; onBack: () => void }) {
  const storeId = store.id;
  const { data: profile, isLoading: profileLoading } = useStoreProfile(storeId);
  const { data: customerKpis, isLoading: kpisLoading } = useStoreCustomerKpis(storeId, lookbackDays);
  const { data: trendData = [] } = useStoreMetricsTrend(storeId, lookbackDays);
  const { data: topFCs = [], isLoading: topFCLoading } = useStoreTopFC(storeId);
  const { data: topCollections = [], isLoading: topCollLoading } = useStoreTopCollections(storeId);
  const { data: kpiTarget } = useStoreKpiTarget(storeId);

  const kpiComparison = useMemo(() => {
    if (!customerKpis) return null;
    return computeKpiComparison(kpiTarget, {
      revenue: customerKpis.totalRevenue, orders: customerKpis.totalTransactions,
      customers: customerKpis.customerCount, aov: customerKpis.avgOrderValue,
    });
  }, [kpiTarget, customerKpis]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-primary/10"><Store className="h-4 w-4 text-primary" /></div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">{store.store_name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className={`text-[10px] ${TIER_COLORS[store.tier] || TIER_COLORS.C}`}>Tier {store.tier || 'C'}</Badge>
              {store.region && <span className="text-xs text-muted-foreground">{store.region}</span>}
              {kpiComparison && kpiComparison.status !== 'no_target' && (() => {
                const cfg = STATUS_CONFIG[kpiComparison.status];
                const StatusIcon = cfg.icon;
                return <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.class}`}><StatusIcon className="h-3 w-3" />{cfg.label}</Badge>;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Inventory summary */}
      <div className="grid grid-cols-4 gap-2">
        <MetricCard icon={Package} label="Tồn kho" value={`${(store.total_on_hand || 0).toLocaleString('vi-VN')}`} iconClass="text-blue-400" />
        <MetricCard icon={DollarSign} label="Giá trị tồn" value={fmtVnd(store.inventory_value || 0)} sub={`@${((store.avg_unit_cost || 0) / 1000).toFixed(0)}k/unit`} iconClass="text-amber-400" />
        <MetricCard icon={BarChart3} label="Sức chứa" value={`${(store.capacity || 0).toLocaleString('vi-VN')}`} sub={`${store.capacity > 0 ? ((store.total_on_hand || 0) / store.capacity * 100).toFixed(0) : 0}% đầy`} iconClass="text-emerald-400" />
        <MetricCard icon={TrendingUp} label="Đã bán" value={profileLoading ? '...' : `${(profile?.totalSold || 0).toLocaleString('vi-VN')}`} sub={profileLoading ? '' : (profile?.periodStart && profile?.periodEnd ? `${format(parseISO(profile.periodStart), 'dd/MM')} - ${format(parseISO(profile.periodEnd), 'dd/MM')}` : '')} iconClass="text-pink-400" />
      </div>

      {/* KPI vs Target progress - only revenue */}
      {kpiComparison && kpiComparison.status !== 'no_target' && kpiComparison.target && kpiComparison.target.revenue_target > 0 && (
        <div className="grid grid-cols-1 max-w-sm">
          <KpiProgressCard label="Doanh thu vs Mục tiêu" actual={kpiComparison.actual.revenue} target={kpiComparison.target.revenue_target} unit="M" icon={DollarSign} iconClass="text-amber-400" />
        </div>
      )}

      {/* Revenue Chart 6 months */}
      <RevenueVsTargetChart storeId={storeId} storeName={store.store_name} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-9">
          <TabsTrigger value="overview" className="text-xs gap-1.5"><BarChart3 className="h-3 w-3" />Tổng quan</TabsTrigger>
          <TabsTrigger value="kpi-target" className="text-xs gap-1.5"><Target className="h-3 w-3" />KPI & Mục tiêu</TabsTrigger>
          <TabsTrigger value="top-collection" className="text-xs gap-1.5"><FolderOpen className="h-3 w-3" />Top BST</TabsTrigger>
          <TabsTrigger value="top-fc" className="text-xs gap-1.5"><Star className="h-3 w-3" />Top FC</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          {/* Customer KPIs */}
          <Card>
            <CardHeader className="pb-1.5 pt-3 px-4">
              <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-cyan-400" />Customer Metrics
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
                <div className="grid grid-cols-4 gap-2">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}</div>
              ) : customerKpis && customerKpis.daysCounted > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  <MetricCard icon={Users} label="Khách hàng" value={customerKpis.customerCount.toLocaleString('vi-VN')} sub={`~${customerKpis.dailyAvgCustomers}/ngày`} iconClass="text-cyan-400" delta={customerKpis.deltaCustomers} />
                  <MetricCard icon={ShoppingCart} label="AOV" value={`${(customerKpis.avgOrderValue / 1000).toFixed(0)}K`} sub={`${customerKpis.totalTransactions.toLocaleString('vi-VN')} đơn`} iconClass="text-amber-400" delta={customerKpis.deltaAov} />
                  <MetricCard icon={Layers} label="IPT" value={`${customerKpis.itemsPerTransaction}`} sub="SP/đơn" iconClass="text-emerald-400" />
                  <MetricCard icon={RotateCcw} label="Tỷ lệ quay lại" value={`${customerKpis.returnRate}%`} iconClass="text-pink-400" />
                </div>
              ) : (
                <div className="py-2 text-center"><Users className="h-5 w-5 mx-auto text-muted-foreground/30 mb-1" /><p className="text-xs text-muted-foreground">Chưa có dữ liệu</p></div>
              )}
            </CardContent>
          </Card>

          {/* Trends */}
          {trendData.length > 3 && (
            <Card>
              <CardHeader className="pb-1.5 pt-3 px-4">
                <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground"><TrendingUp className="h-3.5 w-3.5 text-primary" />Xu hướng</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-1">
                <div className="grid grid-cols-4 gap-3">
                  <MiniTrendChart data={trendData} dataKey="customers" label="Khách/ngày" color="hsl(var(--primary))" />
                  <MiniTrendChart data={trendData} dataKey="aov" label="AOV" color="hsl(45, 93%, 47%)" formatValue={v => `${(v/1000).toFixed(0)}K`} />
                  <MiniTrendChart data={trendData} dataKey="ipt" label="IPT" color="hsl(142, 71%, 45%)" formatValue={v => v.toFixed(1)} />
                  <MiniTrendChart data={trendData} dataKey="repeatRate" label="Quay lại (%)" color="hsl(330, 81%, 60%)" formatValue={v => `${v.toFixed(1)}%`} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-1.5 pt-3 px-3"><CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground"><ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />Demand Space</CardTitle></CardHeader>
              <CardContent className="px-3 pb-3">{profileLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-5 bg-muted animate-pulse rounded" />)}</div> : <HorizontalBarChart items={profile?.demandSpace || []} type="ds" />}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1.5 pt-3 px-3"><CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground"><Ruler className="h-3.5 w-3.5 text-blue-400" />Size</CardTitle></CardHeader>
              <CardContent className="px-3 pb-3">{profileLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-5 bg-muted animate-pulse rounded" />)}</div> : <HorizontalBarChart items={profile?.sizeBreakdown || []} type="size" />}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1.5 pt-3 px-3"><CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground"><Palette className="h-3.5 w-3.5 text-violet-400" />Color</CardTitle></CardHeader>
              <CardContent className="px-3 pb-3">{profileLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-5 bg-muted animate-pulse rounded" />)}</div> : profile?.hasColorData ? <HorizontalBarChart items={profile.colorBreakdown} type="color" /> : <div className="py-3 text-center"><p className="text-xs text-muted-foreground">Chưa có dữ liệu</p></div>}</CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="kpi-target" className="space-y-3">
          <KpiTargetForm storeId={storeId} storeName={store.store_name} />
          <StoreBenchmarkPanel storeId={storeId} storeTier={store.tier} />
          <ProductMixPanel storeId={storeId} />
        </TabsContent>

        <TabsContent value="top-collection">
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm flex items-center gap-2"><FolderOpen className="h-4 w-4 text-primary" />Top BST</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {topCollLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
              : topCollections.length === 0 ? <div className="py-6 text-center"><p className="text-sm text-muted-foreground">Chưa có dữ liệu</p></div>
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs w-[30px]">#</TableHead>
                    <TableHead className="text-xs">BST</TableHead>
                    <TableHead className="text-xs">Season</TableHead>
                    <TableHead className="text-xs text-right">Đã bán</TableHead>
                    <TableHead className="text-xs text-right">Tồn kho</TableHead>
                    <TableHead className="text-xs text-right">Sell-through</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {topCollections.map((c, idx) => {
                      const st = (c.total_sold + c.on_hand) > 0 ? (c.total_sold / (c.total_sold + c.on_hand) * 100) : 0;
                      return (
                        <TableRow key={c.collection_id}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{c.collection_name || c.collection_code}{c.is_new_collection && <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">NEW</Badge>}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.season || '—'}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-medium">{c.total_sold.toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{c.on_hand.toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums"><span className={st > 70 ? 'text-emerald-400' : st > 40 ? 'text-amber-400' : 'text-red-400'}>{st.toFixed(0)}%</span></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-fc">
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-amber-400" />Top FC</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {topFCLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
              : topFCs.length === 0 ? <div className="py-6 text-center"><p className="text-sm text-muted-foreground">Chưa có dữ liệu</p></div>
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs w-[30px]">#</TableHead>
                    <TableHead className="text-xs">FC</TableHead>
                    <TableHead className="text-xs text-right">Đã bán</TableHead>
                    <TableHead className="text-xs text-right">Tồn kho</TableHead>
                    <TableHead className="text-xs text-right">WoC</TableHead>
                    <TableHead className="text-xs text-right">Sell-through</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {topFCs.map((fc, idx) => {
                      const st = (fc.total_sold + fc.on_hand) > 0 ? (fc.total_sold / (fc.total_sold + fc.on_hand) * 100) : 0;
                      return (
                        <TableRow key={fc.fc_id}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="text-xs font-medium">
                            {fc.fc_name || fc.fc_code}
                            {fc.is_core_hero && <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1 bg-amber-500/10 text-amber-400 border-amber-500/30">HERO</Badge>}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-medium">{fc.total_sold.toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fc.on_hand.toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{fc.weeks_of_cover != null ? <span className={fc.weeks_of_cover < 2 ? 'text-red-400' : fc.weeks_of_cover > 8 ? 'text-amber-400' : 'text-emerald-400'}>{Number(fc.weeks_of_cover).toFixed(1)}</span> : '—'}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums"><span className={st > 70 ? 'text-emerald-400' : st > 40 ? 'text-amber-400' : 'text-red-400'}>{st.toFixed(0)}%</span></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function StoreIntelPage() {
  const { data: stores = [], isLoading: storesLoading } = useInventoryStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [lookbackDays, setLookbackDays] = useState(30);

  // Filter out central warehouse for ranking (still accessible via detail)
  const retailStores = useMemo(() => stores.filter((s: any) => s.location_type !== 'central_warehouse'), [stores]);
  const selectedStore = useMemo(() => stores.find((s: any) => s.id === selectedStoreId), [stores, selectedStoreId]);

  const handleToggleCompare = (id: string) => {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  if (storesLoading) {
    return <div className="p-8 text-center text-muted-foreground">Đang tải dữ liệu chi nhánh...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10"><Store className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Chi Nhánh</h1>
            <p className="text-xs text-muted-foreground">{retailStores.length} cửa hàng • Phân tích hiệu suất & KPI</p>
          </div>
        </div>
        {!selectedStoreId && (
          <Select value={String(lookbackDays)} onValueChange={v => setLookbackDays(Number(v))}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <Calendar className="h-3 w-3 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="14">14 ngày</SelectItem>
              <SelectItem value="30">30 ngày</SelectItem>
              <SelectItem value="60">60 ngày</SelectItem>
              <SelectItem value="90">90 ngày</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content */}
      {selectedStoreId && selectedStore ? (
        <StoreDetailView
          store={selectedStore}
          lookbackDays={lookbackDays}
          onBack={() => setSelectedStoreId(null)}
        />
      ) : (
        <>
          {/* Comparison view if 2+ stores selected */}
          {compareIds.length >= 2 && (
            <StoreComparisonView storeIds={compareIds} stores={retailStores} />
          )}

          {/* Ranking table */}
          <StoreRankingView
            stores={retailStores}
            onSelect={setSelectedStoreId}
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
          />
        </>
      )}
    </div>
  );
}
