import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Layers, 
  TrendingUp, 
  Gauge, 
  PieChart,
  LineChart,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Megaphone,
  Target,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMDPData, MarketingPerformance } from '@/hooks/useMDPData';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Marketing Mode Components
import {
  PerformanceOverview,
  CampaignPerformanceTable,
  AdvancedMetricsGrid,
  ExecutionAlertsPanel,
  PlatformAdsOverview,
  MarketingActionsPanel,
  CampaignDetailDialog,
  PlatformDetailDialog,
  ChannelBreakdownPanel,
  PlatformAdsData,
  MarketingAction,
  AdvancedMarketingMetrics,
} from '@/components/mdp/marketing-mode';

// New MDP Components
import { BudgetPacingCard } from '@/components/mdp/BudgetPacingCard';
import { DataQualityIndicator, useMDPDataQuality } from '@/components/mdp/DataQualityIndicator';

// Quick links for Marketing Mode
const quickLinks = [
  { 
    id: 'campaigns', 
    label: 'Hiệu suất Campaigns', 
    labelEn: 'Campaign Performance',
    icon: BarChart3, 
    path: '/mdp/campaigns',
    description: 'Chi tiết từng chiến dịch',
  },
  { 
    id: 'channels', 
    label: 'Phân tích Kênh', 
    labelEn: 'Channel Analysis',
    icon: Layers, 
    path: '/mdp/channels',
    description: 'So sánh hiệu quả các kênh',
  },
  { 
    id: 'funnel', 
    label: 'Marketing Funnel', 
    labelEn: 'Marketing Funnel',
    icon: TrendingUp, 
    path: '/mdp/funnel',
    description: 'Phân tích tỷ lệ chuyển đổi',
  },
  { 
    id: 'ab-testing', 
    label: 'A/B Testing', 
    labelEn: 'A/B Testing',
    icon: Gauge, 
    path: '/mdp/ab-testing',
    description: 'Thử nghiệm và tối ưu',
  },
  { 
    id: 'audience', 
    label: 'Audience Insights', 
    labelEn: 'Audience Insights',
    icon: PieChart, 
    path: '/mdp/audience',
    description: 'Phân tích đối tượng',
  },
  { 
    id: 'customer-ltv', 
    label: 'Customer LTV', 
    labelEn: 'Customer LTV',
    icon: DollarSign, 
    path: '/mdp/customer-ltv',
    description: 'Giá trị vòng đời khách hàng',
  },
];

export default function MarketingModePage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Get data from hook
  const { 
    marketingPerformance,
    executionAlerts,
    marketingModeSummary,
    budgetPacingData,
    totalPlannedBudget,
    totalActualSpend,
    rawQueryResults,
    isLoading, 
    error,
  } = useMDPData();
  
  // Data quality
  const dataQualitySources = useMDPDataQuality(rawQueryResults);

  // Dialog states
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingPerformance | null>(null);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformAdsData | null>(null);
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false);

  // Mock platform data (TODO: replace with real data from useMDPData when platform data is available)
  const platformAdsData: PlatformAdsData[] = [
    { platform: 'Shopee Ads', platform_icon: 'shopee', is_active: true, spend_today: 2500000, spend_month: 45000000, budget_month: 60000000, budget_utilization: 75, impressions: 850000, clicks: 12500, orders: 320, revenue: 128000000, cpm: 52941, cpc: 3600, ctr: 1.47, cvr: 2.56, cpa: 140625, roas: 2.84, acos: 35.2, add_to_cart: 2100, atc_rate: 16.8, quality_score: 8, relevance_score: 7, spend_trend: 5, cpa_trend: -3, roas_trend: 8 },
    { platform: 'Lazada Ads', platform_icon: 'lazada', is_active: true, spend_today: 1800000, spend_month: 32000000, budget_month: 40000000, budget_utilization: 80, impressions: 620000, clicks: 8900, orders: 210, revenue: 84000000, cpm: 51613, cpc: 3596, ctr: 1.44, cvr: 2.36, cpa: 152381, roas: 2.63, acos: 38.1, add_to_cart: 1450, atc_rate: 16.3, quality_score: 7, relevance_score: 8, spend_trend: 2, cpa_trend: 5, roas_trend: -2 },
    { platform: 'TikTok Shop', platform_icon: 'tiktok', is_active: true, spend_today: 3200000, spend_month: 58000000, budget_month: 70000000, budget_utilization: 83, impressions: 1200000, clicks: 28000, orders: 480, revenue: 168000000, cpm: 48333, cpc: 2071, ctr: 2.33, cvr: 1.71, cpa: 120833, roas: 2.90, acos: 34.5, add_to_cart: 3800, atc_rate: 13.6, spend_trend: 12, cpa_trend: -8, roas_trend: 15 },
    { platform: 'Meta Ads', platform_icon: 'meta', is_active: true, spend_today: 1500000, spend_month: 28000000, budget_month: 35000000, budget_utilization: 80, impressions: 480000, clicks: 6200, orders: 95, revenue: 47500000, cpm: 58333, cpc: 4516, ctr: 1.29, cvr: 1.53, cpa: 294737, roas: 1.70, acos: 58.9, add_to_cart: 820, atc_rate: 13.2, spend_trend: -5, cpa_trend: 12, roas_trend: -10 },
    { platform: 'Google Ads', platform_icon: 'google', is_active: false, spend_today: 0, spend_month: 8000000, budget_month: 20000000, budget_utilization: 40, impressions: 150000, clicks: 2100, orders: 42, revenue: 21000000, cpm: 53333, cpc: 3810, ctr: 1.40, cvr: 2.00, cpa: 190476, roas: 2.63, acos: 38.1, add_to_cart: 280, atc_rate: 13.3, quality_score: 6, spend_trend: -100, cpa_trend: 0, roas_trend: 0 },
  ];

  // SINGLE SOURCE OF TRUTH: Calculate advanced metrics FROM useMDPData
  const advancedMetrics: AdvancedMarketingMetrics = useMemo(() => {
    const totalSpend = marketingModeSummary.total_spend;
    const totalRevenue = marketingModeSummary.total_revenue;
    const totalOrders = marketingModeSummary.total_orders;
    const totalImpressions = marketingPerformance.reduce((sum, c) => sum + c.impressions, 0);
    const totalClicks = marketingPerformance.reduce((sum, c) => sum + c.clicks, 0);
    const totalLeads = marketingModeSummary.total_leads;
    
    // Estimate cart metrics based on funnel data
    const estimatedAddToCarts = Math.round(totalClicks * 0.15);
    const estimatedCheckouts = Math.round(estimatedAddToCarts * 0.55);
    
    return {
      total_impressions: totalImpressions,
      total_reach: Math.round(totalImpressions * 0.6),
      frequency: totalImpressions > 0 ? totalImpressions / Math.max(Math.round(totalImpressions * 0.6), 1) : 0,
      total_clicks: totalClicks,
      ctr: marketingModeSummary.overall_ctr,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      add_to_carts: estimatedAddToCarts,
      atc_rate: totalClicks > 0 ? (estimatedAddToCarts / totalClicks) * 100 : 0,
      checkouts: estimatedCheckouts,
      checkout_rate: estimatedAddToCarts > 0 ? (estimatedCheckouts / estimatedAddToCarts) * 100 : 0,
      orders: totalOrders,
      cvr: marketingModeSummary.overall_conversion,
      revenue: totalRevenue,
      aov: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      roas: marketingModeSummary.overall_roas,
      acos: marketingModeSummary.overall_roas > 0 ? (1 / marketingModeSummary.overall_roas) * 100 : 0,
      cpa: marketingModeSummary.overall_cpa,
      total_spend: totalSpend,
      profit_margin: 18.5,
      ltv_cac_ratio: 2.8,
      impressions_trend: 0,
      clicks_trend: 0,
      orders_trend: 0,
      revenue_trend: 0,
      cpa_trend: 0,
      roas_trend: 0,
    };
  }, [marketingModeSummary, marketingPerformance]);

  // Marketing Actions - mock data for now
  const marketingActions: MarketingAction[] = [
    { id: '1', type: 'scale_up', priority: 'high', campaign_name: 'Flash Sale Weekend', campaign_id: 'c1', channel: 'TikTok Shop', reason: 'ROAS 4.2x - vượt benchmark 40%', expected_impact: 'Tăng revenue 25%', impact_value: 42000000, confidence: 85, is_urgent: true },
    { id: '2', type: 'pause', priority: 'high', campaign_name: 'Brand Awareness Q1', campaign_id: 'c2', channel: 'Meta Ads', reason: 'ROAS 1.2x - dưới ngưỡng sinh lời', expected_impact: 'Tiết kiệm 15M/tuần', impact_value: 15000000, confidence: 92, is_urgent: true },
    { id: '3', type: 'review_creative', priority: 'medium', campaign_name: 'New Collection', campaign_id: 'c3', channel: 'Shopee Ads', reason: 'CTR giảm 25% so với tuần trước', expected_impact: 'Cải thiện CTR 0.5%', confidence: 78, is_urgent: false },
    { id: '4', type: 'optimize_bid', priority: 'medium', campaign_name: 'Retargeting', campaign_id: 'c4', channel: 'Lazada Ads', reason: 'CPA cao hơn target 20%', expected_impact: 'Giảm CPA 15%', impact_value: 8000000, confidence: 72, is_urgent: false },
  ];

  const handleViewCampaignDetails = (campaignId: string) => {
    const campaign = marketingPerformance.find(c => c.campaign_id === campaignId);
    if (campaign) {
      setSelectedCampaign(campaign);
      setCampaignDialogOpen(true);
    }
  };

  const handleViewPlatformDetails = (platformName: string) => {
    const platform = platformAdsData.find(p => p.platform === platformName);
    if (platform) {
      setSelectedPlatform(platform);
      setPlatformDialogOpen(true);
    }
  };

  const handlePauseCampaign = (campaignId: string) => {
    toast.success('Campaign đã được tạm dừng');
    console.log('Pause campaign:', campaignId);
  };

  const handleResumeCampaign = (campaignId: string) => {
    toast.success('Campaign đã được kích hoạt lại');
    console.log('Resume campaign:', campaignId);
  };

  const handlePausePlatform = (platformName: string) => {
    toast.success(`${platformName} đã được tạm dừng`);
    console.log('Pause platform:', platformName);
  };

  const handleResumePlatform = (platformName: string) => {
    toast.success(`${platformName} đã được kích hoạt lại`);
    console.log('Resume platform:', platformName);
  };

  const handleAdjustBudget = (platformName: string, direction: 'up' | 'down') => {
    const action = direction === 'up' ? 'tăng' : 'giảm';
    toast.success(`Budget ${platformName} đã ${action} 20%`);
    console.log('Adjust budget:', platformName, direction);
  };

  // Calculate key metrics
  const totalSpend = advancedMetrics.total_spend;
  const totalRevenue = advancedMetrics.revenue;
  const avgROAS = advancedMetrics.roas;
  const totalClicks = advancedMetrics.total_clicks;

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">Unable to load marketing data</p>
                <p className="text-sm text-muted-foreground">Please try again later.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/portal')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Marketing Mode</h1>
              <p className="text-sm text-muted-foreground">
                Execution & Performance - Monitor and optimize marketing
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DataQualityIndicator dataSources={dataQualitySources} compact />
          <Button 
            variant="outline" 
            onClick={() => navigate('/mdp/cmo-mode')}
            className="gap-2"
          >
            <Target className="h-4 w-4" />
            {language === 'vi' ? 'Chuyển CMO Mode' : 'Switch to CMO Mode'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Budget Pacing Card */}
      <BudgetPacingCard />

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Ad Spend</div>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
            <Badge variant="secondary" className="mt-1 text-xs">This period</Badge>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Revenue Generated</div>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</div>
            <Badge variant="secondary" className="mt-1 text-xs">From ads</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Average ROAS</div>
            <div className={cn(
              "text-2xl font-bold",
              avgROAS >= 3 ? "text-emerald-600" : avgROAS >= 2 ? "text-foreground" : "text-amber-600"
            )}>
              {avgROAS.toFixed(2)}x
            </div>
            <Badge variant="secondary" className="mt-1 text-xs">Target: 3.0x</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Clicks</div>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            <Badge variant="secondary" className="mt-1 text-xs">All channels</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            {language === 'vi' ? 'Truy cập nhanh' : 'Quick Access'}
          </CardTitle>
          <CardDescription>
            {language === 'vi' 
              ? 'Các công cụ phân tích và tối ưu marketing'
              : 'Marketing analytics and optimization tools'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickLinks.map((link) => (
              <motion.button
                key={link.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(link.path)}
                className="flex flex-col items-start p-3 rounded-lg border bg-card hover:bg-muted/50 transition-all text-left group"
              >
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center mb-2">
                  <link.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium text-sm group-hover:text-primary transition-colors">
                  {language === 'vi' ? link.label : link.labelEn}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {link.description}
                </span>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <PerformanceOverview summary={marketingModeSummary} />
          <ChannelBreakdownPanel 
            onViewChannelDetails={(channel) => navigate(`/mdp/channels?channel=${channel}`)}
          />
          <AdvancedMetricsGrid metrics={advancedMetrics} period="Last 30 days" />
          <ExecutionAlertsPanel alerts={executionAlerts} />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <CampaignPerformanceTable 
            campaigns={marketingPerformance}
            onViewDetails={handleViewCampaignDetails}
            onPauseCampaign={handlePauseCampaign}
            onResumeCampaign={handleResumeCampaign}
          />
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <PlatformAdsOverview 
            platformData={platformAdsData}
            onViewDetails={handleViewPlatformDetails}
            onPausePlatform={handlePausePlatform}
            onResumePlatform={handleResumePlatform}
            onAdjustBudget={handleAdjustBudget}
          />
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <MarketingActionsPanel actions={marketingActions} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CampaignDetailDialog
        campaign={selectedCampaign}
        open={campaignDialogOpen}
        onOpenChange={setCampaignDialogOpen}
        onPauseCampaign={handlePauseCampaign}
        onResumeCampaign={handleResumeCampaign}
      />
      <PlatformDetailDialog
        platform={selectedPlatform}
        open={platformDialogOpen}
        onOpenChange={setPlatformDialogOpen}
        onPausePlatform={handlePausePlatform}
        onResumePlatform={handleResumePlatform}
        onAdjustBudget={handleAdjustBudget}
      />
    </div>
  );
}
