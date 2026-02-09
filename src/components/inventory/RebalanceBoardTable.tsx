import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';

interface Props {
  suggestions: RebalanceSuggestion[];
  onApprove: (ids: string[]) => void;
  onReject: (ids: string[]) => void;
  transferType?: 'push' | 'lateral' | 'all';
}

const priorityColors: Record<string, string> = {
  P1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  P2: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  P3: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  executed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

export function RebalanceBoardTable({ suggestions, onApprove, onReject, transferType = 'all' }: Props) {
  const filtered = transferType === 'all' 
    ? suggestions 
    : suggestions.filter(s => s.transfer_type === transferType);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Chưa có đề xuất nào</p>
        <p className="text-sm mt-1">Nhấn "Chạy quét" để hệ thống phân tích và đề xuất cân bằng hàng</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Ưu tiên</TableHead>
            {transferType === 'all' && <TableHead className="w-20">Loại</TableHead>}
            <TableHead>Family Code</TableHead>
            <TableHead>Từ</TableHead>
            <TableHead>Đến</TableHead>
            <TableHead className="text-right">SL</TableHead>
            <TableHead>Cover trước</TableHead>
            <TableHead>Cover sau</TableHead>
            {(transferType === 'lateral' || transferType === 'all') && (
              <>
                <TableHead className="text-right">Chi phí VC</TableHead>
                <TableHead className="text-right">Net benefit</TableHead>
              </>
            )}
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="w-24">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${priorityColors[s.priority] || ''}`}>
                  {s.priority}
                </span>
              </TableCell>
              {transferType === 'all' && (
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {s.transfer_type === 'push' ? 'Push' : 'Lateral'}
                  </Badge>
                </TableCell>
              )}
              <TableCell className="font-medium text-sm">{s.fc_name || s.fc_id}</TableCell>
              <TableCell>
                <div className="text-sm">{s.from_location_name}</div>
                <div className="text-xs text-muted-foreground">{s.from_location_type}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{s.to_location_name}</div>
                <div className="text-xs text-muted-foreground">{s.to_location_type}</div>
              </TableCell>
              <TableCell className="text-right font-mono font-bold">{s.qty}</TableCell>
              <TableCell>
                <span className="text-xs">
                  {s.from_weeks_cover?.toFixed(1)}w → {s.to_weeks_cover?.toFixed(1)}w
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-emerald-600 font-medium">
                  {s.balanced_weeks_cover?.toFixed(1)}w
                </span>
              </TableCell>
              {(transferType === 'lateral' || transferType === 'all') && (
                <>
                  <TableCell className="text-right text-sm">
                    {s.logistics_cost_estimate ? `${(s.logistics_cost_estimate / 1_000_000).toFixed(1)}M` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-emerald-600">
                    {s.net_benefit ? `+${(s.net_benefit / 1_000_000).toFixed(1)}M` : '-'}
                  </TableCell>
                </>
              )}
              <TableCell className="text-right text-sm">
                +{(s.potential_revenue_gain / 1_000_000).toFixed(1)}M
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${statusColors[s.status] || ''}`}>
                  {s.status}
                </span>
              </TableCell>
              <TableCell>
                {s.status === 'pending' && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => onApprove([s.id])}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => onReject([s.id])}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
