import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight, Layers3, Tags, ArrowRightLeft, TrendingDown, DollarSign, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type WarRoomPriority } from '@/hooks/command/useWarRoomPriorities';

function formatVND(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${value}`;
}

const TYPE_ICON: Record<WarRoomPriority['type'], React.ElementType> = {
  size_break: Layers3,
  markdown_risk: Tags,
  cash_lock: ArrowRightLeft,
  margin_leak: TrendingDown,
  lost_revenue: DollarSign,
};

const TYPE_LABEL: Record<WarRoomPriority['type'], string> = {
  size_break: 'SIZE BREAK',
  markdown_risk: 'MARKDOWN RISK',
  cash_lock: 'VỐN KHÓA',
  margin_leak: 'RÒ BIÊN',
  lost_revenue: 'DOANH THU MẤT',
};

const URGENCY_STYLE: Record<WarRoomPriority['urgency'], string> = {
  critical: 'bg-destructive text-destructive-foreground',
  urgent: 'bg-orange-500 text-white',
  warning: 'bg-amber-500/80 text-white',
};

interface Props {
  priority: WarRoomPriority;
}

export function PriorityCard({ priority }: Props) {
  const navigate = useNavigate();
  const Icon = TYPE_ICON[priority.type];
  const { damageBreakdown: bd } = priority;

  // Separate: actual losses vs locked capital
  const actualLosses: { label: string; value: number; desc: string }[] = [];
  if (bd.lostRevenue > 0) actualLosses.push({ label: 'Doanh thu mất', value: bd.lostRevenue, desc: 'không bán được → mất doanh thu thật' });
  if (bd.marginLeak > 0) actualLosses.push({ label: 'Rò biên', value: bd.marginLeak, desc: 'phải giảm giá → mất biên lợi nhuận' });
  const hasLockedCapital = bd.cashLocked > 0;
  const totalActualLoss = bd.lostRevenue + bd.marginLeak;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: priority.rank * 0.05 }}
    >
      <Card className={cn(
        'transition-all hover:shadow-md cursor-pointer group',
        priority.urgency === 'critical' && 'border-destructive/40',
        priority.urgency === 'urgent' && 'border-orange-500/30',
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Rank */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <span className="text-sm font-bold text-muted-foreground">#{priority.rank}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Header: Type + Driver Label + Urgency */}
              <div className="flex items-center gap-2 flex-wrap">
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {TYPE_LABEL[priority.type]}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  — {priority.driverLabel}
                </span>
                <Badge className={cn('text-[10px] ml-auto', URGENCY_STYLE[priority.urgency])}>
                  {priority.urgency === 'critical' ? 'KHẨN CẤP' : priority.urgency === 'urgent' ? 'CẦN XỬ LÝ' : 'CHÚ Ý'}
                </Badge>
              </div>

              {/* Product count + total damage */}
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{priority.productCount}</span> sản phẩm
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">
                  Tổng thiệt hại: <span className="font-bold text-destructive">{formatVND(priority.totalDamage)}</span>
                </span>
              </div>

              {/* THIỆT HẠI THỰC TẾ - actual losses */}
              {totalActualLoss > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive/80">
                    💸 Thiệt hại thực tế
                  </span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {actualLosses.map((line) => (
                      <div key={line.label} className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                        <span className="text-xs text-foreground">
                          {line.label}: <span className="font-semibold text-destructive">{formatVND(line.value)}</span>
                          <span className="text-muted-foreground ml-1">({line.desc})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VỐN BỊ KHÓA - locked but recoverable */}
              {hasLockedCapital && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500/80">
                    🔒 Vốn bị khóa <span className="normal-case font-normal text-muted-foreground">(chưa mất, nhưng không xoay được)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <ArrowRightLeft className="h-3 w-3 text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-foreground">
                      <span className="font-semibold text-amber-500">{formatVND(bd.cashLocked)}</span>
                      <span className="text-muted-foreground ml-1">vốn kẹt trong tồn kho — cần transfer hoặc clearance để thu hồi</span>
                    </span>
                  </div>
                </div>
              )}

              {/* TẠI SAO CẦN XỬ LÝ NGAY - WHY explanation */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tại sao cần xử lý ngay
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-[18px]">
                  {priority.whyExplanation}
                </p>
                {priority.markdownEtaDays !== null && (
                  <p className="text-xs text-amber-600 font-medium pl-[18px]">
                    ⏰ {priority.timePressureLabel}
                  </p>
                )}
              </div>

              {/* Top 3 SP nặng nhất */}
              {priority.topProducts.length > 0 && (
                <div className="pl-[18px]">
                  <span className="text-[10px] text-muted-foreground">
                    SP nặng nhất:{' '}
                    {priority.topProducts.map((p, i) => (
                      <span key={i}>
                        {i > 0 && ', '}
                        <span className="font-medium text-foreground">{p.name}</span>
                        {' '}({formatVND(p.damage)})
                      </span>
                    ))}
                  </span>
                </div>
              )}

              {/* Action button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-primary hover:text-primary group-hover:bg-primary/5"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(priority.actionPath);
                }}
              >
                {priority.actionLabel}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
