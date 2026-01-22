import { Users, TrendingUp, ShoppingCart, RotateCcw, Percent, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ResearchStats {
  customerCount: number;
  totalRevenue: number;
  medianAOV: number;
  medianRepurchaseCycle: number;
  returnRate: number;
  promotionDependency: number;
}

interface ResearchStatsPanelProps {
  stats: ResearchStats;
  filterImpact?: {
    customerDelta: number;
    revenueDelta: number;
  };
}

function formatCurrency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString('vi-VN');
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  delta 
}: { 
  icon: typeof Users;
  label: string; 
  value: string; 
  subValue?: string;
  delta?: number;
}) {
  return (
    <Card className="bg-background">
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
            )}
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        {delta !== undefined && delta !== 0 && (
          <p className={`text-xs mt-2 ${delta > 0 ? 'text-success' : 'text-destructive'}`}>
            {delta > 0 ? '+' : ''}{delta.toLocaleString()} so với bộ lọc trước
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ResearchStatsPanel({ stats, filterImpact }: ResearchStatsPanelProps) {
  return (
    <div className="grid grid-cols-6 gap-3">
      <StatCard
        icon={Users}
        label="Số khách hàng"
        value={stats.customerCount.toLocaleString()}
        delta={filterImpact?.customerDelta}
      />
      <StatCard
        icon={TrendingUp}
        label="Tổng doanh thu"
        value={formatCurrency(stats.totalRevenue)}
        delta={filterImpact?.revenueDelta}
      />
      <StatCard
        icon={ShoppingCart}
        label="AOV trung vị"
        value={formatCurrency(stats.medianAOV)}
      />
      <StatCard
        icon={Calendar}
        label="Chu kỳ mua lại"
        value={`${stats.medianRepurchaseCycle} ngày`}
        subValue="Trung vị"
      />
      <StatCard
        icon={RotateCcw}
        label="Tỷ lệ hoàn trả"
        value={`${stats.returnRate.toFixed(1)}%`}
      />
      <StatCard
        icon={Percent}
        label="Phụ thuộc KM"
        value={`${stats.promotionDependency.toFixed(0)}%`}
        subValue="Đơn có khuyến mãi"
      />
    </div>
  );
}
