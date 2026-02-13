import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, ArrowRightLeft, ShieldAlert, DollarSign } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';

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
  // Top 3 destinations by net benefit
  const topDests = transferByDest.slice(0, 3);

  return (
    <Card className="w-[320px] shrink-0 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" /> Hành Động Ưu Tiên
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalTransfers > 0 ? (
          <>
            {/* Impact Summary */}
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <DollarSign className="h-3.5 w-3.5" /> Giá Trị Cứu Được
              </div>
              <div className="text-2xl font-black text-emerald-600">
                {formatVNDCompact(projectedRecovery)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Chuyển</span>
                  <p className="font-semibold">{transferUnits.toLocaleString()} đơn vị</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fix</span>
                  <p className="font-semibold">{recoverableStyles} mẫu lẻ size</p>
                </div>
              </div>
              <Badge variant="outline" className={`text-[10px] ${
                effortLevel === 'THẤP' ? 'border-emerald-500 text-emerald-700' :
                effortLevel === 'TRUNG BÌNH' ? 'border-amber-500 text-amber-700' :
                'border-destructive text-destructive'
              }`}>
                Effort: {effortLevel}
              </Badge>
            </div>

            {/* Top Destinations */}
            {topDests.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Ưu Tiên Chuyển Đến
                </div>
                {topDests.map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{i + 1}</span>
                      <span className="font-medium truncate max-w-[140px]">
                        {d.dest_store_name || d.dest_store_id?.slice(0, 12)}
                      </span>
                    </div>
                    <span className="font-semibold text-emerald-600">
                      +{formatVNDCompact(d.total_net_benefit || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-xs">
            <ArrowRightLeft className="h-6 w-6 mx-auto mb-2 opacity-30" />
            Chưa có đề xuất điều chuyển
          </div>
        )}
      </CardContent>
    </Card>
  );
}
