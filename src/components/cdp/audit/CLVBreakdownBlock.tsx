import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DollarSign, CheckCircle2, Clock, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CLVBreakdownBlockProps {
  realizedRevenue: number;
  remainingPotential: number;
  totalCLV: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)} tỷ`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString('vi-VN');
}

// Industry benchmarks for E-commerce VN
const BENCHMARKS = {
  average: 2500000,
  top25: 4500000,
};

export function CLVBreakdownBlock({ realizedRevenue, remainingPotential, totalCLV }: CLVBreakdownBlockProps) {
  const realizedPercent = totalCLV > 0 ? (realizedRevenue / totalCLV) * 100 : 0;
  const remainingPercent = totalCLV > 0 ? (remainingPotential / totalCLV) * 100 : 0;
  
  // Benchmark comparison
  const vsAverage = totalCLV - BENCHMARKS.average;
  const vsTop25 = totalCLV - BENCHMARKS.top25;
  const isAboveAverage = totalCLV >= BENCHMARKS.average;
  const isTop25 = totalCLV >= BENCHMARKS.top25;

  const maxBenchmarkValue = Math.max(totalCLV, BENCHMARKS.top25) * 1.2;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Phân tích CLV Khách hàng
          </CardTitle>
          {isTop25 ? (
            <Badge className="bg-green-100 text-green-700 border-green-200">Top 25%</Badge>
          ) : isAboveAverage ? (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">Trên TB</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Dưới TB</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Giá trị trọn đời của khách hàng này so với benchmark ngành
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total CLV Hero */}
        <div className="text-center py-4 bg-primary/5 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Tổng CLV</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(totalCLV)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            = Đã khai thác + Tiềm năng còn lại
          </p>
        </div>

        {/* Breakdown: Realized vs Remaining */}
        <div className="grid grid-cols-2 gap-4">
          {/* Đã khai thác */}
          <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Đã khai thác</span>
            </div>
            <p className="text-xl font-bold text-green-700">{formatCurrency(realizedRevenue)}</p>
            <Progress value={realizedPercent} className="h-1.5 bg-green-200" />
            <p className="text-xs text-green-600">{realizedPercent.toFixed(1)}% tổng CLV</p>
          </div>

          {/* Tiềm năng còn lại */}
          <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Tiềm năng còn lại</span>
            </div>
            <p className="text-xl font-bold text-amber-700">{formatCurrency(remainingPotential)}</p>
            <Progress value={remainingPercent} className="h-1.5 bg-amber-200" />
            <p className="text-xs text-amber-600">{remainingPercent.toFixed(1)}% (12 tháng tới)</p>
          </div>
        </div>

        {/* Benchmark Comparison */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            So sánh với Benchmark ngành
          </h4>
          
          <div className="space-y-3">
            {/* Customer CLV bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">CLV Khách hàng này</span>
                <span className="font-bold text-primary">{formatCurrency(totalCLV)}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all rounded-full"
                  style={{ width: `${Math.min((totalCLV / maxBenchmarkValue) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Benchmark Average bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Trung bình ngành E-commerce VN</span>
                <span className="text-muted-foreground">{formatCurrency(BENCHMARKS.average)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-muted-foreground/40 transition-all rounded-full"
                  style={{ width: `${(BENCHMARKS.average / maxBenchmarkValue) * 100}%` }}
                />
              </div>
            </div>

            {/* Top 25% bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Top 25% ngành</span>
                <span className="text-muted-foreground">{formatCurrency(BENCHMARKS.top25)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-muted-foreground/20 transition-all rounded-full"
                  style={{ width: `${(BENCHMARKS.top25 / maxBenchmarkValue) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Insight */}
          <div className={cn(
            "mt-4 p-3 rounded-lg border",
            isTop25 ? "bg-green-50 border-green-100" :
            isAboveAverage ? "bg-amber-50 border-amber-100" :
            "bg-red-50 border-red-100"
          )}>
            {isTop25 ? (
              <div className="flex items-start gap-2 text-sm text-green-800">
                <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Khách hàng này thuộc <strong>Top 25%</strong> ngành với CLV cao hơn benchmark{' '}
                  <strong>{formatCurrency(vsTop25)}</strong>. Ưu tiên giữ chân!
                </span>
              </div>
            ) : isAboveAverage ? (
              <div className="flex items-start gap-2 text-sm text-amber-800">
                <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  CLV <strong>cao hơn trung bình</strong> ngành{' '}
                  <strong>{formatCurrency(vsAverage)}</strong>. Cần thêm{' '}
                  <strong>{formatCurrency(-vsTop25)}</strong> để đạt Top 25%.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm text-red-800">
                <TrendingDown className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  CLV <strong>thấp hơn trung bình</strong> ngành{' '}
                  <strong>{formatCurrency(-vsAverage)}</strong>. Cần tăng retention hoặc AOV.
                </span>
              </div>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground mt-2">
            * Benchmark tham khảo từ E-commerce Việt Nam 2024
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
