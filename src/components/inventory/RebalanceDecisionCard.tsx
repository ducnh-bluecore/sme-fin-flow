import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, ArrowRightLeft, TrendingUp, ShieldAlert } from 'lucide-react';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';

interface Props {
  suggestions: RebalanceSuggestion[];
  onApproveAllP1: () => void;
  isApproving?: boolean;
}

export function RebalanceDecisionCard({ suggestions, onApproveAllP1, isApproving }: Props) {
  const pushSuggestions = suggestions.filter(s => s.transfer_type === 'push');
  const lateralSuggestions = suggestions.filter(s => s.transfer_type === 'lateral');
  const pushUnits = pushSuggestions.reduce((s, r) => s + r.qty, 0);
  const lateralUnits = lateralSuggestions.reduce((s, r) => s + r.qty, 0);
  const totalRevenue = suggestions.reduce((s, r) => s + (r.potential_revenue_gain || 0), 0);
  const p1Pending = suggestions.filter(s => s.priority === 'P1' && s.status === 'pending');
  const uniqueToStores = new Set(pushSuggestions.map(s => s.to_location)).size;
  const uniquePairs = lateralSuggestions.length;

  if (suggestions.length === 0) return null;

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          Đề xuất chia hàng hôm nay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            <span className="text-sm">
              Push: <strong>{pushUnits.toLocaleString()} units</strong> → {uniqueToStores} stores
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-emerald-600" />
            <span className="text-sm">
              Lateral: <strong>{lateralUnits.toLocaleString()} units</strong> giữa {uniquePairs} cặp
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <span className="text-sm">
              Revenue: <strong>+{(totalRevenue / 1_000_000).toFixed(1)}M</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <span className="text-sm">
              P1 cần duyệt: <strong>{p1Pending.length}</strong>
            </span>
          </div>
        </div>

        {p1Pending.length > 0 && (
          <div className="flex gap-2 pt-2">
            <Button onClick={onApproveAllP1} disabled={isApproving} className="flex-1">
              {isApproving ? 'Đang duyệt...' : `Duyệt tất cả P1 (${p1Pending.length})`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
