import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { useMDPData, MarketingPerformance } from '@/hooks/useMDPData';
import { MDPModeSwitcher, MDPMode } from '@/components/mdp/MDPModeSwitcher';
import { toast } from 'sonner';

// Marketing Mode Components
import { 
  PerformanceOverview,
  CampaignPerformanceTable,
  FunnelChart,
  ExecutionAlertsPanel,
  PlatformAdsOverview,
  MarketingActionsPanel,
  AdvancedMetricsGrid,
  CampaignDetailDialog,
  PlatformDetailDialog,
  PlatformAdsData,
  MarketingAction,
  AdvancedMarketingMetrics,
} from '@/components/mdp/marketing-mode';

// CMO Mode Components
import {
  ProfitAttributionPanel,
  CMOCashImpactPanel,
  RiskAlertsPanel,
  DecisionPanel,
  CMOCommandCenter,
  QuickActionCards,
} from '@/components/mdp/cmo-mode';


export default function MDPDashboardPage() {
  const { 
    // Marketing Mode
    marketingPerformance,
    funnelData,
    executionAlerts,
    marketingModeSummary,
    
    // CMO Mode
    profitAttribution,
    cashImpact,
    riskAlerts,
    cmoModeSummary,
    
    // Shared
    isLoading, 
    error,
  } = useMDPData();

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

  const renderContent = (mode: MDPMode) => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-32" />
          <div className="grid lg:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      );
    }

    if (mode === 'marketing') {
      const marketingActions: MarketingAction[] = [
        { id: '1', type: 'scale_up', priority: 'high', campaign_name: 'Flash Sale Weekend', campaign_id: 'c1', channel: 'TikTok Shop', reason: 'ROAS 4.2x - vượt benchmark 40%', expected_impact: 'Tăng revenue 25%', impact_value: 42000000, confidence: 85, is_urgent: true },
        { id: '2', type: 'pause', priority: 'high', campaign_name: 'Brand Awareness Q1', campaign_id: 'c2', channel: 'Meta Ads', reason: 'ROAS 1.2x - dưới ngưỡng sinh lời', expected_impact: 'Tiết kiệm 15M/tuần', impact_value: 15000000, confidence: 92, is_urgent: true },
        { id: '3', type: 'review_creative', priority: 'medium', campaign_name: 'New Collection', campaign_id: 'c3', channel: 'Shopee Ads', reason: 'CTR giảm 25% so với tuần trước', expected_impact: 'Cải thiện CTR 0.5%', confidence: 78, is_urgent: false },
        { id: '4', type: 'optimize_bid', priority: 'medium', campaign_name: 'Retargeting', campaign_id: 'c4', channel: 'Lazada Ads', reason: 'CPA cao hơn target 20%', expected_impact: 'Giảm CPA 15%', impact_value: 8000000, confidence: 72, is_urgent: false },
      ];

      const advancedMetrics: AdvancedMarketingMetrics = {
        total_impressions: 3300000, total_reach: 1850000, frequency: 1.78,
        total_clicks: 57700, ctr: 1.75, cpc: 2980, cpm: 52121,
        add_to_carts: 8450, atc_rate: 14.6, checkouts: 4800, checkout_rate: 56.8, orders: 1147, cvr: 1.99,
        revenue: 448500000, aov: 391000, roas: 2.61, acos: 38.3, cpa: 149869,
        total_spend: 172000000, profit_margin: 18.5, ltv_cac_ratio: 2.8,
        impressions_trend: 8, clicks_trend: 12, orders_trend: 15, revenue_trend: 18, cpa_trend: -5, roas_trend: 10,
      };

      return (
        <div className="space-y-6">
          {/* Platform Ads Overview */}
          <PlatformAdsOverview 
            platformData={platformAdsData}
            onViewDetails={handleViewPlatformDetails}
            onPausePlatform={handlePausePlatform}
            onResumePlatform={handleResumePlatform}
            onAdjustBudget={handleAdjustBudget}
          />
          
          {/* Advanced Metrics Grid */}
          <AdvancedMetricsGrid metrics={advancedMetrics} period="Last 30 days" />

          {/* Marketing Actions */}
          <MarketingActionsPanel actions={marketingActions} />
          
          {/* Performance Overview KPIs */}
          <PerformanceOverview summary={marketingModeSummary} />
          
          {/* Campaign Table */}
          <CampaignPerformanceTable 
            campaigns={marketingPerformance}
            onViewDetails={handleViewCampaignDetails}
            onPauseCampaign={handlePauseCampaign}
            onResumeCampaign={handleResumeCampaign}
          />
          
          {/* Marketing Funnel */}
          <FunnelChart funnelData={funnelData} />
          
          {/* Execution Alerts */}
          <ExecutionAlertsPanel alerts={executionAlerts} />
        </div>
      );
    }

    // CMO Mode
    return (
      <div className="space-y-6">
        {/* Quick Action Cards - Decision-first */}
        <QuickActionCards 
          profitData={profitAttribution}
          cashImpact={cashImpact}
          summary={cmoModeSummary}
        />

        {/* CMO Command Center - Main decision hub */}
        <CMOCommandCenter 
          profitData={profitAttribution}
          cashImpact={cashImpact}
          riskAlerts={riskAlerts}
          summary={cmoModeSummary}
        />
        
        {/* Profit Attribution - Detail view */}
        <ProfitAttributionPanel 
          profitData={profitAttribution} 
          summary={cmoModeSummary} 
        />
        
        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <CMOCashImpactPanel 
              cashImpact={cashImpact} 
              summary={cmoModeSummary} 
            />
          </div>
          
          <div className="space-y-6">
            <RiskAlertsPanel 
              alerts={riskAlerts}
              onAction={(alert) => {
                console.log('CMO Action on alert:', alert);
              }}
            />
          </div>
        </div>

        {/* Decision Panel - Channel-level */}
        <DecisionPanel 
          profitData={profitAttribution}
          cashImpact={cashImpact}
          summary={cmoModeSummary}
        />
      </div>
    );
  };

  return (
    <>
      <MDPModeSwitcher 
        criticalAlerts={cmoModeSummary.critical_alerts_count}
        executionAlerts={marketingModeSummary.execution_alerts_count}
      >
        {renderContent}
      </MDPModeSwitcher>

      {/* Campaign Detail Dialog */}
      <CampaignDetailDialog
        campaign={selectedCampaign}
        open={campaignDialogOpen}
        onOpenChange={setCampaignDialogOpen}
        onPauseCampaign={handlePauseCampaign}
        onResumeCampaign={handleResumeCampaign}
      />

      {/* Platform Detail Dialog */}
      <PlatformDetailDialog
        platform={selectedPlatform}
        open={platformDialogOpen}
        onOpenChange={setPlatformDialogOpen}
        onPausePlatform={handlePausePlatform}
        onResumePlatform={handleResumePlatform}
        onAdjustBudget={handleAdjustBudget}
      />
    </>
  );
}
