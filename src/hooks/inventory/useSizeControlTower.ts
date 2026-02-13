/**
 * Aggregate hook for Size Control Tower — pulls from DB views only.
 * No raw row queries, no 1000-row limit issues.
 */
import { useSizeIntelligenceSummary } from './useSizeIntelligenceSummary';
import { useStoreHeatmap } from './useStoreHeatmap';
import { useSizeHealthGroups } from './useSizeHealthGroups';

export function useSizeControlTower() {
  const { summary, transferByDest, isLoading: summaryLoading } = useSizeIntelligenceSummary();
  const heatmap = useStoreHeatmap();
  const { groups, isLoading: groupsLoading, detailCache, loadingStates, loadGroupDetails, PAGE_SIZE } = useSizeHealthGroups();

  // Projected impact from pending transfers
  const projectedRecovery = summary.totalTransferNetBenefit;
  const transferUnits = transferByDest.reduce((s, d: any) => s + (d.total_qty || 0), 0);
  const transferStyles = transferByDest.reduce((s, d: any) => s + (d.unique_products || 0), 0);

  // Projected health improvement (rough: each recovered style improves score)
  const totalStyles = summary.totalProducts || 1;
  const recoverableStyles = Math.min(transferStyles, summary.brokenCount);
  const projectedHealthDelta = totalStyles > 0 ? (recoverableStyles / totalStyles) * 20 : 0;
  const projectedHealth = summary.avgHealthScore !== null
    ? Math.min(100, summary.avgHealthScore + projectedHealthDelta)
    : null;

  // Health status
  const healthStatus = summary.avgHealthScore === null ? 'UNKNOWN'
    : summary.avgHealthScore >= 80 ? 'GOOD'
    : summary.avgHealthScore >= 60 ? 'WARNING'
    : 'CRITICAL';

  // Effort level based on transfer count
  const totalTransfers = summary.transferOpportunities;
  const effortLevel = totalTransfers <= 10 ? 'THẤP' : totalTransfers <= 50 ? 'TRUNG BÌNH' : 'CAO';

  return {
    summary,
    transferByDest,
    heatmap,
    groups,
    detailCache,
    loadingStates,
    loadGroupDetails,
    PAGE_SIZE,
    // Derived
    projectedRecovery,
    projectedHealth,
    projectedHealthDelta,
    healthStatus,
    transferUnits,
    transferStyles,
    recoverableStyles,
    effortLevel,
    totalTransfers,
    isLoading: summaryLoading || groupsLoading,
  };
}
