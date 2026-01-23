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
  Loader2
} from 'lucide-react';
import { PopulationLayout } from '@/components/cdp/populations/PopulationLayout';
import { PopulationCatalogTable, PopulationItem } from '@/components/cdp/populations/PopulationCatalogTable';
import { useCDPPopulations } from '@/hooks/useCDPPopulations';

export default function PopulationsPage() {
  const { 
    populations, 
    tierPopulations, 
    segmentPopulations, 
    cohortPopulations, 
    isLoading 
  } = useCDPPopulations();
  
  const [sortBy, setSortBy] = useState<'size' | 'revenue' | 'stability'>('revenue');

  // Sort function
  const sortPopulations = (pops: PopulationItem[]) => {
    return [...pops].sort((a, b) => {
      switch (sortBy) {
        case 'size': return b.size - a.size;
        case 'revenue': return b.revenueShare - a.revenueShare;
        case 'stability': {
          const order: Record<string, number> = { stable: 0, drifting: 1, volatile: 2 };
          return (order[a.stability] ?? 0) - (order[b.stability] ?? 0);
        }
        default: return 0;
      }
    });
  };

  if (isLoading) {
    return (
      <PopulationLayout
        title="Danh mục Tập khách hàng"
        subtitle="Các tập khách phục vụ phân tích & insight — chế độ chỉ đọc"
      >
        <Helmet>
          <title>Tập khách hàng | CDP - Bluecore</title>
        </Helmet>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Đang tải...</span>
        </div>
      </PopulationLayout>
    );
  }

  return (
    <PopulationLayout
      title="Danh mục Tập khách hàng"
      subtitle="Các tập khách phục vụ phân tích & insight — chế độ chỉ đọc"
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
                <Badge variant="secondary" className="text-xs">{populations.length}</Badge>
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
              populations={sortPopulations(populations)} 
              isLoading={false}
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
                isLoading={false}
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
                isLoading={false}
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
                isLoading={false}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PopulationLayout>
  );
}
