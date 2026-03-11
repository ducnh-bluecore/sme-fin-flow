import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Play, ShieldAlert, Sparkles, TrendingDown, DollarSign, Package, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatCurrency, formatNumber } from '@/lib/format';
import {
  useClearanceCandidates,
  useClearanceByChannel,
  PREMIUM_MAX_DISCOUNT,
  type ClearanceCandidate,
} from '@/hooks/inventory/useClearanceIntelligence';
import { supabase } from '@/integrations/supabase/client';

interface SimulationResult {
  projections: Array<{
    product_id: string;
    product_name: string;
    fc_code: string;
    current_stock: number;
    units_to_clear: number;
    remaining_stock: number;
    avg_price: number;
    sale_price: number;
    projected_revenue: number;
    discount_loss: number;
    cash_recovered: number;
    clear_rate: number;
    days_to_complete: number | null;
    is_premium: boolean;
  }>;
  summary: {
    total_products: number;
    total_units_to_clear: number;
    total_projected_revenue: number;
    total_discount_loss: number;
    total_cash_recovered: number;
    premium_violations: number;
  };
  recommendation: string;
}

const AVAILABLE_CHANNELS = ['haravan', 'kiotviet', 'lazada', 'tiktok', 'shopee'];

export default function ClearanceSimulatorTab() {
  const { data: candidates, isLoading: candidatesLoading } = useClearanceCandidates();
  const { data: channelData } = useClearanceByChannel();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set(['haravan', 'kiotviet']));
  const [discountPct, setDiscountPct] = useState(30);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!candidates) return [];
    if (!search) return candidates;
    const q = search.toLowerCase();
    return candidates.filter(c => c.product_name.toLowerCase().includes(q) || c.fc_code.toLowerCase().includes(q));
  }, [candidates, search]);

  const selectedProducts = useMemo(() => {
    if (!candidates) return [];
    return candidates.filter(c => selectedIds.has(c.product_id));
  }, [candidates, selectedIds]);

  const hasPremiumOverDiscount = selectedProducts.some(p => p.is_premium) && discountPct > PREMIUM_MAX_DISCOUNT;

  const toggleProduct = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.product_id)));
    }
  };

  const toggleChannel = (ch: string) => {
    setSelectedChannels(prev => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch); else next.add(ch);
      return next;
    });
  };

  const runSimulation = async () => {
    if (selectedProducts.length === 0 || selectedChannels.size === 0) return;
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('clearance-simulator', {
        body: {
          products: selectedProducts.map(p => ({
            product_id: p.product_id,
            product_name: p.product_name,
            fc_code: p.fc_code,
            current_stock: p.current_stock,
            inventory_value: p.inventory_value,
            avg_daily_sales: p.avg_daily_sales,
            is_premium: p.is_premium,
          })),
          channels: Array.from(selectedChannels),
          discountPct,
          historicalData: (channelData || []).map(ch => ({
            channel: ch.channel,
            units_sold: ch.totalUnits,
            revenue_collected: ch.totalRevenue,
            avg_discount_pct: ch.avgDiscountPct,
          })),
        },
      });

      if (fnError) throw fnError;
      setResult(data as SimulationResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi khi chạy mô phỏng');
    } finally {
      setIsRunning(false);
    }
  };

  if (candidatesLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select products */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Bước 1: Chọn sản phẩm thanh lý
            <Badge variant="secondary" className="ml-auto">{selectedIds.size} đã chọn</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm sản phẩm..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selectedIds.size === filtered.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </Button>
          </div>
          <div className="max-h-[280px] overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Tồn kho</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead className="text-center">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.product_id} className="cursor-pointer hover:bg-muted/30" onClick={() => toggleProduct(c.product_id)}>
                    <TableCell>
                      <Checkbox checked={selectedIds.has(c.product_id)} onCheckedChange={() => toggleProduct(c.product_id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="font-medium text-sm">{c.product_name}</span>
                          <span className="text-xs text-muted-foreground block">{c.fc_code}</span>
                        </div>
                        {c.is_premium && (
                          <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                            <ShieldAlert className="h-3 w-3 mr-0.5" />Premium
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatNumber(c.current_stock)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(c.inventory_value)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.markdown_risk_score >= 80 ? 'destructive' : 'secondary'} className="text-xs">
                        {c.markdown_risk_score}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Channel & Discount */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              Bước 2: Chọn kênh bán
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_CHANNELS.map(ch => (
                <Badge
                  key={ch}
                  variant={selectedChannels.has(ch) ? 'default' : 'outline'}
                  className="cursor-pointer text-sm px-3 py-1.5 capitalize"
                  onClick={() => toggleChannel(ch)}
                >
                  {ch}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Bước 3: Mức giảm giá
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <Slider
                value={[discountPct]}
                onValueChange={([v]) => setDiscountPct(v)}
                min={10}
                max={80}
                step={5}
                className="flex-1"
              />
              <Badge variant={discountPct > 50 ? 'destructive' : 'secondary'} className="text-lg font-mono min-w-[60px] justify-center">
                {discountPct}%
              </Badge>
            </div>
            {hasPremiumOverDiscount && (
              <Alert className="border-destructive/50 bg-destructive/5">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive text-xs">
                  ⚠️ SP Premium không được giảm quá {PREMIUM_MAX_DISCOUNT}%!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Run button */}
      <Button
        onClick={runSimulation}
        disabled={selectedProducts.length === 0 || selectedChannels.size === 0 || isRunning}
        className="w-full"
        size="lg"
      >
        {isRunning ? (
          <><Clock className="h-4 w-4 mr-2 animate-spin" />Đang mô phỏng...</>
        ) : (
          <><Play className="h-4 w-4 mr-2" />Chạy Mô Phỏng ({selectedProducts.length} SP, {selectedChannels.size} kênh, -{discountPct}%)</>
        )}
      </Button>

      {error && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertDescription className="text-destructive">{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground">Units thanh lý</p>
                <p className="text-xl font-bold font-mono text-foreground">{formatNumber(result.summary.total_units_to_clear)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground">Doanh thu dự kiến</p>
                <p className="text-xl font-bold font-mono text-primary">{formatCurrency(result.summary.total_projected_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground">Cash thu hồi</p>
                <p className="text-xl font-bold font-mono text-green-600">{formatCurrency(result.summary.total_cash_recovered)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground">Tổn thất discount</p>
                <p className="text-xl font-bold font-mono text-destructive">{formatCurrency(result.summary.total_discount_loss)}</p>
              </CardContent>
            </Card>
          </div>

          {result.summary.premium_violations > 0 && (
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                {result.summary.premium_violations} SP Premium đang giảm quá {PREMIUM_MAX_DISCOUNT}%. Cần điều chỉnh!
              </AlertDescription>
            </Alert>
          )}

          {/* Projection table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Chi tiết dự kiến</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">Tồn</TableHead>
                      <TableHead className="text-right">Clear</TableHead>
                      <TableHead className="text-right">Còn lại</TableHead>
                      <TableHead className="text-right">Giá bán</TableHead>
                      <TableHead className="text-right">DT dự kiến</TableHead>
                      <TableHead className="text-center">Ngày</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.projections.map(p => (
                      <TableRow key={p.product_id}>
                        <TableCell>
                          <div>
                            <span className="font-medium text-sm">{p.product_name}</span>
                            <span className="text-xs text-muted-foreground block">{p.fc_code}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatNumber(p.current_stock)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-primary">{formatNumber(p.units_to_clear)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatNumber(p.remaining_stock)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(p.sale_price)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(p.projected_revenue)}</TableCell>
                        <TableCell className="text-center">
                          {p.days_to_complete ? (
                            <Badge variant={p.days_to_complete > 60 ? 'destructive' : 'secondary'}>{p.days_to_complete}d</Badge>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendation */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Khuyến nghị AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{result.recommendation}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
