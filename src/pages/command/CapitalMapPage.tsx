import { useState } from 'react';
import { motion } from 'framer-motion';
import { Map, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCapitalMap, type CapitalMapItem } from '@/hooks/command/useCapitalMap';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function formatVND(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}tr`;
  return `${(value / 1_000).toFixed(0)}k`;
}

const BAR_COLORS = [
  'hsl(0, 84%, 60%)',    // destructive-ish
  'hsl(25, 95%, 53%)',   // orange
  'hsl(45, 93%, 47%)',   // amber
  'hsl(142, 71%, 45%)',  // green
  'hsl(199, 89%, 48%)',  // blue
  'hsl(262, 83%, 58%)',  // purple
  'hsl(330, 81%, 60%)',  // pink
  'hsl(172, 66%, 50%)',  // teal
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as CapitalMapItem;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground">{d.group}</p>
      <p className="text-destructive">Vốn Khóa: {formatVND(d.cashLocked)}</p>
      <p className="text-muted-foreground">Tồn kho: {formatVND(d.inventoryValue)}</p>
      <p className="text-muted-foreground">Tỷ lệ khóa: {d.lockedPct.toFixed(1)}%</p>
      <p className="text-muted-foreground">{d.productCount} sản phẩm</p>
    </div>
  );
};

export default function CapitalMapPage() {
  const [groupBy, setGroupBy] = useState<'category' | 'season' | 'collection'>('collection');
  const { data, isLoading } = useCapitalMap(groupBy);
  const { tenantId, isReady } = useTenantQueryBuilder();

  // Total inventory value from the same RPC as War Room
  const { data: invStats } = useQuery({
    queryKey: ['command-inv-stats', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_inv_overview_stats', { p_tenant_id: tenantId });
      if (error || !data || (data as any[]).length === 0) return { totalUnits: 0, lockedCash: 0 };
      const row = (data as any[])[0];
      return { totalUnits: Number(row.total_units) || 0, lockedCash: Number(row.locked_cash) || 0 };
    },
    enabled: !!tenantId && isReady,
    staleTime: 2 * 60 * 1000,
  });

  const totalLocked = data?.reduce((s, d) => s + d.cashLocked, 0) || 0;
  const totalInvGroup = data?.reduce((s, d) => s + d.inventoryValue, 0) || 0;
  const totalInvAll = invStats?.lockedCash || 0; // total inventory value across network

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Map className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Capital Map</h1>
            <p className="text-sm text-muted-foreground">Tiền đang nằm sai ở đâu?</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant={groupBy === 'collection' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroupBy('collection')}
          >
            Theo BST
          </Button>
          <Button
            variant={groupBy === 'category' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroupBy('category')}
          >
            Theo Category
          </Button>
          <Button
            variant={groupBy === 'season' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroupBy('season')}
          >
            Theo Season
          </Button>
        </div>
      </motion.div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Tồn Kho Mạng Lưới</p>
            <p className="text-2xl font-bold text-foreground">{(invStats?.totalUnits || 0).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">units</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Giá Trị Tồn Kho</p>
            <p className="text-2xl font-bold text-foreground">{formatVND(totalInvAll)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Toàn mạng lưới</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Tổng Vốn Khóa</p>
            <p className="text-2xl font-bold text-destructive">{formatVND(totalLocked)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Tồn Kho Nhóm Khóa</p>
            <p className="text-2xl font-bold text-foreground">{formatVND(totalInvGroup)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Chỉ SKU bị khóa vốn</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Tỷ Lệ Khóa / Tổng</p>
            <p className="text-2xl font-bold text-amber-500">
              {totalInvAll > 0 ? ((totalLocked / totalInvAll) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>


      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Phân Bổ Vốn Khóa theo {groupBy === 'collection' ? 'Bộ Sưu Tập' : groupBy === 'category' ? 'Category' : 'Season'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : data && data.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
                <XAxis type="number" tickFormatter={(v) => formatVND(v)} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="group" tick={{ fontSize: 11 }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cashLocked" radius={[0, 4, 4, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Chưa có dữ liệu vốn khóa
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table breakdown */}
      {data && data.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">{groupBy === 'collection' ? 'Bộ Sưu Tập' : groupBy === 'category' ? 'Category' : 'Season'}</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Vốn Khóa</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Tồn Kho</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Số Tồn</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">% Khóa</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Số SP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.group} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">{item.group}</td>
                      <td className="p-3 text-right text-destructive font-semibold">{formatVND(item.cashLocked)}</td>
                      <td className="p-3 text-right text-muted-foreground">{formatVND(item.inventoryValue)}</td>
                      <td className="p-3 text-right text-muted-foreground">{item.stockUnits.toLocaleString()}</td>
                      <td className="p-3 text-right text-muted-foreground">{item.lockedPct.toFixed(1)}%</td>
                      <td className="p-3 text-right text-muted-foreground">{item.productCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
