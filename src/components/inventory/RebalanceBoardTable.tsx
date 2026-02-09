import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, HelpCircle } from 'lucide-react';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';

interface Props {
  suggestions: RebalanceSuggestion[];
  onApprove: (ids: string[], editedQty?: Record<string, number>) => void;
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

function HeaderWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function RebalanceBoardTable({ suggestions, onApprove, onReject, transferType = 'all' }: Props) {
  const [editedQty, setEditedQty] = useState<Record<string, number>>({});

  const filtered = transferType === 'all' 
    ? suggestions 
    : suggestions.filter(s => s.transfer_type === transferType);

  const getDisplayQty = (s: RebalanceSuggestion) => editedQty[s.id] ?? s.qty;
  const isEdited = (s: RebalanceSuggestion) => s.id in editedQty && editedQty[s.id] !== s.qty;

  const handleApprove = (id: string) => {
    const edited: Record<string, number> = {};
    if (id in editedQty) edited[id] = editedQty[id];
    onApprove([id], Object.keys(edited).length > 0 ? edited : undefined);
  };

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Chưa có đề xuất nào</p>
        <p className="text-sm mt-1">Nhấn "Chạy quét" để hệ thống phân tích và đề xuất cân bằng hàng</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">
                <HeaderWithTooltip label="Ưu tiên" tooltip="P1: Sắp hết hàng (< 0.5 tuần). P2: Cover thấp (< 2 tuần). P3: Tối ưu phân bổ." />
              </TableHead>
              {transferType === 'all' && (
                <TableHead className="w-20">
                  <HeaderWithTooltip label="Loại" tooltip="Push: Từ kho tổng xuống store. Lateral: Chuyển ngang giữa các kho/store." />
                </TableHead>
              )}
              <TableHead>
                <HeaderWithTooltip label="Sản phẩm" tooltip="Tên sản phẩm (Family Code) — nhóm các SKU cùng mẫu, khác size." />
              </TableHead>
              <TableHead>
                <HeaderWithTooltip label="Từ" tooltip="Kho/store nguồn — nơi đang thừa hàng hoặc kho tổng." />
              </TableHead>
              <TableHead>
                <HeaderWithTooltip label="Đến" tooltip="Kho/store đích — nơi đang thiếu hàng cần bổ sung." />
              </TableHead>
              <TableHead className="text-right">
                <HeaderWithTooltip label="SL" tooltip="Số lượng đề xuất chuyển. Có thể chỉnh sửa trước khi duyệt." />
              </TableHead>
              <TableHead>
                <HeaderWithTooltip label="Cover trước" tooltip="Số tuần tồn kho tại nguồn → đích TRƯỚC khi chuyển." />
              </TableHead>
              <TableHead>
                <HeaderWithTooltip label="Cover sau" tooltip="Số tuần tồn kho dự kiến tại đích SAU khi chuyển." />
              </TableHead>
              {(transferType === 'lateral' || transferType === 'all') && (
                <>
                  <TableHead className="text-right">
                    <HeaderWithTooltip label="Chi phí VC" tooltip="Chi phí vận chuyển ước tính cho lần chuyển hàng này." />
                  </TableHead>
                  <TableHead className="text-right">
                    <HeaderWithTooltip label="Net benefit" tooltip="Lợi ích ròng = Doanh thu tiềm năng − Chi phí vận chuyển." />
                  </TableHead>
                </>
              )}
              <TableHead className="text-right">
                <HeaderWithTooltip label="Revenue" tooltip="Doanh thu tiềm năng nếu hàng được bán tại điểm đích." />
              </TableHead>
              <TableHead>
                <HeaderWithTooltip label="Trạng thái" tooltip="Pending: Chờ duyệt. Approved: Đã duyệt. Rejected: Đã từ chối." />
              </TableHead>
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
                <TableCell className="font-medium text-sm max-w-[180px] truncate" title={s.fc_name || s.fc_id}>
                  {s.fc_name || s.fc_id}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{s.from_location_name}</div>
                  <div className="text-xs text-muted-foreground">{s.from_location_type}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{s.to_location_name}</div>
                  <div className="text-xs text-muted-foreground">{s.to_location_type}</div>
                </TableCell>
                <TableCell className="text-right">
                  {s.status === 'pending' ? (
                    <div className="flex items-center justify-end gap-1.5">
                      {isEdited(s) && (
                        <span className="text-xs text-muted-foreground line-through">{s.qty}</span>
                      )}
                      <Input
                        type="number"
                        value={getDisplayQty(s)}
                        onChange={e => setEditedQty(prev => ({ ...prev, [s.id]: Number(e.target.value) || 0 }))}
                        className="h-7 w-20 text-right font-mono font-bold text-sm"
                        min={0}
                      />
                    </div>
                  ) : (
                    <span className="font-mono font-bold">{s.qty}</span>
                  )}
                </TableCell>
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
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => handleApprove(s.id)}>
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
    </TooltipProvider>
  );
}
