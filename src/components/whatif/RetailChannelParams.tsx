import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  Globe,
  ShoppingBag,
  Package,
  Truck,
  RotateCcw,
  Users,
  Megaphone,
  Building2,
  CreditCard,
  Percent,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
  CheckCircle,
  Wand2,
  Target,
  Calendar,
  DollarSign,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatVNDCompact } from '@/lib/formatters';
import { toast } from 'sonner';

export interface RetailChannelParams {
  // Channel Revenue Mix (%)
  channels: {
    offline: { enabled: boolean; revenueShare: number; growthRate: number };
    online: { enabled: boolean; revenueShare: number; growthRate: number };
    shopee: { enabled: boolean; revenueShare: number; growthRate: number };
    lazada: { enabled: boolean; revenueShare: number; growthRate: number };
    tiki: { enabled: boolean; revenueShare: number; growthRate: number };
    tiktok: { enabled: boolean; revenueShare: number; growthRate: number };
  };
  
  // Cost Structure by Channel (%)
  costs: {
    cogsRate: number; // Base COGS rate
    offlineRentCost: number; // Rent per store
    onlineMarketingCost: number; // Marketing % of online revenue (legacy - fallback)
    marketingAdsCost: { // Ads cost % per channel (channel-specific ads)
      offline: number; // % of offline revenue for local ads
      online: number; // % of website/app revenue for digital ads
      shopee: number;
      lazada: number;
      tiki: number;
      tiktok: number;
    };
    // General marketing costs - branding & multi-channel ads (% of total revenue)
    generalMarketingCost: {
      facebookAds: number; // Facebook/Instagram Ads
      googleAds: number; // Google Ads, YouTube
      otherAds: number; // Influencer, KOL, Affiliate, PR, etc.
    };
    marketplaceCommission: { // Commission rates per platform
      shopee: number;
      lazada: number;
      tiki: number;
      tiktok: number;
    };
    shippingCostPerOrder: number; // VND per order
    packagingCostPerOrder: number; // VND per order
  };
  
  // Operational Metrics
  operations: {
    returnRate: number; // % of orders returned
    returnCostPercent: number; // Cost as % of returned item value
    avgOrderValue: number; // VND
    conversionRate: number; // %
    customerAcquisitionCost: number; // VND per customer
    repeatPurchaseRate: number; // %
  };
  
  // Staff & Overhead
  overhead: {
    offlineStaffPerStore: number;
    avgStaffCost: number; // VND/month
    warehouseRent: number; // VND/month
    techInfraCost: number; // VND/month
    numberOfStores: number;
  };
  
  // Store Expansion (Offline channel)
  expansion: {
    enableExpansion: boolean;
    targetStores: number;
    expansionMonths: number; // Timeline to reach target
    setupCostPerStore: number; // Chi phí mở cửa hàng mới
    revenuePerStore: number; // Doanh thu dự kiến mỗi cửa hàng/năm
    rampUpMonths: number; // Thời gian để đạt 100% doanh thu
  };
}

export const defaultRetailParams: RetailChannelParams = {
  channels: {
    offline: { enabled: true, revenueShare: 40, growthRate: 5 },
    online: { enabled: true, revenueShare: 20, growthRate: 15 },
    shopee: { enabled: true, revenueShare: 15, growthRate: 20 },
    lazada: { enabled: true, revenueShare: 10, growthRate: 10 },
    tiki: { enabled: true, revenueShare: 8, growthRate: 5 },
    tiktok: { enabled: true, revenueShare: 7, growthRate: 30 },
  },
  costs: {
    cogsRate: 65,
    offlineRentCost: 50_000_000,
    onlineMarketingCost: 8, // Legacy fallback
    marketingAdsCost: {
      offline: 2, // Local ads, banners, promotions
      online: 10, // Google Ads, Facebook Ads, SEO for website traffic
      shopee: 8, // Shopee Ads
      lazada: 10, // Lazada Ads
      tiki: 5, // Tiki Ads
      tiktok: 15, // TikTok Ads - typically higher
    },
    generalMarketingCost: {
      facebookAds: 3, // 3% of total revenue for Facebook/Instagram branding
      googleAds: 2, // 2% of total revenue for Google/YouTube branding
      otherAds: 1, // 1% of total revenue for Influencer, KOL, PR, etc.
    },
    marketplaceCommission: {
      shopee: 8,
      lazada: 10,
      tiki: 12,
      tiktok: 5,
    },
    shippingCostPerOrder: 25_000,
    packagingCostPerOrder: 5_000,
  },
  operations: {
    returnRate: 5,
    returnCostPercent: 30,
    avgOrderValue: 350_000,
    conversionRate: 2.5,
    customerAcquisitionCost: 80_000,
    repeatPurchaseRate: 25,
  },
  overhead: {
    offlineStaffPerStore: 5,
    avgStaffCost: 12_000_000,
    warehouseRent: 80_000_000,
    techInfraCost: 20_000_000,
    numberOfStores: 5,
  },
  expansion: {
    enableExpansion: false,
    targetStores: 10,
    expansionMonths: 12,
    setupCostPerStore: 500_000_000,
    revenuePerStore: 2_400_000_000,
    rampUpMonths: 3,
  },
};

interface SliderControlProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description?: string;
  showTrend?: boolean;
  baseValue?: number;
  format?: 'number' | 'currency' | 'percent';
}

function SliderControl({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '%',
  description,
  showTrend = false,
  baseValue,
  format = 'number',
}: SliderControlProps) {
  const formatValue = (val: number) => {
    if (format === 'currency') return formatVNDCompact(val);
    if (format === 'percent') return `${val}%`;
    return val.toLocaleString('vi-VN');
  };

  const change = baseValue !== undefined ? value - baseValue : 0;
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showTrend && baseValue !== undefined && Math.abs(change) > 0.1 && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs px-1.5 py-0.5',
                isPositive && 'border-success/50 text-success bg-success/10',
                isNegative && 'border-destructive/50 text-destructive bg-destructive/10'
              )}
            >
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {isPositive ? '+' : ''}{format === 'currency' ? formatVNDCompact(change) : change.toFixed(1)}{unit !== 'đ' ? unit : ''}
            </Badge>
          )}
          <Input
            type="number"
            value={format === 'currency' ? value : value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-24 h-8 text-right text-sm"
          />
          <span className="text-xs text-muted-foreground w-6">{unit}</span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([val]) => onChange(val)}
        min={min}
        max={max}
        step={step}
        className="py-1"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{format === 'currency' ? formatVNDCompact(min) : min}{unit !== 'đ' ? unit : ''}</span>
        <span>{format === 'currency' ? formatVNDCompact(max) : max}{unit !== 'đ' ? unit : ''}</span>
      </div>
    </div>
  );
}

interface ChannelToggleProps {
  name: string;
  icon: React.ReactNode;
  color: string;
  enabled: boolean;
  revenueShare: number;
  growthRate: number;
  commission?: number;
  baseRevenue: number;
  onToggle: (enabled: boolean) => void;
  onShareChange: (share: number) => void;
  onGrowthChange: (growth: number) => void;
}

function ChannelToggle({
  name,
  icon,
  color,
  enabled,
  revenueShare,
  growthRate,
  commission,
  baseRevenue,
  onToggle,
  onShareChange,
  onGrowthChange,
}: ChannelToggleProps) {
  // Calculate channel revenue
  const channelBaseRevenue = baseRevenue * (revenueShare / 100);
  const channelProjectedRevenue = channelBaseRevenue * (1 + growthRate / 100);
  const revenueChange = channelProjectedRevenue - channelBaseRevenue;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen && enabled} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'p-3 rounded-lg border transition-all',
          enabled ? 'bg-card border-border' : 'bg-muted/30 border-transparent'
        )}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  enabled ? color : 'bg-muted'
                )}
              >
                {icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn('font-medium', !enabled && 'text-muted-foreground')}>{name}</span>
                  {commission !== undefined && enabled && (
                    <Badge variant="outline" className="text-xs">
                      Phí {commission}%
                    </Badge>
                  )}
                </div>
                {enabled && (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-foreground">{formatVNDCompact(channelProjectedRevenue)}</span>
                      {revenueChange !== 0 && (
                        <span className={cn(
                          'text-xs',
                          revenueChange > 0 ? 'text-success' : 'text-destructive'
                        )}>
                          ({revenueChange > 0 ? '+' : ''}{formatVNDCompact(revenueChange)})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Tỷ trọng: {revenueShare}%</span>
                      <span className={cn(growthRate > 0 ? 'text-success' : growthRate < 0 ? 'text-destructive' : '')}>
                        Tăng trưởng: {growthRate > 0 ? '+' : ''}{growthRate}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={enabled} onCheckedChange={onToggle} />
              {enabled && (isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            <SliderControl
              label="Tỷ trọng doanh thu"
              value={revenueShare}
              onChange={onShareChange}
              min={0}
              max={60}
              unit="%"
              description="Phần trăm doanh thu từ kênh này"
            />
            <SliderControl
              label="Tốc độ tăng trưởng"
              value={growthRate}
              onChange={onGrowthChange}
              min={-20}
              max={50}
              unit="%"
              description="Dự kiến tăng trưởng YoY"
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface RetailChannelParamsProps {
  params: RetailChannelParams;
  onChange: (params: RetailChannelParams) => void;
  baseRevenue: number;
}

export function RetailChannelParamsPanel({
  params,
  onChange,
  baseRevenue,
}: RetailChannelParamsProps) {
  const updateChannel = (
    channel: keyof RetailChannelParams['channels'],
    field: string,
    value: number | boolean
  ) => {
    onChange({
      ...params,
      channels: {
        ...params.channels,
        [channel]: {
          ...params.channels[channel],
          [field]: value,
        },
      },
    });
  };

  const updateCosts = (field: string, value: number) => {
    onChange({
      ...params,
      costs: {
        ...params.costs,
        [field]: value,
      },
    });
  };

  const updateMarketplaceCommission = (platform: string, value: number) => {
    onChange({
      ...params,
      costs: {
        ...params.costs,
        marketplaceCommission: {
          ...params.costs.marketplaceCommission,
          [platform]: value,
        },
      },
    });
  };

  const updateMarketingAdsCost = (channel: string, value: number) => {
    onChange({
      ...params,
      costs: {
        ...params.costs,
        marketingAdsCost: {
          ...params.costs.marketingAdsCost,
          [channel]: value,
        },
      },
    });
  };

  const updateGeneralMarketingCost = (source: string, value: number) => {
    onChange({
      ...params,
      costs: {
        ...params.costs,
        generalMarketingCost: {
          ...params.costs.generalMarketingCost,
          [source]: value,
        },
      },
    });
  };

  const updateOperations = (field: string, value: number) => {
    onChange({
      ...params,
      operations: {
        ...params.operations,
        [field]: value,
      },
    });
  };

  const updateOverhead = (field: string, value: number) => {
    onChange({
      ...params,
      overhead: {
        ...params.overhead,
        [field]: value,
      },
    });
  };

  const updateExpansion = (field: string, value: number | boolean) => {
    onChange({
      ...params,
      expansion: {
        ...params.expansion,
        [field]: value,
      },
    });
  };

  // Expansion calculations with null safety
  const expansionMetrics = useMemo(() => {
    const expansion = params?.expansion || defaultRetailParams.expansion;
    const overhead = params?.overhead || defaultRetailParams.overhead;
    const costs = params?.costs || defaultRetailParams.costs;
    
    if (!expansion.enableExpansion) return null;
    
    const currentStores = overhead.numberOfStores || 5;
    const newStores = Math.max(0, (expansion.targetStores || 10) - currentStores);
    const totalSetupCost = newStores * (expansion.setupCostPerStore || 500000000);
    const annualRevenueIncrease = newStores * (expansion.revenuePerStore || 1200000000);
    const annualOperatingCostIncrease = newStores * 12 * (
      (overhead.offlineStaffPerStore || 6) * (overhead.avgStaffCost || 10000000) + (costs.offlineRentCost || 50000000)
    );
    const annualCOGSIncrease = annualRevenueIncrease * ((costs.cogsRate || 65) / 100);
    const annualProfitIncrease = annualRevenueIncrease - annualOperatingCostIncrease - annualCOGSIncrease;
    const paybackPeriod = annualProfitIncrease > 0 
      ? (totalSetupCost / annualProfitIncrease) * 12 
      : Infinity;
    const roi = totalSetupCost > 0 
      ? ((annualProfitIncrease / totalSetupCost) * 100) 
      : 0;
    
    return {
      newStores,
      totalSetupCost,
      annualRevenueIncrease,
      annualProfitIncrease,
      paybackPeriod,
      roi,
    };
  }, [params]);

  // Calculate total revenue share with null safety
  const channels = params?.channels || defaultRetailParams.channels;
  const totalShare = Object.values(channels)
    .filter((c) => c?.enabled)
    .reduce((sum, c) => sum + (c?.revenueShare || 0), 0);

  const isValidShare = Math.abs(totalShare - 100) < 0.1;
  const shareDifference = totalShare - 100;
  const enabledChannelCount = Object.values(channels).filter(c => c?.enabled).length;

  // Auto-normalize function
  const handleNormalizeShares = useCallback(() => {
    if (enabledChannelCount === 0) {
      toast.error('Cần có ít nhất 1 kênh được bật');
      return;
    }

    const currentChannels = params?.channels || defaultRetailParams.channels;
    const enabledChannels = Object.entries(currentChannels)
      .filter(([_, c]) => c?.enabled)
      .map(([key, c]) => ({ key, share: c?.revenueShare || 0 }));

    const currentTotal = enabledChannels.reduce((sum, c) => sum + c.share, 0);
    
    if (currentTotal === 0) {
      // If all shares are 0, distribute equally
      const equalShare = 100 / enabledChannelCount;
      const newChannels = { ...params.channels };
      enabledChannels.forEach(({ key }) => {
        newChannels[key as keyof typeof params.channels] = {
          ...newChannels[key as keyof typeof params.channels],
          revenueShare: Math.round(equalShare * 10) / 10,
        };
      });
      onChange({ ...params, channels: newChannels });
    } else {
      // Proportionally scale to 100%
      const scaleFactor = 100 / currentTotal;
      const newChannels = { ...params.channels };
      enabledChannels.forEach(({ key, share }) => {
        newChannels[key as keyof typeof params.channels] = {
          ...newChannels[key as keyof typeof params.channels],
          revenueShare: Math.round(share * scaleFactor * 10) / 10,
        };
      });
      onChange({ ...params, channels: newChannels });
    }

    toast.success('Đã tự động điều chỉnh tỷ trọng về 100%');
  }, [params, onChange, enabledChannelCount]);

  // Show toast warning when share becomes invalid
  useEffect(() => {
    if (!isValidShare && totalShare > 0) {
      const timeout = setTimeout(() => {
        if (Math.abs(totalShare - 100) > 5) {
          toast.warning(
            `Tổng tỷ trọng: ${totalShare.toFixed(0)}% (cần 100%)`,
            {
              description: shareDifference > 0 
                ? `Thừa ${shareDifference.toFixed(0)}% - cần giảm bớt` 
                : `Thiếu ${Math.abs(shareDifference).toFixed(0)}% - cần thêm`,
              duration: 3000,
            }
          );
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [totalShare, isValidShare, shareDifference]);

  // Calculate estimated metrics with null safety
  const operations = params?.operations || defaultRetailParams.operations;
  const costs = params?.costs || defaultRetailParams.costs;
  const overhead = params?.overhead || defaultRetailParams.overhead;
  
  const estimatedMetrics = {
    totalOrders: Math.round(baseRevenue / (operations.avgOrderValue || 450000)),
    totalReturns: Math.round((baseRevenue / (operations.avgOrderValue || 450000)) * ((operations.returnRate || 8) / 100)),
    returnCost: (baseRevenue / (operations.avgOrderValue || 450000)) * ((operations.returnRate || 8) / 100) * (operations.avgOrderValue || 450000) * ((operations.returnCostPercent || 15) / 100),
    shippingCost: (baseRevenue / (operations.avgOrderValue || 450000)) * (costs.shippingCostPerOrder || 25000),
    packagingCost: (baseRevenue / (operations.avgOrderValue || 450000)) * (costs.packagingCostPerOrder || 5000),
    staffCost: (overhead.numberOfStores || 5) * (overhead.offlineStaffPerStore || 6) * (overhead.avgStaffCost || 10000000),
    rentCost: (overhead.numberOfStores || 5) * (costs.offlineRentCost || 50000000),
  };

  return (
    <Card className={cn("h-full", !isValidShare && "ring-2 ring-destructive/50")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            Tham số bán lẻ đa kênh
          </CardTitle>
          {!isValidShare && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tỷ trọng kênh không hợp lệ ({totalShare.toFixed(0)}%)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Điều chỉnh chi tiết theo đặc thù doanh nghiệp bán lẻ
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="channels" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="channels" className="text-xs px-2 py-1.5 relative">
              <Store className="w-3.5 h-3.5 mr-1" />
              Kênh bán
              {!isValidShare && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="costs" className="text-xs px-2 py-1.5">
              <CreditCard className="w-3.5 h-3.5 mr-1" />
              Chi phí
            </TabsTrigger>
            <TabsTrigger value="operations" className="text-xs px-2 py-1.5">
              <Package className="w-3.5 h-3.5 mr-1" />
              Vận hành
            </TabsTrigger>
            <TabsTrigger value="overhead" className="text-xs px-2 py-1.5">
              <Building2 className="w-3.5 h-3.5 mr-1" />
              Overhead
            </TabsTrigger>
            <TabsTrigger value="expansion" className="text-xs px-2 py-1.5 relative">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              Mở rộng
              {params.expansion.enableExpansion && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-success rounded-full" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* CHANNELS TAB */}
          <TabsContent value="channels" className="space-y-3 mt-4">
            {/* Impact Summary for Channels */}
            <Alert className="bg-muted/50 border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs">
                <strong>Công thức tính:</strong> Doanh thu kênh = Base Revenue × Tỷ trọng × (1 + Tăng trưởng%).
                Mỗi kênh có chi phí khác nhau (hoa hồng, marketing, logistics).
              </AlertDescription>
            </Alert>
            
            {/* Header with total share indicator */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Phân bổ doanh thu theo kênh</span>
              <div className="flex items-center gap-2">
                {!isValidShare && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNormalizeShares}
                    className="h-7 text-xs gap-1"
                  >
                    <Wand2 className="w-3 h-3" />
                    Tự động
                  </Button>
                )}
                <Badge
                  variant={isValidShare ? 'default' : 'destructive'}
                  className={cn(
                    'transition-all',
                    isValidShare && 'bg-success text-success-foreground',
                    !isValidShare && 'animate-pulse'
                  )}
                >
                  {isValidShare ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 mr-1" />
                  )}
                  {totalShare.toFixed(0)}%
                </Badge>
              </div>
            </div>

            {/* Visual progress bar showing total share */}
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-colors",
                  isValidShare ? "bg-success" : totalShare > 100 ? "bg-destructive" : "bg-warning"
                )}
                initial={false}
                animate={{ width: `${Math.min(totalShare, 100)}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              {totalShare > 100 && (
                <motion.div
                  className="absolute inset-y-0 right-0 bg-destructive/30"
                  initial={false}
                  animate={{ width: `${Math.min(totalShare - 100, 100)}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className={cn(!isValidShare && "font-medium text-foreground")}>
                Mục tiêu: 100%
              </span>
            </div>

            <div className="space-y-2">
              <ChannelToggle
                name="Cửa hàng offline"
                icon={<Store className="w-5 h-5 text-white" />}
                color="bg-blue-500"
                enabled={params.channels.offline.enabled}
                revenueShare={params.channels.offline.revenueShare}
                growthRate={params.channels.offline.growthRate}
                baseRevenue={baseRevenue}
                onToggle={(v) => updateChannel('offline', 'enabled', v)}
                onShareChange={(v) => updateChannel('offline', 'revenueShare', v)}
                onGrowthChange={(v) => updateChannel('offline', 'growthRate', v)}
              />

              <ChannelToggle
                name="Website / App"
                icon={<Globe className="w-5 h-5 text-white" />}
                color="bg-purple-500"
                enabled={params.channels.online.enabled}
                revenueShare={params.channels.online.revenueShare}
                growthRate={params.channels.online.growthRate}
                baseRevenue={baseRevenue}
                onToggle={(v) => updateChannel('online', 'enabled', v)}
                onShareChange={(v) => updateChannel('online', 'revenueShare', v)}
                onGrowthChange={(v) => updateChannel('online', 'growthRate', v)}
              />

              <ChannelToggle
                name="Shopee"
                icon={<ShoppingBag className="w-5 h-5 text-white" />}
                color="bg-orange-500"
                enabled={params.channels.shopee.enabled}
                revenueShare={params.channels.shopee.revenueShare}
                growthRate={params.channels.shopee.growthRate}
                commission={params.costs.marketplaceCommission.shopee}
                baseRevenue={baseRevenue}
                onToggle={(v) => updateChannel('shopee', 'enabled', v)}
                onShareChange={(v) => updateChannel('shopee', 'revenueShare', v)}
                onGrowthChange={(v) => updateChannel('shopee', 'growthRate', v)}
              />

              <ChannelToggle
                name="Lazada"
                icon={<ShoppingBag className="w-5 h-5 text-white" />}
                color="bg-blue-600"
                enabled={params.channels.lazada.enabled}
                revenueShare={params.channels.lazada.revenueShare}
                growthRate={params.channels.lazada.growthRate}
                commission={params.costs.marketplaceCommission.lazada}
                baseRevenue={baseRevenue}
                onToggle={(v) => updateChannel('lazada', 'enabled', v)}
                onShareChange={(v) => updateChannel('lazada', 'revenueShare', v)}
                onGrowthChange={(v) => updateChannel('lazada', 'growthRate', v)}
              />

              <ChannelToggle
                name="Tiki"
                icon={<ShoppingBag className="w-5 h-5 text-white" />}
                color="bg-sky-500"
                enabled={params.channels.tiki.enabled}
                revenueShare={params.channels.tiki.revenueShare}
                growthRate={params.channels.tiki.growthRate}
                commission={params.costs.marketplaceCommission.tiki}
                baseRevenue={baseRevenue}
                onToggle={(v) => updateChannel('tiki', 'enabled', v)}
                onShareChange={(v) => updateChannel('tiki', 'revenueShare', v)}
                onGrowthChange={(v) => updateChannel('tiki', 'growthRate', v)}
              />

              <ChannelToggle
                name="TikTok Shop"
                icon={<ShoppingBag className="w-5 h-5 text-white" />}
                color="bg-gray-900"
                enabled={params.channels.tiktok.enabled}
                revenueShare={params.channels.tiktok.revenueShare}
                growthRate={params.channels.tiktok.growthRate}
                commission={params.costs.marketplaceCommission.tiktok}
                baseRevenue={baseRevenue}
                onToggle={(v) => updateChannel('tiktok', 'enabled', v)}
                onShareChange={(v) => updateChannel('tiktok', 'revenueShare', v)}
                onGrowthChange={(v) => updateChannel('tiktok', 'growthRate', v)}
              />
            </div>

            {/* Warning/Error message */}
            <AnimatePresence>
              {!isValidShare && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert variant="destructive" className="mt-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Tổng tỷ trọng không hợp lệ: {totalShare.toFixed(1)}%</span>
                        <p className="text-xs mt-0.5">
                          {shareDifference > 0 
                            ? `Cần giảm ${shareDifference.toFixed(1)}% để đạt 100%` 
                            : `Cần thêm ${Math.abs(shareDifference).toFixed(1)}% để đạt 100%`
                          }
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNormalizeShares}
                        className="ml-2 shrink-0"
                      >
                        <Wand2 className="w-3 h-3 mr-1" />
                        Tự động điều chỉnh
                      </Button>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success message when valid */}
            <AnimatePresence>
              {isValidShare && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-xs text-success mt-2"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Tỷ trọng hợp lệ - Tổng = 100%</span>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* COSTS TAB */}
          <TabsContent value="costs" className="space-y-4 mt-4">
            {/* Impact Summary for Costs */}
            <Alert className="bg-muted/50 border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs">
                <strong>Công thức tính:</strong> COGS = Doanh thu × Tỷ lệ COGS. Chi phí kênh = Hoa hồng sàn + Marketing + Logistics. 
                Tăng chi phí → Giảm lợi nhuận trực tiếp.
              </AlertDescription>
            </Alert>
            
            <SliderControl
              label="Tỷ lệ giá vốn (COGS)"
              value={params.costs.cogsRate}
              onChange={(v) => updateCosts('cogsRate', v)}
              min={40}
              max={85}
              unit="%"
              description="% doanh thu là giá vốn. Tăng 1% COGS → Gross Profit giảm 1% doanh thu. VD: DT 100 tỷ, COGS +1% = mất 1 tỷ lợi nhuận gộp"
              showTrend
              baseValue={defaultRetailParams.costs.cogsRate}
            />

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Phí hoa hồng sàn TMĐT
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Hoa hồng tính trên doanh thu từng sàn. VD: Shopee 8%, doanh thu 10 tỷ → phí 800 triệu.
                        Giảm 1% hoa hồng = tăng 1% lợi nhuận từ kênh đó.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Shopee</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={params.costs.marketplaceCommission.shopee}
                      onChange={(e) => updateMarketplaceCommission('shopee', Number(e.target.value))}
                      className="h-8"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Lazada</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={params.costs.marketplaceCommission.lazada}
                      onChange={(e) => updateMarketplaceCommission('lazada', Number(e.target.value))}
                      className="h-8"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tiki</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={params.costs.marketplaceCommission.tiki}
                      onChange={(e) => updateMarketplaceCommission('tiki', Number(e.target.value))}
                      className="h-8"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">TikTok</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={params.costs.marketplaceCommission.tiktok}
                      onChange={(e) => updateMarketplaceCommission('tiktok', Number(e.target.value))}
                      className="h-8"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {(() => {
              // Calculate channel revenues for ads cost display
              const channelRevenues = {
                offline: params.channels.offline.enabled 
                  ? baseRevenue * (params.channels.offline.revenueShare / 100) * (1 + params.channels.offline.growthRate / 100) 
                  : 0,
                online: params.channels.online.enabled 
                  ? baseRevenue * (params.channels.online.revenueShare / 100) * (1 + params.channels.online.growthRate / 100) 
                  : 0,
                shopee: params.channels.shopee.enabled 
                  ? baseRevenue * (params.channels.shopee.revenueShare / 100) * (1 + params.channels.shopee.growthRate / 100) 
                  : 0,
                lazada: params.channels.lazada.enabled 
                  ? baseRevenue * (params.channels.lazada.revenueShare / 100) * (1 + params.channels.lazada.growthRate / 100) 
                  : 0,
                tiki: params.channels.tiki.enabled 
                  ? baseRevenue * (params.channels.tiki.revenueShare / 100) * (1 + params.channels.tiki.growthRate / 100) 
                  : 0,
                tiktok: params.channels.tiktok.enabled 
                  ? baseRevenue * (params.channels.tiktok.revenueShare / 100) * (1 + params.channels.tiktok.growthRate / 100) 
                  : 0,
              };

              // Calculate ads costs
              const adsCosts = {
                offline: channelRevenues.offline * ((params.costs.marketingAdsCost?.offline ?? 2) / 100),
                online: channelRevenues.online * ((params.costs.marketingAdsCost?.online ?? 10) / 100),
                shopee: channelRevenues.shopee * ((params.costs.marketingAdsCost?.shopee ?? 8) / 100),
                lazada: channelRevenues.lazada * ((params.costs.marketingAdsCost?.lazada ?? 10) / 100),
                tiki: channelRevenues.tiki * ((params.costs.marketingAdsCost?.tiki ?? 5) / 100),
                tiktok: channelRevenues.tiktok * ((params.costs.marketingAdsCost?.tiktok ?? 15) / 100),
              };

              const totalAdsCost = Object.values(adsCosts).reduce((sum, v) => sum + v, 0);
              const totalRevenue = Object.values(channelRevenues).reduce((sum, v) => sum + v, 0);
              const avgAdsRate = totalRevenue > 0 ? (totalAdsCost / totalRevenue * 100) : 0;

              return (
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Megaphone className="w-4 h-4" />
                    Chi phí quảng cáo theo kênh
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3.5 h-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            Chi phí ads tính theo % doanh thu từng kênh. Mỗi kênh có chiến lược và chi phí ads khác nhau.
                            VD: TikTok thường có chi phí ads cao hơn do cần content liên tục.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  
                  {/* Offline Ads */}
                  {params.channels.offline.enabled && (
                    <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
                            <Store className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-sm font-medium">Cửa hàng Offline</span>
                        </div>
                        <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30">
                          {formatVNDCompact(adsCosts.offline)}/năm
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Slider
                            value={[params.costs.marketingAdsCost?.offline ?? 2]}
                            onValueChange={([v]) => updateMarketingAdsCost('offline', v)}
                            min={0}
                            max={10}
                            step={0.5}
                            className="py-1"
                          />
                        </div>
                        <Input
                          type="number"
                          value={params.costs.marketingAdsCost?.offline ?? 2}
                          onChange={(e) => updateMarketingAdsCost('offline', Number(e.target.value))}
                          className="w-16 h-8 text-right text-sm"
                          step={0.5}
                        />
                        <span className="text-xs text-muted-foreground w-4">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Banner, flyer, KOL địa phương • DT: {formatVNDCompact(channelRevenues.offline)}
                      </p>
                    </div>
                  )}

                  {/* Online/Website Ads */}
                  {params.channels.online.enabled && (
                    <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-purple-500 flex items-center justify-center">
                            <Globe className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-sm font-medium">Website / App</span>
                        </div>
                        <Badge variant="outline" className="text-xs bg-purple-500/10 border-purple-500/30">
                          {formatVNDCompact(adsCosts.online)}/năm
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Slider
                            value={[params.costs.marketingAdsCost?.online ?? 10]}
                            onValueChange={([v]) => updateMarketingAdsCost('online', v)}
                            min={0}
                            max={25}
                            step={0.5}
                            className="py-1"
                          />
                        </div>
                        <Input
                          type="number"
                          value={params.costs.marketingAdsCost?.online ?? 10}
                          onChange={(e) => updateMarketingAdsCost('online', Number(e.target.value))}
                          className="w-16 h-8 text-right text-sm"
                          step={0.5}
                        />
                        <span className="text-xs text-muted-foreground w-4">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Google, Facebook Ads, SEO • DT: {formatVNDCompact(channelRevenues.online)}
                      </p>
                    </div>
                  )}

                  {/* Marketplace Ads - Grid layout */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Shopee Ads */}
                    {params.channels.shopee.enabled && (
                      <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center">
                              <ShoppingBag className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-medium">Shopee</span>
                          </div>
                          <span className="text-xs font-medium text-orange-600">{formatVNDCompact(adsCosts.shopee)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={params.costs.marketingAdsCost?.shopee ?? 8}
                            onChange={(e) => updateMarketingAdsCost('shopee', Number(e.target.value))}
                            className="h-7 text-sm"
                            step={0.5}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">DT: {formatVNDCompact(channelRevenues.shopee)}</p>
                      </div>
                    )}

                    {/* Lazada Ads */}
                    {params.channels.lazada.enabled && (
                      <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
                              <ShoppingBag className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-medium">Lazada</span>
                          </div>
                          <span className="text-xs font-medium text-blue-600">{formatVNDCompact(adsCosts.lazada)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={params.costs.marketingAdsCost?.lazada ?? 10}
                            onChange={(e) => updateMarketingAdsCost('lazada', Number(e.target.value))}
                            className="h-7 text-sm"
                            step={0.5}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">DT: {formatVNDCompact(channelRevenues.lazada)}</p>
                      </div>
                    )}

                    {/* Tiki Ads */}
                    {params.channels.tiki.enabled && (
                      <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-sky-500 flex items-center justify-center">
                              <ShoppingBag className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-medium">Tiki</span>
                          </div>
                          <span className="text-xs font-medium text-sky-600">{formatVNDCompact(adsCosts.tiki)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={params.costs.marketingAdsCost?.tiki ?? 5}
                            onChange={(e) => updateMarketingAdsCost('tiki', Number(e.target.value))}
                            className="h-7 text-sm"
                            step={0.5}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">DT: {formatVNDCompact(channelRevenues.tiki)}</p>
                      </div>
                    )}

                    {/* TikTok Ads */}
                    {params.channels.tiktok.enabled && (
                      <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center">
                              <ShoppingBag className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-medium">TikTok</span>
                          </div>
                          <span className="text-xs font-medium text-gray-700">{formatVNDCompact(adsCosts.tiktok)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={params.costs.marketingAdsCost?.tiktok ?? 15}
                            onChange={(e) => updateMarketingAdsCost('tiktok', Number(e.target.value))}
                            className="h-7 text-sm"
                            step={0.5}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">DT: {formatVNDCompact(channelRevenues.tiktok)}</p>
                      </div>
                    )}
                  </div>

                  {/* Summary of total ads cost */}
                  <Alert className="bg-primary/5 border-primary/20">
                    <Megaphone className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            Tổng chi phí Ads: {formatVNDCompact(totalAdsCost)}/năm
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Bình quân {avgAdsRate.toFixed(1)}% trên tổng doanh thu {formatVNDCompact(totalRevenue)}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {formatVNDCompact(totalAdsCost / 12)}/tháng
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              );
            })()}

            {/* GENERAL MARKETING COSTS - Branding & Multi-channel Ads */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4" />
                Chi phí Marketing chung (Branding)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Chi phí quảng cáo cho mục đích xây dựng thương hiệu, chạy traffic đa kênh. 
                        Tính theo % tổng doanh thu, không gắn với kênh cụ thể.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>

              {(() => {
                const totalRevenue = Object.values(params.channels).reduce((sum, ch) => {
                  if (!ch.enabled) return sum;
                  const channelRev = baseRevenue * (ch.revenueShare / 100) * (1 + ch.growthRate / 100);
                  return sum + channelRev;
                }, 0);

                const facebookCost = totalRevenue * ((params.costs.generalMarketingCost?.facebookAds ?? 3) / 100);
                const googleCost = totalRevenue * ((params.costs.generalMarketingCost?.googleAds ?? 2) / 100);
                const otherCost = totalRevenue * ((params.costs.generalMarketingCost?.otherAds ?? 1) / 100);
                const totalGeneralCost = facebookCost + googleCost + otherCost;
                const totalGeneralRate = totalRevenue > 0 ? (totalGeneralCost / totalRevenue * 100) : 0;

                return (
                  <div className="space-y-3">
                    {/* Facebook Ads */}
                    <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
                            <Megaphone className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-sm font-medium">Facebook / Instagram Ads</span>
                        </div>
                        <Badge variant="outline" className="text-xs bg-blue-600/10 border-blue-600/30">
                          {formatVNDCompact(facebookCost)}/năm
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Slider
                            value={[params.costs.generalMarketingCost?.facebookAds ?? 3]}
                            onValueChange={([v]) => updateGeneralMarketingCost('facebookAds', v)}
                            min={0}
                            max={15}
                            step={0.5}
                            className="py-1"
                          />
                        </div>
                        <Input
                          type="number"
                          value={params.costs.generalMarketingCost?.facebookAds ?? 3}
                          onChange={(e) => updateGeneralMarketingCost('facebookAds', Number(e.target.value))}
                          className="w-16 h-8 text-right text-sm"
                          step={0.5}
                        />
                        <span className="text-xs text-muted-foreground w-4">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Branding, awareness, retargeting • Tổng DT: {formatVNDCompact(totalRevenue)}
                      </p>
                    </div>

                    {/* Google Ads */}
                    <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center">
                            <Megaphone className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-sm font-medium">Google / YouTube Ads</span>
                        </div>
                        <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500/30">
                          {formatVNDCompact(googleCost)}/năm
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Slider
                            value={[params.costs.generalMarketingCost?.googleAds ?? 2]}
                            onValueChange={([v]) => updateGeneralMarketingCost('googleAds', v)}
                            min={0}
                            max={15}
                            step={0.5}
                            className="py-1"
                          />
                        </div>
                        <Input
                          type="number"
                          value={params.costs.generalMarketingCost?.googleAds ?? 2}
                          onChange={(e) => updateGeneralMarketingCost('googleAds', Number(e.target.value))}
                          className="w-16 h-8 text-right text-sm"
                          step={0.5}
                        />
                        <span className="text-xs text-muted-foreground w-4">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Search, Display, YouTube, Performance Max
                      </p>
                    </div>

                    {/* Other Ads */}
                    <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center">
                            <Users className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-sm font-medium">Khác (KOL, Influencer, PR...)</span>
                        </div>
                        <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30">
                          {formatVNDCompact(otherCost)}/năm
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Slider
                            value={[params.costs.generalMarketingCost?.otherAds ?? 1]}
                            onValueChange={([v]) => updateGeneralMarketingCost('otherAds', v)}
                            min={0}
                            max={10}
                            step={0.5}
                            className="py-1"
                          />
                        </div>
                        <Input
                          type="number"
                          value={params.costs.generalMarketingCost?.otherAds ?? 1}
                          onChange={(e) => updateGeneralMarketingCost('otherAds', Number(e.target.value))}
                          className="w-16 h-8 text-right text-sm"
                          step={0.5}
                        />
                        <span className="text-xs text-muted-foreground w-4">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Influencer, Affiliate, Event, PR, Sponsorship
                      </p>
                    </div>

                    {/* Summary */}
                    <Alert className="bg-amber-500/5 border-amber-500/20">
                      <Target className="h-4 w-4 text-amber-600" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              Tổng chi phí Marketing chung: {formatVNDCompact(totalGeneralCost)}/năm
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Chiếm {totalGeneralRate.toFixed(1)}% tổng doanh thu
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {formatVNDCompact(totalGeneralCost / 12)}/tháng
                          </Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                );
              })()}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Chi phí Logistics
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Tính theo đơn hàng: Tổng chi phí = Số đơn × (Phí ship + Phí đóng gói).
                        VD: 100K đơn × 30K = 3 tỷ/năm.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <SliderControl
                label="Phí ship/đơn"
                value={params.costs.shippingCostPerOrder}
                onChange={(v) => updateCosts('shippingCostPerOrder', v)}
                min={10_000}
                max={50_000}
                step={1000}
                unit="đ"
                format="currency"
                description="Chi phí vận chuyển TB/đơn. Tăng 10K/đơn × 100K đơn = +1 tỷ chi phí/năm"
              />
              <SliderControl
                label="Phí đóng gói/đơn"
                value={params.costs.packagingCostPerOrder}
                onChange={(v) => updateCosts('packagingCostPerOrder', v)}
                min={2_000}
                max={20_000}
                step={1000}
                unit="đ"
                format="currency"
                description="Bao bì, phụ liệu/đơn. Chi phí nhỏ nhưng tích lũy lớn với volume cao"
              />
            </div>

            <Separator />

            <SliderControl
              label="Tiền thuê cửa hàng"
              value={params.costs.offlineRentCost}
              onChange={(v) => updateCosts('offlineRentCost', v)}
              min={10_000_000}
              max={150_000_000}
              step={5_000_000}
              unit="đ"
              format="currency"
              description="Thuê mặt bằng/CH/tháng. Chi phí cố định - không phụ thuộc doanh thu. 5 CH × 50tr × 12 = 3 tỷ/năm"
            />
          </TabsContent>

          {/* OPERATIONS TAB */}
          <TabsContent value="operations" className="space-y-4 mt-4">
            {/* Impact Summary for Operations */}
            <Alert className="bg-muted/50 border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs">
                <strong>Công thức tính:</strong> Số đơn = Doanh thu ÷ AOV. Chi phí hoàn = Số đơn × Tỷ lệ hoàn × AOV × % xử lý.
                Tăng AOV → Giảm số đơn → Giảm chi phí logistics & hoàn hàng.
              </AlertDescription>
            </Alert>
            
            <SliderControl
              label="Giá trị đơn hàng trung bình (AOV)"
              value={params.operations.avgOrderValue}
              onChange={(v) => updateOperations('avgOrderValue', v)}
              min={100_000}
              max={2_000_000}
              step={10_000}
              unit="đ"
              format="currency"
              description="AOV cao hơn → ít đơn hơn → giảm chi phí fulfillment. VD: DT 100 tỷ, AOV 500K = 200K đơn; AOV 1tr = 100K đơn (tiết kiệm 50% phí ship)"
              showTrend
              baseValue={defaultRetailParams.operations.avgOrderValue}
            />

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Tỷ lệ hoàn hàng
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Chi phí hoàn = Số đơn hoàn × AOV × % chi phí xử lý.
                        Giảm 1% hoàn hàng = tiết kiệm đáng kể (shipping 2 chiều + kiểm hàng + restock).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <SliderControl
                label="% đơn hoàn"
                value={params.operations.returnRate}
                onChange={(v) => updateOperations('returnRate', v)}
                min={0}
                max={20}
                step={0.5}
                unit="%"
                description="Tỷ lệ hoàn hàng. Giảm 1% tỷ lệ hoàn = tiết kiệm ~15-30% giá trị đơn hoàn đó (ship 2 chiều + xử lý)"
                showTrend
                baseValue={defaultRetailParams.operations.returnRate}
              />
              <SliderControl
                label="Chi phí xử lý hoàn"
                value={params.operations.returnCostPercent}
                onChange={(v) => updateOperations('returnCostPercent', v)}
                min={10}
                max={60}
                unit="%"
                description="% giá trị đơn bị mất khi hoàn (ship 2 chiều, kiểm tra, restock, hàng hư). VD: đơn 500K × 30% = mất 150K/đơn hoàn"
              />

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Ước tính chi phí hoàn hàng:{' '}
                  <span className="font-semibold text-foreground">
                    {formatVNDCompact(estimatedMetrics.returnCost)}/tháng
                  </span>{' '}
                  ({estimatedMetrics.totalReturns.toLocaleString('vi-VN')} đơn)
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Khách hàng
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        CAC (Chi phí thu hút) cao + Repeat thấp = tốn tiền marketing liên tục.
                        Repeat cao → giảm chi phí marketing dài hạn.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <SliderControl
                label="Conversion Rate"
                value={params.operations.conversionRate}
                onChange={(v) => updateOperations('conversionRate', v)}
                min={0.5}
                max={10}
                step={0.1}
                unit="%"
                description="Tỷ lệ visitor → mua hàng. Tăng 1% CVR → hiệu quả marketing cao hơn (cùng chi phí Ads, nhiều đơn hơn)"
              />
              <SliderControl
                label="Chi phí thu hút KH (CAC)"
                value={params.operations.customerAcquisitionCost}
                onChange={(v) => updateOperations('customerAcquisitionCost', v)}
                min={20_000}
                max={300_000}
                step={5000}
                unit="đ"
                format="currency"
                description="Chi phí để có 1 KH mới. CAC cao chỉ hợp lý nếu LTV (giá trị vòng đời KH) cao"
              />
              <SliderControl
                label="Tỷ lệ mua lại"
                value={params.operations.repeatPurchaseRate}
                onChange={(v) => updateOperations('repeatPurchaseRate', v)}
                min={5}
                max={60}
                unit="%"
                description="% KH quay lại mua trong 12 tháng. Repeat cao → giảm áp lực CAC, tăng LTV"
              />
            </div>
          </TabsContent>

          {/* OVERHEAD TAB */}
          <TabsContent value="overhead" className="space-y-4 mt-4">
            {/* Impact Summary for Overhead */}
            <Alert className="bg-muted/50 border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs">
                <strong>Chi phí cố định:</strong> Không phụ thuộc doanh thu. Overhead cao → Break-even Revenue cao hơn.
                Tối ưu overhead = tăng margin khi scale.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Store className="w-4 h-4" />
                Cửa hàng Offline
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Chi phí cửa hàng = (Số CH × Nhân viên × Lương) + (Số CH × Tiền thuê).
                        Đây là chi phí cố định - phải cover dù doanh thu thế nào.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <SliderControl
                label="Số cửa hàng"
                value={params.overhead.numberOfStores}
                onChange={(v) => updateOverhead('numberOfStores', v)}
                min={1}
                max={50}
                unit=" CH"
                description="Mỗi CH thêm = +Staff cost + Rent cost. Chỉ mở CH khi doanh thu/CH đủ cover chi phí + margin"
              />
              <SliderControl
                label="Nhân viên/cửa hàng"
                value={params.overhead.offlineStaffPerStore}
                onChange={(v) => updateOverhead('offlineStaffPerStore', v)}
                min={1}
                max={20}
                unit=" người"
                description="Số NV TB/CH. Tăng 1 NV/CH × 5 CH × 12tr × 12 tháng = +720tr/năm"
              />

              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground">
                  Tổng nhân sự offline:{' '}
                  <span className="font-semibold text-foreground">
                    {(params.overhead.numberOfStores * params.overhead.offlineStaffPerStore).toLocaleString('vi-VN')} người
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Chi phí nhân sự offline:{' '}
                  <span className="font-semibold text-foreground">
                    {formatVNDCompact(estimatedMetrics.staffCost)}/tháng
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Chi phí thuê mặt bằng:{' '}
                  <span className="font-semibold text-foreground">
                    {formatVNDCompact(estimatedMetrics.rentCost)}/tháng
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            <SliderControl
              label="Lương trung bình"
              value={params.overhead.avgStaffCost}
              onChange={(v) => updateOverhead('avgStaffCost', v)}
              min={6_000_000}
              max={25_000_000}
              step={500_000}
              unit="đ"
              format="currency"
              description="Lương + phụ cấp TB/người/tháng. Tăng 1tr/người × 30 người = +360tr/năm"
            />

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Chi phí cố định khác
              </Label>
              <SliderControl
                label="Thuê kho bãi"
                value={params.overhead.warehouseRent}
                onChange={(v) => updateOverhead('warehouseRent', v)}
                min={20_000_000}
                max={300_000_000}
                step={5_000_000}
                unit="đ"
                format="currency"
                description="Kho trung tâm/tháng. Thường tăng theo quy mô kinh doanh, nhưng có economies of scale"
              />
              <SliderControl
                label="Hạ tầng công nghệ"
                value={params.overhead.techInfraCost}
                onChange={(v) => updateOverhead('techInfraCost', v)}
                min={5_000_000}
                max={100_000_000}
                step={5_000_000}
                unit="đ"
                format="currency"
                description="ERP, POS, CRM, hosting, bảo mật. Đầu tư tech tốt = giảm nhân sự + tăng hiệu quả"
              />
            </div>
          </TabsContent>

          {/* EXPANSION TAB */}
          <TabsContent value="expansion" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Mô phỏng Mở rộng Cửa hàng
                </Label>
                <Switch
                  checked={params.expansion.enableExpansion}
                  onCheckedChange={(v) => updateExpansion('enableExpansion', v)}
                />
              </div>

              {params.expansion.enableExpansion && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Kế hoạch mở rộng</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {params.overhead.numberOfStores} → {params.expansion.targetStores} CH
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Target className="w-3 h-3" /> Mục tiêu cửa hàng
                        </Label>
                        <Input
                          type="number"
                          value={params.expansion.targetStores}
                          onChange={(e) => updateExpansion('targetStores', Math.max(params.overhead.numberOfStores, Number(e.target.value)))}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Thời gian (tháng)
                        </Label>
                        <Input
                          type="number"
                          value={params.expansion.expansionMonths}
                          onChange={(e) => updateExpansion('expansionMonths', Math.max(1, Number(e.target.value)))}
                          className="h-8"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> Chi phí mở 1 CH
                        </Label>
                        <Input
                          type="number"
                          value={params.expansion.setupCostPerStore}
                          onChange={(e) => updateExpansion('setupCostPerStore', Number(e.target.value))}
                          className="h-8"
                        />
                        <p className="text-xs text-muted-foreground">{formatVNDCompact(params.expansion.setupCostPerStore)}</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> DT/CH/năm
                        </Label>
                        <Input
                          type="number"
                          value={params.expansion.revenuePerStore}
                          onChange={(e) => updateExpansion('revenuePerStore', Number(e.target.value))}
                          className="h-8"
                        />
                        <p className="text-xs text-muted-foreground">{formatVNDCompact(params.expansion.revenuePerStore)}/năm</p>
                      </div>
                    </div>

                    <SliderControl
                      label="Thời gian ramp-up"
                      value={params.expansion.rampUpMonths}
                      onChange={(v) => updateExpansion('rampUpMonths', v)}
                      min={1}
                      max={12}
                      unit=" tháng"
                      description="Thời gian để đạt 100% doanh thu dự kiến"
                    />
                  </div>

                  {/* Expansion Metrics Summary */}
                  {expansionMetrics && expansionMetrics.newStores > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <Plus className="w-3 h-3" /> Cửa hàng mới
                        </div>
                        <p className="text-sm font-bold text-primary">+{expansionMetrics.newStores}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <DollarSign className="w-3 h-3" /> Đầu tư
                        </div>
                        <p className="text-sm font-bold text-destructive">{formatVNDCompact(expansionMetrics.totalSetupCost)}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <Sparkles className="w-3 h-3" /> ROI
                        </div>
                        <p className={cn(
                          "text-sm font-bold",
                          expansionMetrics.roi > 20 ? 'text-success' : expansionMetrics.roi > 0 ? 'text-warning' : 'text-destructive'
                        )}>
                          {expansionMetrics.roi.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Expansion Insight */}
                  {expansionMetrics && expansionMetrics.newStores > 0 && expansionMetrics.annualProfitIncrease > 0 && expansionMetrics.paybackPeriod <= 24 && (
                    <div className="p-2 rounded-lg bg-success/10 border border-success/30 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-medium text-success">Khuyến nghị: Mở rộng khả thi</p>
                        <p className="text-muted-foreground">
                          Hoàn vốn trong {Math.round(expansionMetrics.paybackPeriod)} tháng, 
                          lợi nhuận tăng thêm {formatVNDCompact(expansionMetrics.annualProfitIncrease)}/năm
                        </p>
                      </div>
                    </div>
                  )}

                  {expansionMetrics && expansionMetrics.newStores > 0 && (expansionMetrics.annualProfitIncrease <= 0 || expansionMetrics.paybackPeriod > 24) && (
                    <div className="p-2 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-medium text-warning">Cần xem xét lại</p>
                        <p className="text-muted-foreground">
                          {expansionMetrics.annualProfitIncrease <= 0 
                            ? 'Lợi nhuận không đủ bù chi phí vận hành' 
                            : `Thời gian hoàn vốn dài (${Math.round(expansionMetrics.paybackPeriod)} tháng)`}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {!params.expansion.enableExpansion && (
                <div className="p-4 rounded-lg bg-muted/30 border border-dashed text-center">
                  <TrendingUp className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Bật công tắc để bắt đầu mô phỏng mở rộng cửa hàng
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary Footer */}
        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-muted/50 rounded">
              <p className="text-muted-foreground">Ước tính đơn hàng/tháng</p>
              <p className="font-semibold">{estimatedMetrics.totalOrders.toLocaleString('vi-VN')}</p>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <p className="text-muted-foreground">Chi phí ship + đóng gói</p>
              <p className="font-semibold">{formatVNDCompact(estimatedMetrics.shippingCost + estimatedMetrics.packagingCost)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
