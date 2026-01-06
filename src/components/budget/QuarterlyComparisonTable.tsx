import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';
import { ScenarioBudgetQuarter } from '@/hooks/useScenarioBudgetData';

interface Props {
  quarterlyData: ScenarioBudgetQuarter[];
}

export function QuarterlyComparisonTable({ quarterlyData }: Props) {
  const getVarianceDisplay = (planned: number, actual: number, isExpense = false) => {
    const variance = isExpense ? planned - actual : actual - planned;
    const percent = planned > 0 ? (variance / planned) * 100 : 0;
    const favorable = variance >= 0;

    return (
      <div className="flex items-center gap-1">
        {Math.abs(percent) < 1 ? (
          <Minus className="h-3 w-3 text-muted-foreground" />
        ) : favorable ? (
          <TrendingUp className="h-3 w-3 text-green-500" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-500" />
        )}
        <span className={favorable ? 'text-green-500' : 'text-red-500'}>
          {favorable ? '+' : ''}{formatVNDCompact(variance)}
        </span>
        <Badge variant="outline" className={`text-xs ${favorable ? 'text-green-500' : 'text-red-500'}`}>
          {favorable ? '+' : ''}{percent.toFixed(1)}%
        </Badge>
      </div>
    );
  };

  if (quarterlyData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          So sánh theo Quý
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quý</TableHead>
              <TableHead className="text-right">Doanh thu KH</TableHead>
              <TableHead className="text-right">Doanh thu TT</TableHead>
              <TableHead>Chênh lệch</TableHead>
              <TableHead className="text-right">Chi phí KH</TableHead>
              <TableHead className="text-right">Chi phí TT</TableHead>
              <TableHead>Chênh lệch</TableHead>
              <TableHead className="text-right">EBITDA KH</TableHead>
              <TableHead className="text-right">EBITDA TT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quarterlyData.map((q) => (
              <TableRow key={q.quarter}>
                <TableCell className="font-medium">Q{q.quarter}</TableCell>
                <TableCell className="text-right">{formatVNDCompact(q.plannedRevenue)}</TableCell>
                <TableCell className="text-right">{formatVNDCompact(q.actualRevenue)}</TableCell>
                <TableCell>{getVarianceDisplay(q.plannedRevenue, q.actualRevenue)}</TableCell>
                <TableCell className="text-right">{formatVNDCompact(q.plannedOpex)}</TableCell>
                <TableCell className="text-right">{formatVNDCompact(q.actualOpex)}</TableCell>
                <TableCell>{getVarianceDisplay(q.plannedOpex, q.actualOpex, true)}</TableCell>
                <TableCell className="text-right">{formatVNDCompact(q.plannedEbitda)}</TableCell>
                <TableCell className={`text-right font-medium ${q.actualEbitda >= 0 ? '' : 'text-red-500'}`}>
                  {formatVNDCompact(q.actualEbitda)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
