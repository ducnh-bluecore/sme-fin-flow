import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import { ShieldAlert } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { ClearanceCandidate } from '@/hooks/inventory/useClearanceIntelligence';
import TrendBadge from './TrendBadge';

export default function CandidateTableRows({ items, onSelect }: { items: ClearanceCandidate[]; onSelect: (c: ClearanceCandidate) => void }) {
  return (
    <>
      {items.map((item) => (
        <TableRow key={item.product_id} className="hover:bg-muted/30 cursor-pointer" onClick={() => onSelect(item)}>
          <TableCell>
            <div>
              <span className="font-medium text-sm">{item.product_name}</span>
              <span className="text-xs text-muted-foreground block">{item.fc_code}</span>
            </div>
            {item.is_premium && (
              <Badge variant="outline" className="text-xs mt-1 border-amber-500 text-amber-600">
                <ShieldAlert className="h-3 w-3 mr-1" />Premium
              </Badge>
            )}
          </TableCell>
          <TableCell className="text-right font-mono">{formatNumber(item.current_stock)}</TableCell>
          <TableCell className="text-right font-mono">{formatCurrency(item.inventory_value)}</TableCell>
          <TableCell className="text-center">
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-mono text-xs">{item.avg_daily_sales > 0 ? item.avg_daily_sales.toFixed(2) : '0'}</span>
              <TrendBadge trend={item.trend} />
            </div>
          </TableCell>
          <TableCell className="text-center">
            {item.health_score != null ? (
              <Badge variant={item.health_score < 40 ? 'destructive' : item.health_score < 60 ? 'secondary' : 'default'}>
                {Math.round(item.health_score)}
              </Badge>
            ) : <span className="text-muted-foreground text-xs">—</span>}
          </TableCell>
          <TableCell className="text-center">
            <Badge variant={item.markdown_risk_score >= 80 ? 'destructive' : 'secondary'}>{item.markdown_risk_score}</Badge>
          </TableCell>
          <TableCell>
            {item.curve_state ? (
              <Badge variant={item.curve_state === 'broken' ? 'destructive' : 'secondary'}>{item.curve_state}</Badge>
            ) : <span className="text-muted-foreground text-xs">—</span>}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
