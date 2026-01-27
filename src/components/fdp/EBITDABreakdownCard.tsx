/**
 * EBITDABreakdownCard - Detailed EBITDA breakdown for CFO transparency
 * 
 * Shows: Gross Profit → OpEx Categories → EBITDA
 * Fulfills CFO requirement for transparent expense categorization
 */

import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { useOpExBreakdown } from '@/hooks/useOpExBreakdown';
import { formatVNDCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface EBITDABreakdownCardProps {
  className?: string;
  compact?: boolean;
}

export function EBITDABreakdownCard({ className, compact = false }: EBITDABreakdownCardProps) {
  const { data: snapshot, isLoading: snapshotLoading } = useFinanceTruthSnapshot();
  const { breakdown, isLoading: breakdownLoading, hasData } = useOpExBreakdown();

  const isLoading = snapshotLoading || breakdownLoading;
  const grossProfit = snapshot?.grossProfit ?? 0;
  const calculatedEbitda = grossProfit - breakdown.total;
  const displayEbitda = snapshot?.ebitda ?? calculatedEbitda;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className={compact ? 'pb-2' : ''}>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className={cn('flex flex-row items-center justify-between', compact ? 'pb-2' : '')}>
        <div className="flex items-center gap-2">
          <CardTitle className={compact ? 'text-base' : ''}>EBITDA Breakdown</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">EBITDA = Lợi nhuận gộp - Chi phí hoạt động</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {breakdown.calculationDescription}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge variant="outline" className="text-xs">
          {breakdown.periodLabel}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Gross Profit */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Lợi nhuận gộp</span>
          <span className="font-semibold">{formatVNDCompact(grossProfit)}</span>
        </div>

        <Separator />

        {/* OpEx Categories */}
        {hasData ? (
          <div className="space-y-2">
            {breakdown.categories.map((cat) => (
              <div key={cat.category} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{cat.label}</span>
                  {cat.source === 'baseline' && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      Định mức
                    </Badge>
                  )}
                </div>
                <span className="text-destructive/80">-{formatVNDCompact(cat.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-2">
            Chưa có dữ liệu chi phí hoạt động.
            <br />
            <span className="text-xs">Vào FDP → Chi phí → Định nghĩa chi phí để cấu hình</span>
          </div>
        )}

        {/* Total OpEx */}
        {hasData && (
          <>
            <div className="flex justify-between items-center text-sm pt-1">
              <span className="font-medium">Tổng Chi phí hoạt động</span>
              <span className="text-destructive font-medium">-{formatVNDCompact(breakdown.total)}</span>
            </div>
            <Separator />
          </>
        )}

        {/* EBITDA Result */}
        <div className="flex justify-between items-center pt-1">
          <span className="font-bold">EBITDA</span>
          <span className={cn(
            'text-lg font-bold',
            displayEbitda >= 0 ? 'text-success' : 'text-destructive'
          )}>
            {formatVNDCompact(displayEbitda)}
          </span>
        </div>

        {/* EBITDA Margin */}
        {grossProfit > 0 && (
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>EBITDA Margin</span>
            <span>
              {((displayEbitda / grossProfit) * 100).toFixed(1)}% của lợi nhuận gộp
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
