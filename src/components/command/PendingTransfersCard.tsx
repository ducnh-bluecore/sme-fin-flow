import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, ArrowRight, ClipboardList } from 'lucide-react';
import { useManualTransfers } from '@/hooks/inventory/useManualTransfers';
import { useApproveManualTransfer } from '@/hooks/inventory/useApproveManualTransfer';

export default function PendingTransfersCard() {
  const { data: transfers = [], isLoading } = useManualTransfers('pending');
  const approve = useApproveManualTransfer();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleAll = () => {
    if (selected.size === transfers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transfers.map(t => t.id)));
    }
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAction = (action: 'approved' | 'rejected') => {
    if (selected.size === 0) return;
    approve.mutate({ ids: Array.from(selected), action }, {
      onSuccess: () => setSelected(new Set()),
    });
  };

  if (isLoading) return <Card><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>;
  if (transfers.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Lệnh Điều Chuyển Thủ Công Chờ Duyệt
            <Badge variant="secondary" className="text-[10px]">{transfers.length}</Badge>
          </CardTitle>
          {selected.size > 0 && (
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAction('rejected')} disabled={approve.isPending}>
                <X className="h-3 w-3" /> Từ chối ({selected.size})
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction('approved')} disabled={approve.isPending}>
                <Check className="h-3 w-3" /> Duyệt ({selected.size})
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox checked={selected.size === transfers.length && transfers.length > 0} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead className="text-xs">Sản phẩm</TableHead>
              <TableHead className="text-xs">Từ</TableHead>
              <TableHead className="text-xs w-8" />
              <TableHead className="text-xs">Đến</TableHead>
              <TableHead className="text-xs text-center">SL</TableHead>
              <TableHead className="text-xs">Ngày tạo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map(t => (
              <TableRow key={t.id} className={selected.has(t.id) ? 'bg-primary/5' : ''}>
                <TableCell className="p-2">
                  <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} />
                </TableCell>
                <TableCell className="text-xs font-medium">{t.fc_name || t.fc_id}</TableCell>
                <TableCell className="text-xs">{t.from_store_name}</TableCell>
                <TableCell className="p-0"><ArrowRight className="h-3 w-3 text-muted-foreground" /></TableCell>
                <TableCell className="text-xs">{t.to_store_name}</TableCell>
                <TableCell className="text-center text-xs font-mono font-semibold">{t.qty}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString('vi-VN')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
