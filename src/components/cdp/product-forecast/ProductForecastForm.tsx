/**
 * Product Forecast Form
 * Form tạo dự báo sản phẩm mới với:
 * - Định nghĩa sản phẩm (category, price range)
 * - Chọn SP benchmark (tự động gợi ý + thủ công)
 * - Hiển thị kết quả ước lượng
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ArrowRight, Sparkles, Users, TrendingUp, AlertTriangle, Check, X } from 'lucide-react';
import { 
  useAvailableCategories, 
  useProductBenchmarks, 
  useMatchedCustomers,
  useCalculateForecast,
  ProductBenchmark 
} from '@/hooks/cdp/useProductForecast';
import { toast } from 'sonner';

interface ProductForecastFormProps {
  onClose: () => void;
}

const PRICE_TIERS = [
  { value: 'budget', label: 'Giá rẻ (< 200K)', min: 0, max: 200000 },
  { value: 'mid', label: 'Trung bình (200K - 500K)', min: 200000, max: 500000 },
  { value: 'premium', label: 'Cao cấp (500K - 1M)', min: 500000, max: 1000000 },
  { value: 'luxury', label: 'Xa xỉ (> 1M)', min: 1000000, max: 999999999 },
];

export function ProductForecastForm({ onClose }: ProductForecastFormProps) {
  const [step, setStep] = useState(1);
  
  // Step 1: Product Definition
  const [forecastName, setForecastName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriceTier, setSelectedPriceTier] = useState('');
  
  // Step 2: Benchmark Selection
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<string[]>([]);
  
  // Data hooks
  const { data: categories, isLoading: categoriesLoading } = useAvailableCategories();
  const { data: benchmarks, isLoading: benchmarksLoading } = useProductBenchmarks({
    category: selectedCategory,
    priceTier: selectedPriceTier,
  });
  const { data: matchedData } = useMatchedCustomers({
    category: selectedCategory,
    priceTier: selectedPriceTier,
  });
  const calculateMutation = useCalculateForecast();

  // Auto-suggest top 5 benchmarks
  const suggestedBenchmarks = useMemo(() => {
    if (!benchmarks?.length) return [];
    return benchmarks.slice(0, 5).map(b => b.product_id);
  }, [benchmarks]);

  // Toggle benchmark selection
  const toggleBenchmark = (productId: string) => {
    setSelectedBenchmarks(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Use suggested benchmarks
  const useSuggested = () => {
    setSelectedBenchmarks(suggestedBenchmarks);
  };

  // Calculate estimates preview
  const estimatePreview = useMemo(() => {
    if (!matchedData || !selectedBenchmarks.length) return null;

    const matchedCount = matchedData.count;
    const selectedBenchmarkData = benchmarks?.filter(b => selectedBenchmarks.includes(b.product_id)) || [];
    
    let _newPctSum = 0;
    for (const b of selectedBenchmarkData) _newPctSum += b.new_customer_pct || 0;
    const avgNewPct = selectedBenchmarkData.length ? _newPctSum / selectedBenchmarkData.length : 12;

    // Estimate conversion rate (10-15% typical)
    const conversionRate = 12;
    
    const estimatedExisting = Math.round(matchedCount * (conversionRate / 100));
    const estimatedNew = Math.round(estimatedExisting * (avgNewPct / (100 - avgNewPct)));
    
    return {
      matchedCustomers: matchedCount,
      estimatedExisting,
      estimatedNew,
      total: estimatedExisting + estimatedNew,
      newCustomerPct: avgNewPct,
    };
  }, [matchedData, selectedBenchmarks, benchmarks]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedCategory || !forecastName || selectedBenchmarks.length === 0) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const priceTierData = PRICE_TIERS.find(t => t.value === selectedPriceTier);

    try {
      await calculateMutation.mutateAsync({
        forecastName,
        category: selectedCategory,
        priceMin: priceTierData?.min,
        priceMax: priceTierData?.max,
        priceTier: selectedPriceTier,
        benchmarkProductIds: selectedBenchmarks,
      });
      
      toast.success('Đã tạo dự báo thành công');
      onClose();
    } catch (error) {
      toast.error('Có lỗi xảy ra khi tạo dự báo');
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            1
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            2
          </div>
          <div className={`w-16 h-1 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            3
          </div>
        </div>
      </div>

      {/* Step 1: Product Definition */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 1: Định nghĩa Sản phẩm mới</CardTitle>
            <CardDescription>
              Chọn danh mục và phân khúc giá cho sản phẩm bạn muốn dự báo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="forecastName">Tên dự báo</Label>
              <Input
                id="forecastName"
                placeholder="VD: Dự báo Son môi cao cấp Q1/2025"
                value={forecastName}
                onChange={(e) => setForecastName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Danh mục sản phẩm</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={categoriesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={categoriesLoading ? "Đang tải..." : "Chọn danh mục"} />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {categoriesLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Đang tải danh mục...</div>
                  ) : categories && categories.length > 0 ? (
                    categories.map(cat => (
                      <SelectItem key={cat.category} value={cat.category}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{cat.category}</span>
                          <span className="text-xs text-muted-foreground">
                            {cat.buyers.toLocaleString()} khách
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">Không có danh mục</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Phân khúc giá</Label>
              <Select value={selectedPriceTier} onValueChange={setSelectedPriceTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phân khúc giá" />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_TIERS.map(tier => (
                    <SelectItem key={tier.value} value={tier.value}>
                      {tier.label}
                    </SelectItem>
                  ))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Preview matched customers */}
            {selectedCategory && matchedData && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium">Khách hàng tiềm năng</span>
                </div>
                <p className="text-2xl font-semibold">{matchedData.count.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">
                  khách hàng phù hợp với tiêu chí này (đã mua {selectedCategory}, còn active)
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!selectedCategory || !forecastName}
              >
                Tiếp theo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Benchmark Selection */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 2: Chọn Sản phẩm tương tự (Benchmark)</CardTitle>
            <CardDescription>
              Hệ thống gợi ý các SP cùng danh mục và giá. Bạn có thể điều chỉnh lựa chọn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto suggestions */}
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm">
                  Hệ thống gợi ý <strong>{suggestedBenchmarks.length}</strong> sản phẩm tương tự
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={useSuggested}>
                Dùng gợi ý
              </Button>
            </div>

            {/* Benchmark list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Danh sách sản phẩm benchmark ({selectedBenchmarks.length} đã chọn)</Label>
                {selectedBenchmarks.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedBenchmarks([])}>
                    Bỏ chọn tất cả
                  </Button>
                )}
              </div>
              
              <ScrollArea className="h-[300px] border rounded-lg p-2">
                {benchmarksLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : !benchmarks?.length ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Không có sản phẩm nào trong danh mục này
                  </div>
                ) : (
                  <div className="space-y-2">
                    {benchmarks.map((benchmark) => (
                      <BenchmarkItem
                        key={benchmark.product_id}
                        benchmark={benchmark}
                        isSelected={selectedBenchmarks.includes(benchmark.product_id)}
                        isSuggested={suggestedBenchmarks.includes(benchmark.product_id)}
                        onToggle={() => toggleBenchmark(benchmark.product_id)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={selectedBenchmarks.length === 0}
              >
                Xem kết quả
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Results */}
      {step === 3 && estimatePreview && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 3: Kết quả Ước lượng</CardTitle>
            <CardDescription>
              Dựa trên {selectedBenchmarks.length} sản phẩm tương tự và {estimatePreview.matchedCustomers.toLocaleString()} khách hàng phù hợp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main results */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Existing customers estimate */}
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Từ khách cũ</span>
                  <Badge variant="outline" className="text-green-700 border-green-300 text-xs">
                    Confidence Cao
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-green-700">{estimatePreview.estimatedExisting} đơn</p>
                <p className="text-xs text-green-600 mt-1">
                  {estimatePreview.matchedCustomers.toLocaleString()} KH phù hợp × ~12% CR
                </p>
              </div>

              {/* New customers estimate */}
              <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Từ khách mới</span>
                  <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">
                    Ước tính
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-amber-700">~{estimatePreview.estimatedNew} đơn</p>
                <p className="text-xs text-amber-600 mt-1">
                  Dựa trên tỷ lệ {estimatePreview.newCustomerPct.toFixed(1)}% từ SP tương tự
                </p>
              </div>

              {/* Total */}
              <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">TỔNG CỘNG</span>
                </div>
                <p className="text-3xl font-bold text-primary">{estimatePreview.total} đơn</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Trong 6 tháng đầu sau khi launch
                </p>
              </div>
            </div>

            {/* Insights */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Insight
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Có {estimatePreview.matchedCustomers.toLocaleString()} khách cũ phù hợp chưa được tiếp cận</li>
                <li>• Nếu target khách cũ trước, có thể đạt {estimatePreview.estimatedExisting} đơn với chi phí thấp hơn marketing đại trà</li>
                <li>• SP benchmark đạt ~{estimatePreview.newCustomerPct.toFixed(1)}% doanh số từ khách mới</li>
              </ul>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Điều chỉnh
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={calculateMutation.isPending}
              >
                {calculateMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Lưu dự báo
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Benchmark item component
function BenchmarkItem({ 
  benchmark, 
  isSelected, 
  isSuggested,
  onToggle 
}: { 
  benchmark: ProductBenchmark;
  isSelected: boolean;
  isSuggested: boolean;
  onToggle: () => void;
}) {
  return (
    <div 
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected 
          ? 'bg-primary/5 border-primary/30' 
          : 'hover:bg-muted/50'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <Checkbox checked={isSelected} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{benchmark.product_id}</span>
            {isSuggested && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Gợi ý
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span>{benchmark.total_orders} đơn</span>
            <span>{benchmark.unique_customers} khách</span>
            <span className="text-green-600">{benchmark.existing_customers} cũ</span>
            <span className="text-amber-600">{benchmark.new_customers} mới ({benchmark.new_customer_pct}%)</span>
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="font-medium">{(benchmark.avg_unit_price / 1000).toFixed(0)}K</div>
          <div className="text-xs text-muted-foreground">{benchmark.price_tier}</div>
        </div>
      </div>
    </div>
  );
}
