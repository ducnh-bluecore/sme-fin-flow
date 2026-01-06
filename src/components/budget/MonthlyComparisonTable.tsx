import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, List } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';
import { ScenarioBudgetMonth } from '@/hooks/useScenarioBudgetData';

interface Props {
  comparison: ScenarioBudgetMonth[];
}

export function MonthlyComparisonTable({ comparison }: Props) {
  const currentMonth = new Date().getMonth() + 1;
  
  const getVarianceBadge = (variance: number, percent: number, isExpense = false) => {
    const favorable = isExpense ? variance > 0 : variance > 0;
    
    if (Math.abs(percent) < 1) {
      return <Badge variant="outline" className="text-xs">Đúng KH</Badge>;
    }
    
    return (
      <Badge 
        variant="outline" 
        className={`text-xs ${favorable ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
      >
        {favorable ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
        {favorable ? '+' : ''}{percent.toFixed(1)}%
      </Badge>
    );
  };

  if (comparison.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <List className="h-4 w-4" />
          Chi tiết theo tháng
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Tháng</TableHead>
                <TableHead className="text-right">DT KH</TableHead>
                <TableHead className="text-right">DT TT</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">CP KH</TableHead>
                <TableHead className="text-right">CP TT</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">EBITDA TT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.map((c) => {
                const isPastMonth = c.month <= currentMonth;
                return (
                  <TableRow key={c.month} className={!isPastMonth ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">T{c.month}</TableCell>
                    <TableCell className="text-right">{formatVNDCompact(c.plannedRevenue)}</TableCell>
                    <TableCell className="text-right">
                      {isPastMonth ? formatVNDCompact(c.actualRevenue) : '-'}
                    </TableCell>
                    <TableCell>
                      {isPastMonth ? getVarianceBadge(c.revenueVariance, c.revenueVariancePct) : '-'}
                    </TableCell>
                    <TableCell className="text-right">{formatVNDCompact(c.plannedOpex)}</TableCell>
                    <TableCell className="text-right">
                      {isPastMonth ? formatVNDCompact(c.actualOpex) : '-'}
                    </TableCell>
                    <TableCell>
                      {isPastMonth ? getVarianceBadge(c.opexVariance, c.opexVariancePct, true) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${c.actualEbitda >= 0 ? '' : 'text-red-500'}`}>
                      {isPastMonth ? formatVNDCompact(c.actualEbitda) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
