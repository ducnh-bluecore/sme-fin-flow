import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Send, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';

interface FCGroup {
  fcId: string;
  fcName: string;
  highestPriority: string;
  suggestions: RebalanceSuggestion[];
  totalQty: number;
  totalRevenue: number;
  totalNetBenefit: number;
  avgWeeksCover: number;
  stockoutCount: number;
  avgVelocity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fcGroup: FCGroup | null;
  onApprove: (ids: string[]) => void;
  onReject: (ids: string[]) => void;
}

const priorityColors: Record<string, string> = {
  P1: 'bg-red-500/10 text-red-400 border-red-500/30',
  P2: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  P3: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

export function RebalanceDetailSheet({ open, onOpenChange, fcGroup, onApprove, onReject }: Props) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);

  if (!fcGroup) return null;

  const pendingIds = fcGroup.suggestions.filter(s => s.status === 'pending').map(s => s.id);

  const handleApproveAll = () => {
    if (pendingIds.length > 0) {
      onApprove(pendingIds);
      setConfirmApproveOpen(false);
      onOpenChange(false);
    }
  };

  const handleRejectAll = () => {
    if (pendingIds.length > 0) {
      onReject(pendingIds);
      setRejectDialogOpen(false);
      setRejectNote('');
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", priorityColors[fcGroup.highestPriority])}>
              <Package className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className="text-lg">{fcGroup.fcName}</SheetTitle>
              <SheetDescription>
                {fcGroup.suggestions.length} đề xuất • {fcGroup.totalQty.toLocaleString()} units
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Impact Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Tổng Units</p>
            <p className="text-lg font-bold">{fcGroup.totalQty.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Revenue tiềm năng</p>
            <p className="text-lg font-bold text-emerald-400">+{(fcGroup.totalRevenue / 1e6).toFixed(1)}M</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Net Benefit</p>
            <p className="text-lg font-bold text-emerald-400">+{(fcGroup.totalNetBenefit / 1e6).toFixed(1)}M</p>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Allocation Detail Table */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3">Chi tiết phân bổ</h3>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Từ</TableHead>
                  <TableHead className="text-xs">Đến</TableHead>
                  <TableHead className="text-xs text-right">SL</TableHead>
                  <TableHead className="text-xs">Cover</TableHead>
                  <TableHead className="text-xs">Lý do</TableHead>
                  <TableHead className="text-xs">TT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fcGroup.suggestions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">
                      <div>{s.from_location_name}</div>
                      <div className="text-muted-foreground">{s.from_location_type}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{s.to_location_name}</div>
                      <div className="text-muted-foreground">{s.to_location_type}</div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold">{s.qty}</TableCell>
                    <TableCell className="text-xs">
                      <span className="text-muted-foreground">{s.from_weeks_cover?.toFixed(1)}w</span>
                      <span className="mx-1">→</span>
                      <span className="text-emerald-400 font-medium">{s.balanced_weeks_cover?.toFixed(1)}w</span>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px]">
                      <div className="font-medium">{s.reason}</div>
                      {(s as any).explain_text && (
                        <div className="text-muted-foreground mt-1 whitespace-pre-wrap text-[11px] leading-relaxed">
                          {(s as any).explain_text}
                        </div>
                      )}
                      {(s as any).constraint_checks && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {Object.entries((s as any).constraint_checks as Record<string, any>).map(([key, val]) => (
                            <Badge key={key} variant="outline" className={cn("text-[9px] font-normal", val === true || val === 'pass' ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400')}>
                              {key}: {String(val)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Actions */}
        {pendingIds.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <Dialog open={confirmApproveOpen} onOpenChange={setConfirmApproveOpen}>
              <DialogTrigger asChild>
                <Button className="flex-col h-auto py-4 gap-2 w-full">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-xs">Duyệt & Thực thi ({pendingIds.length})</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Xác nhận duyệt</DialogTitle>
                  <DialogDescription>
                    Duyệt {pendingIds.length} đề xuất cho {fcGroup.fcName} ({fcGroup.totalQty.toLocaleString()} units)?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmApproveOpen(false)}>Hủy</Button>
                  <Button onClick={handleApproveAll}>
                    <Send className="h-4 w-4 mr-2" />Phê duyệt
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-col h-auto py-4 gap-2 w-full border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <XCircle className="h-5 w-5" />
                  <span className="text-xs">Từ chối ({pendingIds.length})</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Từ chối đề xuất</DialogTitle>
                  <DialogDescription>
                    Từ chối {pendingIds.length} đề xuất cho {fcGroup.fcName}. Ghi lý do bên dưới.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Lý do từ chối..."
                  className="mt-2"
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Hủy</Button>
                  <Button variant="destructive" onClick={handleRejectAll}>Từ chối</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
