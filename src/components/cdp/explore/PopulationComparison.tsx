import { useState } from 'react';
import { 
  GitCompare, 
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCDPPopulationComparison, PopulationComparison as PopulationComparisonData } from '@/hooks/useCDPExplore';
import { formatVNDCompact } from '@/lib/formatters';

interface ComparisonMetric {
  key: string;
  label: string;
  valueA: number;
  valueB: number;
  format: 'currency' | 'percent' | 'number' | 'days';
  confidence: 'high' | 'medium' | 'low';
}

function formatValue(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return formatVNDCompact(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'days':
      return `${value.toFixed(0)} ngày`;
    default:
      return value.toLocaleString();
  }
}

function getComparisonMetrics(popA: PopulationComparisonData | undefined, popB: PopulationComparisonData | undefined): ComparisonMetric[] {
  if (!popA || !popB) return [];
  
  return [
    { 
      key: 'aov', 
      label: 'AOV trung bình', 
      valueA: popA.avgAov, 
      valueB: popB.avgAov,
      format: 'currency',
      confidence: 'high'
    },
    { 
      key: 'repurchase', 
      label: 'Chu kỳ mua lại', 
      valueA: popA.avgRepurchaseCycle, 
      valueB: popB.avgRepurchaseCycle,
      format: 'days',
      confidence: 'high'
    },
    { 
      key: 'return_rate', 
      label: 'Tỷ lệ hoàn trả', 
      valueA: popA.avgReturnRate, 
      valueB: popB.avgReturnRate,
      format: 'percent',
      confidence: 'medium'
    },
    { 
      key: 'margin', 
      label: 'Biên đóng góp', 
      valueA: popA.avgMarginPercent, 
      valueB: popB.avgMarginPercent,
      format: 'percent',
      confidence: 'medium'
    },
    { 
      key: 'order_frequency', 
      label: 'Tần suất mua', 
      valueA: popA.avgFrequency, 
      valueB: popB.avgFrequency,
      format: 'number',
      confidence: 'high'
    },
  ];
}

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { label: 'Tin cậy cao', className: 'bg-success/10 text-success border-success/20' },
    medium: { label: 'Tin cậy TB', className: 'bg-warning/10 text-warning border-warning/20' },
    low: { label: 'Cần xác minh', className: 'bg-muted text-muted-foreground border-border' },
  };
  
  return (
    <Badge variant="outline" className={cn("text-xs", config[level].className)}>
      {config[level].label}
    </Badge>
  );
}

export function PopulationComparison() {
  const [populationAId, setPopulationAId] = useState<string>('');
  const [populationBId, setPopulationBId] = useState<string>('');

  const { data: populations, isLoading } = useCDPPopulationComparison();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pops = populations || [];
  const popA = pops.find(p => p.populationId === populationAId);
  const popB = pops.find(p => p.populationId === populationBId);
  const metrics = getComparisonMetrics(popA, popB);

  const swapPopulations = () => {
    const temp = populationAId;
    setPopulationAId(populationBId);
    setPopulationBId(temp);
  };

  return (
    <div className="space-y-6">
      {/* Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="w-4 h-4" />
            So sánh hai tập khách
          </CardTitle>
          <CardDescription>
            Chọn hai nhóm khách hàng để so sánh các chỉ số hành vi và giá trị
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pops.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Chưa có tập khách nào để so sánh</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {/* Population A */}
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Tập A</label>
                <Select value={populationAId} onValueChange={setPopulationAId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tập khách..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pops.filter(p => p.populationId !== populationBId).map(pop => (
                      <SelectItem key={pop.populationId} value={pop.populationId}>
                        {pop.populationName} ({pop.customerCount.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Swap Button */}
              <Button 
                variant="outline" 
                size="icon" 
                className="mt-6"
                onClick={swapPopulations}
                disabled={!populationAId || !populationBId}
              >
                <ArrowLeftRight className="w-4 h-4" />
              </Button>

              {/* Population B */}
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Tập B</label>
                <Select value={populationBId} onValueChange={setPopulationBId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tập khách..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pops.filter(p => p.populationId !== populationAId).map(pop => (
                      <SelectItem key={pop.populationId} value={pop.populationId}>
                        {pop.populationName} ({pop.customerCount.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {popA && popB && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Kết quả so sánh</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{popA.populationName}: <strong>{popA.customerCount.toLocaleString()}</strong></span>
                <span>vs</span>
                <span>{popB.populationName}: <strong>{popB.customerCount.toLocaleString()}</strong></span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Chỉ số</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Tập A</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Tập B</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Chênh lệch</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">% Thay đổi</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Độ tin cậy</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, index) => {
                  const diff = metric.valueA - metric.valueB;
                  const percentChange = metric.valueB !== 0 
                    ? ((metric.valueA - metric.valueB) / metric.valueB) * 100 
                    : 0;
                  const isPositive = diff > 0;
                  const isNeutral = Math.abs(percentChange) < 5;

                  return (
                    <tr 
                      key={metric.key} 
                      className={cn(
                        "border-b last:border-0",
                        index % 2 === 0 && "bg-muted/10"
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium">{metric.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium">
                          {formatValue(metric.valueA, metric.format)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-muted-foreground">
                          {formatValue(metric.valueB, metric.format)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          "text-sm font-medium",
                          isNeutral && "text-muted-foreground",
                          !isNeutral && isPositive && "text-success",
                          !isNeutral && !isPositive && "text-destructive"
                        )}>
                          {isPositive ? '+' : ''}{formatValue(diff, metric.format)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isNeutral ? (
                            <Minus className="w-3 h-3 text-muted-foreground" />
                          ) : isPositive ? (
                            <TrendingUp className="w-3 h-3 text-success" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-destructive" />
                          )}
                          <span className={cn(
                            "text-sm",
                            isNeutral && "text-muted-foreground",
                            !isNeutral && isPositive && "text-success",
                            !isNeutral && !isPositive && "text-destructive"
                          )}>
                            {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ConfidenceBadge level={metric.confidence} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Interpretation Note */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Lưu ý khi diễn giải</p>
              <p>
                Sự khác biệt giữa hai tập khách có thể phản ánh thay đổi trong hành vi mua 
                hoặc khác biệt về đặc điểm phân khúc. Nên kết hợp với phân tích định tính 
                trước khi đưa ra quyết định.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
