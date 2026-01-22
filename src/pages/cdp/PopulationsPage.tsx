import { Helmet } from 'react-helmet-async';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Layers, 
  Calendar, 
  BarChart3,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { PopulationLayout } from '@/components/cdp/populations/PopulationLayout';
import { PopulationCatalogTable, PopulationItem } from '@/components/cdp/populations/PopulationCatalogTable';
import { useCDPData } from '@/hooks/useCDPData';

export default function PopulationsPage() {
  const { segmentSummaries, summaryStats, isLoading } = useCDPData();
  const [sortBy, setSortBy] = useState<'size' | 'revenue' | 'stability'>('revenue');

  // Transform data into population items
  const allPopulations = useMemo<PopulationItem[]>(() => {
    const populations: PopulationItem[] = [];

    // Value Tiers
    const tiers = [
      { name: 'TOP10', pct: 0.1, revShare: 45, stability: 'stable' as const },
      { name: 'TOP20', pct: 0.1, revShare: 25, stability: 'stable' as const },
      { name: 'TOP30', pct: 0.1, revShare: 15, stability: 'drifting' as const },
      { name: 'CÒN LẠI', pct: 0.7, revShare: 15, stability: 'volatile' as const },
    ];

    tiers.forEach((tier, i) => {
      populations.push({
        id: `tier-${i}`,
        name: tier.name,
        type: 'tier',
        definition: `${tier.name === 'CÒN LẠI' ? 'Bottom 70%' : tier.name.replace('TOP', 'Top ')} khách hàng theo doanh thu thuần 365 ngày`,
        size: Math.round(summaryStats.totalCustomers * tier.pct),
        revenueShare: tier.revShare,
        stability: tier.stability,
        insightCount: Math.floor(Math.random() * 3),
      });
    });

    // Segments from data
    segmentSummaries.forEach((seg, i) => {
      populations.push({
        id: `segment-${i}`,
        name: seg.name,
        type: 'segment',
        definition: getSegmentDefinition(seg.name),
        size: seg.customerCount,
        revenueShare: seg.totalRevenue / (summaryStats.totalRevenue || 1) * 100,
        stability: getStability(seg.trend),
        insightCount: Math.floor(Math.random() * 4),
      });
    });

    // Cohorts
    const cohorts = [
      { name: 'Mua Q4-2024', pct: 0.15, revShare: 8.5, stability: 'drifting' as const },
      { name: 'Mua Q3-2024', pct: 0.18, revShare: 12.3, stability: 'stable' as const },
      { name: 'Mua Q2-2024', pct: 0.2, revShare: 18.7, stability: 'stable' as const },
      { name: 'Mua Q1-2024', pct: 0.12, revShare: 10.2, stability: 'drifting' as const },
    ];

    cohorts.forEach((cohort, i) => {
      populations.push({
        id: `cohort-${i}`,
        name: cohort.name,
        type: 'cohort',
        definition: `Khách hàng có lần mua đầu tiên trong ${cohort.name.replace('Mua ', '')}`,
        size: Math.round(summaryStats.totalCustomers * cohort.pct),
        revenueShare: cohort.revShare,
        stability: cohort.stability,
        insightCount: Math.floor(Math.random() * 2),
      });
    });

    return populations;
  }, [segmentSummaries, summaryStats]);

  // Filter by type
  const tierPopulations = allPopulations.filter(p => p.type === 'tier');
  const segmentPopulations = allPopulations.filter(p => p.type === 'segment');
  const cohortPopulations = allPopulations.filter(p => p.type === 'cohort');

  // Sort function
  const sortPopulations = (pops: PopulationItem[]) => {
    return [...pops].sort((a, b) => {
      switch (sortBy) {
        case 'size': return b.size - a.size;
        case 'revenue': return b.revenueShare - a.revenueShare;
        case 'stability': {
          const order = { stable: 0, drifting: 1, volatile: 2 };
          return order[a.stability] - order[b.stability];
        }
        default: return 0;
      }
    });
  };

  return (
    <PopulationLayout
      title="Danh mục Tập khách hàng"
      subtitle="Các tập khách dùng cho phân tích & insight — không dùng cho kích hoạt"
    >
      <Helmet>
        <title>Tập khách hàng | CDP - Bluecore</title>
        <meta name="description" content="Định nghĩa tập khách hàng - Phân khúc, Cohort và Value Tier" />
      </Helmet>

      <div className="space-y-6">
        {/* Tabs + Sort */}
        <Tabs defaultValue="all" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                Tất cả
                <Badge variant="secondary" className="text-xs">{allPopulations.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="tiers" className="gap-2">
                <BarChart3 className="w-3.5 h-3.5" />
                Nhóm giá trị
                <Badge variant="secondary" className="text-xs">{tierPopulations.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="segments" className="gap-2">
                <Layers className="w-3.5 h-3.5" />
                Phân khúc
                <Badge variant="secondary" className="text-xs">{segmentPopulations.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cohorts" className="gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Cohort
                <Badge variant="secondary" className="text-xs">{cohortPopulations.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant={sortBy === 'revenue' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSortBy('revenue')}
              >
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                Doanh thu
              </Button>
              <Button
                variant={sortBy === 'size' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSortBy('size')}
              >
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                Quy mô
              </Button>
              <Button
                variant={sortBy === 'stability' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSortBy('stability')}
              >
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                Độ ổn định
              </Button>
            </div>
          </div>

          <TabsContent value="all">
            <PopulationCatalogTable 
              populations={sortPopulations(allPopulations)} 
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="tiers">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Khách hàng được phân nhóm theo phân vị doanh thu thuần 365 ngày. 
                Định nghĩa cố định, phục vụ phân tích giá trị.
              </p>
              <PopulationCatalogTable 
                populations={sortPopulations(tierPopulations)} 
                isLoading={isLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="segments">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Nhóm khách hàng dựa trên logic hành vi. Định nghĩa được version hóa 
                để đảm bảo tính nhất quán trong phân tích.
              </p>
              <PopulationCatalogTable 
                populations={sortPopulations(segmentPopulations)} 
                isLoading={isLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="cohorts">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Nhóm theo thời điểm mua đầu tiên để phân tích lifecycle economics 
                và retention theo thời gian.
              </p>
              <PopulationCatalogTable 
                populations={sortPopulations(cohortPopulations)} 
                isLoading={isLoading}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PopulationLayout>
  );
}

// Helper functions
function getSegmentDefinition(name: string): string {
  const definitions: Record<string, string> = {
    'Top 10%': 'Khách hàng trong top 10% theo lifetime revenue với 3+ lần mua',
    'P75-P90': 'Khách hàng trong phân vị 75-90% theo doanh thu thuần',
    'P50-P75': 'Khách hàng trong phân vị 50-75% theo doanh thu thuần',
    'P25-P50': 'Khách hàng trong phân vị 25-50% theo doanh thu thuần',
    'Bottom 25%': 'Khách hàng trong phân vị dưới 25% theo doanh thu thuần',
  };
  return definitions[name] || `Khách hàng được phân loại là ${name} dựa trên hành vi`;
}

function getStability(trend: 'up' | 'down' | 'stable'): 'stable' | 'drifting' | 'volatile' {
  if (trend === 'stable') return 'stable';
  if (trend === 'down') return 'volatile';
  return 'drifting';
}
