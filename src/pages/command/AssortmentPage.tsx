import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAssortmentData } from '@/hooks/inventory/useAssortmentData';
import HealthStrip from '@/components/command/SizeControlTower/HealthStrip';
import DecisionFeed from '@/components/command/SizeControlTower/DecisionFeed';
import TransfersTab from '@/components/command/SizeControlTower/TransfersTab';
import ProductsTab from '@/components/command/SizeControlTower/ProductsTab';
import HeatmapTab from '@/components/command/SizeControlTower/HeatmapTab';
import EvidenceDrawer from '@/components/command/EvidenceDrawer';

export default function AssortmentPage() {
  const {
    summary, transferByDest, heatmap,
    brokenDetails, riskDetails, allProductDetails,
    fcNames, storeNames, transfersByDest,
    projectedRecovery, projectedHealth, projectedHealthDelta,
    healthStatus, transferUnits, transferStyles, recoverableStyles,
    effortLevel, totalTransfers, isLoading,
    loadGroupDetails, loadingStates, PAGE_SIZE,
    evidenceProductId, setEvidenceProductId,
    evidencePack, evidenceRow, drawerSizeData, surplusStores,
    enrichedTransferByDest,
    runKpiEngine,
    activeTab, setActiveTab,
  } = useAssortmentData();

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">SIZE CONTROL TOWER</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">Revenue Protection Center</p>
        </div>
        <Button onClick={() => runKpiEngine.mutate()} disabled={runKpiEngine.isPending} size="sm" variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${runKpiEngine.isPending ? 'animate-spin' : ''}`} />
          {runKpiEngine.isPending ? 'Đang tính...' : 'Chạy Engine'}
        </Button>
      </motion.div>

      <HealthStrip
        avgHealthScore={summary.avgHealthScore}
        healthStatus={healthStatus}
        brokenCount={summary.brokenCount}
        riskCount={summary.riskCount}
        totalLostRevenue={summary.totalLostRevenue}
        totalCashLocked={summary.totalCashLocked}
        totalMarginLeak={summary.totalMarginLeak}
        projectedHealth={projectedHealth}
        projectedRecovery={projectedRecovery}
        transferUnits={transferUnits}
        recoverableStyles={recoverableStyles}
        effortLevel={effortLevel}
      />

      <DecisionFeed brokenDetails={brokenDetails} onViewEvidence={(pid) => setEvidenceProductId(pid)} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="transfers">
            🔄 Theo Cửa Hàng
            {summary.transferOpportunities > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">{summary.transferOpportunities}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="products">
            📦 Theo Sản Phẩm
            {(summary.brokenCount + summary.riskCount) > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">{summary.brokenCount + summary.riskCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="heatmap">🗺️ Heatmap & Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="transfers">
          <TransfersTab
            transferByDest={transferByDest}
            transfersByDest={transfersByDest}
            storeNames={storeNames}
            fcNames={fcNames}
            totalOpportunities={summary.transferOpportunities}
          />
        </TabsContent>

        <TabsContent value="products">
          <ProductsTab
            allProductDetails={allProductDetails}
            brokenDetails={brokenDetails}
            riskDetails={riskDetails}
            fcNames={fcNames}
            loadGroupDetails={loadGroupDetails}
            loadingStates={loadingStates}
            PAGE_SIZE={PAGE_SIZE}
          />
        </TabsContent>

        <TabsContent value="heatmap">
          <HeatmapTab
            heatmap={heatmap}
            projectedRecovery={projectedRecovery}
            transferUnits={transferUnits}
            recoverableStyles={recoverableStyles}
            effortLevel={effortLevel}
            totalTransfers={totalTransfers}
            enrichedTransferByDest={enrichedTransferByDest}
          />
        </TabsContent>
      </Tabs>

      <EvidenceDrawer
        evidenceProductId={evidenceProductId}
        onClose={() => setEvidenceProductId(null)}
        evidenceRow={evidenceRow}
        evidencePack={evidencePack || null}
        drawerSizeData={drawerSizeData}
        surplusStores={surplusStores}
        productName={evidenceRow?.product_name || (evidenceProductId && (fcNames?.get(evidenceProductId) || evidenceProductId)) || ''}
      />
    </div>
  );
}
