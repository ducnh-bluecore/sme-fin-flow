import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Users, AlertTriangle, DollarSign, Target, PieChart, CheckCircle2, Clock, BarChart3, Filter } from 'lucide-react';
import { useLTVSummary, useActiveLTVModel, useRealizedRevenue } from '@/hooks/useCDPLTVEngine';
import { useCDPPopulationDetail } from '@/hooks/useCDPPopulations';
import { useCDPTierData, useCDPRFMData } from '@/hooks/useCDPTierData';
import { SegmentSelector, SelectedSegment } from './SegmentSelector';
import { cn } from '@/lib/utils';
function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '0';
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  }
  if (value >= 1_000_000) {
    // Show 1 decimal for millions to avoid rounding confusion
    const formatted = (value / 1_000_000).toFixed(1);
    // Remove trailing .0 for cleaner display
    return formatted.endsWith('.0') ? `${parseInt(formatted)}M` : `${formatted}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString('vi-VN');
}

function safeNumber(value: number | null | undefined): number {
  return value ?? 0;
}

interface BenchmarkBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  isYours?: boolean;
}

function BenchmarkBar({ label, value, maxValue, color, isYours }: BenchmarkBarProps) {
  const percent = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={cn(isYours && "font-medium")}>{label}</span>
        <span className={cn("font-medium", isYours && "text-primary")}>{formatCurrency(value)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full transition-all rounded-full", color)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function LTVOverview() {
  const [selectedSegment, setSelectedSegment] = useState<SelectedSegment>({
    id: 'all',
    name: 'Tất cả khách hàng',
    type: 'all',
  });

  const { data: summary, isLoading: summaryLoading } = useLTVSummary();
  const { data: activeModel, isLoading: modelLoading } = useActiveLTVModel();
  const { data: realizedData, isLoading: realizedLoading } = useRealizedRevenue();
  
  // For custom segments/populations - use population detail
  const populationId = selectedSegment.type === 'segment' || selectedSegment.type === 'cohort' 
    ? selectedSegment.id 
    : undefined;
  const { data: populationDetail, isLoading: populationLoading } = useCDPPopulationDetail(populationId);
  
  // For tiers - extract tier label from ID (e.g., "tier-REST" -> "REST")
  const tierLabel = selectedSegment.type === 'tier' 
    ? selectedSegment.id.replace('tier-', '') 
    : undefined;
  const { data: tierFilterData, isLoading: tierLoading } = useCDPTierData(tierLabel);
  
  // For RFM segments - extract RFM name from ID (e.g., "rfm-champions" -> "Champions")
  const rfmSegment = selectedSegment.type === 'rfm' 
    ? selectedSegment.name
    : undefined;
  const { data: rfmFilterData, isLoading: rfmLoading } = useCDPRFMData(rfmSegment);

  const isLoading = summaryLoading || modelLoading || realizedLoading || 
    (selectedSegment.type === 'tier' && tierLoading) ||
    (selectedSegment.type === 'rfm' && rfmLoading) ||
    ((selectedSegment.type === 'segment' || selectedSegment.type === 'cohort') && populationLoading);

  const isFiltered = selectedSegment.type !== 'all';

  // Use filtered data based on segment type - MUST be called before any early returns
  const displayData = useMemo(() => {
    // If still loading or no summary, return defaults
    if (!summary) {
      return {
        totalCustomers: 0,
        totalEquity12m: 0,
        realizedRevenue: 0,
      };
    }

    // Tier filtering
    if (selectedSegment.type === 'tier' && tierFilterData) {
      return {
        totalCustomers: tierFilterData.customerCount,
        totalEquity12m: tierFilterData.estimatedEquity,
        realizedRevenue: tierFilterData.totalRevenue,
      };
    }
    
    // RFM filtering
    if (selectedSegment.type === 'rfm' && rfmFilterData) {
      return {
        totalCustomers: rfmFilterData.customerCount,
        totalEquity12m: rfmFilterData.estimatedEquity,
        realizedRevenue: rfmFilterData.totalRevenue,
      };
    }
    
    // Custom segment/cohort filtering
    if ((selectedSegment.type === 'segment' || selectedSegment.type === 'cohort') && populationDetail) {
      return {
        totalCustomers: populationDetail.customerCount,
        totalEquity12m: populationDetail.estimatedEquity,
        realizedRevenue: populationDetail.totalRevenue,
      };
    }
    
    // Default: all customers
    return {
      totalCustomers: safeNumber(summary.total_customers),
      totalEquity12m: safeNumber(summary.total_equity_12m),
      realizedRevenue: safeNumber(realizedData?.realized_revenue),
    };
  }, [selectedSegment, tierFilterData, rfmFilterData, populationDetail, summary, realizedData]);

  // Early returns AFTER all hooks
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!summary) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Chưa có dữ liệu LTV</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Cần có dữ liệu khách hàng và đơn hàng để tính toán LTV. 
            Hãy đảm bảo đã import dữ liệu từ các nguồn.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalEquity12m = displayData.totalEquity12m;
  const atRiskEquity = safeNumber(summary.at_risk_equity);
  const atRiskPercent = totalEquity12m > 0 
    ? (atRiskEquity / totalEquity12m) * 100 
    : 0;

  const summaryTierData = [
    { tier: 'Platinum', count: safeNumber(summary.platinum_count), color: 'bg-violet-500' },
    { tier: 'Gold', count: safeNumber(summary.gold_count), color: 'bg-amber-500' },
    { tier: 'Silver', count: safeNumber(summary.silver_count), color: 'bg-slate-400' },
    { tier: 'Bronze', count: safeNumber(summary.bronze_count), color: 'bg-orange-600' },
  ];

  const totalTierCount = summaryTierData.reduce((sum, t) => sum + t.count, 0);
  const totalCustomers = displayData.totalCustomers;
  const atRiskCount = safeNumber(summary.at_risk_count);

  // LOGIC ĐÚNG:
  // - Tổng tiềm năng = Đã thu + Còn lại (Equity 12m)
  // - Đã thu = Doanh thu THẬT từ tất cả orders đã thực hiện (data thật)
  // - Còn lại = Equity 12m = Dự báo giá trị tương lai (có thể thu thêm)
  
  const realizedRevenue = displayData.realizedRevenue;
  const remainingPotential = totalEquity12m;
  const totalPotentialValue = realizedRevenue + remainingPotential;
  
  const realizedPercent = totalPotentialValue > 0 
    ? (realizedRevenue / totalPotentialValue) * 100 
    : 0;

  // Tính CLV đúng = Tổng tiềm năng / Số KH (bao gồm cả đã thu + còn lại)
  const avgCLVTotal = totalCustomers > 0 
    ? totalPotentialValue / totalCustomers 
    : 0;

  const avgRealizedPerKH = totalCustomers > 0 
    ? realizedRevenue / totalCustomers 
    : 0;

  const avgRemainingPerKH = totalCustomers > 0 
    ? remainingPotential / totalCustomers 
    : 0;

  return (
    <div className="space-y-6">
      {/* Segment Selector */}
      <div className="flex items-center justify-between">
        <SegmentSelector value={selectedSegment} onChange={setSelectedSegment} />
        {isFiltered && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Đang lọc: {selectedSegment.name}
          </Badge>
        )}
      </div>

      {/* Hero Card - Customer Value Overview */}
      <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                {isFiltered ? `Giá trị: ${selectedSegment.name}` : 'Tổng quan Giá trị Khách hàng'}
              </CardTitle>
            </div>
            <Badge variant="outline" className="bg-background">
              {totalCustomers.toLocaleString()} khách hàng
            </Badge>
          </div>
          <CardDescription>
            {isFiltered 
              ? `Phân tích CLV cho nhóm "${selectedSegment.name}"`
              : 'Tổng tiềm năng = Đã thu + Còn có thể thu (12 tháng tới)'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Potential Value */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tổng tiềm năng KH</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalPotentialValue)}</p>
              <p className="text-xs text-muted-foreground">Đã thu + Còn lại</p>
            </div>
            
            {/* Average CLV per customer - CORRECT calculation */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">CLV Trung bình / KH</p>
              <p className="text-2xl font-bold">{formatCurrency(avgCLVTotal)}</p>
              <p className="text-xs text-muted-foreground">
                Đã thu: {formatCurrency(avgRealizedPerKH)} | Còn: {formatCurrency(avgRemainingPerKH)}
              </p>
            </div>
            
            {/* Realized - Already collected */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <p className="text-xs text-muted-foreground">Đã thu (thực tế)</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(realizedRevenue)}</p>
              <p className="text-xs text-muted-foreground">Dữ liệu thật từ orders</p>
            </div>
            
            {/* Remaining - Can still collect */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <p className="text-xs text-muted-foreground">Còn có thể thu</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(remainingPotential)}</p>
              <p className="text-xs text-muted-foreground">Dự báo 12 tháng tới</p>
            </div>
          </div>

          {/* Progress Bar - Realized vs Remaining */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tỷ lệ khai thác giá trị khách hàng</span>
              <span className="font-medium">{realizedPercent.toFixed(1)}% đã thu</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-green-500 transition-all"
                style={{ width: `${realizedPercent}%` }}
              />
              <div 
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${100 - realizedPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Đã thu: {formatCurrency(realizedRevenue)}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                Còn lại: {formatCurrency(remainingPotential)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CLV Breakdown per Customer */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Phân tích CLV / Khách hàng</CardTitle>
          </div>
          <CardDescription>
            So sánh giá trị khai thác với benchmark ngành
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CLV Breakdown Bars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Đã khai thác / KH */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Đã khai thác / KH</span>
                </div>
                <span className="text-lg font-bold text-green-600">{formatCurrency(avgRealizedPerKH)}</span>
              </div>
              <Progress value={avgCLVTotal > 0 ? (avgRealizedPerKH / avgCLVTotal) * 100 : 0} className="h-2 bg-green-100" />
              <p className="text-xs text-muted-foreground">
                {realizedPercent.toFixed(1)}% tổng CLV đã thu
              </p>
            </div>

            {/* Còn lại / KH */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium">Tiềm năng còn lại / KH</span>
                </div>
                <span className="text-lg font-bold text-amber-600">{formatCurrency(avgRemainingPerKH)}</span>
              </div>
              <Progress value={avgCLVTotal > 0 ? (avgRemainingPerKH / avgCLVTotal) * 100 : 0} className="h-2 bg-amber-100" />
              <p className="text-xs text-muted-foreground">
                {(100 - realizedPercent).toFixed(1)}% còn có thể thu (12 tháng tới)
              </p>
            </div>

            {/* Tổng CLV / KH */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Tổng CLV / KH</span>
                </div>
                <span className="text-lg font-bold text-primary">{formatCurrency(avgCLVTotal)}</span>
              </div>
              <Progress value={100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                = Đã khai thác + Tiềm năng còn lại
              </p>
            </div>
          </div>

          {/* Industry Benchmark Comparison */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              So sánh với Benchmark ngành
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Benchmark bars */}
              <div className="space-y-3">
                <BenchmarkBar 
                  label="CLV của bạn" 
                  value={avgCLVTotal} 
                  maxValue={avgCLVTotal * 1.5} 
                  color="bg-primary" 
                  isYours={true}
                />
                <BenchmarkBar 
                  label="Benchmark E-commerce VN" 
                  value={2500000} 
                  maxValue={avgCLVTotal * 1.5} 
                  color="bg-muted-foreground/50"
                />
                <BenchmarkBar 
                  label="Top 25% ngành" 
                  value={4500000} 
                  maxValue={avgCLVTotal * 1.5} 
                  color="bg-muted-foreground/30"
                />
              </div>

              {/* Insights */}
              <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                <p className="text-sm font-medium">Nhận xét</p>
                {avgCLVTotal >= 4500000 ? (
                  <div className="flex items-start gap-2 text-sm text-green-700">
                    <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>CLV của bạn thuộc <strong>Top 25%</strong> ngành. Tiếp tục duy trì!</span>
                  </div>
                ) : avgCLVTotal >= 2500000 ? (
                  <div className="flex items-start gap-2 text-sm text-amber-700">
                    <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>CLV của bạn <strong>cao hơn trung bình</strong> ngành. Còn tiềm năng tăng {formatCurrency(4500000 - avgCLVTotal)}/KH để đạt Top 25%.</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-sm text-red-700">
                    <TrendingDown className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>CLV của bạn <strong>thấp hơn trung bình</strong> ngành. Cần cải thiện retention và AOV.</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  * Benchmark dựa trên dữ liệu tham khảo E-commerce Việt Nam 2024
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeModel && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm">
                Đang sử dụng: <span className="font-medium">{activeModel.model_name}</span>
              </span>
              <Badge variant="outline" className="text-xs">
                Retention Y1: {(activeModel.retention_year_1 * 100).toFixed(0)}%
              </Badge>
              <Badge variant="outline" className="text-xs">
                Discount: {(activeModel.discount_rate * 100).toFixed(0)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Tổng Equity 12 tháng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_equity_12m)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCustomers.toLocaleString()} khách hàng
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tổng Equity 24 tháng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_equity_24m)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Dự báo với mô hình hiện tại
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              LTV Trung bình
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.avg_ltv_12m)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Median: {formatCurrency(summary.median_ltv_12m)}
            </p>
          </CardContent>
        </Card>

        <Card className={atRiskPercent > 20 ? 'border-destructive/50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${atRiskPercent > 20 ? 'text-destructive' : ''}`} />
              Giá trị Rủi ro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.at_risk_equity)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {atRiskPercent.toFixed(1)}% tổng equity ({atRiskCount} KH)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phân bổ theo Tier</CardTitle>
          <CardDescription>
            Dựa trên LTV 24 tháng của khách hàng
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {summaryTierData.map((tier) => {
            const percent = totalTierCount > 0 ? (tier.count / totalTierCount) * 100 : 0;
            return (
              <div key={tier.tier} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                    <span>{tier.tier}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {tier.count.toLocaleString()} ({percent.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={percent} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Formula Explanation */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Công thức LTV</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-xs bg-background px-2 py-1 rounded">
            LTV = Σ (BaseValue × Retention<sub>t</sub> × AOV_Growth<sub>t</sub>) / (1 + DiscountRate)<sup>t</sup>
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            BaseValue được tính từ gross profit thực tế, nhân với retention curve và growth rate, 
            sau đó chiết khấu về giá trị hiện tại (NPV).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
