import { useState } from 'react';
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
  Megaphone,
  Target,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMDPData, MarketingPerformance } from '@/hooks/useMDPData';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

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
    color: 'from-blue-500 to-blue-600'
  },
  { 
    id: 'channels', 
    label: 'Phân tích Kênh', 
    labelEn: 'Channel Analysis',
    icon: Layers, 
    path: '/mdp/channels',
    description: 'So sánh hiệu quả các kênh',
    color: 'from-purple-500 to-purple-600'
  },
  { 
    id: 'funnel', 
    label: 'Marketing Funnel', 
    labelEn: 'Marketing Funnel',
    icon: TrendingUp, 
    path: '/mdp/funnel',
    description: 'Phân tích tỷ lệ chuyển đổi',
    color: 'from-green-500 to-green-600'
  },
  { 
    id: 'ab-testing', 
    label: 'A/B Testing', 
    labelEn: 'A/B Testing',
    icon: Gauge, 
    path: '/mdp/ab-testing',
    description: 'Thử nghiệm và tối ưu',
    color: 'from-orange-500 to-orange-600'
  },
  { 
    id: 'audience', 
    label: 'Audience Insights', 
    labelEn: 'Audience Insights',
    icon: PieChart, 
    path: '/mdp/audience',
    description: 'Phân tích đối tượng',
    color: 'from-pink-500 to-pink-600'
  },
  { 
    id: 'roi-analytics', 
    label: 'ROI Analytics', 
    labelEn: 'ROI Analytics',
    icon: LineChart, 
    path: '/mdp/roi-analytics',
    description: 'Phân tích lợi nhuận đầu tư',
    color: 'from-emerald-500 to-emerald-600'
  },
  { 
    id: 'customer-ltv', 
    label: 'Customer LTV', 
    labelEn: 'Customer LTV',
    icon: DollarSign, 
    path: '/mdp/customer-ltv',
    description: 'Giá trị vòng đời khách hàng',
    color: 'from-cyan-500 to-cyan-600'
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

  // Mock platform data
  const platformAdsData: PlatformAdsData[] = [
    { platform: 'Shopee Ads', platform_icon: 'shopee', is_active: true, spend_today: 2500000, spend_month: 45000000, budget_month: 60000000, budget_utilization: 75, impressions: 850000, clicks: 12500, orders: 320, revenue: 128000000, cpm: 52941, cpc: 3600, ctr: 1.47, cvr: 2.56, cpa: 140625, roas: 2.84, acos: 35.2, add_to_cart: 2100, atc_rate: 16.8, quality_score: 8, relevance_score: 7, spend_trend: 5, cpa_trend: -3, roas_trend: 8 },
    { platform: 'Lazada Ads', platform_icon: 'lazada', is_active: true, spend_today: 1800000, spend_month: 32000000, budget_month: 40000000, budget_utilization: 80, impressions: 620000, clicks: 8900, orders: 210, revenue: 84000000, cpm: 51613, cpc: 3596, ctr: 1.44, cvr: 2.36, cpa: 152381, roas: 2.63, acos: 38.1, add_to_cart: 1450, atc_rate: 16.3, quality_score: 7, relevance_score: 8, spend_trend: 2, cpa_trend: 5, roas_trend: -2 },
    { platform: 'TikTok Shop', platform_icon: 'tiktok', is_active: true, spend_today: 3200000, spend_month: 58000000, budget_month: 70000000, budget_utilization: 83, impressions: 1200000, clicks: 28000, orders: 480, revenue: 168000000, cpm: 48333, cpc: 2071, ctr: 2.33, cvr: 1.71, cpa: 120833, roas: 2.90, acos: 34.5, add_to_cart: 3800, atc_rate: 13.6, spend_trend: 12, cpa_trend: -8, roas_trend: 15 },
    { platform: 'Meta Ads', platform_icon: 'meta', is_active: true, spend_today: 1500000, spend_month: 28000000, budget_month: 35000000, budget_utilization: 80, impressions: 480000, clicks: 6200, orders: 95, revenue: 47500000, cpm: 58333, cpc: 4516, ctr: 1.29, cvr: 1.53, cpa: 294737, roas: 1.70, acos: 58.9, add_to_cart: 820, atc_rate: 13.2, spend_trend: -5, cpa_trend: 12, roas_trend: -10 },
    { platform: 'Google Ads', platform_icon: 'google', is_active: false, spend_today: 0, spend_month: 8000000, budget_month: 20000000, budget_utilization: 40, impressions: 150000, clicks: 2100, orders: 42, revenue: 21000000, cpm: 53333, cpc: 3810, ctr: 1.40, cvr: 2.00, cpa: 190476, roas: 2.63, acos: 38.1, add_to_cart: 280, atc_rate: 13.3, quality_score: 6, spend_trend: -100, cpa_trend: 0, roas_trend: 0 },
  ];

  // Marketing Actions
  const marketingActions: MarketingAction[] = [
    { id: '1', type: 'scale_up', priority: 'high', campaign_name: 'Flash Sale Weekend', campaign_id: 'c1', channel: 'TikTok Shop', reason: 'ROAS 4.2x - vượt benchmark 40%', expected_impact: 'Tăng revenue 25%', impact_value: 42000000, confidence: 85, is_urgent: true },
    { id: '2', type: 'pause', priority: 'high', campaign_name: 'Brand Awareness Q1', campaign_id: 'c2', channel: 'Meta Ads', reason: 'ROAS 1.2x - dưới ngưỡng sinh lời', expected_impact: 'Tiết kiệm 15M/tuần', impact_value: 15000000, confidence: 92, is_urgent: true },
    { id: '3', type: 'review_creative', priority: 'medium', campaign_name: 'New Collection', campaign_id: 'c3', channel: 'Shopee Ads', reason: 'CTR giảm 25% so với tuần trước', expected_impact: 'Cải thiện CTR 0.5%', confidence: 78, is_urgent: false },
    { id: '4', type: 'optimize_bid', priority: 'medium', campaign_name: 'Retargeting', campaign_id: 'c4', channel: 'Lazada Ads', reason: 'CPA cao hơn target 20%', expected_impact: 'Giảm CPA 15%', impact_value: 8000000, confidence: 72, is_urgent: false },
  ];

  // Advanced Metrics
  const advancedMetrics: AdvancedMarketingMetrics = {
    total_impressions: 3300000, total_reach: 1850000, frequency: 1.78,
    total_clicks: 57700, ctr: 1.75, cpc: 2980, cpm: 52121,
    add_to_carts: 8450, atc_rate: 14.6, checkouts: 4800, checkout_rate: 56.8, orders: 1147, cvr: 1.99,
    revenue: 448500000, aov: 391000, roas: 2.61, acos: 38.3, cpa: 149869,
    total_spend: 172000000, profit_margin: 18.5, ltv_cac_ratio: 2.8,
    impressions_trend: 8, clicks_trend: 12, orders_trend: 15, revenue_trend: 18, cpa_trend: -5, roas_trend: 10,
  };

  // Handlers
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
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
          <AlertDescription>
            Không thể tải dữ liệu marketing. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20" />
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
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <Megaphone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Marketing Mode</h1>
            <p className="text-muted-foreground text-sm">
              {language === 'vi' 
                ? 'Execution & Performance - Theo dõi và tối ưu marketing'
                : 'Execution & Performance - Monitor and optimize marketing'}
            </p>
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

      {/* Budget Pacing Card - Uses unified data source internally */}
      <BudgetPacingCard />

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Ad Spend</div>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
            <Badge variant="secondary" className="mt-1 text-xs">This period</Badge>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Revenue Generated</div>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <Badge variant="secondary" className="mt-1 text-xs">From ads</Badge>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Average ROAS</div>
            <div className="text-2xl font-bold">{avgROAS.toFixed(2)}x</div>
            <Badge variant="secondary" className="mt-1 text-xs">Target: 3.0x</Badge>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {language === 'vi' ? 'Truy cập nhanh' : 'Quick Access'}
          </CardTitle>
          <CardDescription>
            {language === 'vi' 
              ? 'Các công cụ phân tích và tối ưu marketing'
              : 'Marketing analytics and optimization tools'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickLinks.map((link) => (
              <motion.button
                key={link.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(link.path)}
                className="flex flex-col items-start p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all text-left group"
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${link.color} mb-3`}>
                  <link.icon className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium text-sm group-hover:text-primary transition-colors">
                  {language === 'vi' ? link.label : link.labelEn}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {link.description}
                </span>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            {language === 'vi' ? 'Tổng quan' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            {language === 'vi' ? 'Campaigns' : 'Campaigns'}
          </TabsTrigger>
          <TabsTrigger value="platforms">
            {language === 'vi' ? 'Platforms' : 'Platforms'}
          </TabsTrigger>
          <TabsTrigger value="actions">
            {language === 'vi' ? 'Actions' : 'Actions'}
          </TabsTrigger>
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
