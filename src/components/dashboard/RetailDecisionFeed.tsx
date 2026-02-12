import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { useInventoryAging } from '@/hooks/useInventoryAging';
import { useAllChannelsPL } from '@/hooks/useAllChannelsPL';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, AlertTriangle, TrendingDown, Package, Megaphone, Clock,
  BarChart3, Calculator, Store, LineChart, ArrowRight,
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

  const decisions = useMemo((): NarrativeDecision[] => {
    const items: NarrativeDecision[] = [];

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
    }

    // 3. Marketing overspend per channel (using ROAS proxy)
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

    // Sort: critical first, then warning
    items.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });

    return items.slice(0, 5);
  }, [snapshot, summary, agingBuckets, channelData]);

  const isLoading = snapshotLoading || inventoryLoading || channelLoading;

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
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}
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
            <Button variant="outline" size="sm" className="justify-start gap-1.5 text-xs" onClick={() => navigate('/inventory-allocation')}>
              <Package className="h-3 w-3" /> Inventory
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-1.5 text-xs" onClick={() => navigate('/unit-economics')}>
              <Calculator className="h-3 w-3" /> Unit Economics
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-1.5 text-xs" onClick={() => navigate('/channel-pl')}>
              <Store className="h-3 w-3" /> Channel P&L
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-1.5 text-xs" onClick={() => navigate('/mdp')}>
              <LineChart className="h-3 w-3" /> Marketing
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
