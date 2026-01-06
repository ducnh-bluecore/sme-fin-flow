import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, Percent, 
  Calculator, RefreshCw, Save, Sparkles, ShoppingCart, Megaphone,
  Package, Receipt, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useChannelPL, useAvailableChannels, ChannelPLSummary } from '@/hooks/useChannelPL';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Area
} from 'recharts';

const CHANNEL_COLORS: Record<string, string> = {
  SHOPEE: '#EE4D2D',
  TIKTOK: '#000000',
  LAZADA: '#0F146D',
  HARAVAN: '#2196F3',
  'NHANH.VN': '#4CAF50',
  NHANH: '#4CAF50',
  DEFAULT: '#6366f1',
};

const CHANNEL_ICONS: Record<string, string> = {
  SHOPEE: '🛒',
  TIKTOK: '🎵',
  LAZADA: '🛍️',
  HARAVAN: '🏪',
  'NHANH.VN': '⚡',
  NHANH: '⚡',
};

interface WhatIfParams {
  // Sales
  orderVolumeChange: number;     // % change in order volume
  aovChange: number;             // % change in AOV
  // Platform fees (% point changes)
  commissionChange: number;      // Hoa hồng sàn
  serviceFeeChange: number;      // Phí dịch vụ sàn
  paymentFeeChange: number;      // Phí thanh toán
  shippingSubsidyChange: number; // Phí hỗ trợ vận chuyển
  couponSubsidyChange: number;   // Phí hỗ trợ coupon/voucher
  platformAdsChange: number;     // Phí quảng cáo nội sàn
  // Costs
  cogsChange: number;            // % change in COGS per order
  externalAdsChange: number;     // % change in external ads spending
}

const DEFAULT_PARAMS: WhatIfParams = {
  orderVolumeChange: 0,
  aovChange: 0,
  commissionChange: 0,
  serviceFeeChange: 0,
  paymentFeeChange: 0,
  shippingSubsidyChange: 0,
  couponSubsidyChange: 0,
  platformAdsChange: 0,
  cogsChange: 0,
  externalAdsChange: 0,
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  );
}

function calculateWhatIf(
  baseData: ChannelPLSummary,
  params: WhatIfParams
) {
  // Calculate new values based on parameters
  const volumeMultiplier = 1 + params.orderVolumeChange / 100;
  const aovMultiplier = 1 + params.aovChange / 100;
  const cogsMultiplier = 1 + params.cogsChange / 100;
  const externalAdsMultiplier = 1 + params.externalAdsChange / 100;

  // New order count
  const newOrderCount = Math.round(baseData.orderCount * volumeMultiplier);
  
  // New AOV
  const newAov = baseData.avgOrderValue * aovMultiplier;
  
  // New revenue
  const newRevenue = newOrderCount * newAov;
  
  // Calculate fee rates from base data
  const baseCommissionRate = baseData.totalRevenue > 0 
    ? (baseData.feeBreakdown.commission / baseData.totalRevenue) * 100 
    : 2; // default 2%
  const baseServiceFeeRate = baseData.totalRevenue > 0 
    ? (baseData.feeBreakdown.platform / baseData.totalRevenue) * 100 
    : 1; // default 1%
  const basePaymentRate = baseData.totalRevenue > 0 
    ? (baseData.feeBreakdown.payment / baseData.totalRevenue) * 100 
    : 2; // default 2%
  const baseShippingSubsidyRate = baseData.totalRevenue > 0 
    ? (baseData.feeBreakdown.shippingSubsidy / baseData.totalRevenue) * 100 
    : 1; // default 1%
  const baseCouponSubsidyRate = baseData.totalRevenue > 0 
    ? (baseData.feeBreakdown.couponSubsidy / baseData.totalRevenue) * 100 
    : 0.5; // default 0.5%
  const basePlatformAdsRate = baseData.totalRevenue > 0 
    ? (baseData.feeBreakdown.platformAds / baseData.totalRevenue) * 100 
    : 2; // default 2%

  // Apply fee changes (percentage point changes)
  const newCommissionRate = Math.max(0, baseCommissionRate + params.commissionChange);
  const newServiceFeeRate = Math.max(0, baseServiceFeeRate + params.serviceFeeChange);
  const newPaymentRate = Math.max(0, basePaymentRate + params.paymentFeeChange);
  const newShippingSubsidyRate = Math.max(0, baseShippingSubsidyRate + params.shippingSubsidyChange);
  const newCouponSubsidyRate = Math.max(0, baseCouponSubsidyRate + params.couponSubsidyChange);
  const newPlatformAdsRate = Math.max(0, basePlatformAdsRate + params.platformAdsChange);

  // Calculate new fees
  const newCommissionFee = newRevenue * (newCommissionRate / 100);
  const newServiceFee = newRevenue * (newServiceFeeRate / 100);
  const newPaymentFee = newRevenue * (newPaymentRate / 100);
  const newShippingSubsidy = newRevenue * (newShippingSubsidyRate / 100);
  const newCouponSubsidy = newRevenue * (newCouponSubsidyRate / 100);
  const newPlatformAds = newRevenue * (newPlatformAdsRate / 100);
  
  // Legacy shipping fee from base data (proportional)
  const baseShippingRate = baseData.totalRevenue > 0 
    ? (baseData.feeBreakdown.shipping / baseData.totalRevenue) * 100 
    : 0;
  const newShippingFee = newRevenue * (baseShippingRate / 100);
  
  const newTotalFees = newCommissionFee + newServiceFee + newPaymentFee + 
    newShippingSubsidy + newCouponSubsidy + newPlatformAds + newShippingFee;

  // New COGS (per order basis)
  const baseCogPerOrder = baseData.orderCount > 0 
    ? baseData.totalCogs / baseData.orderCount 
    : 0;
  const newCogPerOrder = baseCogPerOrder * cogsMultiplier;
  const newCogs = newOrderCount * newCogPerOrder;

  // External Ads (separate from platform ads)
  const newExternalAds = baseData.totalAds * externalAdsMultiplier;

  // Calculate profits
  const newGrossProfit = newRevenue - newTotalFees - newCogs;
  const newOperatingProfit = newGrossProfit - newExternalAds;

  // Calculate margins
  const newGrossMargin = newRevenue > 0 ? (newGrossProfit / newRevenue) * 100 : 0;
  const newOperatingMargin = newRevenue > 0 ? (newOperatingProfit / newRevenue) * 100 : 0;

  return {
    // New values
    orderCount: newOrderCount,
    avgOrderValue: newAov,
    totalRevenue: newRevenue,
    totalFees: newTotalFees,
    totalCogs: newCogs,
    totalAds: newExternalAds,
    grossProfit: newGrossProfit,
    operatingProfit: newOperatingProfit,
    grossMargin: newGrossMargin,
    operatingMargin: newOperatingMargin,
    feeBreakdown: {
      commission: newCommissionFee,
      serviceFee: newServiceFee,
      payment: newPaymentFee,
      shipping: newShippingFee,
      shippingSubsidy: newShippingSubsidy,
      couponSubsidy: newCouponSubsidy,
      platformAds: newPlatformAds,
    },
    rates: {
      commissionRate: newCommissionRate,
      serviceFeeRate: newServiceFeeRate,
      paymentRate: newPaymentRate,
      shippingSubsidyRate: newShippingSubsidyRate,
      couponSubsidyRate: newCouponSubsidyRate,
      platformAdsRate: newPlatformAdsRate,
    },
    // Changes from base
    changes: {
      revenue: newRevenue - baseData.totalRevenue,
      revenuePercent: baseData.totalRevenue > 0 
        ? ((newRevenue - baseData.totalRevenue) / baseData.totalRevenue) * 100 
        : 0,
      grossProfit: newGrossProfit - baseData.grossProfit,
      grossProfitPercent: baseData.grossProfit !== 0 
        ? ((newGrossProfit - baseData.grossProfit) / Math.abs(baseData.grossProfit)) * 100 
        : 0,
      operatingProfit: newOperatingProfit - baseData.operatingProfit,
      operatingProfitPercent: baseData.operatingProfit !== 0 
        ? ((newOperatingProfit - baseData.operatingProfit) / Math.abs(baseData.operatingProfit)) * 100 
        : 0,
    }
  };
}

function ChangeIndicator({ value, format = 'currency' }: { value: number; format?: 'currency' | 'percent' }) {
  if (value === 0) return null;
  
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isPositive ? 'text-green-500' : 'text-red-500';
  
  return (
    <span className={`flex items-center gap-1 text-sm ${color}`}>
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}
      {format === 'currency' ? formatCurrency(value) : `${value.toFixed(1)}%`}
    </span>
  );
}

function ComparisonCard({
  title,
  icon: Icon,
  baseValue,
  newValue,
  change,
  format = 'currency',
}: {
  title: string;
  icon: React.ElementType;
  baseValue: number;
  newValue: number;
  change: number;
  format?: 'currency' | 'percent';
}) {
  const isPositive = change >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={change !== 0 ? (isPositive ? 'border-green-500/50' : 'border-red-500/50') : ''}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">
                  {format === 'currency' ? formatCurrency(newValue) : `${newValue.toFixed(1)}%`}
                </span>
                {change !== 0 && (
                  <ChangeIndicator value={change} format={format === 'currency' ? 'currency' : 'percent'} />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Hiện tại: {format === 'currency' ? formatCurrency(baseValue) : `${baseValue.toFixed(1)}%`}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <Icon className={`h-4 w-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ParamSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '%',
  description,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-20 h-8 text-right text-sm"
            min={min}
            max={max}
            step={step}
          />
          <span className="text-sm text-muted-foreground w-8">{unit}</span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export default function ChannelWhatIfPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const channelName = channelId?.toUpperCase() || '';
  
  const { data: plData, isLoading, error } = useChannelPL(channelName, 12);
  const { data: availableChannels } = useAvailableChannels();

  const [params, setParams] = useState<WhatIfParams>(DEFAULT_PARAMS);

  const channelColor = CHANNEL_COLORS[channelName] || CHANNEL_COLORS.DEFAULT;
  const channelIcon = CHANNEL_ICONS[channelName] || '📊';

  const whatIfResults = useMemo(() => {
    if (!plData) return null;
    return calculateWhatIf(plData, params);
  }, [plData, params]);

  const updateParam = (key: keyof WhatIfParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const resetParams = () => {
    setParams(DEFAULT_PARAMS);
  };

  const hasChanges = Object.values(params).some(v => v !== 0);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !plData || !whatIfResults) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg text-muted-foreground">Không có dữ liệu cho kênh {channelName}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/channel-analytics')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  // Prepare comparison chart data
  const comparisonData = [
    {
      name: 'Doanh thu',
      base: plData.totalRevenue,
      scenario: whatIfResults.totalRevenue,
    },
    {
      name: 'Phí kênh',
      base: plData.totalFees,
      scenario: whatIfResults.totalFees,
    },
    {
      name: 'COGS',
      base: plData.totalCogs,
      scenario: whatIfResults.totalCogs,
    },
    {
      name: 'Ads',
      base: plData.totalAds,
      scenario: whatIfResults.totalAds,
    },
    {
      name: 'LN gộp',
      base: plData.grossProfit,
      scenario: whatIfResults.grossProfit,
    },
    {
      name: 'LN hoạt động',
      base: plData.operatingProfit,
      scenario: whatIfResults.operatingProfit,
    },
  ];

  return (
    <>
      <Helmet>
        <title>{channelName} What-If Analysis | CFO Dashboard</title>
        <meta name="description" content={`Phân tích What-If cho kênh ${channelName}`} />
      </Helmet>

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/channel/${channelId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{channelIcon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold" style={{ color: channelColor }}>
                    {channelName}
                  </h1>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    What-If
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Mô phỏng kịch bản kinh doanh
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" onClick={resetParams}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
            {availableChannels?.map(ch => (
              <Button
                key={ch}
                variant={ch === channelName ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  resetParams();
                  navigate(`/channel/${ch.toLowerCase()}/whatif`);
                }}
                style={ch === channelName ? { backgroundColor: channelColor } : undefined}
              >
                {CHANNEL_ICONS[ch] || '📊'}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Parameters */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Tham số mô phỏng
              </CardTitle>
              <CardDescription>
                Điều chỉnh các tham số để xem tác động
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sales Parameters */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  Doanh số
                </h4>
                <ParamSlider
                  label="Số lượng đơn"
                  value={params.orderVolumeChange}
                  onChange={(v) => updateParam('orderVolumeChange', v)}
                  min={-50}
                  max={100}
                  step={5}
                  description="Thay đổi số lượng đơn hàng"
                />
                <ParamSlider
                  label="Giá trị đơn TB"
                  value={params.aovChange}
                  onChange={(v) => updateParam('aovChange', v)}
                  min={-30}
                  max={50}
                  step={5}
                  description="Thay đổi giá trị trung bình"
                />
              </div>

              <Separator />

              {/* Commission & Service Fee */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-red-500" />
                  Hoa hồng & Phí dịch vụ
                </h4>
                <ParamSlider
                  label="Hoa hồng sàn"
                  value={params.commissionChange}
                  onChange={(v) => updateParam('commissionChange', v)}
                  min={-5}
                  max={5}
                  step={0.25}
                  unit="%pt"
                  description="Tỷ lệ % chiết khấu hoa hồng"
                />
                <ParamSlider
                  label="Phí dịch vụ"
                  value={params.serviceFeeChange}
                  onChange={(v) => updateParam('serviceFeeChange', v)}
                  min={-3}
                  max={3}
                  step={0.25}
                  unit="%pt"
                  description="Phí dịch vụ giao dịch"
                />
                <ParamSlider
                  label="Phí thanh toán"
                  value={params.paymentFeeChange}
                  onChange={(v) => updateParam('paymentFeeChange', v)}
                  min={-3}
                  max={3}
                  step={0.25}
                  unit="%pt"
                  description="Phí cổng thanh toán"
                />
              </div>

              <Separator />

              {/* Subsidies */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-orange-500" />
                  Hỗ trợ & Khuyến mãi
                </h4>
                <ParamSlider
                  label="Hỗ trợ vận chuyển"
                  value={params.shippingSubsidyChange}
                  onChange={(v) => updateParam('shippingSubsidyChange', v)}
                  min={-3}
                  max={3}
                  step={0.25}
                  unit="%pt"
                  description="Phí sàn hỗ trợ ship"
                />
                <ParamSlider
                  label="Hỗ trợ Coupon/Voucher"
                  value={params.couponSubsidyChange}
                  onChange={(v) => updateParam('couponSubsidyChange', v)}
                  min={-3}
                  max={3}
                  step={0.25}
                  unit="%pt"
                  description="Phí tham gia voucher sàn"
                />
                <ParamSlider
                  label="Ads nội sàn"
                  value={params.platformAdsChange}
                  onChange={(v) => updateParam('platformAdsChange', v)}
                  min={-5}
                  max={10}
                  step={0.5}
                  unit="%pt"
                  description="Chi phí quảng cáo trong sàn"
                />
              </div>

              <Separator />

              {/* Cost Parameters */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-yellow-500" />
                  Chi phí khác
                </h4>
                <ParamSlider
                  label="COGS/đơn"
                  value={params.cogsChange}
                  onChange={(v) => updateParam('cogsChange', v)}
                  min={-30}
                  max={30}
                  step={5}
                  description="Thay đổi giá vốn mỗi đơn"
                />
                <ParamSlider
                  label="Ads ngoài sàn"
                  value={params.externalAdsChange}
                  onChange={(v) => updateParam('externalAdsChange', v)}
                  min={-50}
                  max={100}
                  step={10}
                  description="Chi phí quảng cáo Facebook, Google..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* KPI Comparison Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ComparisonCard
                title="Doanh thu"
                icon={DollarSign}
                baseValue={plData.totalRevenue}
                newValue={whatIfResults.totalRevenue}
                change={whatIfResults.changes.revenue}
              />
              <ComparisonCard
                title="Lợi nhuận gộp"
                icon={TrendingUp}
                baseValue={plData.grossProfit}
                newValue={whatIfResults.grossProfit}
                change={whatIfResults.changes.grossProfit}
              />
              <ComparisonCard
                title="LN hoạt động"
                icon={BarChart3}
                baseValue={plData.operatingProfit}
                newValue={whatIfResults.operatingProfit}
                change={whatIfResults.changes.operatingProfit}
              />
              <ComparisonCard
                title="Margin gộp"
                icon={Percent}
                baseValue={plData.grossMargin}
                newValue={whatIfResults.grossMargin}
                change={whatIfResults.grossMargin - plData.grossMargin}
                format="percent"
              />
              <ComparisonCard
                title="Operating Margin"
                icon={Percent}
                baseValue={plData.operatingMargin}
                newValue={whatIfResults.operatingMargin}
                change={whatIfResults.operatingMargin - plData.operatingMargin}
                format="percent"
              />
              <ComparisonCard
                title="Số đơn hàng"
                icon={ShoppingCart}
                baseValue={plData.orderCount}
                newValue={whatIfResults.orderCount}
                change={whatIfResults.orderCount - plData.orderCount}
              />
            </div>

            {/* Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle>So sánh kịch bản</CardTitle>
                <CardDescription>
                  Hiện tại vs Kịch bản mới
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={comparisonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v, true)} />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value), 
                        name === 'base' ? 'Hiện tại' : 'Kịch bản'
                      ]}
                    />
                    <Legend formatter={(value) => value === 'base' ? 'Hiện tại' : 'Kịch bản'} />
                    <Bar dataKey="base" fill="#94a3b8" name="base" />
                    <Bar dataKey="scenario" fill={channelColor} name="scenario" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Detailed Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết thay đổi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Chỉ số</th>
                        <th className="text-right p-3">Hiện tại</th>
                        <th className="text-right p-3">Kịch bản</th>
                        <th className="text-right p-3">Thay đổi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-3 font-medium">Số đơn hàng</td>
                        <td className="text-right p-3">{plData.orderCount.toLocaleString()}</td>
                        <td className="text-right p-3">{whatIfResults.orderCount.toLocaleString()}</td>
                        <td className="text-right p-3">
                          <ChangeIndicator 
                            value={whatIfResults.orderCount - plData.orderCount} 
                            format="currency" 
                          />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium">AOV</td>
                        <td className="text-right p-3">{formatCurrency(plData.avgOrderValue)}</td>
                        <td className="text-right p-3">{formatCurrency(whatIfResults.avgOrderValue)}</td>
                        <td className="text-right p-3">
                          <ChangeIndicator 
                            value={whatIfResults.avgOrderValue - plData.avgOrderValue} 
                            format="currency" 
                          />
                        </td>
                      </tr>
                      <tr className="border-b bg-green-500/5">
                        <td className="p-3 font-medium text-green-600">Doanh thu</td>
                        <td className="text-right p-3">{formatCurrency(plData.totalRevenue)}</td>
                        <td className="text-right p-3">{formatCurrency(whatIfResults.totalRevenue)}</td>
                        <td className="text-right p-3">
                          <ChangeIndicator value={whatIfResults.changes.revenue} format="currency" />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium text-red-500">Phí kênh</td>
                        <td className="text-right p-3">-{formatCurrency(plData.totalFees)}</td>
                        <td className="text-right p-3">-{formatCurrency(whatIfResults.totalFees)}</td>
                        <td className="text-right p-3">
                          <ChangeIndicator 
                            value={-(whatIfResults.totalFees - plData.totalFees)} 
                            format="currency" 
                          />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium text-yellow-600">COGS</td>
                        <td className="text-right p-3">-{formatCurrency(plData.totalCogs)}</td>
                        <td className="text-right p-3">-{formatCurrency(whatIfResults.totalCogs)}</td>
                        <td className="text-right p-3">
                          <ChangeIndicator 
                            value={-(whatIfResults.totalCogs - plData.totalCogs)} 
                            format="currency" 
                          />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium text-purple-500">Chi phí Ads</td>
                        <td className="text-right p-3">-{formatCurrency(plData.totalAds)}</td>
                        <td className="text-right p-3">-{formatCurrency(whatIfResults.totalAds)}</td>
                        <td className="text-right p-3">
                          <ChangeIndicator 
                            value={-(whatIfResults.totalAds - plData.totalAds)} 
                            format="currency" 
                          />
                        </td>
                      </tr>
                      <tr className="border-b bg-primary/5">
                        <td className="p-3 font-bold">Lợi nhuận gộp</td>
                        <td className="text-right p-3 font-bold">{formatCurrency(plData.grossProfit)}</td>
                        <td className="text-right p-3 font-bold">{formatCurrency(whatIfResults.grossProfit)}</td>
                        <td className="text-right p-3">
                          <ChangeIndicator value={whatIfResults.changes.grossProfit} format="currency" />
                        </td>
                      </tr>
                      <tr className="bg-primary/10">
                        <td className="p-3 font-bold">LN hoạt động</td>
                        <td className="text-right p-3 font-bold">{formatCurrency(plData.operatingProfit)}</td>
                        <td className="text-right p-3 font-bold">{formatCurrency(whatIfResults.operatingProfit)}</td>
                        <td className="text-right p-3">
                          <ChangeIndicator value={whatIfResults.changes.operatingProfit} format="currency" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
