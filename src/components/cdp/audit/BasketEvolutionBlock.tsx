import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp, TrendingDown, Minus, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryShift {
  category: string;
  earlyShare: number; // % in first half of orders
  recentShare: number; // % in second half of orders
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

interface BasketEvolutionBlockProps {
  shifts: CategoryShift[];
  earlyPeriod: string;
  recentPeriod: string;
}

export function BasketEvolutionBlock({ shifts, earlyPeriod, recentPeriod }: BasketEvolutionBlockProps) {
  if (!shifts || shifts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Dịch chuyển Thói quen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Cần ít nhất 2 đơn để so sánh
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasSignificantShift = shifts.some(s => Math.abs(s.changePercent) >= 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Dịch chuyển Thói quen
          </CardTitle>
          {hasSignificantShift && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              Có thay đổi
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          So sánh cấu trúc basket giữa {earlyPeriod} và {recentPeriod}
        </p>
      </CardHeader>
      <CardContent>
        {/* Header */}
        <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mb-3 pb-2 border-b">
          <div>Danh mục</div>
          <div className="text-center">Trước đây</div>
          <div className="text-center">Gần đây</div>
          <div className="text-right">Thay đổi</div>
        </div>
        
        {/* Rows */}
        <div className="space-y-2">
          {shifts.map((shift) => (
            <div 
              key={shift.category} 
              className={cn(
                "grid grid-cols-4 gap-2 items-center text-sm py-1.5 px-2 rounded",
                Math.abs(shift.changePercent) >= 10 && "bg-muted/50"
              )}
            >
              <div className="font-medium capitalize">{shift.category}</div>
              <div className="text-center text-muted-foreground">
                {shift.earlyShare.toFixed(0)}%
              </div>
              <div className="text-center flex items-center justify-center gap-1">
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">{shift.recentShare.toFixed(0)}%</span>
              </div>
              <div className={cn(
                "text-right flex items-center justify-end gap-1",
                shift.trend === 'up' && "text-green-600",
                shift.trend === 'down' && "text-red-600",
                shift.trend === 'stable' && "text-muted-foreground"
              )}>
                {shift.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {shift.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {shift.trend === 'stable' && <Minus className="w-3 h-3" />}
                <span className="font-medium">
                  {shift.changePercent > 0 ? '+' : ''}{shift.changePercent.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Insight note */}
        {hasSignificantShift && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-800">
              <strong>Ghi chú:</strong> Phát hiện dịch chuyển &gt;10% trong cấu trúc mua hàng.
              Khách hàng có thể đang thay đổi nhu cầu hoặc thử nghiệm danh mục mới.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
