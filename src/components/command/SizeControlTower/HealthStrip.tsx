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
  
  const stripBg = healthStatus === 'CRITICAL' ? 'severity-critical-bg'
    : healthStatus === 'WARNING' ? 'severity-warning-bg'
    : healthStatus === 'GOOD' ? 'severity-success-bg'
    : '';

  const damageMetrics = [
    { icon: ShieldAlert, label: 'Lẻ Size', value: brokenCount, sub: riskCount > 0 ? `+${riskCount} rủi ro` : undefined, color: 'text-destructive', borderColor: 'border-l-destructive' },
    { icon: DollarSign, label: 'DT Mất', value: totalLostRevenue > 0 ? formatVNDCompact(totalLostRevenue) : '—', color: 'text-destructive', borderColor: 'border-l-destructive' },
    { icon: Lock, label: 'Vốn Khóa', value: totalCashLocked > 0 ? formatVNDCompact(totalCashLocked) : '—', color: 'text-orange-500', borderColor: 'border-l-orange-500' },
    { icon: Flame, label: 'Rò Biên', value: totalMarginLeak > 0 ? formatVNDCompact(totalMarginLeak) : '—', color: 'text-red-500', borderColor: 'border-l-red-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={`premium-card rounded-xl border p-6 ${stripBg}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Left: Health Score — large & prominent */}
        <div className="flex items-center gap-5 shrink-0">
          <div>
            <div className={`metric-value-lg ${statusColor} tabular-nums`}>
              {avgHealthScore !== null ? Math.round(avgHealthScore) : '—'}
            </div>
            <div className="metric-label mt-1">Sức Khỏe Size</div>
          </div>
          <div className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
            healthStatus === 'CRITICAL' ? 'bg-destructive/20 text-destructive pulse-badge' :
            healthStatus === 'WARNING' ? 'bg-amber-500/20 text-amber-500' :
            'bg-emerald-500/20 text-emerald-500'
          }`}>
            {healthStatus === 'CRITICAL' ? '⚠️ NGUY HIỂM' :
             healthStatus === 'WARNING' ? '⚡ CẢNH BÁO' : '✅ TỐT'}
          </div>
        </div>

        {/* Center: Damage Metrics — color-coded tiles */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {damageMetrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06 }}
              className={`rounded-lg bg-card/50 border border-border/50 border-l-[3px] ${m.borderColor} p-3 transition-all duration-300 hover:bg-card/80`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <m.icon className="h-3 w-3 text-muted-foreground" />
                <span className="metric-label text-[10px]">{m.label}</span>
              </div>
              <div className={`text-lg font-bold ${m.color}`}>{m.value}</div>
              {m.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</div>}
            </motion.div>
          ))}
        </div>

        {/* Right: Projected Future — card-in-card */}
        <div className="shrink-0 lg:w-[260px] rounded-lg bg-card/60 border border-border/50 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="metric-label text-emerald-500">Nếu Hành Động</span>
          </div>
          {projectedRecovery > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-muted-foreground text-xs">Sức khỏe:</span>
                <span className="font-bold text-sm">{Math.round(avgHealthScore || 0)}</span>
                <span className="text-emerald-500 font-bold text-sm">→ {Math.round(projectedHealth || 0)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-muted-foreground text-xs">Chuyển {transferUnits.toLocaleString()} đv</span>
                <span className="text-emerald-500 font-semibold text-sm">→ Cứu {formatVNDCompact(projectedRecovery)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/30">
                <span>Fix {recoverableStyles} mẫu</span>
                <span>·</span>
                <span className={`font-semibold ${effortLevel === 'THẤP' ? 'text-emerald-500' : effortLevel === 'TRUNG BÌNH' ? 'text-amber-500' : 'text-destructive'}`}>
                  Effort: {effortLevel}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground/70">Không có đề xuất điều chuyển</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
