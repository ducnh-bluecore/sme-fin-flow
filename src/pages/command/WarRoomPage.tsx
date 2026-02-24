import { motion } from 'framer-motion';
import { Siren, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WinScoreboard } from '@/components/command/WarRoom/WinScoreboard';
import { PriorityCard } from '@/components/command/WarRoom/PriorityCard';
import { useWarRoomPriorities } from '@/hooks/command/useWarRoomPriorities';
import { useWinScoreboard } from '@/hooks/command/useWinScoreboard';
import { useWarRoomClearanceHint } from '@/hooks/command/useWarRoomClearanceHint';

export default function WarRoomPage() {
  const { data: priorities, isLoading: prioritiesLoading } = useWarRoomPriorities();
  const { data: scoreboard, isLoading: scoreboardLoading } = useWinScoreboard();
  const { data: clearanceHints } = useWarRoomClearanceHint();
  const navigate = useNavigate();

  const quickActions = [
    { label: 'Hàng Tồn Chết', path: '/command/dead-stock', desc: 'SP ≥90 ngày không bán — cần thanh lý' },
    { label: 'Xem Size Health', path: '/command/assortment', desc: 'Kiểm tra cơ cấu size lệch chuẩn' },
    { label: 'Thanh Lý Urgent', path: '/command/clearance', desc: 'Sản phẩm cần clearance ngay' },
    { label: 'Phân Bổ Lại', path: '/command/allocation', desc: 'Transfer hàng giải phóng vốn' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Siren className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Daily War Room</h1>
          <p className="text-sm text-muted-foreground">Hôm nay cần xử lý gì?</p>
        </div>
      </motion.div>

      {/* A. Win Scoreboard */}
      <WinScoreboard data={scoreboard} isLoading={scoreboardLoading} />

      {/* B. Today's Priorities */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            🚨 Today's Priorities
            {priorities && priorities.length > 0 && (
              <span className="text-xs font-normal">({priorities.length} vấn đề)</span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Nhóm theo nguyên nhân, không phải từng sản phẩm</p>
        </div>

        {prioritiesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : priorities && priorities.length > 0 ? (
          <div className="space-y-3">
            {priorities.map((p) => (
              <PriorityCard key={p.id} priority={p} clearanceHints={clearanceHints} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
            <p className="text-sm font-medium">🎉 Không có vấn đề khẩn cấp</p>
            <p className="text-xs mt-1">Tất cả chỉ số trong ngưỡng an toàn</p>
          </div>
        )}
      </section>

      {/* C. Quick Action Queue */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          ⚡ Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.path}
              variant="outline"
              className="h-auto py-3 px-4 flex flex-col items-start gap-1 hover:border-primary/30 hover:bg-primary/5"
              onClick={() => navigate(action.path)}
            >
              <span className="text-sm font-medium text-foreground flex items-center gap-1">
                {action.label} <ArrowRight className="h-3 w-3" />
              </span>
              <span className="text-xs text-muted-foreground font-normal">{action.desc}</span>
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
