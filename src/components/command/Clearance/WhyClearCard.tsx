import { AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClearanceCandidate } from '@/hooks/inventory/useClearanceIntelligence';
import { useMarkdownLadder } from '@/hooks/inventory/useMarkdownLadder';
import { formatNumber } from '@/lib/format';

function MarkdownMemorySection({ fcId }: { fcId: string }) {
  const { data, isLoading } = useMarkdownLadder(fcId);

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!data || data.steps.length === 0) return null;

  // Find best performing channel/step combo
  const best = data.steps.reduce((a, b) => a.clearability_score > b.clearability_score ? a : b);
  const rec = data.recommendations[0];

  return (
    <div className="space-y-2 pt-2 border-t border-border/50">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Clock className="h-3 w-3" /> Markdown Memory
      </div>
      <div className="bg-muted/50 rounded-lg p-2.5 space-y-1.5 text-xs">
        <div>
          Đã off <span className="font-mono font-bold">{best.discount_step}%</span> trên{' '}
          <span className="font-medium">{best.channel}</span>, clear được{' '}
          <span className="font-mono font-bold">{formatNumber(best.total_units_cleared)} units</span>
          {best.avg_days_to_clear ? ` trong ~${best.avg_days_to_clear} ngày` : ''}
        </div>
        {rec && (
          <div className="text-blue-600 dark:text-blue-400">
            → Đề xuất: tăng lên <span className="font-mono font-bold">{rec.nextStep}%</span> trên{' '}
            <span className="font-medium">{rec.channel}</span> (clearability: {rec.expectedClearability})
          </div>
        )}
      </div>
    </div>
  );
}

export default function WhyClearCard({ candidate }: { candidate: ClearanceCandidate }) {
  const factors: { label: string; value: string | number; severity: 'high' | 'medium' | 'low'; pct?: number }[] = [];

  const riskScore = candidate.markdown_risk_score;
  factors.push({ label: 'Rủi ro markdown', value: `${riskScore}/100`, severity: riskScore >= 80 ? 'high' : riskScore >= 60 ? 'medium' : 'low', pct: riskScore });

  if (candidate.health_score != null) {
    const hs = Math.round(candidate.health_score);
    factors.push({ label: 'Sức khỏe size curve', value: `${hs}/100`, severity: hs < 40 ? 'high' : hs < 60 ? 'medium' : 'low', pct: hs });
  }

  if (candidate.curve_state) {
    factors.push({ label: 'Trạng thái size', value: candidate.curve_state === 'broken' ? 'Đã vỡ' : candidate.curve_state, severity: candidate.curve_state === 'broken' ? 'high' : 'medium' });
  }

  factors.push({ label: 'Tốc độ bán', value: candidate.avg_daily_sales > 0 ? `${candidate.avg_daily_sales.toFixed(2)}/ngày` : 'Không bán được', severity: candidate.avg_daily_sales < 0.05 ? 'high' : candidate.avg_daily_sales < 0.2 ? 'medium' : 'low' });

  const dtc = candidate.days_to_clear;
  if (dtc != null && dtc < 9999) {
    factors.push({ label: 'Số ngày để clear hết', value: `${dtc} ngày`, severity: dtc > 180 ? 'high' : dtc > 90 ? 'medium' : 'low' });
  } else {
    factors.push({ label: 'Số ngày để clear hết', value: 'Không có nhu cầu', severity: 'high' });
  }

  if (candidate.markdown_eta_days != null) {
    factors.push({ label: 'Thời gian tới markdown', value: `${candidate.markdown_eta_days} ngày`, severity: candidate.markdown_eta_days < 14 ? 'high' : candidate.markdown_eta_days < 30 ? 'medium' : 'low' });
  }

  const severityColor = { high: 'text-destructive bg-destructive/10', medium: 'text-amber-600 bg-amber-500/10', low: 'text-emerald-600 bg-emerald-500/10' };
  const progressColor = { high: '[&>div]:bg-destructive', medium: '[&>div]:bg-amber-500', low: '[&>div]:bg-emerald-500' };

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          Tại sao cần Clear?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {candidate.reason && <p className="text-sm text-muted-foreground">{candidate.reason}</p>}
        <div className="space-y-2">
          {factors.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-36 shrink-0">{f.label}</span>
              {f.pct != null ? (
                <div className="flex-1 flex items-center gap-2">
                  <Progress value={f.pct} className={`h-2 flex-1 ${progressColor[f.severity]}`} />
                  <span className={`text-xs font-mono font-medium ${severityColor[f.severity].split(' ')[0]}`}>{f.value}</span>
                </div>
              ) : (
                <Badge className={`text-xs ${severityColor[f.severity]}`}>{f.value}</Badge>
              )}
            </div>
          ))}
        </div>
        <MarkdownMemorySection fcId={candidate.product_id} />
      </CardContent>
    </Card>
  );
}
