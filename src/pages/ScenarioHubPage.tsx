import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { 
  GitBranch, 
  FlaskConical,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import the existing page components
import ScenarioPage from './ScenarioPage';
import { WhatIfSimulationPanel } from '@/components/whatif/WhatIfSimulationPanel';

export default function ScenarioHubPage() {
  const [activeTab, setActiveTab] = useState('scenario');

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
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Kịch bản & Mô phỏng
              </h1>
              <p className="text-muted-foreground">Scenario Planning & What-If Analysis</p>
            </div>
          </div>
        </motion.div>

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
