import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, ArrowRightLeft, DollarSign } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';
import { motion } from 'framer-motion';

interface ActionImpactPanelProps {
  projectedRecovery: number;
  transferUnits: number;
  recoverableStyles: number;
  effortLevel: string;
  totalTransfers: number;
  transferByDest: any[];
}

export default function ActionImpactPanel({
  projectedRecovery, transferUnits, recoverableStyles,
  effortLevel, totalTransfers, transferByDest,
}: ActionImpactPanelProps) {
  const topDests = transferByDest.slice(0, 3);

  return (
    <Card className="w-[320px] shrink-0 premium-card card-glow-success">
      <CardHeader className="pb-2 px-5 pt-5">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" /> Hành Động Ưu Tiên
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        {totalTransfers > 0 ? (
          <>
            {/* Impact Summary */}
            <div className="rounded-xl severity-success-bg border border-emerald-500/20 p-4 space-y-3">
              <div className="flex items-center gap-2 metric-label text-emerald-500">
                <DollarSign className="h-3.5 w-3.5" /> Giá Trị Cứu Được
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="metric-value text-emerald-500"
              >
                {formatVNDCompact(projectedRecovery)}
              </motion.div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-card/40 p-2">
                  <span className="text-muted-foreground text-[10px]">Chuyển</span>
                  <p className="font-semibold mt-0.5">{transferUnits.toLocaleString()} đơn vị</p>
                </div>
                <div className="rounded-lg bg-card/40 p-2">
                  <span className="text-muted-foreground text-[10px]">Fix</span>
                  <p className="font-semibold mt-0.5">{recoverableStyles} mẫu lẻ size</p>
                </div>
              </div>
              <Badge variant="outline" className={`text-[10px] ${
                effortLevel === 'THẤP' ? 'border-emerald-500/40 text-emerald-500' :
                effortLevel === 'TRUNG BÌNH' ? 'border-amber-500/40 text-amber-500' :
                'border-destructive/40 text-destructive'
              }`}>
                Effort: {effortLevel}
              </Badge>
            </div>

            {/* Top Destinations */}
            {topDests.length > 0 && (
              <div className="space-y-2">
                <div className="metric-label text-[10px]">
                  Ưu Tiên Chuyển Đến
                </div>
                {topDests.map((d: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="flex items-center justify-between text-xs p-3 rounded-lg bg-card/40 border border-border/30 hover:bg-card/70 transition-all duration-300"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-medium truncate max-w-[140px]">
                        {d.dest_store_name || d.dest_store_id?.slice(0, 12)}
                      </span>
                    </div>
                    <span className="font-bold text-emerald-500">
                      +{formatVNDCompact(d.total_net_benefit || 0)}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <ArrowRightLeft className="h-6 w-6 mx-auto mb-2 opacity-20" />
            Chưa có đề xuất điều chuyển
          </div>
        )}
      </CardContent>
    </Card>
  );
}
