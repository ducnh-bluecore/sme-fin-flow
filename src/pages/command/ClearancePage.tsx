import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tags, AlertTriangle, TrendingDown, Store, Search, ShieldAlert, ArrowLeft, Calendar, Package } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

// ─── Product Detail Panel ───
function ProductDetailPanel({ candidate, onBack }: { candidate: ClearanceCandidate; onBack: () => void }) {
  const { data: history, isLoading } = useClearanceHistory(candidate.product_name);

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
    const bandOrder = ['0-20%', '20-30%', '30-50%', '>50%'];
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
              {candidate.season && <Badge variant="outline" className="mt-1">{candidate.season}</Badge>}
            </div>
            {candidate.is_premium && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                <ShieldAlert className="h-3 w-3 mr-1" />
                Premium - Max {PREMIUM_MAX_DISCOUNT}%
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground block text-xs">Tồn kho</span>
              <span className="font-mono font-bold">{formatNumber(candidate.current_stock)}</span>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground block text-xs">Giá trị tồn</span>
              <span className="font-mono font-bold">{formatCurrency(candidate.inventory_value)}</span>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground block text-xs">Health Score</span>
              <Badge variant={candidate.health_score != null && candidate.health_score < 40 ? 'destructive' : 'secondary'}>
                {candidate.health_score != null ? Math.round(candidate.health_score) : '—'}
              </Badge>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground block text-xs">MD Risk</span>
              <Badge variant={candidate.markdown_risk_score >= 80 ? 'destructive' : 'secondary'}>
                {candidate.markdown_risk_score}
              </Badge>
            </div>
          </div>
          {candidate.reason && (
            <p className="text-xs text-muted-foreground italic">Lý do: {candidate.reason}</p>
          )}
        </CardContent>
      </Card>

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
            <p className="text-sm text-muted-foreground py-4 text-center">Sản phẩm này chưa từng được giảm giá — chưa có dữ liệu clearance để phân tích.</p>
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
                        <Badge variant={g.band === '>50%' ? 'destructive' : 'secondary'}>{g.band}</Badge>
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
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Đã clear</span>
                    <span className="font-mono">{formatNumber(ch.units)} units</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Doanh thu</span>
                    <span className="font-mono">{formatCurrency(ch.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Avg discount</span>
                    <Badge variant={ch.avgDiscount > 40 ? 'destructive' : 'secondary'} className="text-xs h-5">
                      {ch.avgDiscount}%
                    </Badge>
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

// ─── Tab 1: Clearance Candidates ───
function ClearanceCandidatesTab() {
  const { data: candidates, isLoading } = useClearanceCandidates();
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<ClearanceCandidate | null>(null);

  const filtered = useMemo(() => {
    if (!candidates) return [];
    if (!search) return candidates;
    const q = search.toLowerCase();
    return candidates.filter(c =>
      c.product_name.toLowerCase().includes(q) ||
      c.fc_code.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (selectedCandidate) {
    return <ProductDetailPanel candidate={selectedCandidate} onBack={() => setSelectedCandidate(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
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
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="text-right">Tồn kho</TableHead>
              <TableHead className="text-right">Giá trị tồn</TableHead>
              <TableHead className="text-center">Health</TableHead>
              <TableHead className="text-center">MD Risk</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Không có sản phẩm nào cần clearance
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow
                  key={item.product_id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => setSelectedCandidate(item)}
                >
                  <TableCell>
                    <div>
                      <span className="font-medium text-sm">{item.product_name}</span>
                      <span className="text-xs text-muted-foreground block">{item.fc_code}</span>
                    </div>
                    {item.is_premium && (
                      <Badge variant="outline" className="text-xs mt-1 border-amber-500 text-amber-600">
                        <ShieldAlert className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(item.current_stock)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.inventory_value)}</TableCell>
                  <TableCell className="text-center">
                    {item.health_score != null ? (
                      <Badge variant={item.health_score < 40 ? 'destructive' : item.health_score < 60 ? 'secondary' : 'default'}>
                        {Math.round(item.health_score)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
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
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
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
      {channels.map(ch => (
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
      {channels.length === 0 && (
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
