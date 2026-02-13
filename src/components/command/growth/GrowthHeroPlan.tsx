import { Star, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SimResult, HeroGap } from './types';
import { formatVNDCompact } from '@/lib/formatters';

interface Props {
  heroes: SimResult[];
  candidates: SimResult[];
  heroGap: HeroGap;
  growthPct: number;
  horizonMonths: number;
}

export default function GrowthHeroPlan({ heroes, candidates, heroGap, growthPct, horizonMonths }: Props) {
  return (
    <div className="space-y-6">
      {/* Hero List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" /> Hero Plan
          </h4>
          <Badge variant="outline">{heroes.length} Hero FC</Badge>
        </div>

        {heroes.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hero FC</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Velocity</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Tồn Kho</TableHead>
                  <TableHead className="text-right">DOC</TableHead>
                  <TableHead className="text-right">SX Đề Xuất</TableHead>
                  <TableHead className="text-right">% Đóng Góp</TableHead>
                  <TableHead className="text-right">HeroScore</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heroes.map(d => (
                  <TableRow key={d.fcCode}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        {d.fcName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-0 text-xs ${d.isHeroManual
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                      }`}>
                        {d.isHeroManual ? 'Manual' : 'Calculated'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{d.velocity.toFixed(1)}/ngày</TableCell>
                    <TableCell className="text-right">
                      <span className={d.marginPct < 20 ? 'text-red-600' : d.marginPct < 40 ? 'text-amber-600' : 'text-emerald-600'}>
                        {d.marginPct.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-blue-600">{d.onHandQty.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{d.docCurrent}d</TableCell>
                    <TableCell className="text-right font-medium text-orange-600">{d.productionQty.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{d.growthContributionPct.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-bold">{d.heroScore}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">Chưa có FC nào được đánh dấu Hero</p>
        )}
      </div>

      {/* Hero Gap */}
      <div className="rounded-lg border p-4 bg-background space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" /> Cần Thêm Bao Nhiêu Hero?
        </h4>
        <p className="text-sm">
          {heroGap.heroCountGap > 0
            ? <span className="text-amber-600 font-medium">
                Thiếu {heroGap.heroCountGap} hero SKU để đạt +{growthPct}% trong {horizonMonths} tháng
              </span>
            : <span className="text-emerald-600 font-medium">
                Hero hiện có đủ capacity để đạt target ({heroGap.recoverabilityPct.toFixed(0)}%)
              </span>
          }
        </p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Revenue tăng trưởng cần: {formatVNDCompact(heroGap.incrementalRevenueNeeded)}</p>
          <p>Hero capacity hiện có: {formatVNDCompact(heroGap.heroCapacity)}</p>
          <p>Hero target (60%): {formatVNDCompact(heroGap.heroNeed)}</p>
          {heroGap.gap > 0 && <p>Gap: {formatVNDCompact(heroGap.gap)}</p>}
        </div>
      </div>

      {/* Next Hero Candidates */}
      {candidates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Next Hero Candidates (Top {candidates.length})</h4>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>FC</TableHead>
                  <TableHead className="text-right">Velocity</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">HeroScore</TableHead>
                  <TableHead>Lý Do</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map(d => (
                  <TableRow key={d.fcCode}>
                    <TableCell className="font-medium">{d.fcName}</TableCell>
                    <TableCell className="text-right">{d.velocity.toFixed(1)}/ngày</TableCell>
                    <TableCell className="text-right">
                      <span className={d.marginPct >= 40 ? 'text-emerald-600' : 'text-amber-600'}>
                        {d.marginPct.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold">{d.heroScore}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[250px]">{d.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
