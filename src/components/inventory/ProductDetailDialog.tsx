/**
 * ProductDetailDialog - Lifecycle detail for a single product
 * Shows timeline, milestone progress, metrics, and batch history
 */

import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, Package, DollarSign, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fcId: string | null;
  tenantId: string | null;
}

interface MilestoneItem {
  day: number;
  target_pct: number;
  actual_pct: number | null;
  status: string;
}

interface BatchItem {
  batch_id: string;
  batch_number: number;
  batch_qty: number;
  batch_start_date: string;
  source: string;
  is_completed: boolean;
  age_days: number;
}

interface ProductDetail {
  product: {
    id: string;
    fc_code: string;
    fc_name: string;
    category: string | null;
    subcategory: string | null;
  };
  batches: BatchItem[];
  active_batch: BatchItem | null;
  current_on_hand: number;
  lifecycle_days: number;
  milestones: MilestoneItem[];
  first_sale_date: string | null;
  current_sell_through: number;
  velocity_current: number;
  velocity_required: number;
  cash_at_risk: number;
}

const milestoneStatusConfig: Record<string, { label: string; icon: string; className: string }> = {
  ahead: { label: 'Ahead', icon: '✅', className: 'text-emerald-600 dark:text-emerald-400' },
  on_track: { label: 'On Track', icon: '✅', className: 'text-primary' },
  behind: { label: 'Behind', icon: '⚠️', className: 'text-amber-600 dark:text-amber-400' },
  upcoming: { label: 'Chưa tới', icon: '🔜', className: 'text-muted-foreground' },
  no_data: { label: 'No Data', icon: '—', className: 'text-muted-foreground' },
};

export default function ProductDetailDialog({ open, onOpenChange, fcId, tenantId }: ProductDetailDialogProps) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['lifecycle-product-detail', tenantId, fcId],
    queryFn: async () => {
      if (!tenantId || !fcId) return null;
      const { data, error } = await supabase.rpc('fn_lifecycle_product_detail', {
        p_tenant_id: tenantId,
        p_fc_id: fcId,
      });
      if (error) throw error;
      return data as unknown as ProductDetail;
    },
    enabled: !!tenantId && !!fcId && open,
  });

  const activeBatch = detail?.active_batch;
  const ageDays = activeBatch?.age_days ?? 0;
  const lifecycleDays = detail?.lifecycle_days ?? 180;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !detail?.product ? (
          <div className="text-center py-12 text-muted-foreground">Không tìm thấy sản phẩm</div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {detail.product.fc_name || detail.product.fc_code}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{detail.product.fc_code}</Badge>
                {detail.product.category && <Badge variant="secondary" className="text-xs">{detail.product.category}</Badge>}
                {activeBatch && <Badge variant="outline" className="text-xs">Batch #{activeBatch.batch_number} — {ageDays} ngày</Badge>}
                {detail.first_sale_date && <Badge variant="secondary" className="text-xs">Ngày bán đầu: {detail.first_sale_date}</Badge>}
              </DialogDescription>
            </DialogHeader>

            {/* Lifecycle Timeline */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Lifecycle Timeline</h4>
              <LifecycleTimeline
                ageDays={ageDays}
                lifecycleDays={lifecycleDays}
                milestones={detail.milestones}
              />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard icon={TrendingUp} label="Sell-through" value={`${detail.current_sell_through}%`} />
              <MetricCard icon={Zap} label="Velocity" value={`${detail.velocity_current}/ngày`} />
              <MetricCard icon={Clock} label="Cần/ngày" value={`${detail.velocity_required}`} accent={detail.velocity_required > detail.velocity_current} />
              <MetricCard icon={DollarSign} label="Cash at Risk" value={`${detail.cash_at_risk}M`} accent={detail.cash_at_risk > 10} />
            </div>

            {/* Inventory summary */}
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="py-3 text-center">
                <p className="text-xs text-muted-foreground">Tồn kho</p>
                <p className="text-lg font-bold tabular-nums">{detail.current_on_hand}</p>
              </CardContent></Card>
              <Card><CardContent className="py-3 text-center">
                <p className="text-xs text-muted-foreground">Đã bán (batch)</p>
                <p className="text-lg font-bold tabular-nums">{activeBatch ? activeBatch.batch_qty - detail.current_on_hand : 0}</p>
              </CardContent></Card>
            </div>

            {/* Milestone Progress Table */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Milestone Progress</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Giai đoạn</TableHead>
                    <TableHead className="text-center">Target</TableHead>
                    <TableHead className="text-center">Thực tế</TableHead>
                    <TableHead className="text-center">Gap</TableHead>
                    <TableHead className="text-center">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detail.milestones || []).map((m, i) => {
                    const sc = milestoneStatusConfig[m.status] || milestoneStatusConfig.no_data;
                    const gap = m.actual_pct != null ? Math.round(m.actual_pct - m.target_pct) : null;
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">0–{m.day}d</TableCell>
                        <TableCell className="text-center tabular-nums text-sm">{m.target_pct}%</TableCell>
                        <TableCell className="text-center tabular-nums text-sm">
                          {m.actual_pct != null ? `${m.actual_pct}%` : '—'}
                        </TableCell>
                        <TableCell className={cn('text-center tabular-nums text-sm', gap != null && gap < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400')}>
                          {gap != null ? `${gap > 0 ? '+' : ''}${gap}%` : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn('text-sm', sc.className)}>{sc.icon} {sc.label}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Batch History */}
            {detail.batches && detail.batches.length > 1 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Batch History ({detail.batches.length} batches)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-center">Số lượng</TableHead>
                      <TableHead>Ngày bắt đầu</TableHead>
                      <TableHead>Nguồn</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.batches.map(b => (
                      <TableRow key={b.batch_id}>
                        <TableCell className="font-medium text-sm">#{b.batch_number}</TableCell>
                        <TableCell className="text-center tabular-nums text-sm">{b.batch_qty}</TableCell>
                        <TableCell className="text-sm">{b.batch_start_date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{b.source}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={b.is_completed ? 'secondary' : 'default'} className="text-[10px]">
                            {b.is_completed ? 'Done' : 'Active'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LifecycleTimeline({ ageDays, lifecycleDays, milestones }: { ageDays: number; lifecycleDays: number; milestones: MilestoneItem[] }) {
  const progressPct = Math.min((ageDays / lifecycleDays) * 100, 100);
  const allDays = [0, ...(milestones || []).map(m => m.day)];

  return (
    <div className="relative px-2 py-4">
      {/* Track */}
      <div className="relative h-2 bg-muted rounded-full">
        <div className="absolute h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      {/* Milestone dots */}
      <div className="relative mt-1">
        {allDays.map((day, i) => {
          const left = (day / lifecycleDays) * 100;
          const milestone = milestones?.find(m => m.day === day);
          const isPast = ageDays >= day;
          return (
            <div key={i} className="absolute -translate-x-1/2" style={{ left: `${Math.min(left, 100)}%` }}>
              <div className={cn(
                'w-3 h-3 rounded-full border-2 -mt-[10px]',
                isPast ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/40'
              )} />
              <p className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">{day}d</p>
              {milestone && milestone.target_pct && (
                <p className="text-[9px] text-muted-foreground/70">{milestone.target_pct}%</p>
              )}
            </div>
          );
        })}
        {/* Current position indicator */}
        <div className="absolute -translate-x-1/2" style={{ left: `${progressPct}%` }}>
          <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-primary -mt-[14px]" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-6">
        Đang ở ngày <span className="font-semibold text-foreground">{ageDays}</span> / {lifecycleDays}
      </p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="py-3 px-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', accent ? 'text-destructive' : 'text-muted-foreground')} />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className={cn('text-sm font-bold tabular-nums', accent && 'text-destructive')}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
