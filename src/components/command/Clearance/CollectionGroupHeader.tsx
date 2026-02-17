import { Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import type { ClearanceCandidate } from '@/hooks/inventory/useClearanceIntelligence';

export interface CollectionGroup {
  name: string;
  season: string | null;
  candidates: ClearanceCandidate[];
  totalValue: number;
}

export default function CollectionGroupHeader({ group }: { group: CollectionGroup }) {
  return (
    <div className="flex items-center justify-between w-full py-1">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-blue-500" />
        <span className="font-semibold text-sm">{group.name}</span>
        {group.season && <Badge variant="outline" className="text-xs">{group.season}</Badge>}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{group.candidates.length} SP</span>
        <span className="font-mono">{formatCurrency(group.totalValue)}</span>
      </div>
    </div>
  );
}
