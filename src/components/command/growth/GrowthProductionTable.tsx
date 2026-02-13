import { useState } from 'react';
import { Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { SimResult } from './types';
import { formatVNDCompact } from '@/lib/formatters';

type FilterTab = 'all' | 'hero' | 'non-hero' | 'fast' | 'slow';

interface Props {
  details: SimResult[];
}

const PAGE_SIZE = 30;

export default function GrowthProductionTable({ details }: Props) {
  const [tab, setTab] = useState<FilterTab>('all');
  const [page, setPage] = useState(0);

  const filtered = details.filter(d => {
    if (d.productionQty <= 0) return false;
    switch (tab) {
      case 'hero': return d.isHero;
      case 'non-hero': return !d.isHero;
      case 'fast': return d.segment === 'fast';
      case 'slow': return d.segment === 'slow';
      default: return true;
    }
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `Tất cả (${details.filter(d => d.productionQty > 0).length})` },
    { key: 'hero', label: 'Hero' },
    { key: 'non-hero', label: 'Non-Hero' },
    { key: 'fast', label: 'Fast Mover' },
    { key: 'slow', label: 'Slow Mover' },
  ];

  const segmentBadge = (seg: string) => {
    const map: Record<string, string> = {
      fast: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      slow: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      normal: 'bg-muted text-muted-foreground',
    };
    const labels: Record<string, string> = { fast: 'Fast', slow: 'Slow', normal: 'Normal' };
    return <Badge className={`${map[seg] || map.normal} border-0 text-xs`}>{labels[seg] || seg}</Badge>;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4" /> Kế Hoạch Sản Xuất
        </h4>
        <div className="flex gap-1">
          {tabs.map(t => (
            <Button
              key={t.key}
              variant={tab === t.key ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setTab(t.key); setPage(0); }}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên SP</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead className="text-right">Velocity</TableHead>
              <TableHead className="text-right">DOC Hiện</TableHead>
              <TableHead className="text-right">DOC Sau SX</TableHead>
              <TableHead className="text-right">Tồn Kho</TableHead>
              <TableHead className="text-right">Cần SX</TableHead>
              <TableHead className="text-right">Vốn Cần</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-right">HeroScore</TableHead>
              <TableHead className="min-w-[200px]">Lý Do</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map(d => (
              <TableRow key={d.fcCode}>
                <TableCell className="font-medium text-sm">
                  <div className="flex items-center gap-1.5">
                    {d.isHero && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-0 text-xs">Hero</Badge>}
                    {d.fcName}
                  </div>
                </TableCell>
                <TableCell>{segmentBadge(d.segment)}</TableCell>
                <TableCell className="text-right text-sm">{d.velocity.toFixed(1)}/ngày</TableCell>
                <TableCell className="text-right text-sm">{d.docCurrent}d</TableCell>
                <TableCell className="text-right text-sm font-medium text-primary">{d.docAfterProduction}d</TableCell>
                <TableCell className="text-right text-blue-600">{d.onHandQty.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium text-orange-600">{d.productionQty.toLocaleString()}</TableCell>
                <TableCell className="text-right">{formatVNDCompact(d.cashRequired)}</TableCell>
                <TableCell className="text-right">
                  <span className={d.marginPct < 20 ? 'text-red-600' : d.marginPct < 40 ? 'text-amber-600' : 'text-emerald-600'}>
                    {d.marginPct.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">{d.heroScore}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[250px]">{d.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Trước</Button>
          <span className="text-muted-foreground">Trang {page + 1} / {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Sau →</Button>
        </div>
      )}
    </div>
  );
}
