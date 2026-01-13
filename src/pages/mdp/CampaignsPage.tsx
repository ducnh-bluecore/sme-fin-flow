import { useState } from 'react';
import { useMDPData, MarketingPerformance } from '@/hooks/useMDPData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  CampaignPerformanceTable,
  CampaignDetailDialog,
  PerformanceOverview,
  ExecutionAlertsPanel,
  FinancialTruthOverlay,
} from '@/components/mdp/marketing-mode';

export default function CampaignsPage() {
  const { 
    marketingPerformance,
    executionAlerts,
    marketingModeSummary,
    cmoModeSummary,
    isLoading, 
    error,
  } = useMDPData();

  const [selectedCampaign, setSelectedCampaign] = useState<MarketingPerformance | null>(null);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);

  const handleViewCampaignDetails = (campaignId: string) => {
    const campaign = marketingPerformance.find(c => c.campaign_id === campaignId);
    if (campaign) {
      setSelectedCampaign(campaign);
      setCampaignDialogOpen(true);
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

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
          <AlertDescription>
            Không thể tải dữ liệu campaigns. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Hiệu suất Campaigns"
        subtitle="Theo dõi và quản lý hiệu suất các chiến dịch marketing"
      />

      {/* Financial Truth - Real Profit */}
      <FinancialTruthOverlay 
        cmoSummary={cmoModeSummary}
        marketingSummary={marketingModeSummary}
      />

      {/* Performance Overview */}
      <PerformanceOverview summary={marketingModeSummary} />
      
      {/* Campaign Table */}
      <CampaignPerformanceTable 
        campaigns={marketingPerformance}
        onViewDetails={handleViewCampaignDetails}
        onPauseCampaign={handlePauseCampaign}
        onResumeCampaign={handleResumeCampaign}
      />
      
      {/* Execution Alerts */}
      <ExecutionAlertsPanel alerts={executionAlerts} />

      {/* Campaign Detail Dialog */}
      <CampaignDetailDialog
        campaign={selectedCampaign}
        open={campaignDialogOpen}
        onOpenChange={setCampaignDialogOpen}
        onPauseCampaign={handlePauseCampaign}
        onResumeCampaign={handleResumeCampaign}
      />
    </div>
  );
}
