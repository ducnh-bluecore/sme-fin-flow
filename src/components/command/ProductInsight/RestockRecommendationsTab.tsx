/**
 * RestockRecommendationsTab - Đề xuất sản phẩm nên restock
 * Dựa vào: velocity bán, sell-through, tồn kho còn lại, days of supply
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Package, TrendingUp, AlertTriangle, Zap, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LifecycleRow {
  fc_id: string;
  fc_name: string | null;
  category: string | null;
  collection_name: string | null;
  batch_number: number;
  initial_qty: number;
  current_qty: number;
  sold_qty: number;
  sell_through_pct: number;
  age_days: number;
  first_sale_date: string | null;
  status: string;
  target_pct: number | null;
  velocity_required: number;
  cash_at_risk: number;
}

export interface RestockCandidate {
  fc_id: string;
  fc_name: string;
  category: string;
  collection_name: string;
  sell_through_pct: number;
  daily_velocity: number;
  current_qty: number;
  days_of_supply: number;
  urgency: 'critical' | 'high' | 'medium';
  reason: string;
  suggested_qty: number;
  score: number;
}

const urgencyConfig = {
  critical: { label: 'Khẩn cấp', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  high: { label: 'Cao', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  medium: { label: 'Trung bình', className: 'bg-primary/10 text-primary border-primary/30' },
};

function computeRestockCandidates(rows: LifecycleRow[]): RestockCandidate[] {
  // Group by fc_id, take the latest batch (highest batch_number)
  const fcMap = new Map<string, LifecycleRow>();
  for (const row of rows) {
    const existing = fcMap.get(row.fc_id);
    if (!existing || row.batch_number > existing.batch_number) {
      fcMap.set(row.fc_id, row);
    }
  }

  const candidates: RestockCandidate[] = [];

  for (const [, row] of fcMap) {
    if (row.age_days < 7) continue; // Too new to evaluate

    const dailyVelocity = row.age_days > 0 ? row.sold_qty / row.age_days : 0;
    if (dailyVelocity <= 0) continue; // No sales = no restock needed

    const daysOfSupply = dailyVelocity > 0 ? Math.round(row.current_qty / dailyVelocity) : 999;

    // Score: higher = more urgent to restock
    // Factors: high sell-through, low days of supply, high velocity
    let score = 0;
    let reason = '';
    let urgency: 'critical' | 'high' | 'medium' = 'medium';

    // High sell-through & running out
    if (row.sell_through_pct >= 70 && daysOfSupply <= 14) {
      score = 95;
      reason = `Bán ${row.sell_through_pct}%, chỉ còn ${daysOfSupply} ngày hàng`;
      urgency = 'critical';
    } else if (row.sell_through_pct >= 60 && daysOfSupply <= 21) {
      score = 80;
      reason = `Sell-through ${row.sell_through_pct}%, tồn còn ~${daysOfSupply} ngày`;
      urgency = 'high';
    } else if (row.sell_through_pct >= 50 && daysOfSupply <= 30) {
      score = 65;
      reason = `Velocity tốt (${dailyVelocity.toFixed(1)}/ngày), nên bổ sung sớm`;
      urgency = 'medium';
    } else if (dailyVelocity >= 3 && daysOfSupply <= 14) {
      // Fast seller regardless of sell-through
      score = 75;
      reason = `Velocity cao ${dailyVelocity.toFixed(1)}/ngày, sắp hết hàng`;
      urgency = 'high';
    } else {
      continue; // Not a restock candidate
    }

    // Suggested restock qty: 30 days of supply
    const suggestedQty = Math.max(10, Math.round(dailyVelocity * 30));

    candidates.push({
      fc_id: row.fc_id,
      fc_name: row.fc_name || row.fc_id,
      category: row.category || '',
      collection_name: row.collection_name || '',
      sell_through_pct: row.sell_through_pct,
      daily_velocity: dailyVelocity,
      current_qty: row.current_qty,
      days_of_supply: daysOfSupply,
      urgency,
      reason,
      suggested_qty: suggestedQty,
      score,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export default function RestockRecommendationsTab({
  lifecycleData,
  isLoading,
  onRowClick,
}: {
  lifecycleData: LifecycleRow[];
  isLoading: boolean;
  onRowClick: (fcId: string) => void;
}) {
  const candidates = useMemo(() => computeRestockCandidates(lifecycleData), [lifecycleData]);

  const stats = useMemo(() => {
    const critical = candidates.filter(c => c.urgency === 'critical').length;
    const high = candidates.filter(c => c.urgency === 'high').length;
    const totalSuggestedQty = candidates.reduce((s, c) => s + c.suggested_qty, 0);
    return { total: candidates.length, critical, high, totalSuggestedQty };
  }, [candidates]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={ShoppingCart} label="Cần restock" value={String(stats.total)} sub="sản phẩm" />
        <MiniStat icon={AlertTriangle} label="Khẩn cấp" value={String(stats.critical)} sub="hết hàng <14 ngày" className="text-destructive" />
        <MiniStat icon={Zap} label="Ưu tiên cao" value={String(stats.high)} sub="hết hàng <21 ngày" className="text-amber-600" />
        <MiniStat icon={Package} label="Tổng đề xuất" value={stats.totalSuggestedQty.toLocaleString()} sub="units nên nhập" />
      </div>

      {/* Table */}
      {candidates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-2">
            <TrendingUp className="h-10 w-10 mx-auto opacity-20" />
            <p className="font-medium">Không có đề xuất restock</p>
            <p className="text-sm">Tất cả sản phẩm đang có đủ hàng hoặc chưa đủ dữ liệu bán</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Đề xuất Restock</CardTitle>
            <CardDescription className="text-xs">
              Dựa trên tốc độ bán, sell-through và số ngày tồn kho còn lại
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 border-t">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Sản phẩm</TableHead>
                    <TableHead className="text-center">Mức độ</TableHead>
                    <TableHead className="text-center">Sell-through</TableHead>
                    <TableHead className="text-right">V/ngày</TableHead>
                    <TableHead className="text-right">Tồn kho</TableHead>
                    <TableHead className="text-right">Còn (ngày)</TableHead>
                    <TableHead className="text-right">Đề xuất nhập</TableHead>
                    <TableHead className="min-w-[160px]">Lý do</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((c) => {
                    const uc = urgencyConfig[c.urgency];
                    return (
                      <TableRow
                        key={c.fc_id}
                        className="cursor-pointer"
                        onClick={() => onRowClick(c.fc_id)}
                      >
                        <TableCell>
                          <p className="font-medium text-sm truncate">{c.fc_name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.category}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn('text-[10px]', uc.className)}>
                            {uc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <span className="text-sm tabular-nums font-medium">{c.sell_through_pct}%</span>
                            <Progress value={Math.min(c.sell_through_pct, 100)} className="h-1" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {c.daily_velocity.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {c.current_qty}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            'tabular-nums text-sm font-medium',
                            c.days_of_supply <= 7 && 'text-destructive',
                            c.days_of_supply > 7 && c.days_of_supply <= 14 && 'text-amber-600',
                          )}>
                            {c.days_of_supply}d
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-semibold text-primary">
                          +{c.suggested_qty}
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground">{c.reason}</p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, sub, className }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4 text-muted-foreground', className)} />
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold tabular-nums">{value}</p>
            <p className="text-[10px] text-muted-foreground">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
