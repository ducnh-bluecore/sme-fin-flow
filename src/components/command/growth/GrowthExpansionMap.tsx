import { Map, TrendingUp, TrendingDown, Minus, Compass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { GrowthShape, SizeShift } from './types';

interface Props {
  shape: GrowthShape;
  growthPct: number;
  horizonMonths: number;
}

function DirectionIcon({ dir }: { dir: 'tăng' | 'ổn định' | 'giảm' }) {
  if (dir === 'tăng') return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (dir === 'giảm') return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function EfficiencyBadge({ label }: { label: 'CAO' | 'TRUNG BÌNH' | 'THẤP' }) {
  const cls = label === 'CAO'
    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
    : label === 'THẤP'
      ? 'bg-red-500/15 text-red-700 border-red-500/30'
      : 'bg-amber-500/15 text-amber-700 border-amber-500/30';
  return <Badge className={`text-[10px] font-semibold ${cls}`}>Hiệu suất {label}</Badge>;
}

function SizeBar({ shifts }: { shifts: SizeShift[] }) {
  const total = shifts.reduce((s, sh) => s + sh.totalVelocity, 0);
  if (total === 0) return null;

  const colors: Record<string, string> = {
    XS: 'bg-violet-500',
    S: 'bg-emerald-500',
    M: 'bg-sky-500',
    L: 'bg-amber-500',
    XL: 'bg-red-500',
  };

  return (
    <div className="flex h-7 w-full rounded-md overflow-hidden border">
      {shifts
        .filter(sh => sh.velocityShare > 0)
        .sort((a, b) => b.velocityShare - a.velocityShare)
        .map(sh => (
          <div
            key={sh.size}
            className={`${colors[sh.size] || 'bg-muted'} flex items-center justify-center text-[10px] font-bold text-white transition-all`}
            style={{ width: `${Math.max(sh.velocityShare, 4)}%` }}
            title={`${sh.size}: ${sh.velocityShare.toFixed(0)}%`}
          >
            {sh.velocityShare >= 10 && `${sh.size} ${sh.velocityShare.toFixed(0)}%`}
          </div>
        ))}
    </div>
  );
}

export default function GrowthExpansionMap({ shape, growthPct, horizonMonths }: Props) {
  const { expandCategories, avoidCategories, sizeShifts, gravitySummary, shapeStatement } = shape;

  // Find dominant size shift narrative
  const growing = sizeShifts.filter(s => s.direction === 'tăng').sort((a, b) => b.deltaPct - a.deltaPct);
  const declining = sizeShifts.filter(s => s.direction === 'giảm').sort((a, b) => a.deltaPct - b.deltaPct);

  let sizeNarrative = '';
  if (growing.length > 0 && declining.length > 0) {
    sizeNarrative = `Xu hướng tiêu dùng đang dịch chuyển sang size nhỏ hơn.`;
  } else if (growing.length > 0) {
    sizeNarrative = `Cầu đang tập trung vào size ${growing.map(s => s.size).join(', ')}.`;
  }

  return (
    <div className="rounded-xl border bg-gradient-to-br from-card via-card to-muted/30 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Map className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">BẢN ĐỒ MỞ RỘNG TĂNG TRƯỞNG</h3>
          <p className="text-xs text-muted-foreground">Để đạt <span className="font-semibold text-primary">+{growthPct}%</span> trong <span className="font-semibold">{horizonMonths} tháng</span>:</p>
        </div>
      </div>

      {/* Section 1: Expansion Signals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Expand */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Nên tập trung mở rộng
          </p>
          {expandCategories.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Không đủ dữ liệu để xác định.</p>
          )}
          {expandCategories.map(cat => (
            <div key={cat.category} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{cat.category}</span>
                <span className="text-xs font-bold text-emerald-600">
                  {cat.momentumPct >= 0 ? '+' : ''}{cat.momentumPct.toFixed(0)}% momentum
                </span>
              </div>
              <EfficiencyBadge label={cat.efficiencyLabel} />
              <p className="text-xs text-muted-foreground">{cat.reason}</p>
            </div>
          ))}
        </div>

        {/* Avoid */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wide flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" /> Hạn chế mở rộng
          </p>
          {avoidCategories.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Không có category cần hạn chế.</p>
          )}
          {avoidCategories.map(cat => (
            <div key={cat.category} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{cat.category}</span>
                <span className="text-xs font-bold text-red-600">
                  {cat.momentumPct >= 0 ? '+' : ''}{cat.momentumPct.toFixed(0)}% momentum
                </span>
              </div>
              <EfficiencyBadge label={cat.efficiencyLabel} />
              <p className="text-xs text-muted-foreground">{cat.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Structural Demand Shift */}
      {sizeShifts.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">Dịch Chuyển Cầu Cấu Trúc</p>
          <SizeBar shifts={sizeShifts} />
          {sizeNarrative && (
            <p className="text-xs text-muted-foreground italic">"{sizeNarrative}"</p>
          )}
          <div className="flex flex-wrap gap-3">
            {sizeShifts
              .filter(s => s.totalVelocity > 0)
              .sort((a, b) => b.velocityShare - a.velocityShare)
              .map(sh => (
                <div key={sh.size} className="flex items-center gap-1 text-xs">
                  <DirectionIcon dir={sh.direction} />
                  <span className="font-medium">Size {sh.size}:</span>
                  <span className={
                    sh.direction === 'tăng' ? 'text-emerald-600 font-semibold' :
                    sh.direction === 'giảm' ? 'text-red-600 font-semibold' :
                    'text-muted-foreground'
                  }>
                    {sh.deltaPct >= 0 ? '+' : ''}{sh.deltaPct.toFixed(0)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Section 3: Growth Gravity */}
      <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">Trọng Lực Tăng Trưởng</p>
        </div>
        <p className="text-sm font-medium text-foreground">{gravitySummary}</p>
        <p className="text-xs text-muted-foreground italic">"{shapeStatement}"</p>
      </div>
    </div>
  );
}
