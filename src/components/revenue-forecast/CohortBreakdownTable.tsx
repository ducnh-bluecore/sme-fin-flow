import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ForecastMonth } from '@/hooks/useRevenueForecast';

function fmt(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString('vi-VN');
}

interface Props {
  data: ForecastMonth[];
}

export function CohortBreakdownTable({ data }: Props) {
  // Collect all unique cohort months across forecast months
  const cohortMap = new Map<string, Record<string, { retention_pct: number; returning_customers: number; revenue: number }>>();

  data.forEach((fm) => {
    fm.returning_breakdown?.forEach((cb) => {
      if (!cohortMap.has(cb.cohort_month)) cohortMap.set(cb.cohort_month, {});
      cohortMap.get(cb.cohort_month)![fm.month] = {
        retention_pct: cb.retention_pct,
        returning_customers: cb.returning_customers,
        revenue: cb.revenue,
      };
    });
  });

  const cohortMonths = Array.from(cohortMap.keys()).sort();
  const forecastMonths = data.map((d) => d.month);

  if (cohortMonths.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Chưa có dữ liệu cohort để hiển thị
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Chi tiết doanh thu theo Cohort</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs whitespace-nowrap">Cohort</TableHead>
              {forecastMonths.map((fm) => (
                <TableHead key={fm} className="text-xs text-right whitespace-nowrap">
                  {fm}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cohortMonths.map((cm) => {
              const row = cohortMap.get(cm)!;
              return (
                <TableRow key={cm}>
                  <TableCell className="text-xs font-medium whitespace-nowrap">{cm}</TableCell>
                  {forecastMonths.map((fm) => {
                    const cell = row[fm];
                    return (
                      <TableCell key={fm} className="text-xs text-right">
                        {cell ? (
                          <div>
                            <div className="font-medium">{fmt(cell.revenue)}</div>
                            <div className="text-muted-foreground text-[10px]">
                              {cell.returning_customers} KH · {cell.retention_pct}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            {/* Total row */}
            <TableRow className="font-semibold border-t-2">
              <TableCell className="text-xs">Tổng khách cũ</TableCell>
              {data.map((fm) => (
                <TableCell key={fm.month} className="text-xs text-right font-bold">
                  {fmt(fm.returning_revenue)}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="text-xs text-emerald-600">+ Khách mới</TableCell>
              {data.map((fm) => (
                <TableCell key={fm.month} className="text-xs text-right text-emerald-600">
                  {fmt(fm.new_revenue)}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="text-xs text-amber-600">+ Ads</TableCell>
              {data.map((fm) => (
                <TableCell key={fm.month} className="text-xs text-right text-amber-600">
                  {fmt(fm.ads_revenue)}
                </TableCell>
              ))}
            </TableRow>
            <TableRow className="bg-muted/50 font-bold">
              <TableCell className="text-xs">TỔNG (Base)</TableCell>
              {data.map((fm) => (
                <TableCell key={fm.month} className="text-xs text-right font-bold">
                  {fmt(fm.total_base)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
