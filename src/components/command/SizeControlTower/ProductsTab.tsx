import ProductSizeMatrixCard from '@/components/command/ProductSizeMatrixCard';
import type { SizeHealthDetailRow } from '@/hooks/inventory/useSizeHealthGroups';

interface ProductsTabProps {
  allProductDetails: SizeHealthDetailRow[];
  brokenDetails: SizeHealthDetailRow[];
  riskDetails: SizeHealthDetailRow[];
  fcNames?: Map<string, string>;
  loadGroupDetails: (state: string, loadMore?: boolean) => void;
  loadingStates: Record<string, boolean>;
  PAGE_SIZE: number;
}

export default function ProductsTab({
  allProductDetails, brokenDetails, riskDetails,
  fcNames, loadGroupDetails, loadingStates, PAGE_SIZE,
}: ProductsTabProps) {
  return (
    <ProductSizeMatrixCard
      products={allProductDetails}
      fcNames={fcNames}
      onLoadMore={() => {
        loadGroupDetails('broken', true);
        loadGroupDetails('risk', true);
      }}
      isLoadingMore={loadingStates['broken'] || loadingStates['risk']}
      hasMore={
        (brokenDetails.length % PAGE_SIZE === 0 && brokenDetails.length > 0) ||
        (riskDetails.length % PAGE_SIZE === 0 && riskDetails.length > 0)
      }
    />
  );
}
