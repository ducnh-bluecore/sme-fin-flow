import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Lock } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function CashVelocityPanel() {
  const { data: snapshot, isLoading } = useFinanceTruthSnapshot();

  if (isLoading) return <Skeleton className="h-72" />;
  if (!snapshot) return null;

  // CCC components
  const cccData = [
    { name: 'DSO', value: snapshot.dso, target: 30, color: 'hsl(210, 70%, 55%)' },
    { name: 'DIO', value: snapshot.dio, target: 45, color: 'hsl(var(--warning))' },
    { name: 'DPO', value: snapshot.dpo, target: 45, color: 'hsl(var(--success))' },
  ];

  // Locked cash breakdown
  const lockedData = [
    { name: 'Tồn kho', value: snapshot.lockedCashInventory, color: 'hsl(var(--warning))' },
    { name: 'Quảng cáo', value: snapshot.lockedCashAds, color: 'hsl(var(--info))' },
    { name: 'Vận hành', value: snapshot.lockedCashOps, color: 'hsl(210, 40%, 60%)' },
  ].filter(d => d.value > 0);

  const cccStatus = snapshot.ccc > 60 ? 'text-destructive' : snapshot.ccc > 30 ? 'text-warning' : 'text-success';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Cash Velocity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CCC Summary */}
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground">Cash Conversion Cycle:</span>
          <span className={`text-xl font-bold tabular-nums ${cccStatus}`}>
            {snapshot.ccc.toFixed(0)} ngày
          </span>
          <span className="text-[10px] text-muted-foreground">
            (DSO {snapshot.dso.toFixed(0)} + DIO {snapshot.dio.toFixed(0)} − DPO {snapshot.dpo.toFixed(0)})
          </span>
        </div>

        {/* CCC Bar Viz */}
        <div className="h-20">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cccData} layout="vertical" margin={{ left: 5, right: 5 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={35} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(0)} ngày`} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                {cccData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Locked Cash */}
        {snapshot.lockedCashTotal > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Cash bị khóa: <span className="font-semibold text-foreground">{formatVNDCompact(snapshot.lockedCashTotal)}</span>
            </div>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-muted">
              {lockedData.map((d) => (
                <div
                  key={d.name}
                  className="h-full transition-all"
                  style={{
                    width: `${(d.value / snapshot.lockedCashTotal) * 100}%`,
                    backgroundColor: d.color,
                  }}
                  title={`${d.name}: ${formatVNDCompact(d.value)}`}
                />
              ))}
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              {lockedData.map((d) => (
                <div key={d.name} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}: {formatVNDCompact(d.value)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
