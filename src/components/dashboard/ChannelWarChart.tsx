import { useAllChannelsPL } from '@/hooks/useAllChannelsPL';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Swords } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CHANNEL_COLORS: Record<string, string> = {
  SHOPEE: 'hsl(16, 85%, 55%)',
  LAZADA: 'hsl(260, 70%, 55%)',
  TIKTOK: 'hsl(0, 0%, 15%)',
  KIOTVIET: 'hsl(210, 70%, 50%)',
  TIKI: 'hsl(200, 80%, 45%)',
};

export function ChannelWarChart() {
  const { data, isLoading } = useAllChannelsPL();

  if (isLoading) return <Skeleton className="h-80" />;
  if (!data || data.channels.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Chưa có dữ liệu channel
        </CardContent>
      </Card>
    );
  }

  const chartData = data.channels.map(ch => ({
    channel: ch.channel,
    revenue: ch.totalRevenue,
    margin: ch.operatingMargin,
    orders: ch.orderCount,
    aov: ch.avgOrderValue,
    roas: ch.totalRevenue > 0 && ch.totalFees > 0 ? ch.totalRevenue / ch.totalFees : 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary" />
          Channel War
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Bar Chart */}
        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
              <XAxis type="number" tickFormatter={(v) => formatVNDCompact(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="channel" width={80} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => formatVNDCompact(value)}
                labelFormatter={(label) => `Kênh: ${label}`}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.channel} fill={CHANNEL_COLORS[entry.channel] || 'hsl(var(--primary))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Detail Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 font-medium text-muted-foreground">Channel</th>
                <th className="text-right py-1.5 font-medium text-muted-foreground">Revenue</th>
                <th className="text-right py-1.5 font-medium text-muted-foreground">Margin</th>
                <th className="text-right py-1.5 font-medium text-muted-foreground">Orders</th>
                <th className="text-right py-1.5 font-medium text-muted-foreground">AOV</th>
              </tr>
            </thead>
            <tbody>
              {data.channels.map((ch) => (
                <tr key={ch.channel} className="border-b border-border/50">
                  <td className="py-1.5 font-medium text-foreground">{ch.channel}</td>
                  <td className="text-right tabular-nums">{formatVNDCompact(ch.totalRevenue)}</td>
                  <td className="text-right">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      ch.operatingMargin > 15 ? 'bg-success/10 text-success' : 
                      ch.operatingMargin > 5 ? 'bg-warning/10 text-warning' : 
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {ch.operatingMargin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{ch.orderCount.toLocaleString()}</td>
                  <td className="text-right tabular-nums">{formatVNDCompact(ch.avgOrderValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
