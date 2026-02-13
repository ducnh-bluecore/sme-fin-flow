import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RiskFlag } from './types';

interface Props {
  risks: RiskFlag[];
}

const RISK_TYPE_LABELS: Record<string, string> = {
  stockout: 'Stockout',
  overstock: 'Overstock',
  concentration: 'Concentration',
  slow_mover_high_stock: 'Slow + High Stock',
};

const SEV_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-muted text-muted-foreground',
};

export default function GrowthRiskRegister({ risks }: Props) {
  if (risks.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" /> Risk Register (Top {risks.length})
      </h4>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Risk Type</TableHead>
              <TableHead>Mức Độ</TableHead>
              <TableHead>Chi Tiết</TableHead>
              <TableHead>Đề Xuất</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {risks.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium text-sm">{RISK_TYPE_LABELS[r.type] || r.type}</TableCell>
                <TableCell>
                  <Badge className={`${SEV_STYLES[r.severity] || SEV_STYLES.low} border-0 text-xs`}>
                    {r.severity === 'critical' ? 'Nghiêm trọng' : r.severity === 'high' ? 'Cao' : r.severity === 'medium' ? 'TB' : 'Thấp'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[300px]">{r.detail}</TableCell>
                <TableCell className="text-sm font-medium">{r.suggestion}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
