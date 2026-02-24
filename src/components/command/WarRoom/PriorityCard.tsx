import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight, Layers3, Tags, ArrowRightLeft, TrendingDown, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type WarRoomPriority } from '@/hooks/command/useWarRoomPriorities';

function formatVND(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}tr`;
  return `${(value / 1_000).toFixed(0)}k`;
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
  cash_lock: 'CASH LOCK',
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
            <div className="flex-1 min-w-0 space-y-2">
              {/* Header row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {TYPE_LABEL[priority.type]}
                </span>
                <span className="text-sm font-semibold text-foreground truncate">
                  — {priority.fcName}
                </span>
                <Badge className={cn('text-[10px] ml-auto', URGENCY_STYLE[priority.urgency])}>
                  {priority.urgency === 'critical' ? 'KHẨN CẤP' : priority.urgency === 'urgent' ? 'CẦN XỬ LÝ' : 'CHÚ Ý'}
                </Badge>
              </div>

              {/* Financial damage */}
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                <span className="text-sm text-foreground">
                  Mất <span className="font-bold text-destructive">{formatVND(priority.financialDamage)}</span>
                  {priority.markdownEtaDays !== null && (
                    <> trong <span className="font-semibold">{priority.markdownEtaDays}</span> ngày nếu không xử lý</>
                  )}
                </span>
              </div>

              {/* WHY NOW */}
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-xs text-muted-foreground">
                  WHY NOW: {priority.timePressureLabel}
                </span>
              </div>

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
