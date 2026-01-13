import { DateRangeIndicator } from '@/components/shared/DateRangeIndicator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { useMDPData } from '@/hooks/useMDPData';
import { MDPLayout, MDPMode } from '@/components/mdp/MDPLayout';

// Marketing Mode Components
import { 
  PerformanceOverview,
  CampaignPerformanceTable,
  FunnelChart,
  ExecutionAlertsPanel,
} from '@/components/mdp/marketing-mode';

// CMO Mode Components
import {
  ProfitAttributionPanel,
  CMOCashImpactPanel,
  RiskAlertsPanel,
  DecisionPanel,
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Marketing Data Platform</h1>
          <DateRangeIndicator />
        </div>
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
      return (
        <div className="space-y-6">
          {/* Performance Overview KPIs */}
          <PerformanceOverview summary={marketingModeSummary} />
          
          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left - Campaign Table (2 cols) */}
            <div className="lg:col-span-2">
              <CampaignPerformanceTable campaigns={marketingPerformance} />
            </div>
            
            {/* Right - Funnel & Alerts */}
            <div className="space-y-6">
              <FunnelChart funnelData={funnelData} />
              <ExecutionAlertsPanel alerts={executionAlerts} />
            </div>
          </div>
        </div>
      );
    }

    // CMO Mode
    return (
      <div className="space-y-6">
        {/* Profit Attribution - Full Width */}
        <ProfitAttributionPanel 
          profitData={profitAttribution} 
          summary={cmoModeSummary} 
        />
        
        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <CMOCashImpactPanel 
              cashImpact={cashImpact} 
              summary={cmoModeSummary} 
            />
          </div>
          
          {/* Right Column */}
          <div className="space-y-6">
            <RiskAlertsPanel 
              alerts={riskAlerts}
              onAction={(alert) => {
                console.log('CMO Action on alert:', alert);
                // TODO: Open decision dialog or create Control Tower task
              }}
            />
          </div>
        </div>

        {/* Decision Panel - Full Width */}
        <DecisionPanel 
          profitData={profitAttribution}
          cashImpact={cashImpact}
          summary={cmoModeSummary}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="flex justify-end">
        <DateRangeIndicator />
      </div>

      {/* MDP Layout with Mode Switcher */}
      <MDPLayout 
        criticalAlerts={cmoModeSummary.critical_alerts_count}
        executionAlerts={marketingModeSummary.execution_alerts_count}
      >
        {renderContent}
      </MDPLayout>
    </div>
  );
}
