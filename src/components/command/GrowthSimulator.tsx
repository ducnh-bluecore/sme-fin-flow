import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Play, AlertTriangle, Star, Zap, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { formatVNDCompact } from '@/lib/formatters';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SKUSummary {
  sku: string | null;
  product_name: string | null;
  category: string | null;
  total_revenue: number | null;
  total_quantity: number | null;
  total_cogs: number | null;
  gross_profit: number | null;
  margin_percent: number | null;
  avg_unit_price: number | null;
  avg_unit_cogs: number | null;
}

interface FamilyCode {
  id: string;
  fc_code: string;
  fc_name: string;
  is_core_hero: boolean;
}

interface SimResult {
  fcCode: string;
  fcName: string;
  isHero: boolean;
  currentRevenue: number;
  currentQty: number;
  neededRevenue: number;
  neededQty: number;
  cashRequired: number;
  projectedMargin: number;
  marginPct: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface SimSummary {
  currentRevenue: number;
  targetRevenue: number;
  gapRevenue: number;
  totalQtyNeeded: number;
  totalCashRequired: number;
  totalProjectedMargin: number;
  avgMarginPct: number;
  heroCount: number;
  heroRevenueShare: number;
  newHeroesNeeded: number;
  heroQtyTotal: number;
  nonHeroQtyTotal: number;
  risks: { type: string; severity: 'warning' | 'critical'; message: string }[];
  details: SimResult[];
}

const PIE_COLORS = ['hsl(45, 93%, 47%)', 'hsl(215, 20%, 65%)'];

function runSimulation(
  revenueData: any[],
  skuData: SKUSummary[],
  fcData: FamilyCode[],
  growthPct: number,
  timeframe: string
): SimSummary | null {
  if (!revenueData?.length || !skuData?.length) return null;

  const totalDailyRevenue = revenueData.reduce((s: number, r: any) => s + (Number(r.metric_value) || 0), 0);
  const daysCount = revenueData.length || 1;
  const avgDailyRevenue = totalDailyRevenue / daysCount;
  const monthlyRevenue = avgDailyRevenue * 30;
  const months = Number(timeframe);
  const currentRevenue = monthlyRevenue * months;

  const targetRevenue = currentRevenue * (1 + growthPct / 100);
  const gapRevenue = targetRevenue - currentRevenue;

  const heroSet = new Set<string>();
  const fcNameMap = new Map<string, string>();
  for (const fc of fcData || []) {
    fcNameMap.set(fc.fc_code, fc.fc_name);
    if (fc.is_core_hero) heroSet.add(fc.fc_code);
  }

  const fcAgg = new Map<string, {
    revenue: number; qty: number; cogs: number; profit: number;
    avgPrice: number; avgCogs: number; count: number;
  }>();

  for (const sku of skuData) {
    if (!sku.sku) continue;
    let fcCode = sku.sku;
    for (const fc of fcData || []) {
      if (sku.sku.startsWith(fc.fc_code)) {
        fcCode = fc.fc_code;
        break;
      }
    }
    const existing = fcAgg.get(fcCode) || { revenue: 0, qty: 0, cogs: 0, profit: 0, avgPrice: 0, avgCogs: 0, count: 0 };
    existing.revenue += sku.total_revenue || 0;
    existing.qty += sku.total_quantity || 0;
    existing.cogs += sku.total_cogs || 0;
    existing.profit += sku.gross_profit || 0;
    existing.avgPrice += sku.avg_unit_price || 0;
    existing.avgCogs += sku.avg_unit_cogs || 0;
    existing.count += 1;
    fcAgg.set(fcCode, existing);
  }

  const totalSkuRevenue = Array.from(fcAgg.values()).reduce((s, v) => s + v.revenue, 0);
  if (totalSkuRevenue === 0) return null;

  const heroFCs = Array.from(fcAgg.entries()).filter(([k]) => heroSet.has(k));
  const nonHeroFCs = Array.from(fcAgg.entries()).filter(([k]) => !heroSet.has(k));

  const heroTotalRevenue = heroFCs.reduce((s, [, v]) => s + v.revenue, 0);
  const heroShareActual = totalSkuRevenue > 0 ? heroTotalRevenue / totalSkuRevenue : 0;

  const heroGapAllocation = gapRevenue * 0.6;
  const nonHeroGapAllocation = gapRevenue * 0.4;

  const details: SimResult[] = [];

  const buildDetail = (fcCode: string, agg: typeof fcAgg extends Map<string, infer V> ? V : never, allocation: number, totalInGroup: number, isHero: boolean) => {
    const share = totalInGroup > 0 ? agg.revenue / totalInGroup : 0.05;
    const neededRevenue = allocation * share;
    const unitPrice = agg.count > 0 ? agg.avgPrice / agg.count : 250000;
    const unitCogs = agg.count > 0 ? agg.avgCogs / agg.count : 150000;
    const neededQty = unitPrice > 0 ? Math.ceil(neededRevenue / unitPrice) : 0;
    const cashRequired = neededQty * unitCogs;
    const projectedMargin = neededQty * (unitPrice - unitCogs);
    const marginPct = unitPrice > 0 ? ((unitPrice - unitCogs) / unitPrice) * 100 : 0;

    details.push({
      fcCode,
      fcName: fcNameMap.get(fcCode) || fcCode,
      isHero,
      currentRevenue: agg.revenue,
      currentQty: agg.qty,
      neededRevenue,
      neededQty,
      cashRequired,
      projectedMargin,
      marginPct,
      riskLevel: marginPct < 20 ? 'high' : marginPct < 40 ? 'medium' : 'low',
    });
  };

  for (const [fcCode, agg] of heroFCs) {
    buildDetail(fcCode, agg, heroGapAllocation, heroTotalRevenue, true);
  }

  const nonHeroTotalRevenue = nonHeroFCs.reduce((s, [, v]) => s + v.revenue, 0);
  const topNonHero = [...nonHeroFCs].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 20);
  for (const [fcCode, agg] of topNonHero) {
    buildDetail(fcCode, agg, nonHeroGapAllocation, nonHeroTotalRevenue, false);
  }

  details.sort((a, b) => b.neededRevenue - a.neededRevenue);

  const totalQtyNeeded = details.reduce((s, d) => s + d.neededQty, 0);
  const totalCashRequired = details.reduce((s, d) => s + d.cashRequired, 0);
  const totalProjectedMargin = details.reduce((s, d) => s + d.projectedMargin, 0);
  const avgMarginPct = totalCashRequired + totalProjectedMargin > 0
    ? (totalProjectedMargin / (totalCashRequired + totalProjectedMargin)) * 100
    : 0;

  const heroQtyTotal = details.filter(d => d.isHero).reduce((s, d) => s + d.neededQty, 0);
  const nonHeroQtyTotal = details.filter(d => !d.isHero).reduce((s, d) => s + d.neededQty, 0);

  const risks: SimSummary['risks'] = [];
  const heroCount = heroFCs.length;

  if (heroCount < 3) {
    risks.push({
      type: 'concentration',
      severity: 'critical',
      message: `Chỉ có ${heroCount} Hero FC — rủi ro tập trung cao. Nếu 1 Hero sụt giảm, ảnh hưởng lớn đến kế hoạch.`,
    });
  }

  if (heroShareActual < 0.4) {
    const avgHeroRevenue = heroCount > 0 ? heroTotalRevenue / heroCount : 1;
    const newHeroesNeeded = avgHeroRevenue > 0 ? Math.ceil((gapRevenue * 0.6) / avgHeroRevenue) : 0;
    risks.push({
      type: 'hero_gap',
      severity: 'warning',
      message: `Hero chỉ chiếm ${(heroShareActual * 100).toFixed(0)}% doanh thu. Cần phát triển thêm ~${newHeroesNeeded} Hero mới.`,
    });
  }

  if (totalCashRequired > currentRevenue * 0.5) {
    risks.push({
      type: 'capital',
      severity: 'critical',
      message: `Vốn cần (${formatVNDCompact(totalCashRequired)}) chiếm >${((totalCashRequired / currentRevenue) * 100).toFixed(0)}% doanh thu hiện tại. Rủi ro cashflow cao.`,
    });
  }

  const newHeroesNeeded = heroShareActual < 0.4 && heroCount > 0
    ? Math.ceil((gapRevenue * 0.6) / (heroTotalRevenue / heroCount))
    : 0;

  return {
    currentRevenue, targetRevenue, gapRevenue,
    totalQtyNeeded, totalCashRequired, totalProjectedMargin, avgMarginPct,
    heroCount, heroRevenueShare: heroShareActual * 100, newHeroesNeeded,
    heroQtyTotal, nonHeroQtyTotal,
    risks, details,
  };
}

export default function GrowthSimulator() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const [growthPct, setGrowthPct] = useState(30);
  const [timeframe, setTimeframe] = useState('6');
  const [simulation, setSimulation] = useState<SimSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const { data: revenueData, isLoading: revLoading } = useQuery({
    queryKey: ['growth-sim-revenue', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery(
        'kpi_facts_daily' as any,
        'metric_value'
      )
        .eq('metric_code', 'NET_REVENUE')
        .eq('dimension_type', 'total')
        .order('fact_date', { ascending: false })
        .limit(90);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: isReady,
  });

  const { data: skuData, isLoading: skuLoading } = useQuery({
    queryKey: ['growth-sim-sku', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('fdp_sku_summary' as any, '*')
        .order('total_revenue', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as SKUSummary[];
    },
    enabled: isReady,
  });

  const { data: fcData, isLoading: fcLoading } = useQuery({
    queryKey: ['growth-sim-fc', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery(
        'inv_family_codes' as any,
        'id, fc_code, fc_name, is_core_hero'
      )
        .eq('is_active', true)
        .limit(2000);
      if (error) throw error;
      return (data || []) as unknown as FamilyCode[];
    },
    enabled: isReady,
  });

  const dataLoading = revLoading || skuLoading || fcLoading;
  const dataReady = !!revenueData?.length && !!skuData?.length;

  const handleRun = useCallback(() => {
    if (!revenueData || !skuData) return;
    setIsRunning(true);
    // Use setTimeout to allow UI to show loading state
    setTimeout(() => {
      const result = runSimulation(revenueData, skuData, fcData || [], growthPct, timeframe);
      setSimulation(result);
      setIsRunning(false);
    }, 100);
  }, [revenueData, skuData, fcData, growthPct, timeframe]);

  const heroDetails = simulation?.details.filter(d => d.isHero) || [];

  // Chart data
  const pieData = simulation ? [
    { name: 'Hero', value: simulation.heroQtyTotal },
    { name: 'Non-Hero', value: simulation.nonHeroQtyTotal },
  ] : [];

  const barData = simulation
    ? simulation.details.slice(0, 10).map(d => ({
        name: d.fcName.length > 12 ? d.fcName.slice(0, 12) + '…' : d.fcName,
        qty: d.neededQty,
        isHero: d.isHero,
      }))
    : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Mô Phỏng Tăng Trưởng
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Panel */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 rounded-lg bg-muted/50 border">
          <div className="flex-1 w-full space-y-2">
            <label className="text-sm font-medium">Mục tiêu tăng trưởng</label>
            <div className="flex items-center gap-3">
              <Slider
                value={[growthPct]}
                onValueChange={v => setGrowthPct(v[0])}
                min={10}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-lg font-bold text-primary w-16 text-right">+{growthPct}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Khung thời gian</label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 tháng</SelectItem>
                <SelectItem value="6">6 tháng</SelectItem>
                <SelectItem value="12">12 tháng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleRun} disabled={dataLoading || !dataReady || isRunning} className="gap-2">
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {dataLoading ? 'Đang tải...' : 'Chạy Mô Phỏng'}
          </Button>
        </div>

        {/* Results */}
        {simulation && (
          <>
            {/* KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 bg-background">
                <p className="text-xs text-muted-foreground">Doanh Thu Mục Tiêu</p>
                <p className="text-xl font-bold mt-1 text-primary">{formatVNDCompact(simulation.targetRevenue)}</p>
                <p className="text-xs text-muted-foreground">({timeframe} tháng, +{growthPct}%)</p>
              </div>
              <div className="rounded-lg border p-3 bg-background">
                <p className="text-xs text-muted-foreground">Tổng SL Cần SX</p>
                <p className="text-xl font-bold mt-1 text-orange-600">{simulation.totalQtyNeeded.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">đơn vị thêm</p>
              </div>
              <div className="rounded-lg border p-3 bg-background">
                <p className="text-xs text-muted-foreground">Vốn Cần</p>
                <p className="text-xl font-bold mt-1 text-red-600">{formatVNDCompact(simulation.totalCashRequired)}</p>
                <p className="text-xs text-muted-foreground">cash required</p>
              </div>
              <div className="rounded-lg border p-3 bg-background">
                <p className="text-xs text-muted-foreground">Margin Dự Kiến</p>
                <p className="text-xl font-bold mt-1 text-emerald-600">{simulation.avgMarginPct.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{formatVNDCompact(simulation.totalProjectedMargin)}</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pie Chart: Hero vs Non-Hero */}
              <div className="rounded-lg border p-4 bg-background">
                <h4 className="text-sm font-semibold mb-3">Phân Bổ SL Sản Xuất</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Chart: Top FC cần sản xuất */}
              <div className="rounded-lg border p-4 bg-background">
                <h4 className="text-sm font-semibold mb-3">Top FC Cần Sản Xuất</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(v) => v.toLocaleString()} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="qty" name="SL Cần SX" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hero Analysis */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" /> Hero Analysis
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{simulation.heroCount} Hero FC</Badge>
                  <Badge variant="outline">{simulation.heroRevenueShare.toFixed(0)}% doanh thu</Badge>
                  {simulation.newHeroesNeeded > 0 && (
                    <Badge variant="destructive">Cần +{simulation.newHeroesNeeded} Hero mới</Badge>
                  )}
                </div>
              </div>
              {heroDetails.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hero FC</TableHead>
                        <TableHead className="text-right">DT Hiện Tại</TableHead>
                        <TableHead className="text-right">SL Cần Thêm</TableHead>
                        <TableHead className="text-right">Vốn Cần</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {heroDetails.map(d => (
                        <TableRow key={d.fcCode}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              {d.fcName}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatVNDCompact(d.currentRevenue)}</TableCell>
                          <TableCell className="text-right font-medium text-orange-600">{d.neededQty.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{formatVNDCompact(d.cashRequired)}</TableCell>
                          <TableCell className="text-right">
                            <span className={d.marginPct < 20 ? 'text-red-600' : d.marginPct < 40 ? 'text-amber-600' : 'text-emerald-600'}>
                              {d.marginPct.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Chưa có FC nào được đánh dấu Hero</p>
              )}
            </div>

            {/* Full Production Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" /> Chi Tiết Sản Xuất
              </h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên SP</TableHead>
                      <TableHead>Hero?</TableHead>
                      <TableHead className="text-right">SL Cần</TableHead>
                      <TableHead className="text-right">Vốn Cần</TableHead>
                      <TableHead className="text-right">Margin DK</TableHead>
                      <TableHead>Rủi Ro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulation.details.slice(0, 30).map(d => (
                      <TableRow key={d.fcCode}>
                        <TableCell className="font-medium text-sm">{d.fcName}</TableCell>
                        <TableCell>
                          {d.isHero ? (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-0">Hero</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">{d.neededQty.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatVNDCompact(d.cashRequired)}</TableCell>
                        <TableCell className="text-right">
                          <span className={d.marginPct < 20 ? 'text-red-600' : d.marginPct < 40 ? 'text-amber-600' : 'text-emerald-600'}>
                            {d.marginPct.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={d.riskLevel === 'high' ? 'destructive' : d.riskLevel === 'medium' ? 'secondary' : 'outline'}>
                            {d.riskLevel === 'high' ? 'Cao' : d.riskLevel === 'medium' ? 'TB' : 'Thấp'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {simulation.details.length > 30 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">Hiển thị 30 / {simulation.details.length}</p>
                )}
              </div>
            </div>

            {/* Risk Summary */}
            {simulation.risks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Đánh Giá Rủi Ro
                </h4>
                <div className="space-y-2">
                  {simulation.risks.map((risk, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 text-sm ${
                        risk.severity === 'critical'
                          ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 text-red-800 dark:text-red-300'
                          : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {risk.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!simulation && !isRunning && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {dataLoading
              ? 'Đang tải dữ liệu...'
              : 'Chọn % tăng trưởng và khung thời gian, sau đó nhấn "Chạy Mô Phỏng" để xem kết quả.'}
          </p>
        )}

        {isRunning && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Đang tính toán...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
