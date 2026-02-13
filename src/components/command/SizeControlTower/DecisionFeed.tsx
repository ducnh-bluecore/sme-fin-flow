import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, TrendingUp, ShieldAlert } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';
import type { SizeHealthDetailRow } from '@/hooks/inventory/useSizeHealthGroups';

interface DecisionFeedProps {
  brokenDetails: SizeHealthDetailRow[];
}

export default function DecisionFeed({ brokenDetails }: DecisionFeedProps) {
  // Top 5 critical signals: broken + core missing, sorted by lost revenue
  const signals = brokenDetails
    .filter(r => r.core_size_missing || r.lost_revenue_est > 0)
    .sort((a, b) => (b.lost_revenue_est || 0) - (a.lost_revenue_est || 0))
    .slice(0, 5);

  if (signals.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Tín Hiệu Quan Trọng
          <Badge variant="secondary" className="text-[10px]">Top {signals.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {signals.map((signal, i) => {
          const severity = signal.size_health_score < 30 ? 'critical' :
            signal.size_health_score < 50 ? 'high' : 'medium';
          
          return (
            <div
              key={signal.product_id}
              className={`rounded-lg border-l-4 p-3 ${
                severity === 'critical' ? 'border-l-destructive bg-destructive/5' :
                severity === 'high' ? 'border-l-orange-500 bg-orange-500/5' :
                'border-l-amber-400 bg-amber-400/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert className={`h-3.5 w-3.5 shrink-0 ${
                      severity === 'critical' ? 'text-destructive' :
                      severity === 'high' ? 'text-orange-600' : 'text-amber-600'
                    }`} />
                    <span className="text-sm font-semibold truncate">{signal.product_name}</span>
                    {signal.core_size_missing && (
                      <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30 shrink-0">
                        Size core thiếu
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {signal.lost_revenue_est > 0 && (
                      <span>Mất: <span className="font-semibold text-destructive">{formatVNDCompact(signal.lost_revenue_est)}</span></span>
                    )}
                    {signal.cash_locked_value > 0 && (
                      <span>Khóa: <span className="font-semibold text-orange-600">{formatVNDCompact(signal.cash_locked_value)}</span></span>
                    )}
                    {signal.markdown_eta_days && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {signal.markdown_eta_days}d → MD
                      </span>
                    )}
                  </div>
                </div>
                <div className={`text-2xl font-black tabular-nums ${
                  signal.size_health_score < 30 ? 'text-destructive' :
                  signal.size_health_score < 50 ? 'text-orange-600' : 'text-amber-600'
                }`}>
                  {Math.round(signal.size_health_score)}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
