import TransferSuggestionsCard from '@/components/command/TransferSuggestionsCard';

interface TransfersTabProps {
  transferByDest: any[];
  transfersByDest: Map<string, any[]>;
  storeNames?: Map<string, string>;
  fcNames?: Map<string, string>;
  totalOpportunities: number;
}

export default function TransfersTab({
  transferByDest, transfersByDest, storeNames, fcNames, totalOpportunities,
}: TransfersTabProps) {
  if (transferByDest.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Chưa có đề xuất điều chuyển</div>;
  }

  if (!fcNames) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Đang tải tên sản phẩm...</div>;
  }

  return (
    <TransferSuggestionsCard
      transferByDest={transferByDest}
      detailRows={transfersByDest}
      storeNames={storeNames}
      fcNames={fcNames}
      totalOpportunities={totalOpportunities}
    />
  );
}
