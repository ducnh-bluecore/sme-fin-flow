import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  GitBranch,
  FlaskConical,
  Download,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Import the existing page components
import ScenarioPage from './ScenarioPage';
import { WhatIfSimulationPanel } from '@/components/whatif/WhatIfSimulationPanel';
import { useWhatIfScenarios, type WhatIfScenario } from '@/hooks/useWhatIfScenarios';
import { useCreateScenario } from '@/hooks/useScenarioData';
import { useKPIData } from '@/hooks/useKPIData';
import { useAuth } from '@/hooks/useAuth';

export default function ScenarioHubPage() {
  const [activeTab, setActiveTab] = useState('scenario');

  // What-If -> Financial scenario import
  const { user } = useAuth();
  const { data: kpiData } = useKPIData();
  const { data: whatIfScenarios } = useWhatIfScenarios();
  const createScenario = useCreateScenario();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const currentBaseRevenue = useMemo(() => {
    // Same convention used elsewhere: totalRevenue is annual -> divide by 12
    return kpiData?.totalRevenue ? kpiData.totalRevenue / 12 : 0;
  }, [kpiData]);

  const handleImportWhatIfScenario = async (whatIfScenario: WhatIfScenario) => {
    await createScenario.mutateAsync({
      name: `[What-If] ${whatIfScenario.name}`,
      description: whatIfScenario.description || `Imported từ What-If: ${whatIfScenario.name}`,
      base_revenue: currentBaseRevenue,
      base_costs: currentBaseRevenue * 0.7,
      revenue_change: whatIfScenario.params?.revenueChange ?? 0,
      cost_change: whatIfScenario.params?.cogsChange ?? 0,
      calculated_ebitda: whatIfScenario.results?.ebitda ?? null,
      created_by: user?.id || null,
      is_primary: null,
    });
    setIsImportDialogOpen(false);
  };

  return (
    <>
      <Helmet>
        <title>Kịch bản & Mô phỏng | Bluecore Finance</title>
        <meta name="description" content="Lập kế hoạch kịch bản và phân tích What-If" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              {activeTab === 'scenario' ? (
                <GitBranch className="w-6 h-6 text-primary" />
              ) : (
                <FlaskConical className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Kịch bản & Mô phỏng</h1>
              <p className="text-muted-foreground">Scenario Planning & What-If Analysis</p>
            </div>
          </div>

          {activeTab === 'scenario' && (whatIfScenarios?.length || 0) > 0 && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                <Download className="mr-2 h-4 w-4" />
                Import từ What-If
                <Badge variant="secondary" className="ml-2">
                  {whatIfScenarios?.length || 0}
                </Badge>
              </Button>
            </div>
          )}
        </motion.div>

        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Import từ What-If</DialogTitle>
              <DialogDescription>
                Chọn 1 kịch bản What-If đã lưu để tạo "Kịch bản tài chính".
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {(whatIfScenarios || []).map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{s.name}</div>
                    {s.description ? (
                      <div className="text-sm text-muted-foreground line-clamp-2">{s.description}</div>
                    ) : null}
                  </div>
                  <Button
                    onClick={() => handleImportWhatIfScenario(s)}
                    disabled={createScenario.isPending}
                  >
                    Import
                  </Button>
                </div>
              ))}

              {(whatIfScenarios || []).length === 0 && (
                <div className="text-sm text-muted-foreground">Chưa có kịch bản What-If nào.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="scenario" className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Kịch bản tài chính
            </TabsTrigger>
            <TabsTrigger value="whatif" className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              What-If
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scenario" className="mt-6">
            {/* Embed ScenarioPage - it has its own internal structure */}
            <div className="scenario-page-embedded [&_.scenario-header]:hidden">
              <ScenarioPage />
            </div>
          </TabsContent>

          <TabsContent value="whatif" className="mt-6">
            {/* WhatIfSimulationPanel has its own internal tabs for Cơ bản/Bán lẻ */}
            <WhatIfSimulationPanel />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
