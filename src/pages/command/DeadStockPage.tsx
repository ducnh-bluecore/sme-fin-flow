import { useState } from 'react';
import { motion } from 'framer-motion';
import { Skull, Package, ArrowRightLeft, TrendingDown, AlertTriangle, Filter, Calendar, ShoppingBag, Zap, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useDeadStock, type AgingBucket, type DeadStockItem } from '@/hooks/command/useDeadStock';

function formatVND(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${value}`;
}

const BUCKET_CONFIG: Record<AgingBucket, { label: string; icon: string; color: string; badgeClass: string }> = {
  slow_moving: { label: 'Chậm bán', icon: '🟡', color: 'text-amber-500', badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  stagnant: { label: 'Tồn nặng', icon: '🟠', color: 'text-orange-500', badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  dead_stock: { label: 'Hàng chết', icon: '⚫', color: 'text-muted-foreground', badgeClass: 'bg-muted text-muted-foreground border-muted' },
};

function getSuggestion(item: DeadStockItem, isSlowSelling?: boolean): string {
  if (isSlowSelling) {
    if (item.avg_daily_sales <= 0) return 'Velocity = 0 trong 45-90 ngày → Cần đẩy marketing hoặc giảm giá kích cầu';
    if (item.current_stock > 100) return 'Tồn nhiều + bán chậm → Cân nhắc flash sale hoặc combo bundle';
    return 'Bán chậm → Theo dõi thêm, chuẩn bị plan B nếu không cải thiện trong 2 tuần';
  }
  if (item.avg_daily_sales <= 0 && item.curve_state === 'broken') {
    return 'Size lệch + không bán được → Transfer sang kênh khác hoặc thanh lý';
  }
  if (item.avg_daily_sales <= 0) {
    return 'Velocity = 0 → Giảm giá không cứu được. Cần transfer/bundle/thanh lý';
  }
  if (item.days_to_clear >= 365) {
    return 'Cần >1 năm mới clear → Đẩy qua kênh online hoặc thanh lý lô';
  }
  if (item.days_to_clear >= 180) {
    return 'Tồn rất nặng → Thử flash sale hoặc chuyển kho có traffic cao hơn';
  }
  return 'Chậm bán → Cân nhắc giảm giá hoặc chuyển kênh bán tốt hơn';
}

export default function DeadStockPage() {
  // Single query for ALL items (45+ days) — derive both tabs from this
  const { data: allData, isLoading } = useDeadStock(45);

  // Split: dead stock = daysSinceLastSale >= 90, slow selling = the rest
  const deadStockItems = (allData?.items ?? []).filter(i => {
    // Original useDeadStock(90) logic: items that would pass minInactiveDays=90
    return i.daysSinceLastSale === null || i.daysSinceLastSale >= 90;
  });
  const slowItems = (allData?.items ?? []).filter(i => {
    return i.daysSinceLastSale !== null && i.daysSinceLastSale < 90;
  });

  // Build summaries
  const buildSummary = (items: DeadStockItem[]) => {
    const summary = {
      total_items: items.length,
      total_locked_value: items.reduce((s, i) => s + i.cash_locked, 0),
      total_stock: items.reduce((s, i) => s + i.current_stock, 0),
      by_bucket: {
        slow_moving: { items: 0, locked: 0, stock: 0 },
        stagnant: { items: 0, locked: 0, stock: 0 },
        dead_stock: { items: 0, locked: 0, stock: 0 },
      } as Record<AgingBucket, { items: number; locked: number; stock: number }>,
    };
    items.forEach(i => {
      const b = summary.by_bucket[i.aging_bucket];
      b.items++;
      b.locked += i.cash_locked;
      b.stock += i.current_stock;
    });
    return summary;
  };

  const deadSummary = buildSummary(deadStockItems);
  const slowSummary = buildSummary(slowItems);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <Skull className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Hàng Tồn Cần Xử Lý</h1>
          <p className="text-sm text-muted-foreground">Phát hiện sớm hàng bán chậm & hàng chết để hành động kịp thời</p>
        </div>
      </motion.div>

      <Tabs defaultValue="slow-selling">
        <TabsList>
          <TabsTrigger value="slow-selling" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Hàng bán chậm (45-90 ngày)
          </TabsTrigger>
          <TabsTrigger value="dead-stock" className="gap-1.5">
            <Skull className="h-3.5 w-3.5" />
            Hàng tồn chết (≥90 ngày)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slow-selling">
          <SlowSellingTab items={slowItems} summary={slowSummary} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="dead-stock">
          <DeadStockTab items={deadStockItems} summary={deadSummary} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TabProps {
  items: DeadStockItem[];
  summary: { total_items: number; total_locked_value: number; total_stock: number; by_bucket: Record<AgingBucket, { items: number; locked: number; stock: number }> };
  isLoading: boolean;
}

function SlowSellingTab({ items: slowItems, summary, isLoading }: TabProps) {
  const [filterBucket, setFilterBucket] = useState<AgingBucket | 'all'>('all');

  const filteredItems = slowItems.filter(i => filterBucket === 'all' || i.aging_bucket === filterBucket);

  return (
    <div className="space-y-4 mt-4">
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (
        <>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {summary.total_items} sản phẩm — {summary.total_stock.toLocaleString()} units
                    </p>
                    <p className="text-xs text-muted-foreground">không bán được trong 45-90 ngày — cần can thiệp sớm</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-500">{formatVND(summary.total_locked_value)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vốn đang chậm quay</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <ItemsList items={filteredItems} filterBucket={filterBucket} setFilterBucket={setFilterBucket} summary={summary} isSlowSelling />
        </>
      )}
    </div>
  );
}

function DeadStockTab({ items, summary, isLoading }: TabProps) {
  const [filterBucket, setFilterBucket] = useState<AgingBucket | 'all'>('all');
  const filteredItems = items.filter(i => filterBucket === 'all' || i.aging_bucket === filterBucket);

  return (
    <div className="space-y-4 mt-4">
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (
        <>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {summary.total_items} sản phẩm — {summary.total_stock.toLocaleString()} units
                    </p>
                    <p className="text-xs text-muted-foreground">đang khóa vốn, không tạo doanh thu</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-destructive">{formatVND(summary.total_locked_value)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vốn bị khóa</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <ItemsList items={filteredItems} filterBucket={filterBucket} setFilterBucket={setFilterBucket} summary={summary} />
        </>
      )}
    </div>
  );
}

function ItemsList({ items, filterBucket, setFilterBucket, summary, isSlowSelling }: {
  items: DeadStockItem[];
  filterBucket: AgingBucket | 'all';
  setFilterBucket: (b: AgingBucket | 'all') => void;
  summary: { total_items: number; by_bucket: Record<AgingBucket, { items: number; locked: number; stock: number }> };
  isSlowSelling?: boolean;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterBucket === 'all' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setFilterBucket('all')}
        >
          <Filter className="h-3 w-3 mr-1" /> Tất cả ({summary.total_items})
        </Button>
        {(Object.keys(BUCKET_CONFIG) as AgingBucket[]).map(bucket => {
          const cfg = BUCKET_CONFIG[bucket];
          const bData = summary.by_bucket[bucket];
          if (bData.items === 0) return null;
          return (
            <Button
              key={bucket}
              variant={filterBucket === bucket ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setFilterBucket(bucket)}
            >
              {cfg.icon} {cfg.label} ({bData.items}) — {formatVND(bData.locked)}
            </Button>
          );
        })}
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
            <p className="text-sm">Không có sản phẩm trong nhóm này</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <DeadStockCard key={`${item.product_id}-${item.fc_code}`} item={item} index={idx} isSlowSelling={isSlowSelling} />
          ))
        )}
      </div>
    </>
  );
}

function DeadStockCard({ item, index, isSlowSelling }: { item: DeadStockItem; index: number; isSlowSelling?: boolean }) {
  const cfg = BUCKET_CONFIG[item.aging_bucket];
  const suggestion = getSuggestion(item, isSlowSelling);
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Rank */}
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
              <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              {/* Header row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground truncate">{item.product_name}</span>
                <span className="text-xs text-muted-foreground">({item.fc_code})</span>
                <Badge variant="outline" className={cn('text-[10px] ml-auto', cfg.badgeClass)}>
                  {cfg.icon} {cfg.label}
                </Badge>
              </div>

              {/* Metrics row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Tồn:</span>
                  <span className="font-semibold">{item.current_stock.toLocaleString()} units</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">Vốn khóa:</span>
                  <span className="font-semibold text-destructive">{formatVND(item.cash_locked)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground" title="Tốc độ bán trung bình tính từ lúc nhập hàng đến nay">Velocity TB:</span>
                  <span className={cn('font-semibold', item.avg_daily_sales <= 0 ? 'text-destructive' : 'text-foreground')}>
                    {item.avg_daily_sales <= 0 ? '0 — không bán được' : `${item.avg_daily_sales.toFixed(1)}/ngày`}
                  </span>
                </span>
                {item.recentVelocity !== null && (
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span className="text-muted-foreground" title="Tốc độ bán quanh lần bán cuối cùng">Velocity gần đây:</span>
                    <span className={cn('font-semibold', item.recentVelocity > 0.5 ? 'text-emerald-600' : item.recentVelocity > 0 ? 'text-amber-500' : 'text-destructive')}>
                      {item.recentVelocity.toFixed(1)}/ngày
                    </span>
                    <span className="text-[10px] text-muted-foreground">({item.recentVelocityWindow})</span>
                  </span>
                )}
                {(() => {
                  const velocity = item.recentVelocity && item.recentVelocity > 0 ? item.recentVelocity : item.avg_daily_sales;
                  if (velocity <= 0) return null;
                  const eta = Math.ceil(item.current_stock / velocity);
                  const isRecent = item.recentVelocity && item.recentVelocity > 0;
                  return (
                    <span className="flex items-center gap-1">
                      <span className="text-muted-foreground">ETA clear{isRecent ? ' (theo gần đây)' : ''}:</span>
                      <span className="font-semibold">{eta.toLocaleString()} ngày</span>
                    </span>
                  );
                })()}
                {item.curve_state && (
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">Size:</span>
                    <span className={cn('font-semibold', item.curve_state === 'broken' ? 'text-destructive' : 'text-foreground')}>
                      {item.curve_state === 'broken' ? '❌ Lệch' : item.curve_state}
                    </span>
                  </span>
                )}
              </div>

              {/* Days since last sale */}
              {item.daysSinceLastSale !== null && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Lần bán cuối:</span>
                  <span className={cn('font-semibold', item.daysSinceLastSale > 180 ? 'text-destructive' : item.daysSinceLastSale > 90 ? 'text-amber-500' : 'text-foreground')}>
                    {item.daysSinceLastSale} ngày trước
                  </span>
                  <span className="text-muted-foreground">({item.lastSaleDate})</span>
                </div>
              )}
              {item.daysSinceLastSale === null && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-amber-500 font-semibold">Chưa đủ dữ liệu lịch sử bán</span>
                </div>
              )}

              {/* Channel sales history */}
              {item.channelHistory.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Lịch sử bán theo kênh
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 pl-[18px]">
                    {item.channelHistory.map((ch) => (
                      <div key={ch.channel} className="flex items-center gap-2 text-xs flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {ch.channel}
                        </Badge>
                        <span className="text-muted-foreground">
                          bán cuối: <span className="font-medium text-foreground">{ch.lastSaleMonth}</span>
                        </span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">{ch.totalUnitsSold.toLocaleString()}</span> units
                        </span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-muted-foreground">
                          giảm TB: <span className={cn('font-medium', ch.avgDiscountPct >= 30 ? 'text-destructive' : ch.avgDiscountPct >= 15 ? 'text-amber-500' : 'text-foreground')}>
                            {ch.avgDiscountPct}%
                          </span>
                        </span>
                        {ch.discountBands.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            ({ch.discountBands.join(', ')})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestion */}
              <div className="flex items-start gap-1.5 bg-muted/50 rounded-md px-2.5 py-1.5">
                <ArrowRightLeft className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-xs text-foreground">{suggestion}</span>
              </div>

              {/* Reason tag */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  Nguyên nhân: <span className="font-medium text-foreground">{item.reason}</span>
                </span>
                {item.collection_name && (
                  <span className="text-[10px] text-muted-foreground">
                    | BST: <span className="font-medium">{item.collection_name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
