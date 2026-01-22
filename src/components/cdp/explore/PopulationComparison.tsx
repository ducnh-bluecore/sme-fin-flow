import { useState } from 'react';
import { 
  GitCompare, 
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Check,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Population {
  id: string;
  name: string;
  customerCount: number;
}

interface ComparisonMetric {
  key: string;
  label: string;
  valueA: number;
  valueB: number;
  format: 'currency' | 'percent' | 'number' | 'days';
  confidence: 'high' | 'medium' | 'low';
}

const mockPopulations: Population[] = [
  { id: 'top20', name: 'Top 20% giá trị', customerCount: 2450 },
  { id: 'newq1', name: 'Khách mới Q1/2025', customerCount: 1230 },
  { id: 'dormant', name: 'Khách ngủ đông', customerCount: 890 },
  { id: 'highrisk', name: 'Rủi ro hoàn trả cao', customerCount: 456 },
  { id: 'promo', name: 'Phụ thuộc khuyến mãi', customerCount: 1670 },
];

function formatValue(value: number, format: string): string {
  switch (format) {
    case 'currency':
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
      return value.toLocaleString('vi-VN');
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'days':
      return `${value.toFixed(0)} ngày`;
    default:
      return value.toLocaleString();
  }
}

function getComparisonMetrics(populationA: string, populationB: string): ComparisonMetric[] {
  // Mock data based on population selection
  return [
    { 
      key: 'aov', 
      label: 'AOV trung bình', 
      valueA: populationA === 'top20' ? 2150000 : 850000, 
      valueB: populationB === 'top20' ? 2150000 : 650000,
      format: 'currency',
      confidence: 'high'
    },
    { 
      key: 'repurchase', 
      label: 'Chu kỳ mua lại', 
      valueA: populationA === 'top20' ? 18 : 45, 
      valueB: populationB === 'dormant' ? 95 : 52,
      format: 'days',
      confidence: 'high'
    },
    { 
      key: 'return_rate', 
      label: 'Tỷ lệ hoàn trả', 
      valueA: populationA === 'highrisk' ? 28.5 : 8.2, 
      valueB: populationB === 'highrisk' ? 28.5 : 12.3,
      format: 'percent',
      confidence: 'medium'
    },
    { 
      key: 'margin', 
      label: 'Biên đóng góp', 
      valueA: populationA === 'top20' ? 35.2 : 22.1, 
      valueB: populationB === 'promo' ? 15.8 : 24.5,
      format: 'percent',
      confidence: 'medium'
    },
    { 
      key: 'order_frequency', 
      label: 'Tần suất mua/năm', 
      valueA: populationA === 'top20' ? 8.5 : 3.2, 
      valueB: populationB === 'dormant' ? 1.2 : 2.8,
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
  const [populationA, setPopulationA] = useState<string>('top20');
  const [populationB, setPopulationB] = useState<string>('dormant');

  const popA = mockPopulations.find(p => p.id === populationA);
  const popB = mockPopulations.find(p => p.id === populationB);
  const metrics = populationA && populationB ? getComparisonMetrics(populationA, populationB) : [];

  const swapPopulations = () => {
    const temp = populationA;
    setPopulationA(populationB);
    setPopulationB(temp);
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
          <div className="flex items-center gap-4">
            {/* Population A */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Tập A</label>
              <Select value={populationA} onValueChange={setPopulationA}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tập khách..." />
                </SelectTrigger>
                <SelectContent>
                  {mockPopulations.filter(p => p.id !== populationB).map(pop => (
                    <SelectItem key={pop.id} value={pop.id}>
                      {pop.name} ({pop.customerCount.toLocaleString()})
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
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>

            {/* Population B */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Tập B</label>
              <Select value={populationB} onValueChange={setPopulationB}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tập khách..." />
                </SelectTrigger>
                <SelectContent>
                  {mockPopulations.filter(p => p.id !== populationA).map(pop => (
                    <SelectItem key={pop.id} value={pop.id}>
                      {pop.name} ({pop.customerCount.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {populationA && populationB && popA && popB && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Kết quả so sánh</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{popA.name}: <strong>{popA.customerCount.toLocaleString()}</strong></span>
                <span>vs</span>
                <span>{popB.name}: <strong>{popB.customerCount.toLocaleString()}</strong></span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Chỉ số</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    Tập A
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    Tập B
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    Chênh lệch
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    % Thay đổi
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                    Độ tin cậy
                  </th>
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
