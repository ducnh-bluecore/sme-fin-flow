import StoreHeatmap from './StoreHeatmap';
import ActionImpactPanel from './ActionImpactPanel';

interface HeatmapTabProps {
  heatmap: { data: any[] | undefined; isLoading: boolean };
  projectedRecovery: number;
  transferUnits: number;
  recoverableStyles: number;
  effortLevel: string;
  totalTransfers: number;
  enrichedTransferByDest: any[];
}

export default function HeatmapTab({
  heatmap, projectedRecovery, transferUnits,
  recoverableStyles, effortLevel, totalTransfers, enrichedTransferByDest,
}: HeatmapTabProps) {
  return (
    <div className="flex gap-4">
      <StoreHeatmap data={heatmap.data || []} isLoading={heatmap.isLoading} />
      <ActionImpactPanel
        projectedRecovery={projectedRecovery}
        transferUnits={transferUnits}
        recoverableStyles={recoverableStyles}
        effortLevel={effortLevel}
        totalTransfers={totalTransfers}
        transferByDest={enrichedTransferByDest}
      />
    </div>
  );
}
