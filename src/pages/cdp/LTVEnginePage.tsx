import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { LTVOverview } from '@/components/cdp/ltv/LTVOverview';
import { LTVByCohort } from '@/components/cdp/ltv/LTVByCohort';
import { LTVBySource } from '@/components/cdp/ltv/LTVBySource';
import { AssumptionEditor } from '@/components/cdp/ltv/AssumptionEditor';
import { ScenarioBuilder, Scenario } from '@/components/cdp/ltv/ScenarioBuilder';
import { ScenarioComparison } from '@/components/cdp/ltv/ScenarioComparison';
import { LTVDecayAlert } from '@/components/cdp/ltv/LTVDecayAlert';
import { useLTVScenarioComparison, useLTVDecayDetection, useCreateDecayDecisionCard } from '@/hooks/useCDPScenarios';
import { useActiveLTVModel } from '@/hooks/useCDPLTVEngine';
import { LayoutGrid, Users, Megaphone, Settings, Sparkles, AlertTriangle } from 'lucide-react';

export default function LTVEnginePage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const { data: activeModel } = useActiveLTVModel();
  
  const { data: scenarioResults = [], isLoading: scenariosLoading } = useLTVScenarioComparison(
    activeModel?.id || null, 
    scenarios
  );
  const { data: decayAlerts = [], isLoading: decayLoading } = useLTVDecayDetection();
  const createDecisionCard = useCreateDecayDecisionCard();

  return (
    <CDPLayout>
      <Helmet>
        <title>LTV Engine | Giá trị Khách hàng - Bluecore</title>
        <meta name="description" content="Phân tích và dự báo giá trị vòng đời khách hàng với mô hình tùy chỉnh" />
      </Helmet>

      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold mb-1">LTV Intelligence Engine</h1>
          <p className="text-sm text-muted-foreground">
            Phân tích và dự báo giá trị vòng đời khách hàng với giả định tùy chỉnh
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="cohort" className="gap-2">
              <Users className="h-4 w-4" />
              Theo Cohort
            </TabsTrigger>
            <TabsTrigger value="source" className="gap-2">
              <Megaphone className="h-4 w-4" />
              Theo Nguồn
            </TabsTrigger>
            <TabsTrigger value="whatif" className="gap-2">
              <Sparkles className="h-4 w-4" />
              What-If
            </TabsTrigger>
            <TabsTrigger value="decay" className="gap-2 relative">
              <AlertTriangle className="h-4 w-4" />
              Decay Alert
              {decayAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                  {decayAlerts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Mô hình
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <LTVOverview />
          </TabsContent>

          <TabsContent value="cohort">
            <LTVByCohort />
          </TabsContent>

          <TabsContent value="source">
            <LTVBySource />
          </TabsContent>

          <TabsContent value="whatif">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <ScenarioBuilder 
                  scenarios={scenarios}
                  onScenariosChange={setScenarios}
                />
              </div>
              <div className="lg:col-span-2">
                <ScenarioComparison 
                  results={scenarioResults}
                  isLoading={scenariosLoading}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="decay">
            <LTVDecayAlert 
              alerts={decayAlerts}
              isLoading={decayLoading}
              onCreateDecisionCard={(alert) => createDecisionCard.mutate(alert)}
            />
          </TabsContent>

          <TabsContent value="settings">
            <AssumptionEditor />
          </TabsContent>
        </Tabs>
      </div>
    </CDPLayout>
  );
}
