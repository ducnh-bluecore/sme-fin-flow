/**
 * ProvisionalExpensesSummary - Shows estimated monthly expenses from baselines/estimates
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 */
import { Info, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProvisionalExpense {
  category: string;
  name: string;
  monthlyAmount: number;
  source: 'baseline' | 'estimate';
}

const categoryLabels: Record<string, string> = {
  salary: 'Lương nhân viên',
  rent: 'Thuê mặt bằng',
  utilities: 'Điện nước',
  marketing: 'Marketing',
  logistics: 'Vận chuyển',
  depreciation: 'Khấu hao',
  insurance: 'Bảo hiểm',
  supplies: 'Vật tư',
  maintenance: 'Bảo trì',
  professional: 'Dịch vụ chuyên nghiệp',
  other: 'Chi phí khác',
};

function useProvisionalExpenses() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  return useQuery({
    queryKey: ['provisional-expenses', tenantId, nextYear, nextMonth],
    queryFn: async (): Promise<{ 
      fixedCosts: ProvisionalExpense[]; 
      variableCosts: ProvisionalExpense[];
      totalFixed: number;
      totalVariable: number;
      totalMonthly: number;
    }> => {
      if (!tenantId) {
        return { fixedCosts: [], variableCosts: [], totalFixed: 0, totalVariable: 0, totalMonthly: 0 };
      }

      // Fetch baselines (fixed costs)
      const { data: baselines, error: baselineError } = await buildSelectQuery('expense_baselines', '*')
        .lte('effective_from', new Date().toISOString().split('T')[0])
        .or(`effective_to.is.null,effective_to.gte.${new Date().toISOString().split('T')[0]}`);

      if (baselineError) {
        console.error('Error fetching baselines:', baselineError);
      }

      // Fetch estimates (variable costs) for next month
      const { data: estimates, error: estimateError } = await buildSelectQuery('expense_estimates', '*')
        .eq('year', nextYear)
        .eq('month', nextMonth);

      if (estimateError) {
        console.error('Error fetching estimates:', estimateError);
      }

      const fixedCosts: ProvisionalExpense[] = ((baselines || []) as unknown as any[]).map((b: any) => ({
        category: b.category,
        name: b.name,
        monthlyAmount: b.monthly_amount || 0,
        source: 'baseline' as const,
      }));

      const variableCosts: ProvisionalExpense[] = ((estimates || []) as unknown as any[]).map((e: any) => ({
        category: e.category,
        name: e.name || categoryLabels[e.category] || e.category,
        monthlyAmount: e.estimated_amount || 0,
        source: 'estimate' as const,
      }));

      const totalFixed = fixedCosts.reduce((sum, c) => sum + c.monthlyAmount, 0);
      const totalVariable = variableCosts.reduce((sum, c) => sum + c.monthlyAmount, 0);

      return {
        fixedCosts,
        variableCosts,
        totalFixed,
        totalVariable,
        totalMonthly: totalFixed + totalVariable,
      };
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

interface ProvisionalExpensesSummaryProps {
  className?: string;
  showHeader?: boolean;
}

export function ProvisionalExpensesSummary({ 
  className,
  showHeader = true,
}: ProvisionalExpensesSummaryProps) {
  const { data, isLoading } = useProvisionalExpenses();
  const nextMonthName = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    .toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasNoData = !data || (data.fixedCosts.length === 0 && data.variableCosts.length === 0);

  if (hasNoData) {
    return (
      <Card className={cn('border-amber-200 bg-amber-50/50', className)}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-700">Chưa có định nghĩa chi phí</p>
              <p className="text-sm text-muted-foreground mt-1">
                Thêm chi phí cố định và biến phí để xem dự báo chi phí hàng tháng
              </p>
              <Link to="/expenses" className="mt-3 inline-block">
                <Button variant="outline" size="sm" className="text-amber-700 border-amber-300">
                  Thêm định nghĩa chi phí
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Chi phí dự kiến tháng tới</CardTitle>
          </div>
          <CardDescription className="flex items-center gap-1">
            <span>Dựa trên định nghĩa chi phí cho {nextMonthName}</span>
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={cn(!showHeader && 'pt-4')}>
        <div className="space-y-4">
          {/* Fixed Costs */}
          {data.fixedCosts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Chi phí cố định
              </p>
              <div className="space-y-1.5">
                {data.fixedCosts.map((cost, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                    <span className="text-sm">{cost.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm tabular-nums">
                        {formatCurrency(cost.monthlyAmount)}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 text-blue-600 border-blue-200">
                        Cố định
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variable Costs */}
          {data.variableCosts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Biến phí dự kiến
              </p>
              <div className="space-y-1.5">
                {data.variableCosts.map((cost, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                    <span className="text-sm">{cost.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm tabular-nums">
                        {formatCurrency(cost.monthlyAmount)}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-amber-50 text-amber-600 border-amber-200">
                        Tạm tính
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Tổng dự kiến hàng tháng</span>
              <span className="font-bold text-lg font-mono tabular-nums text-primary">
                {formatCurrency(data.totalMonthly)}
              </span>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 pt-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Dữ liệu từ "Định nghĩa chi phí" trong menu Chi phí. Số liệu này sẽ được thay thế khi có chi phí thực tế.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
