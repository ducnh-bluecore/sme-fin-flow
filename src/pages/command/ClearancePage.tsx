import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tags, AlertTriangle, TrendingDown, TrendingUp, Minus, Store, Search, ShieldAlert, ArrowLeft, Calendar, Package, ChevronDown, Layers } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  useClearanceHistory,
  useClearanceCandidates,
  useClearanceByChannel,
  isPremiumGroup,
  PREMIUM_MAX_DISCOUNT,
  type ClearanceCandidate,
} from '@/hooks/inventory/useClearanceIntelligence';
import { formatCurrency, formatNumber } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Trend Badge ───
function TrendBadge({ trend }: { trend: string | null }) {
  if (!trend) return <span className="text-muted-foreground text-xs">—</span>;
  if (trend === 'up') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30"><TrendingUp className="h-3 w-3 mr-1" />Tăng</Badge>;
  if (trend === 'down') return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><TrendingDown className="h-3 w-3 mr-1" />Giảm</Badge>;
  return <Badge variant="secondary"><Minus className="h-3 w-3 mr-1" />Ổn định</Badge>;
}

// ─── Why Clear Card ───
function WhyClearCard({ candidate }: { candidate: ClearanceCandidate }) {
  const factors: { label: string; value: string | number; severity: 'high' | 'medium' | 'low'; pct?: number }[] = [];

  // Markdown risk
  const riskScore = candidate.markdown_risk_score;
  factors.push({
    label: 'Rủi ro markdown',
    value: `${riskScore}/100`,
    severity: riskScore >= 80 ? 'high' : riskScore >= 60 ? 'medium' : 'low',
    pct: riskScore,
  });

  // Health score
  if (candidate.health_score != null) {
    const hs = Math.round(candidate.health_score);
    factors.push({
      label: 'Sức khỏe size curve',
      value: `${hs}/100`,
      severity: hs < 40 ? 'high' : hs < 60 ? 'medium' : 'low',
      pct: hs,
    });
  }

  // Curve state
  if (candidate.curve_state) {
    factors.push({
      label: 'Trạng thái size',
      value: candidate.curve_state === 'broken' ? 'Đã vỡ' : candidate.curve_state,
      severity: candidate.curve_state === 'broken' ? 'high' : 'medium',
    });
  }

  // Sales velocity
  factors.push({
    label: 'Tốc độ bán',
    value: candidate.avg_daily_sales > 0 ? `${candidate.avg_daily_sales.toFixed(2)}/ngày` : 'Không bán được',
    severity: candidate.avg_daily_sales < 0.05 ? 'high' : candidate.avg_daily_sales < 0.2 ? 'medium' : 'low',
  });

  // Days to clear
  if (candidate.days_to_clear != null) {
    factors.push({
      label: 'Số ngày để clear hết',
      value: `${candidate.days_to_clear} ngày`,
      severity: candidate.days_to_clear > 180 ? 'high' : candidate.days_to_clear > 90 ? 'medium' : 'low',
    });
  }

  // ETA
  if (candidate.markdown_eta_days != null) {
    factors.push({
      label: 'Thời gian tới markdown',
      value: `${candidate.markdown_eta_days} ngày`,
      severity: candidate.markdown_eta_days < 14 ? 'high' : candidate.markdown_eta_days < 30 ? 'medium' : 'low',
    });
  }

  const severityColor = {
    high: 'text-red-600 bg-red-500/10',
    medium: 'text-amber-600 bg-amber-500/10',
    low: 'text-emerald-600 bg-emerald-500/10',
  };

  const progressColor = {
    high: '[&>div]:bg-red-500',
    medium: '[&>div]:bg-amber-500',
    low: '[&>div]:bg-emerald-500',
  };

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          Tại sao cần Clear?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {candidate.reason && (
          <p className="text-sm text-muted-foreground">{candidate.reason}</p>
        )}
        <div className="space-y-2">
          {factors.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-36 shrink-0">{f.label}</span>
              {f.pct != null ? (
                <div className="flex-1 flex items-center gap-2">
                  <Progress value={f.pct} className={`h-2 flex-1 ${progressColor[f.severity]}`} />
                  <span className={`text-xs font-mono font-medium ${severityColor[f.severity].split(' ')[0]}`}>{f.value}</span>
                </div>
              ) : (
                <Badge className={`text-xs ${severityColor[f.severity]}`}>{f.value}</Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Product Detail Panel ───
function ProductDetailPanel({ candidate, onBack }: { candidate: ClearanceCandidate; onBack: () => void }) {
  const { data: history, isLoading } = useClearanceHistory(candidate.product_id);

  const grouped = useMemo(() => {
    if (!history) return [];
    const map = new Map<string, { band: string; channel: string; units: number; revenue: number; discount: number; months: Set<string> }>();
    history.forEach(h => {
      const key = `${h.discount_band}|${h.channel}`;
      const existing = map.get(key);
      if (existing) {
        existing.units += h.units_sold;
        existing.revenue += h.revenue_collected;
        existing.discount += h.total_discount_given;
        existing.months.add(h.sale_month);
      } else {
        map.set(key, {
          band: h.discount_band,
          channel: h.channel,
          units: h.units_sold,
          revenue: h.revenue_collected,
          discount: h.total_discount_given,
          months: new Set([h.sale_month]),
        });
      }
    });
    const bandOrder = ['full_price', '0-20%', '20-30%', '30-50%', '>50%'];
    return Array.from(map.values())
      .sort((a, b) => bandOrder.indexOf(a.band) - bandOrder.indexOf(b.band));
  }, [history]);

  // Summary by channel
  const channelSummary = useMemo(() => {
    if (!history) return [];
    const map = new Map<string, { channel: string; units: number; revenue: number; avgDiscount: number; count: number }>();
    history.forEach(h => {
      const existing = map.get(h.channel);
      if (existing) {
        existing.units += h.units_sold;
        existing.revenue += h.revenue_collected;
        existing.count += 1;
      } else {
        map.set(h.channel, { channel: h.channel, units: h.units_sold, revenue: h.revenue_collected, avgDiscount: 0, count: 1 });
      }
    });
    map.forEach(ch => {
      const rows = history.filter(h => h.channel === ch.channel);
      ch.avgDiscount = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.avg_discount_pct, 0) / rows.length) : 0;
    });
    return Array.from(map.values()).sort((a, b) => b.units - a.units);
  }, [history]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </Button>

      {/* Product header */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">{candidate.product_name}</h2>
              <p className="text-sm text-muted-foreground">Mã FC: {candidate.fc_code}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {candidate.season && <Badge variant="outline">{candidate.season}</Badge>}
                {candidate.collection_name && <Badge variant="outline" className="border-blue-500/30 text-blue-600">{candidate.collection_name}</Badge>}
              </div>
            </div>
            {candidate.is_premium && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                <ShieldAlert className="h-3 w-3 mr-1" />
                Premium - Max {PREMIUM_MAX_DISCOUNT}%
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            <div className="bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground block text-xs">Tồn kho</span>
              <span className="font-mono font-bold">{formatNumber(candidate.current_stock)}</span>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground block text-xs">Giá trị tồn</span>
              <span className="font-mono font-bold">{candidate.inventory_value > 0 ? formatCurrency(candidate.inventory_value) : 'Chưa cập nhật'}</span>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground block text-xs">Tốc độ bán TB</span>
              <span className="font-mono font-bold">{candidate.avg_daily_sales > 0 ? `${candidate.avg_daily_sales.toFixed(2)}/ngày` : '0'}</span>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground block text-xs">Xu hướng</span>
              <TrendBadge trend={candidate.trend} />
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground block text-xs">Ngày để clear hết</span>
              <span className="font-mono font-bold">{candidate.days_to_clear != null ? `${candidate.days_to_clear}` : '∞'}</span>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground block text-xs">MD Risk</span>
              <Badge variant={candidate.markdown_risk_score >= 80 ? 'destructive' : 'secondary'}>
                {candidate.markdown_risk_score}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Why Clear card */}
      <WhyClearCard candidate={candidate} />

      {/* Clearance history by discount band & channel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            Lịch sử giảm giá theo mức & kênh
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sản phẩm này chưa có lịch sử bán hàng trong hệ thống.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Mức giảm</TableHead>
                    <TableHead>Kênh</TableHead>
                    <TableHead className="text-right">SL clear</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Số tháng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map((g, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant={g.band === '>50%' ? 'destructive' : g.band === 'full_price' ? 'default' : 'secondary'}>
                          {g.band === 'full_price' ? 'Giá gốc' : g.band}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{g.channel}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(g.units)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(g.revenue)}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{formatCurrency(g.discount)}</TableCell>
                      <TableCell className="text-right">{g.months.size}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            Hiệu quả theo kênh
          </CardTitle>
        </CardHeader>
        <CardContent>
          {channelSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Chưa có dữ liệu</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {channelSummary.map(ch => (
                <div key={ch.channel} className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="font-medium text-sm">{ch.channel}</div>
                  <div className="space-y-0.5">
                    <div className="text-xs"><span className="text-muted-foreground">Đã clear:</span> <span className="font-mono">{formatNumber(ch.units)} units</span></div>
                    <div className="text-xs"><span className="text-muted-foreground">Doanh thu:</span> <span className="font-mono">{formatCurrency(ch.revenue)}</span></div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Avg discount:</span>{' '}
                      <Badge variant={ch.avgDiscount > 40 ? 'destructive' : 'secondary'} className="text-xs h-5">{ch.avgDiscount}%</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Collection Group ───
interface CollectionGroup {
  name: string;
  season: string | null;
  candidates: ClearanceCandidate[];
  totalValue: number;
}

function CollectionGroupHeader({ group }: { group: CollectionGroup }) {
  return (
    <div className="flex items-center justify-between w-full py-1">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-blue-500" />
        <span className="font-semibold text-sm">{group.name}</span>
        {group.season && <Badge variant="outline" className="text-xs">{group.season}</Badge>}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{group.candidates.length} SP</span>
        <span className="font-mono">{formatCurrency(group.totalValue)}</span>
      </div>
    </div>
  );
}

// ─── Candidate Table Rows ───
function CandidateTableRows({ items, onSelect }: { items: ClearanceCandidate[]; onSelect: (c: ClearanceCandidate) => void }) {
  return (
    <>
      {items.map((item) => (
        <TableRow
          key={item.product_id}
          className="hover:bg-muted/30 cursor-pointer"
          onClick={() => onSelect(item)}
        >
          <TableCell>
            <div>
              <span className="font-medium text-sm">{item.product_name}</span>
              <span className="text-xs text-muted-foreground block">{item.fc_code}</span>
            </div>
            {item.is_premium && (
              <Badge variant="outline" className="text-xs mt-1 border-amber-500 text-amber-600">
                <ShieldAlert className="h-3 w-3 mr-1" />Premium
              </Badge>
            )}
          </TableCell>
          <TableCell className="text-right font-mono">{formatNumber(item.current_stock)}</TableCell>
          <TableCell className="text-right font-mono">{formatCurrency(item.inventory_value)}</TableCell>
          <TableCell className="text-center">
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-mono text-xs">{item.avg_daily_sales > 0 ? item.avg_daily_sales.toFixed(2) : '0'}</span>
              <TrendBadge trend={item.trend} />
            </div>
          </TableCell>
          <TableCell className="text-center">
            {item.health_score != null ? (
              <Badge variant={item.health_score < 40 ? 'destructive' : item.health_score < 60 ? 'secondary' : 'default'}>
                {Math.round(item.health_score)}
              </Badge>
            ) : <span className="text-muted-foreground text-xs">—</span>}
          </TableCell>
          <TableCell className="text-center">
            <Badge variant={item.markdown_risk_score >= 80 ? 'destructive' : 'secondary'}>
              {item.markdown_risk_score}
            </Badge>
          </TableCell>
          <TableCell>
            {item.curve_state ? (
              <Badge variant={item.curve_state === 'broken' ? 'destructive' : 'secondary'}>
                {item.curve_state}
              </Badge>
            ) : <span className="text-muted-foreground text-xs">—</span>}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Tab 1: Clearance Candidates ───
function ClearanceCandidatesTab() {
  const { data: candidates, isLoading } = useClearanceCandidates();
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<ClearanceCandidate | null>(null);
  const [groupByCollection, setGroupByCollection] = useState(true);

  const filtered = useMemo(() => {
    if (!candidates) return [];
    if (!search) return candidates;
    const q = search.toLowerCase();
    return candidates.filter(c =>
      c.product_name.toLowerCase().includes(q) ||
      c.fc_code.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const collectionGroups = useMemo(() => {
    if (!groupByCollection) return [];
    const groupMap = new Map<string, CollectionGroup>();
    const ungrouped: ClearanceCandidate[] = [];

    filtered.forEach(c => {
      if (c.collection_name) {
        const existing = groupMap.get(c.collection_name);
        if (existing) {
          existing.candidates.push(c);
          existing.totalValue += c.inventory_value;
        } else {
          groupMap.set(c.collection_name, {
            name: c.collection_name,
            season: c.season,
            candidates: [c],
            totalValue: c.inventory_value,
          });
        }
      } else {
        ungrouped.push(c);
      }
    });

    const groups = Array.from(groupMap.values()).sort((a, b) => b.totalValue - a.totalValue);
    if (ungrouped.length > 0) {
      groups.push({ name: 'Chưa phân BST', season: null, candidates: ungrouped, totalValue: ungrouped.reduce((s, c) => s + c.inventory_value, 0) });
    }
    return groups;
  }, [filtered, groupByCollection]);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (selectedCandidate) {
    return <ProductDetailPanel candidate={selectedCandidate} onBack={() => setSelectedCandidate(null)} />;
  }

  const tableHeader = (
    <TableHeader>
      <TableRow className="bg-muted/50">
        <TableHead>Sản phẩm</TableHead>
        <TableHead className="text-right">Tồn kho</TableHead>
        <TableHead className="text-right">Giá trị tồn</TableHead>
        <TableHead className="text-center">Tốc độ bán</TableHead>
        <TableHead className="text-center">Health</TableHead>
        <TableHead className="text-center">MD Risk</TableHead>
        <TableHead>Trạng thái</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm sản phẩm..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{filtered.length} sản phẩm</Badge>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">Nhóm theo BST</span>
          <Switch checked={groupByCollection} onCheckedChange={setGroupByCollection} />
        </div>
      </div>

      {groupByCollection && collectionGroups.length > 0 ? (
        <div className="space-y-3">
          {collectionGroups.map(group => (
            <Collapsible key={group.name} defaultOpen>
              <div className="rounded-lg border overflow-hidden">
                <CollapsibleTrigger className="w-full px-4 py-2 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center gap-2">
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform [[data-state=closed]>&]:rotate-[-90deg]" />
                  <CollectionGroupHeader group={group} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    {tableHeader}
                    <TableBody>
                      <CandidateTableRows items={group.candidates} onSelect={setSelectedCandidate} />
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            {tableHeader}
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Không có sản phẩm nào cần clearance
                  </TableCell>
                </TableRow>
              ) : (
                <CandidateTableRows items={filtered} onSelect={setSelectedCandidate} />
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Markdown History ───
function MarkdownHistoryTab() {
  const [searchSku, setSearchSku] = useState('');
  const { data: history, isLoading } = useClearanceHistory(searchSku || undefined);

  const grouped = useMemo(() => {
    if (!history) return [];
    const map = new Map<string, { band: string; channel: string; units: number; revenue: number; discount: number; months: string[] }>();
    history.forEach(h => {
      const key = `${h.discount_band}|${h.channel}`;
      const existing = map.get(key);
      if (existing) {
        existing.units += h.units_sold;
        existing.revenue += h.revenue_collected;
        existing.discount += h.total_discount_given;
        if (!existing.months.includes(h.sale_month)) existing.months.push(h.sale_month);
      } else {
        map.set(key, {
          band: h.discount_band,
          channel: h.channel,
          units: h.units_sold,
          revenue: h.revenue_collected,
          discount: h.total_discount_given,
          months: [h.sale_month],
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const bandOrder = ['0-20%', '20-30%', '30-50%', '>50%'];
      return bandOrder.indexOf(a.band) - bandOrder.indexOf(b.band);
    });
  }, [history]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Nhập tên sản phẩm để xem lịch sử..."
          value={searchSku}
          onChange={e => setSearchSku(e.target.value)}
          className="pl-9"
        />
      </div>

      {!searchSku && (
        <Alert>
          <TrendingDown className="h-4 w-4" />
          <AlertDescription>Nhập tên sản phẩm để xem lịch sử markdown theo thời gian và kênh. Hoặc click sản phẩm trong tab "Cần Clearance".</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : searchSku && grouped.length === 0 ? (
        <Alert>
          <AlertDescription>Không tìm thấy lịch sử giảm giá cho sản phẩm này.</AlertDescription>
        </Alert>
      ) : searchSku ? (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Mức giảm</TableHead>
                <TableHead>Kênh</TableHead>
                <TableHead className="text-right">Số lượng clear</TableHead>
                <TableHead className="text-right">Doanh thu thu về</TableHead>
                <TableHead className="text-right">Tổng discount</TableHead>
                <TableHead className="text-right">Số tháng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map((g, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Badge variant={g.band === '>50%' ? 'destructive' : 'secondary'}>{g.band}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{g.channel}</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(g.units)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(g.revenue)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(g.discount)}</TableCell>
                  <TableCell className="text-right">{g.months.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}

// ─── Tab 3: Channel Analysis ───
function ChannelAnalysisTab() {
  const { data: channels, isLoading } = useClearanceByChannel();

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {(channels || []).map(ch => (
        <Card key={ch.channel}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              {ch.channel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Discount</span>
              <Badge variant={ch.avgDiscountPct > 40 ? 'destructive' : 'secondary'}>
                {ch.avgDiscountPct}%
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tổng units</span>
              <span className="font-mono font-medium">{formatNumber(ch.totalUnits)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Doanh thu</span>
              <span className="font-mono font-medium">{formatCurrency(ch.totalRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tổng discount</span>
              <span className="font-mono font-medium text-destructive">{formatCurrency(ch.totalDiscount)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
      {(!channels || channels.length === 0) && (
        <div className="col-span-full text-center text-muted-foreground py-8">
          Chưa có dữ liệu clearance
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───
export default function ClearancePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Tags className="h-6 w-6 text-orange-500" />
          Thanh Lý Thông Minh
        </h1>
        <p className="text-muted-foreground mt-1">
          Phân tích hàng cần clearance, lịch sử markdown và hiệu quả theo kênh
        </p>
      </div>

      <Alert className="border-amber-500/30 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-700 dark:text-amber-400">
          <strong>Guardrail:</strong> Nhóm Premium / Signature / Thêu không được off quá {PREMIUM_MAX_DISCOUNT}%.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="candidates" className="w-full">
        <TabsList>
          <TabsTrigger value="candidates">Cần Clearance</TabsTrigger>
          <TabsTrigger value="history">Lịch Sử Markdown</TabsTrigger>
          <TabsTrigger value="channels">Phân Tích Kênh</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates">
          <ClearanceCandidatesTab />
        </TabsContent>
        <TabsContent value="history">
          <MarkdownHistoryTab />
        </TabsContent>
        <TabsContent value="channels">
          <ChannelAnalysisTab />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
