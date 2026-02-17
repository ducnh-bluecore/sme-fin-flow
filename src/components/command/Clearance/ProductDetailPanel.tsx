import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, Store, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useClearanceHistory,
  PREMIUM_MAX_DISCOUNT,
  type ClearanceCandidate,
} from '@/hooks/inventory/useClearanceIntelligence';
import { formatCurrency, formatNumber } from '@/lib/format';
import TrendBadge from './TrendBadge';
import WhyClearCard from './WhyClearCard';

export default function ProductDetailPanel({ candidate, onBack }: { candidate: ClearanceCandidate; onBack: () => void }) {
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
        map.set(key, { band: h.discount_band, channel: h.channel, units: h.units_sold, revenue: h.revenue_collected, discount: h.total_discount_given, months: new Set([h.sale_month]) });
      }
    });
    const bandOrder = ['full_price', '0-20%', '20-30%', '30-50%', '>50%'];
    return Array.from(map.values()).sort((a, b) => bandOrder.indexOf(a.band) - bandOrder.indexOf(b.band));
  }, [history]);

  const channelSummary = useMemo(() => {
    if (!history) return [];
    const map = new Map<string, { channel: string; units: number; revenue: number; avgDiscount: number; count: number }>();
    history.forEach(h => {
      const existing = map.get(h.channel);
      if (existing) { existing.units += h.units_sold; existing.revenue += h.revenue_collected; existing.count += 1; }
      else { map.set(h.channel, { channel: h.channel, units: h.units_sold, revenue: h.revenue_collected, avgDiscount: 0, count: 1 }); }
    });
    map.forEach(ch => {
      const rows = history.filter(h => h.channel === ch.channel);
      ch.avgDiscount = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.avg_discount_pct, 0) / rows.length) : 0;
    });
    return Array.from(map.values()).sort((a, b) => b.units - a.units);
  }, [history]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </Button>

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
                <ShieldAlert className="h-3 w-3 mr-1" />Premium - Max {PREMIUM_MAX_DISCOUNT}%
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground block text-xs">Tồn kho</span><span className="font-mono font-bold">{formatNumber(candidate.current_stock)}</span></div>
            <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground block text-xs">Giá trị tồn</span><span className="font-mono font-bold">{candidate.inventory_value > 0 ? formatCurrency(candidate.inventory_value) : 'Chưa cập nhật'}</span></div>
            <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground block text-xs">Tốc độ bán TB</span><span className="font-mono font-bold">{candidate.avg_daily_sales > 0 ? `${candidate.avg_daily_sales.toFixed(2)}/ngày` : '0'}</span></div>
            <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground block text-xs">Xu hướng</span><TrendBadge trend={candidate.trend} /></div>
            <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground block text-xs">Ngày để clear hết</span><span className="font-mono font-bold">{candidate.days_to_clear != null && candidate.days_to_clear < 9999 ? `${candidate.days_to_clear}` : '∞'}</span></div>
            <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground block text-xs">MD Risk</span><Badge variant={candidate.markdown_risk_score >= 80 ? 'destructive' : 'secondary'}>{candidate.markdown_risk_score}</Badge></div>
          </div>
        </CardContent>
      </Card>

      <WhyClearCard candidate={candidate} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-muted-foreground" />Lịch sử giảm giá theo mức & kênh</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sản phẩm này chưa có lịch sử bán hàng trong hệ thống.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow className="bg-muted/50"><TableHead>Mức giảm</TableHead><TableHead>Kênh</TableHead><TableHead className="text-right">SL clear</TableHead><TableHead className="text-right">Doanh thu</TableHead><TableHead className="text-right">Discount</TableHead><TableHead className="text-right">Số tháng</TableHead></TableRow></TableHeader>
                <TableBody>
                  {grouped.map((g, i) => (
                    <TableRow key={i}>
                      <TableCell><Badge variant={g.band === '>50%' ? 'destructive' : g.band === 'full_price' ? 'default' : 'secondary'}>{g.band === 'full_price' ? 'Giá gốc' : g.band}</Badge></TableCell>
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

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4 text-muted-foreground" />Hiệu quả theo kênh</CardTitle></CardHeader>
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
                    <div className="text-xs"><span className="text-muted-foreground">Avg discount:</span> <Badge variant={ch.avgDiscount > 40 ? 'destructive' : 'secondary'} className="text-xs h-5">{ch.avgDiscount}%</Badge></div>
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
