import { ArrowRight } from 'lucide-react';
import type { BeforeAfterMetrics } from './types';
import { formatVNDCompact } from '@/lib/formatters';

interface Props {
  data: BeforeAfterMetrics;
}

export default function GrowthBeforeAfter({ data }: Props) {
  const rows = [
    { label: 'Revenue (projected)', before: formatVNDCompact(data.revenueProjected[0]), after: formatVNDCompact(data.revenueProjected[1]) },
    { label: 'Margin %', before: `${data.marginPct[0].toFixed(1)}%`, after: `${data.marginPct[1].toFixed(1)}%` },
    { label: 'Hero Revenue Share', before: `${data.heroRevenueShare[0].toFixed(1)}%`, after: `${data.heroRevenueShare[1].toFixed(1)}%` },
    { label: 'Stockout Risk FCs', before: String(data.stockoutRiskCount[0]), after: String(data.stockoutRiskCount[1]) },
    { label: 'DOC trung bình', before: `${data.avgDOC[0]} ngày`, after: `${data.avgDOC[1]} ngày` },
  ];

  return (
    <div className="rounded-lg border bg-background">
      <div className="p-3 border-b">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-primary" /> Before → After
        </h4>
      </div>
      <div className="divide-y">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-3 px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="text-center font-medium">{r.before}</span>
            <span className="text-center font-bold text-primary">{r.after}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
