import { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Lightbulb, 
  Users,
  TrendingDown,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface HypothesisCondition {
  id: string;
  metric: string;
  operator: string;
  value: string;
  timeframe: string;
}

interface HypothesisResult {
  customerCount: number;
  percentOfTotal: number;
  avgAOV: number;
  avgAOVDelta: number;
  returnRate: number;
  returnRateDelta: number;
  systemSuggestion?: string;
}

const metricOptions = [
  { value: 'aov', label: 'AOV (giá trị đơn TB)' },
  { value: 'order_count', label: 'Số đơn hàng' },
  { value: 'total_spend', label: 'Tổng chi tiêu' },
  { value: 'repurchase_cycle', label: 'Chu kỳ mua lại' },
  { value: 'return_rate', label: 'Tỷ lệ hoàn trả' },
  { value: 'last_purchase', label: 'Lần mua gần nhất' },
  { value: 'margin_contribution', label: 'Đóng góp biên' },
];

const operatorOptions = [
  { value: 'gt', label: 'lớn hơn' },
  { value: 'lt', label: 'nhỏ hơn' },
  { value: 'gte', label: '>=' },
  { value: 'lte', label: '<=' },
  { value: 'change_up', label: 'tăng' },
  { value: 'change_down', label: 'giảm' },
];

const timeframeOptions = [
  { value: '30d', label: 'trong 30 ngày' },
  { value: '60d', label: 'trong 60 ngày' },
  { value: '90d', label: 'trong 90 ngày' },
  { value: 'ytd', label: 'từ đầu năm' },
  { value: 'all', label: 'toàn bộ' },
];

// Mock result based on conditions
function calculateMockResult(conditions: HypothesisCondition[]): HypothesisResult | null {
  if (conditions.length === 0) return null;
  
  // Simulate different results based on conditions
  const hasDownTrend = conditions.some(c => c.operator === 'change_down');
  const hasHighReturn = conditions.some(c => c.metric === 'return_rate' && c.operator === 'gt');
  
  return {
    customerCount: hasDownTrend ? 1234 : 3456,
    percentOfTotal: hasDownTrend ? 12.5 : 35.2,
    avgAOV: hasDownTrend ? 850000 : 1250000,
    avgAOVDelta: hasDownTrend ? -18.5 : 5.2,
    returnRate: hasHighReturn ? 22.3 : 8.7,
    returnRateDelta: hasHighReturn ? 8.1 : -2.3,
    systemSuggestion: hasDownTrend 
      ? 'Dữ liệu cho thấy xu hướng suy giảm giá trị ở tập khách này. Đề xuất rà soát rủi ro doanh thu và dòng tiền liên quan.'
      : hasHighReturn
        ? 'Tỷ lệ hoàn trả cao hơn mức trung bình có thể ảnh hưởng đến biên lợi nhuận thực tế. Cần được xem xét ở cấp điều hành.'
        : undefined,
  };
}

export function HypothesisBuilder() {
  const [conditions, setConditions] = useState<HypothesisCondition[]>([
    { id: '1', metric: 'aov', operator: 'change_down', value: '20', timeframe: '60d' }
  ]);
  
  const result = calculateMockResult(conditions);

  const addCondition = () => {
    setConditions([
      ...conditions,
      { 
        id: Date.now().toString(), 
        metric: 'order_count', 
        operator: 'gte', 
        value: '', 
        timeframe: '90d' 
      }
    ]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, field: keyof HypothesisCondition, value: string) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return value.toLocaleString('vi-VN');
  };

  return (
    <div className="space-y-6">
      {/* Builder Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Xây dựng giả thuyết hành vi
          </CardTitle>
          <CardDescription>
            Định nghĩa điều kiện để tìm nhóm khách hàng theo giả thuyết của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Natural Language Preview */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm font-medium text-primary mb-1">Giả thuyết hiện tại:</p>
            <p className="text-sm text-foreground">
              "Khách hàng có {conditions.map((c, i) => {
                const metric = metricOptions.find(m => m.value === c.metric)?.label.toLowerCase();
                const op = operatorOptions.find(o => o.value === c.operator)?.label;
                const time = timeframeOptions.find(t => t.value === c.timeframe)?.label;
                return (
                  <span key={c.id}>
                    {i > 0 && ' VÀ '}
                    <strong>{metric}</strong> {op} <strong>{c.value}%</strong> {time}
                  </span>
                );
              })}"
            </p>
          </div>

          {/* Conditions */}
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div key={condition.id} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-16">
                  {index === 0 ? 'Nếu' : 'Và'}
                </span>
                <Select
                  value={condition.metric}
                  onValueChange={(v) => updateCondition(condition.id, 'metric', v)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metricOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={condition.operator}
                  onValueChange={(v) => updateCondition(condition.id, 'operator', v)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operatorOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Input
                    type="text"
                    value={condition.value}
                    onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                    className="w-20"
                    placeholder="Giá trị"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <Select
                  value={condition.timeframe}
                  onValueChange={(v) => updateCondition(condition.id, 'timeframe', v)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeframeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeCondition(condition.id)}
                  disabled={conditions.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addCondition}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm điều kiện
          </Button>
        </CardContent>
      </Card>

      {/* Results Card */}
      {result && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Kết quả giả thuyết</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Quy mô</span>
                </div>
                <p className="text-xl font-semibold">{result.customerCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{result.percentOfTotal}% tổng số</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">AOV trung bình</span>
                </div>
                <p className="text-xl font-semibold">{formatCurrency(result.avgAOV)}</p>
                <p className={cn(
                  "text-xs",
                  result.avgAOVDelta >= 0 ? "text-success" : "text-destructive"
                )}>
                  {result.avgAOVDelta >= 0 ? '+' : ''}{result.avgAOVDelta.toFixed(1)}% so với TB
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">Tỷ lệ hoàn trả</span>
                </div>
                <p className="text-xl font-semibold">{result.returnRate.toFixed(1)}%</p>
                <p className={cn(
                  "text-xs",
                  result.returnRateDelta <= 0 ? "text-success" : "text-destructive"
                )}>
                  {result.returnRateDelta >= 0 ? '+' : ''}{result.returnRateDelta.toFixed(1)}% so với TB
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg flex flex-col justify-center">
                <Button size="sm" className="w-full" variant="outline">
                  Xem chi tiết tập khách
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* System Suggestion */}
            {result.systemSuggestion && (
              <>
                <Separator />
                <div className="flex items-start gap-3 p-3 bg-warning/5 border border-warning/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Gợi ý từ hệ thống</p>
                    <p className="text-sm text-muted-foreground">{result.systemSuggestion}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
