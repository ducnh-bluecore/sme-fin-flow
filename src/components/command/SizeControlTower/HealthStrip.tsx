import { motion } from 'framer-motion';
import { Activity, ShieldAlert, DollarSign, Lock, Flame, ArrowRightLeft, TrendingUp } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';

interface HealthStripProps {
  avgHealthScore: number | null;
  healthStatus: string;
  brokenCount: number;
  riskCount: number;
  totalLostRevenue: number;
  totalCashLocked: number;
  totalMarginLeak: number;
  projectedHealth: number | null;
  projectedRecovery: number;
  transferUnits: number;
  recoverableStyles: number;
  effortLevel: string;
}

export default function HealthStrip({
  avgHealthScore, healthStatus, brokenCount, riskCount,
  totalLostRevenue, totalCashLocked, totalMarginLeak,
  projectedHealth, projectedRecovery, transferUnits, recoverableStyles, effortLevel,
}: HealthStripProps) {
  const statusColor = healthStatus === 'CRITICAL' ? 'text-destructive' 
    : healthStatus === 'WARNING' ? 'text-amber-500' 
    : healthStatus === 'GOOD' ? 'text-emerald-500' : 'text-muted-foreground';
  
  const statusBg = healthStatus === 'CRITICAL' ? 'from-destructive/10 to-destructive/5 border-destructive/30'
    : healthStatus === 'WARNING' ? 'from-amber-500/10 to-amber-500/5 border-amber-500/30'
    : healthStatus === 'GOOD' ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30'
    : 'from-muted/20 to-muted/10 border-border';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border bg-gradient-to-r ${statusBg} p-5`}
    >
      <div className="grid grid-cols-12 gap-6 items-center">
        {/* Health Score - Large */}
        <div className="col-span-3 flex items-center gap-4">
          <div className="relative">
            <div className={`text-5xl font-black ${statusColor} tabular-nums`}>
              {avgHealthScore !== null ? Math.round(avgHealthScore) : '—'}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
              Sức Khỏe Size
            </div>
          </div>
          <div className={`text-xs font-bold px-2 py-1 rounded ${
            healthStatus === 'CRITICAL' ? 'bg-destructive/20 text-destructive' :
            healthStatus === 'WARNING' ? 'bg-amber-500/20 text-amber-700' :
            'bg-emerald-500/20 text-emerald-700'
          }`}>
            {healthStatus === 'CRITICAL' ? '⚠️ NGUY HIỂM' :
             healthStatus === 'WARNING' ? '⚡ CẢNH BÁO' : '✅ TỐT'}
          </div>
        </div>

        {/* Key Damage Metrics */}
        <div className="col-span-5 grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-1">
              <ShieldAlert className="h-3 w-3" /> Lẻ Size
            </div>
            <div className="text-xl font-bold text-destructive">{brokenCount}</div>
            {riskCount > 0 && <div className="text-[10px] text-muted-foreground">+{riskCount} rủi ro</div>}
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" /> DT Mất
            </div>
            <div className="text-xl font-bold text-destructive">
              {totalLostRevenue > 0 ? formatVNDCompact(totalLostRevenue) : '—'}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-1">
              <Lock className="h-3 w-3" /> Vốn Khóa
            </div>
            <div className="text-xl font-bold text-orange-600">
              {totalCashLocked > 0 ? formatVNDCompact(totalCashLocked) : '—'}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-1">
              <Flame className="h-3 w-3" /> Rò Biên
            </div>
            <div className="text-xl font-bold text-red-600">
              {totalMarginLeak > 0 ? formatVNDCompact(totalMarginLeak) : '—'}
            </div>
          </div>
        </div>

        {/* Projected Future */}
        <div className="col-span-4 border-l border-border/50 pl-5">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
            <TrendingUp className="h-3 w-3" /> Nếu Hành Động
          </div>
          {projectedRecovery > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-muted-foreground">Sức khỏe:</span>
                <span className="font-bold">{Math.round(avgHealthScore || 0)}</span>
                <span className="text-emerald-600 font-bold">→ {Math.round(projectedHealth || 0)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ArrowRightLeft className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-muted-foreground">Chuyển {transferUnits.toLocaleString()} đv</span>
                <span className="text-emerald-600 font-semibold">→ Cứu {formatVNDCompact(projectedRecovery)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Fix {recoverableStyles} mẫu</span>
                <span>·</span>
                <span className={`font-semibold ${effortLevel === 'THẤP' ? 'text-emerald-600' : effortLevel === 'TRUNG BÌNH' ? 'text-amber-600' : 'text-destructive'}`}>
                  Effort: {effortLevel}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Không có đề xuất điều chuyển</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
