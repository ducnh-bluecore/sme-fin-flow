import { useInventoryAging } from '@/hooks/useInventoryAging';
import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, AlertTriangle, Info } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const AGING_COLORS = [
  'hsl(var(--success))',
  'hsl(210, 70%, 55%)',
  'hsl(var(--warning))',
  'hsl(25, 80%, 50%)',
  'hsl(var(--destructive))',
];

export function InventoryRiskPanel() {
  const { agingBuckets, summary, isLoading } = useInventoryAging();
  const { data: snapshot, isLoading: snapshotLoading } = useFinanceTruthSnapshot();

  if (isLoading || snapshotLoading) return <Skeleton className="h-72" />;

  // If inventory_items is empty but snapshot has inventory data, show fallback
  if (!summary || summary.totalItems === 0) {
    if (snapshot && snapshot.totalInventoryValue > 0) {
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Inventory Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tổng giá trị tồn kho</span>
                <span className="font-semibold tabular-nums text-lg">{formatVNDCompact(snapshot.totalInventoryValue)}</span>
              </div>
              {snapshot.slowMovingInventory > 0 && (
                <div className="flex justify-between items-center text-warning">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Tồn kho chậm luân chuyển
                  </span>
                  <span className="font-semibold tabular-nums">{formatVNDCompact(snapshot.slowMovingInventory)}</span>
                </div>
              )}
              {snapshot.totalInventoryValue > 0 && snapshot.slowMovingInventory > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">% chậm luân chuyển</span>
                  <span className="font-semibold tabular-nums">
                    {((snapshot.slowMovingInventory / snapshot.totalInventoryValue) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">DIO (Inventory Days)</span>
                <span className="font-semibold tabular-nums">{snapshot.dio.toFixed(0)} ngày</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
                <Info className="h-3 w-3 flex-shrink-0" />
                <span>Dữ liệu từ snapshot tổng hợp. Import chi tiết SKU để xem aging breakdown.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Chưa có dữ liệu tồn kho
        </CardContent>
      </Card>
    );
  }

  // Original detailed view when inventory_items has data
  const donutData = agingBuckets
    .filter(b => b.totalValue > 0)
    .map(b => ({ name: b.bucket, value: b.totalValue }));

  const deadStock = agingBuckets.find(b => b.minDays >= 181);
  const slowMoving = agingBuckets.filter(b => b.minDays >= 91);
  const slowMovingValue = slowMoving.reduce((s, b) => s + b.totalValue, 0);
  const slowMovingPercent = summary.totalValue > 0 ? (slowMovingValue / summary.totalValue) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Inventory Risk
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="w-28 h-28 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} innerRadius={28} outerRadius={48} paddingAngle={2} dataKey="value">
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={AGING_COLORS[i % AGING_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatVNDCompact(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tổng tồn kho</span>
              <span className="font-semibold tabular-nums">{formatVNDCompact(summary.totalValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tuổi TB</span>
              <span className="font-semibold tabular-nums">{Math.round(summary.avgAge)} ngày</span>
            </div>
            <div className={`flex justify-between items-center ${slowMovingPercent > 25 ? 'text-destructive' : slowMovingPercent > 15 ? 'text-warning' : ''}`}>
              <span className="flex items-center gap-1">
                {slowMovingPercent > 20 && <AlertTriangle className="h-3 w-3" />}
                Chậm luân chuyển (&gt;90d)
              </span>
              <span className="font-semibold tabular-nums">{slowMovingPercent.toFixed(1)}%</span>
            </div>
            <div className={`flex justify-between items-center ${(deadStock?.percentage || 0) > 15 ? 'text-destructive' : ''}`}>
              <span>Dead stock (&gt;180d)</span>
              <span className="font-semibold tabular-nums">{formatVNDCompact(deadStock?.totalValue || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tổng SKU</span>
              <span className="font-semibold tabular-nums">{summary.totalItems.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {agingBuckets.map((b, i) => (
            <div key={b.bucket} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: AGING_COLORS[i] }} />
              {b.bucket}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
