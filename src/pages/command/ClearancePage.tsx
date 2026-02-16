import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tags, AlertTriangle, TrendingDown, Store, Search, ShieldAlert } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useClearanceHistory,
  useClearanceCandidates,
  useClearanceByChannel,
  isPremiumGroup,
  PREMIUM_MAX_DISCOUNT,
} from '@/hooks/inventory/useClearanceIntelligence';
import { formatCurrency, formatNumber } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Tab 1: Clearance Candidates ───
function ClearanceCandidatesTab() {
  const { data: candidates, isLoading } = useClearanceCandidates();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!candidates) return [];
    if (!search) return candidates;
    const q = search.toLowerCase();
    return candidates.filter(c =>
      c.product_name.toLowerCase().includes(q) ||
      c.sku.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
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
              filtered.map((item) => {
                const premium = isPremiumGroup({ product_name: item.product_name, subcategory: item.subcategory });
                return (
                  <TableRow key={item.product_id} className="hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{item.product_name}</span>
                        <span className="text-xs text-muted-foreground block">{item.sku}</span>
                      </div>
                      {premium && (
                        <Badge variant="outline" className="text-xs mt-1 border-amber-500 text-amber-600">
                          <ShieldAlert className="h-3 w-3 mr-1" />
                          Premium - Max {PREMIUM_MAX_DISCOUNT}%
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
                );
              })
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
          placeholder="Nhập SKU để xem lịch sử..."
          value={searchSku}
          onChange={e => setSearchSku(e.target.value)}
          className="pl-9"
        />
      </div>

      {!searchSku && (
        <Alert>
          <TrendingDown className="h-4 w-4" />
          <AlertDescription>Nhập SKU hoặc tên sản phẩm để xem lịch sử markdown theo thời gian và kênh.</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : searchSku && grouped.length === 0 ? (
        <Alert>
          <AlertDescription>Không tìm thấy lịch sử giảm giá cho SKU này.</AlertDescription>
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
