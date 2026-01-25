import { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Lightbulb, 
  Users,
  AlertTriangle,
  ChevronRight,
  Save,
  Loader2,
  Database,
  CheckCircle2
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useHypothesisQuery, useSaveAsSegment, HypothesisCondition } from '@/hooks/cdp/useHypothesisQuery';

const metricOptions = [
  { value: 'aov', label: 'AOV (giá trị đơn TB)' },
  { value: 'order_count', label: 'Số đơn hàng' },
  { value: 'total_spend', label: 'Tổng chi tiêu' },
  { value: 'repurchase_cycle', label: 'Chu kỳ mua lại' },
  { value: 'return_rate', label: 'Tỷ lệ hoàn trả' },
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

export function HypothesisBuilder() {
  const [conditions, setConditions] = useState<HypothesisCondition[]>([
    { id: '1', metric: 'aov', operator: 'gte', value: '500000', timeframe: '90d' }
  ]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');

  // Real data query
  const { data: result, isLoading, isFetching } = useHypothesisQuery(conditions);
  const saveAsSegment = useSaveAsSegment();

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
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return value.toLocaleString('vi-VN');
  };

  const handleSaveSegment = async () => {
    if (!segmentName.trim()) return;
    
    await saveAsSegment.mutateAsync({
      name: segmentName,
      description: segmentDescription,
      conditions,
    });
    
    setSaveDialogOpen(false);
    setSegmentName('');
    setSegmentDescription('');
  };

  // Generate description from conditions
  const generateDescription = () => {
    return conditions.map(c => {
      const metric = metricOptions.find(m => m.value === c.metric)?.label || c.metric;
      const op = operatorOptions.find(o => o.value === c.operator)?.label || c.operator;
      return `${metric} ${op} ${c.value}`;
    }).join(' VÀ ');
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
            Định nghĩa điều kiện để tìm nhóm khách hàng theo giả thuyết của bạn. Dữ liệu được query trực tiếp từ database.
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
                const unit = ['aov', 'total_spend', 'margin_contribution'].includes(c.metric) ? 'đ' : '';
                return (
                  <span key={c.id}>
                    {i > 0 && ' VÀ '}
                    <strong>{metric}</strong> {op} <strong>{c.value}{unit}</strong> {time}
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
                    className="w-24"
                    placeholder="Giá trị"
                  />
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
      {(isLoading || result) && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                Kết quả giả thuyết
                {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </CardTitle>
              {result?.isRealData && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
                  <Database className="w-3 h-3" />
                  Dữ liệu thật
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && !result ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Đang query dữ liệu...</span>
              </div>
            ) : result ? (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                      {result.avgAOVDelta >= 0 ? '+' : ''}{result.avgAOVDelta.toFixed(1)}% so với TB tenant
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">Tổng chi tiêu</span>
                    </div>
                    <p className="text-xl font-semibold">{formatCurrency(result.totalSpend)}</p>
                    <p className="text-xs text-muted-foreground">
                      Biên: {formatCurrency(result.marginContribution)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg flex flex-col gap-2">
                    <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          className="w-full" 
                          disabled={result.customerCount === 0}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Lưu thành Tập khách
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Lưu tập khách hàng mới</DialogTitle>
                          <DialogDescription>
                            Tập khách sẽ được lưu và có thể sử dụng cho phân tích, insight.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Tên tập khách</Label>
                            <Input
                              id="name"
                              value={segmentName}
                              onChange={(e) => setSegmentName(e.target.value)}
                              placeholder="VD: Khách VIP AOV cao"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Mô tả</Label>
                            <Textarea
                              id="description"
                              value={segmentDescription}
                              onChange={(e) => setSegmentDescription(e.target.value)}
                              placeholder={generateDescription()}
                              rows={3}
                            />
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg text-sm">
                            <p className="font-medium mb-1">Điều kiện:</p>
                            <p className="text-muted-foreground">{generateDescription()}</p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                            Hủy
                          </Button>
                          <Button 
                            onClick={handleSaveSegment} 
                            disabled={!segmentName.trim() || saveAsSegment.isPending}
                          >
                            {saveAsSegment.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            Lưu
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" className="w-full" variant="outline">
                      Xem chi tiết
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

                {/* Data Source */}
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Nguồn: {result.dataSource}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
