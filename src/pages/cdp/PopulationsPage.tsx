import { Helmet } from 'react-helmet-async';
import { 
  Users, 
  Layers,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { useCDPData } from '@/hooks/useCDPData';

// Stability indicator
function StabilityBadge({ stability }: { stability: 'stable' | 'drifting' | 'volatile' }) {
  const styles = {
    stable: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', icon: Minus, label: 'Ổn định' },
    drifting: { bg: 'bg-warning/10', text: 'text-warning-foreground', border: 'border-warning/20', icon: TrendingUp, label: 'Đang dịch chuyển' },
    volatile: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20', icon: TrendingDown, label: 'Biến động' }
  };
  
  const style = styles[stability];
  const Icon = style.icon;
  
  return (
    <Badge variant="outline" className={`${style.bg} ${style.text} ${style.border}`}>
      <Icon className="w-3 h-3 mr-1" />
      {style.label}
    </Badge>
  );
}

// Population card component
function PopulationCard({ 
  name,
  type,
  definition,
  size,
  revenueShare,
  stability,
  metrics
}: { 
  name: string;
  type: 'segment' | 'cohort' | 'tier';
  definition: string;
  size: number;
  revenueShare: number;
  stability: 'stable' | 'drifting' | 'volatile';
  metrics: string[];
}) {
  const typeLabels = {
    segment: 'PHÂN KHÚC',
    cohort: 'COHORT',
    tier: 'TIER'
  };
  
  const typeStyles = {
    segment: { color: 'text-info', bg: 'bg-info/10' },
    cohort: { color: 'text-primary', bg: 'bg-primary/10' },
    tier: { color: 'text-warning-foreground', bg: 'bg-warning/10' }
  };
  
  const typeStyle = typeStyles[type];
  
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${typeStyle.bg} ${typeStyle.color} border-0 text-xs uppercase`}>
              {typeLabels[type]}
            </Badge>
            <CardTitle className="text-base">{name}</CardTitle>
          </div>
          <StabilityBadge stability={stability} />
        </div>
        <CardDescription className="text-sm mt-2">
          {definition}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Quy mô</p>
            <p className="font-semibold">{size.toLocaleString('vi-VN')} khách hàng</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Tỷ trọng doanh thu</p>
            <p className="font-semibold">{revenueShare.toFixed(1)}%</p>
          </div>
        </div>
        
        <div>
          <p className="text-xs text-muted-foreground mb-2">Chỉ số chính (chỉ đọc)</p>
          <div className="flex flex-wrap gap-1.5">
            {metrics.map((metric) => (
              <Badge key={metric} variant="secondary" className="text-xs font-normal">
                {metric}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PopulationsPage() {
  const { segmentSummaries, summaryStats, isLoading } = useCDPData();

  // Transform segment data into population definitions
  const segments = segmentSummaries.map((seg) => ({
    name: seg.name,
    type: 'segment' as const,
    definition: getSegmentDefinition(seg.name),
    size: seg.customerCount,
    revenueShare: seg.totalRevenue / (summaryStats.totalRevenue || 1) * 100,
    stability: getStability(seg.trend),
    metrics: ['Doanh thu thuần', 'AOV', 'Tần suất']
  }));

  // Value tiers (derived from percentile logic)
  const valueTiers = [
    {
      name: 'TOP10',
      type: 'tier' as const,
      definition: 'Top 10% khách hàng theo doanh thu thuần 365 ngày',
      size: Math.round(summaryStats.totalCustomers * 0.1),
      revenueShare: summaryStats.top20Percent * 0.6,
      stability: 'stable' as const,
      metrics: ['Doanh thu 365d', 'Biên lợi nhuận', 'Tần suất']
    },
    {
      name: 'TOP20',
      type: 'tier' as const,
      definition: 'Top 11-20% khách hàng theo doanh thu thuần 365 ngày',
      size: Math.round(summaryStats.totalCustomers * 0.1),
      revenueShare: summaryStats.top20Percent * 0.4,
      stability: 'stable' as const,
      metrics: ['Doanh thu 365d', 'Biên lợi nhuận', 'Tần suất']
    },
    {
      name: 'TOP30',
      type: 'tier' as const,
      definition: 'Top 21-30% khách hàng theo doanh thu thuần 365 ngày',
      size: Math.round(summaryStats.totalCustomers * 0.1),
      revenueShare: Math.max(0, 100 - summaryStats.top20Percent) * 0.3,
      stability: 'drifting' as const,
      metrics: ['Doanh thu 365d', 'AOV']
    },
    {
      name: 'CÒN LẠI',
      type: 'tier' as const,
      definition: 'Bottom 70% khách hàng theo doanh thu thuần 365 ngày',
      size: Math.round(summaryStats.totalCustomers * 0.7),
      revenueShare: Math.max(0, 100 - summaryStats.top20Percent) * 0.7,
      stability: 'volatile' as const,
      metrics: ['Doanh thu 365d']
    }
  ];

  // Example cohorts (time-based)
  const cohorts = [
    {
      name: 'Mua Q4-2024',
      type: 'cohort' as const,
      definition: 'Khách hàng có lần mua đầu tiên trong T10-T12/2024',
      size: Math.round(summaryStats.totalCustomers * 0.15),
      revenueShare: 8.5,
      stability: 'drifting' as const,
      metrics: ['Thời gian mua lần 2', 'AOV', 'Retention 90d']
    },
    {
      name: 'Mua Q3-2024',
      type: 'cohort' as const,
      definition: 'Khách hàng có lần mua đầu tiên trong T7-T9/2024',
      size: Math.round(summaryStats.totalCustomers * 0.18),
      revenueShare: 12.3,
      stability: 'stable' as const,
      metrics: ['Thời gian mua lần 2', 'AOV', 'Retention 90d']
    }
  ];

  return (
    <CDPLayout>
      <Helmet>
        <title>Tập khách hàng | CDP - Bluecore</title>
        <meta name="description" content="Định nghĩa tập khách hàng - Phân khúc, Cohort và Value Tier" />
      </Helmet>

      <div className="space-y-8 max-w-5xl">
        {/* Page Header */}
        <div>
          <h1 className="text-xl font-semibold mb-1">Tập khách hàng</h1>
          <p className="text-sm text-muted-foreground">Phân khúc, Cohort, Value Tier</p>
        </div>

        {/* Explanatory Header */}
        <Card className="border-border bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">
                  Màn hình này giải thích CÁCH khách hàng được phân nhóm, không phải AI là ai
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tập khách hàng là đơn vị phân tích trong CDP. Tất cả tín hiệu và quyết định 
                  đều tham chiếu đến tập khách hàng, không phải khách hàng riêng lẻ. Định nghĩa 
                  được version hóa và chỉ đọc để đảm bảo tính nhất quán trong phân tích.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Population Types */}
        <Tabs defaultValue="tiers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tiers" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Value Tier
            </TabsTrigger>
            <TabsTrigger value="segments" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Phân khúc
            </TabsTrigger>
            <TabsTrigger value="cohorts" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Cohort
            </TabsTrigger>
          </TabsList>

          {/* Value Tiers */}
          <TabsContent value="tiers" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Value Tier</h3>
                <p className="text-sm text-muted-foreground">
                  Khách hàng được phân nhóm theo phân vị doanh thu thuần 365 ngày
                </p>
              </div>
              <Badge variant="outline">{valueTiers.length} tier</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {valueTiers.map((tier) => (
                <PopulationCard key={tier.name} {...tier} />
              ))}
            </div>
          </TabsContent>

          {/* Segments */}
          <TabsContent value="segments" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Phân khúc hành vi</h3>
                <p className="text-sm text-muted-foreground">
                  Nhóm khách hàng dựa trên logic hành vi, có định nghĩa được version hóa
                </p>
              </div>
              <Badge variant="outline">{segments.length} phân khúc</Badge>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="h-48 animate-pulse bg-muted" />
                ))}
              </div>
            ) : segments.length === 0 ? (
              <Card className="py-12 text-center">
                <CardContent>
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">Chưa có phân khúc nào được định nghĩa</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Phân khúc được cấu hình trong CDP registry
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {segments.map((seg) => (
                  <PopulationCard key={seg.name} {...seg} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Cohorts */}
          <TabsContent value="cohorts" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Cohort theo thời gian mua</h3>
                <p className="text-sm text-muted-foreground">
                  Nhóm theo thời điểm để phân tích lifecycle economics
                </p>
              </div>
              <Badge variant="outline">{cohorts.length} cohort</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cohorts.map((cohort) => (
                <PopulationCard key={cohort.name} {...cohort} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </CDPLayout>
  );
}

// Helper functions
function getSegmentDefinition(name: string): string {
  const definitions: Record<string, string> = {
    'Elite': 'Khách hàng trong top 10% theo lifetime revenue với 3+ lần mua',
    'High Value': 'Khách hàng trong phân vị 75-90% theo doanh thu',
    'Medium Value': 'Khách hàng trong phân vị 50-75% theo doanh thu',
    'Low Value': 'Khách hàng trong phân vị 25-50% theo doanh thu',
    'At Risk': 'Khách hàng có tần suất mua hoặc AOV đang giảm'
  };
  return definitions[name] || `Khách hàng được phân loại là ${name} dựa trên hành vi`;
}

function getStability(trend: 'up' | 'down' | 'stable'): 'stable' | 'drifting' | 'volatile' {
  if (trend === 'stable') return 'stable';
  if (trend === 'down') return 'volatile';
  return 'drifting';
}
