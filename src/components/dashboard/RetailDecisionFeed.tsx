import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { useInventoryAging } from '@/hooks/useInventoryAging';
import { useAllChannelsPL } from '@/hooks/useAllChannelsPL';
import { useRetailHealthScore } from '@/hooks/useRetailHealthScore';
import { useSizeIntelligenceSummary } from '@/hooks/inventory/useSizeIntelligenceSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, AlertTriangle, TrendingDown, Package, Megaphone, Clock,
  Calculator, Store, LineChart, Database, Layers3,
} from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';

interface NarrativeDecision {
  id: string;
  icon: React.ReactNode;
  narrative: string;
  severity: 'critical' | 'warning' | 'info';
}

export function RetailDecisionFeed() {
  const navigate = useNavigate();
  const { data: snapshot, isLoading: snapshotLoading } = useFinanceTruthSnapshot();
  const { summary, agingBuckets, isLoading: inventoryLoading } = useInventoryAging();
  const { data: channelData, isLoading: channelLoading } = useAllChannelsPL();
  const { data: healthScore } = useRetailHealthScore();
  const { summary: siSummary, isLoading: siLoading } = useSizeIntelligenceSummary();

  const decisions = useMemo((): NarrativeDecision[] => {
    const items: NarrativeDecision[] = [];

    // 0. Data quality gaps — surface missing data sources
    if (snapshot) {
      const dq = snapshot.dataQuality;
      if (!dq.hasExpenseData) {
        items.push({
          id: 'data-gap-expenses',
          icon: <Database className="h-4 w-4" />,
          narrative: 'Thiếu dữ liệu COGS/Chi phí — Gross Margin và CM chưa tính được chính xác. Cần import dữ liệu chi phí.',
          severity: 'warning',
        });
      }
      if (!dq.hasCashData) {
        items.push({
          id: 'data-gap-cash',
          icon: <Database className="h-4 w-4" />,
          narrative: 'Chưa có dữ liệu ngân hàng/cash — Cash Runway và CCC chưa phản ánh thực tế.',
          severity: 'warning',
        });
      }
    }

    // 1. Channel margin collapse
    if (channelData?.channels) {
      channelData.channels.forEach(ch => {
        if (ch.operatingMargin < 10 && ch.totalRevenue > 0) {
          items.push({
            id: `channel-margin-${ch.channel}`,
            icon: <TrendingDown className="h-4 w-4" />,
            narrative: `${ch.channel} đang đốt margin: CM chỉ ${ch.operatingMargin.toFixed(1)}% trên doanh thu ${formatVNDCompact(ch.totalRevenue)}`,
            severity: ch.operatingMargin < 0 ? 'critical' : 'warning',
          });
        }
      });
    }

    // 2. Inventory cash trap
    if (summary && summary.totalValue > 0) {
      const slowPercent = summary.slowMovingPercentage;
      if (slowPercent > 25) {
        items.push({
          id: 'inventory-trap',
          icon: <Package className="h-4 w-4" />,
          narrative: `${formatVNDCompact(summary.slowMovingValue)} bị khóa trong tồn kho >90 ngày, chiếm ${slowPercent.toFixed(0)}% tổng giá trị`,
          severity: slowPercent > 40 ? 'critical' : 'warning',
        });
      }
    } else if (snapshot && snapshot.totalInventoryValue > 0 && snapshot.slowMovingInventory > 0) {
      // Fallback from snapshot
      const pct = (snapshot.slowMovingInventory / snapshot.totalInventoryValue) * 100;
      if (pct > 25) {
        items.push({
          id: 'inventory-trap-snapshot',
          icon: <Package className="h-4 w-4" />,
          narrative: `${formatVNDCompact(snapshot.slowMovingInventory)} tồn kho chậm luân chuyển, chiếm ${pct.toFixed(0)}% tổng giá trị kho ${formatVNDCompact(snapshot.totalInventoryValue)}`,
          severity: pct > 40 ? 'critical' : 'warning',
        });
      }
    }

    // 3. Marketing overspend
    if (snapshot && snapshot.marketingRoas > 0 && snapshot.marketingRoas < 2) {
      items.push({
        id: 'marketing-roas',
        icon: <Megaphone className="h-4 w-4" />,
        narrative: `ROAS chỉ ${snapshot.marketingRoas.toFixed(1)}x — mỗi đồng ads chỉ thu về ${snapshot.marketingRoas.toFixed(1)} đồng doanh thu`,
        severity: snapshot.marketingRoas < 1 ? 'critical' : 'warning',
      });
    }

    // 4. CCC warning
    if (snapshot && snapshot.ccc > 60) {
      items.push({
        id: 'ccc-warning',
        icon: <Clock className="h-4 w-4" />,
        narrative: `Vòng quay tiền mất ${snapshot.ccc.toFixed(0)} ngày, chậm hơn benchmark 30 ngày`,
        severity: snapshot.ccc > 90 ? 'critical' : 'warning',
      });
    }

    // 5. Dead stock
    if (agingBuckets) {
      const deadBucket = agingBuckets.find(b => b.minDays >= 181);
      if (deadBucket && deadBucket.totalValue > 0 && deadBucket.percentage > 10) {
        items.push({
          id: 'dead-stock',
          icon: <AlertTriangle className="h-4 w-4" />,
          narrative: `${formatVNDCompact(deadBucket.totalValue)} hàng tồn >180 ngày — cash bị chết, chiếm ${deadBucket.percentage.toFixed(0)}% giá trị kho`,
          severity: deadBucket.percentage > 25 ? 'critical' : 'warning',
        });
      }
    }

    // 6. Health Score CRITICAL but no specific decisions found
    if (healthScore?.overall === 'CRITICAL' && items.filter(i => i.severity === 'critical').length === 0) {
      items.push({
        id: 'health-critical-no-detail',
        icon: <AlertTriangle className="h-4 w-4" />,
        narrative: 'Health Score CRITICAL — thiếu dữ liệu chi tiết để phân tích nguyên nhân cụ thể. Cần bổ sung COGS, chi phí, và dữ liệu cash.',
        severity: 'critical',
      });
    }

    // 7. Size Intelligence: Broken curves with revenue at risk
    if (siSummary.brokenCount > 0 && siSummary.totalLostRevenue > 0) {
      items.push({
        id: 'size-curve-broken',
        icon: <Layers3 className="h-4 w-4" />,
        narrative: `${siSummary.brokenCount} style có size curve gãy — ước tính mất ${formatVNDCompact(siSummary.totalLostRevenue)} doanh thu. Cần transfer hoặc reorder core sizes.`,
        severity: siSummary.totalLostRevenue > 50_000_000 ? 'critical' : 'warning',
      });
    }

    // 8. Size Intelligence: High markdown risk
    if (siSummary.highMarkdownRiskCount > 0) {
      items.push({
        id: 'size-markdown-risk',
        icon: <TrendingDown className="h-4 w-4" />,
        narrative: `${siSummary.highMarkdownRiskCount} style có nguy cơ markdown cao do size curve stress + tồn kho già${siSummary.criticalMarkdownCount > 0 ? ` (${siSummary.criticalMarkdownCount} critical)` : ''}.`,
        severity: siSummary.criticalMarkdownCount > 0 ? 'critical' : 'warning',
      });
    }

    // Sort: critical first, then warning
    items.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });

    return items.slice(0, 7);
  }, [snapshot, summary, agingBuckets, channelData, healthScore, siSummary]);

  const isLoading = snapshotLoading || inventoryLoading || channelLoading || siLoading;

  const severityStyles = {
    critical: 'border-l-destructive bg-destructive/5',
    warning: 'border-l-warning bg-warning/5',
    info: 'border-l-info bg-info/5',
  };

  const iconStyles = {
    critical: 'text-destructive',
    warning: 'text-warning',
    info: 'text-info',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          Decision Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i}><Skeleton className="h-14" /></div>
            ))}
          </div>
        ) : decisions.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Không có vấn đề cần xử lý — Retail machine đang khỏe ✓
          </div>
        ) : (
          <div className="space-y-2">
            {decisions.map((d) => (
              <div
                key={d.id}
                className={`border-l-2 rounded-r-md p-3 text-sm ${severityStyles[d.severity]}`}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 ${iconStyles[d.severity]}`}>{d.icon}</span>
                  <span className="text-foreground leading-snug">{d.narrative}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="border-t border-border pt-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Quick Actions
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigate('/inventory-allocation')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors justify-start">
              <Package className="h-3 w-3" /> Inventory
            </button>
            <button onClick={() => navigate('/unit-economics')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors justify-start">
              <Calculator className="h-3 w-3" /> Unit Economics
            </button>
            <button onClick={() => navigate('/channel-pl')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors justify-start">
              <Store className="h-3 w-3" /> Channel P&L
            </button>
            <button onClick={() => navigate('/mdp')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors justify-start">
              <LineChart className="h-3 w-3" /> Marketing
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
