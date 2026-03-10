/**
 * ProductDetailPage - Full-page product lifecycle detail
 * Replaces the old dialog approach with a spacious layout:
 * Left column: Lifecycle + Metrics + Milestones + Batches
 * Right column: Channel Sales + AI Insight
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Loader2, TrendingUp, Package, DollarSign, Clock, Zap,
  ShoppingBag, Sparkles, Store, Percent, Tag, ArrowLeft,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useTenantContext } from '@/contexts/TenantContext';
import { useProductChannelSales } from '@/hooks/inventory/useProductChannelSales';
import { toast } from 'sonner';

// ── Types ──

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
  total_sold: number;
  initial_qty: number;
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

// ── Main Page ──

export default function ProductDetailPage() {
  const { fcId } = useParams<{ fcId: string }>();
  const navigate = useNavigate();
  const { activeTenant } = useTenantContext();
  const tenantId = activeTenant?.id ?? null;
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const { data: detail, isLoading, error } = useQuery({
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
    enabled: !!tenantId && !!fcId,
  });

  const fcCode = detail?.product?.fc_code || null;
  const { data: channelData, isLoading: channelLoading } = useProductChannelSales(tenantId, fcCode, !!detail);

  const aiMutation = useMutation({
    mutationFn: async () => {
      if (!detail || !channelData) throw new Error('No data');
      const activeBatch = detail.active_batch;
      const ageDays = activeBatch?.age_days ?? 0;
      const stages = ['Launch', 'Growth', 'Markdown', 'Clearance'];
      const stageIdx = ageDays <= 60 ? 0 : ageDays <= 120 ? 1 : ageDays <= 150 ? 2 : 3;

      const { data, error } = await supabase.functions.invoke('product-ai-insight', {
        body: {
          product: {
            name: detail.product.fc_name,
            fc_code: detail.product.fc_code,
            category: detail.product.category,
          },
          lifecycle: {
            age_days: ageDays,
            total_days: detail.lifecycle_days,
            stage: stages[stageIdx],
            sell_through: detail.current_sell_through,
            target_pct: [50, 70, 85, 100][stageIdx],
            velocity: detail.velocity_current,
            velocity_required: detail.velocity_required,
            on_hand: detail.current_on_hand,
            initial_qty: detail.initial_qty,
            cash_at_risk: detail.cash_at_risk,
          },
          channelSales: channelData.channels,
        },
      });
      if (error) throw error;
      return (data as any).insight as string;
    },
    onSuccess: (insight) => setAiInsight(insight),
    onError: (err) => toast.error('AI insight failed', { description: err.message }),
  });

  const activeBatch = detail?.active_batch;
  const ageDays = activeBatch?.age_days ?? 0;
  const lifecycleDays = detail?.lifecycle_days ?? 180;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !detail?.product) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/command/product-insight')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          {error ? 'Không thể tải chi tiết sản phẩm' : 'Không tìm thấy sản phẩm'}
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{detail.product.fc_name || detail.product.fc_code} | Product Insight</title></Helmet>

      <div className="space-y-6">
        {/* Back + Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/command/product-insight')} className="gap-1.5 -ml-2 mb-1">
              <ArrowLeft className="h-4 w-4" /> Product Insight
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {detail.product.fc_name || detail.product.fc_code}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{detail.product.fc_code}</Badge>
              {detail.product.category && <Badge variant="secondary" className="text-xs">{detail.product.category}</Badge>}
              {activeBatch && <Badge variant="outline" className="text-xs">Batch #{activeBatch.batch_number} — {ageDays} ngày</Badge>}
              {detail.first_sale_date && <Badge variant="secondary" className="text-xs">Ngày bán đầu: {detail.first_sale_date}</Badge>}
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT: 3/5 - Lifecycle + Metrics + Milestones */}
          <div className="lg:col-span-3 space-y-6">

            {/* Lifecycle Timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lifecycle Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <LifecycleTimeline
                  ageDays={ageDays}
                  lifecycleDays={lifecycleDays}
                  milestones={detail.milestones}
                  sellThrough={detail.current_sell_through ?? 0}
                />
              </CardContent>
            </Card>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard icon={TrendingUp} label="Sell-through" value={`${detail.current_sell_through}%`} />
              <MetricCard icon={Zap} label="Velocity" value={`${detail.velocity_current}/ngày`} />
              <MetricCard icon={Clock} label="Cần/ngày" value={`${detail.velocity_required}`} accent={detail.velocity_required > detail.velocity_current} />
              <MetricCard icon={DollarSign} label="Cash at Risk" value={`${detail.cash_at_risk}M`} accent={detail.cash_at_risk > 10} />
            </div>

            {/* Inventory summary */}
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="py-4 text-center">
                <p className="text-xs text-muted-foreground">Số lượng ban đầu</p>
                <p className="text-2xl font-bold tabular-nums">{detail.initial_qty ?? '—'}</p>
              </CardContent></Card>
              <Card><CardContent className="py-4 text-center">
                <p className="text-xs text-muted-foreground">Đã bán</p>
                <p className="text-2xl font-bold tabular-nums">{detail.total_sold ?? 0}</p>
              </CardContent></Card>
              <Card><CardContent className="py-4 text-center">
                <p className="text-xs text-muted-foreground">Tồn kho</p>
                <p className="text-2xl font-bold tabular-nums">{detail.current_on_hand}</p>
              </CardContent></Card>
            </div>

            {/* Milestone Progress Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Milestone Progress</CardTitle>
              </CardHeader>
              <CardContent>
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
                    <MilestoneRows milestones={detail.milestones} ageDays={ageDays} currentSellThrough={detail.current_sell_through} />
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Batch History */}
            {detail.batches && detail.batches.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Batch History ({detail.batches.length} batches)</CardTitle>
                </CardHeader>
                <CardContent>
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
                          <TableCell><Badge variant="outline" className="text-[10px]">{b.source}</Badge></TableCell>
                          <TableCell className="text-center">
                            <Badge variant={b.is_completed ? 'secondary' : 'default'} className="text-[10px]">
                              {b.is_completed ? 'Done' : 'Active'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: 2/5 - Channel Sales + AI Insight */}
          <div className="lg:col-span-2 space-y-6">

            {/* Channel Sales */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Store className="h-4 w-4" /> Bán theo kênh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {channelLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : channelData && channelData.channels.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-border bg-muted/30 py-3 text-center">
                        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><ShoppingBag className="h-3 w-3" /> Tổng đơn</p>
                        <p className="text-lg font-bold tabular-nums">{channelData.total_orders}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 py-3 text-center">
                        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Tag className="h-3 w-3" /> Tổng KM</p>
                        <p className="text-lg font-bold tabular-nums text-amber-500">{(channelData.total_discount / 1_000_000).toFixed(1)}M</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 py-3 text-center">
                        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Percent className="h-3 w-3" /> Tỷ lệ KM</p>
                        <p className="text-lg font-bold tabular-nums">{channelData.avg_discount_pct.toFixed(1)}%</p>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kênh</TableHead>
                          <TableHead className="text-center">SL</TableHead>
                          <TableHead className="text-right">DT</TableHead>
                          <TableHead className="text-right">KM</TableHead>
                          <TableHead className="text-center">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {channelData.channels.map(ch => (
                          <TableRow key={ch.channel}>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] capitalize">{ch.channel}</Badge>
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-sm">{ch.qty_sold}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{(ch.revenue / 1_000_000).toFixed(1)}M</TableCell>
                            <TableCell className="text-right tabular-nums text-sm text-amber-500">{(ch.discount_amount / 1_000_000).toFixed(1)}M</TableCell>
                            <TableCell className="text-center tabular-nums text-sm">
                              <span className={cn(ch.avg_discount_pct > 15 ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                                {ch.avg_discount_pct.toFixed(1)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Chưa có dữ liệu bán hàng</p>
                )}
              </CardContent>
            </Card>

            {/* AI Insight */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" /> AI Insight
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={aiMutation.isPending || !channelData}
                    onClick={() => aiMutation.mutate()}
                  >
                    {aiMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {aiMutation.isPending ? 'Đang phân tích...' : 'Phân tích'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiInsight ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="text-sm whitespace-pre-line leading-relaxed">{aiInsight}</div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nhấn "Phân tích" để AI đánh giá hiệu suất sản phẩm
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Milestone Rows ──

function MilestoneRows({ milestones, ageDays, currentSellThrough }: { milestones: MilestoneItem[]; ageDays: number; currentSellThrough: number }) {
  const stageRanges: Record<number, string> = { 60: '0–60d', 120: '61–120d', 150: '121–150d', 180: '151–180d' };

  const formatPct = (value: number | null) => {
    if (value == null || Number.isNaN(value)) return '—';
    const rounded = Math.round(value * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
  };

  return (
    <>
      {(milestones || []).map((m, i, arr) => {
        const stageStartDay = i === 0 ? 0 : (arr[i - 1]?.day ?? 0) + 1;
        const stageEndDay = m.day;
        const isCurrentStage = ageDays >= stageStartDay && ageDays <= stageEndDay;
        const displayActualPct = m.actual_pct ?? (isCurrentStage ? currentSellThrough : null);
        const gap = displayActualPct != null ? Math.round((displayActualPct - m.target_pct) * 10) / 10 : null;

        const derivedStatus: keyof typeof milestoneStatusConfig =
          gap == null ? 'no_data' : gap >= 0 ? 'ahead' : gap >= -5 ? 'on_track' : 'behind';
        const statusKey: keyof typeof milestoneStatusConfig =
          isCurrentStage && m.actual_pct == null
            ? derivedStatus
            : ((m.status in milestoneStatusConfig ? m.status : 'no_data') as keyof typeof milestoneStatusConfig);
        const sc = milestoneStatusConfig[statusKey] || milestoneStatusConfig.no_data;
        const rangeLabel = stageRanges[m.day] || `${stageStartDay}–${m.day}d`;

        return (
          <TableRow key={i}>
            <TableCell className="font-medium text-sm">{rangeLabel}</TableCell>
            <TableCell className="text-center tabular-nums text-sm">{m.target_pct}%</TableCell>
            <TableCell className="text-center tabular-nums text-sm">{formatPct(displayActualPct)}</TableCell>
            <TableCell className={cn('text-center tabular-nums text-sm', gap != null && gap < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400')}>
              {gap != null ? `${gap > 0 ? '+' : ''}${Number.isInteger(gap) ? gap.toFixed(0) : gap.toFixed(1)}%` : '—'}
            </TableCell>
            <TableCell className="text-center">
              <span className={cn('text-sm', sc.className)}>{sc.icon} {sc.label}</span>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

// ── Lifecycle Timeline ──

function LifecycleTimeline({ ageDays, lifecycleDays, milestones, sellThrough }: { ageDays: number; lifecycleDays: number; milestones: MilestoneItem[]; sellThrough: number }) {
  const progressPct = Math.min((ageDays / lifecycleDays) * 100, 100);
  const stages = [
    { startDay: 0, endDay: 60, label: 'Launch', color: 'hsl(var(--success))', targetPct: 50 },
    { startDay: 61, endDay: 120, label: 'Growth', color: 'hsl(var(--info))', targetPct: 70 },
    { startDay: 121, endDay: 150, label: 'Markdown', color: 'hsl(var(--warning))', targetPct: 85 },
    { startDay: 151, endDay: 180, label: 'Clearance', color: 'hsl(var(--destructive))', targetPct: 100 },
  ];

  const getCurrentStage = () => {
    for (let i = stages.length - 1; i >= 0; i--) {
      if (ageDays >= stages[i].startDay) return i;
    }
    return 0;
  };
  const currentStageIdx = getCurrentStage();
  const currentStage = stages[currentStageIdx];
  const gapPct = sellThrough - currentStage.targetPct;
  const isOnTrack = gapPct >= -5;

  return (
    <div className="space-y-3 py-2">
      <div className="relative">
        <div className="flex gap-[2px] h-3 rounded-full overflow-hidden">
          {stages.map((stage, i) => {
            const stageWidth = ((stage.endDay - stage.startDay + 1) / lifecycleDays) * 100;
            const isFilled = ageDays > stage.endDay;
            const isActive = ageDays >= stage.startDay && ageDays <= stage.endDay;
            const fillPct = isActive ? ((ageDays - stage.startDay) / (stage.endDay - stage.startDay + 1)) * 100 : 0;
            return (
              <div key={i} className="relative h-full rounded-sm overflow-hidden" style={{ width: `${stageWidth}%`, backgroundColor: `color-mix(in srgb, ${stage.color} 15%, transparent)` }}>
                {(isFilled || isActive) && (
                  <div className="absolute inset-y-0 left-0 rounded-sm transition-all duration-500" style={{ width: isFilled ? '100%' : `${fillPct}%`, backgroundColor: stage.color, opacity: 0.85 }} />
                )}
              </div>
            );
          })}
        </div>
        <div className="absolute -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${progressPct}%`, top: '-6px' }}>
          <div className="w-4 h-4 rounded-full border-[3px] shadow-lg" style={{ borderColor: currentStage.color, backgroundColor: 'hsl(var(--background))', boxShadow: `0 0 8px ${currentStage.color}` }} />
        </div>
      </div>

      <div className="flex gap-[2px]">
        {stages.map((stage, i) => {
          const stageWidth = ((stage.endDay - stage.startDay + 1) / lifecycleDays) * 100;
          const isActive = i === currentStageIdx;
          return (
            <div key={i} className="text-center" style={{ width: `${stageWidth}%` }}>
              <p className={cn('text-[10px] font-medium', isActive ? 'text-foreground' : 'text-muted-foreground/60')} style={isActive ? { color: stage.color } : undefined}>{stage.label}</p>
              <p className="text-[9px] text-muted-foreground/50">{stage.startDay}–{stage.endDay}d · {stage.targetPct}%</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: currentStage.color }} />
          <p className="text-sm text-muted-foreground">
            Ngày <span className="font-bold text-foreground">{ageDays}</span>/{lifecycleDays}
            <span className="mx-1.5">·</span>
            <span className="font-semibold" style={{ color: currentStage.color }}>{currentStage.label}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm">
            <span className="font-bold text-foreground">{sellThrough.toFixed(1)}%</span>
            <span className="text-muted-foreground"> / {currentStage.targetPct}%</span>
          </p>
          <span className={cn('text-sm font-bold px-2 py-0.5 rounded', isOnTrack ? 'bg-emerald-500/15 text-emerald-500' : 'bg-destructive/15 text-destructive')}>
            {gapPct >= 0 ? '+' : ''}{gapPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Metric Card ──

function MetricCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-3">
          <Icon className={cn('h-5 w-5', accent ? 'text-destructive' : 'text-muted-foreground')} />
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('text-lg font-bold tabular-nums', accent && 'text-destructive')}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
