import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ExploreLayout } from '@/components/cdp/explore/ExploreLayout';
import { ResearchStatsPanel } from '@/components/cdp/explore/ResearchStatsPanel';
import { CustomerResearchFilters } from '@/components/cdp/explore/CustomerResearchFilters';
import { CustomerResearchTable } from '@/components/cdp/explore/CustomerResearchTable';
import { ResearchActionBar } from '@/components/cdp/explore/ResearchActionBar';
import { SaveViewDialog } from '@/components/cdp/explore/SaveViewDialog';
import { useCDPCustomerResearch, useCDPResearchStats, ResearchFilters, useSaveResearchView } from '@/hooks/useCDPExplore';

export default function CustomerResearchPage() {
  const [filters, setFilters] = useState<ResearchFilters>({});
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const { data: statsData, isLoading: statsLoading } = useCDPResearchStats();
  const { data: customersData, isLoading: customersLoading } = useCDPCustomerResearch(page, 10, filters);
  const saveViewMutation = useSaveResearchView();

  const stats = statsData || {
    customerCount: 0,
    totalRevenue: 0,
    medianAOV: 0,
    medianRepurchaseCycle: 30,
    returnRate: 0,
    promotionDependency: 0,
  };

  const customers = customersData?.customers || [];
  const totalCount = customersData?.totalCount || 0;

  const activeFiltersCount = Object.keys(filters).filter(k => filters[k as keyof ResearchFilters] && filters[k as keyof ResearchFilters] !== 'all').length;

  if (statsLoading && customersLoading) {
    return (
      <ExploreLayout title="Tập khách nghiên cứu">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </ExploreLayout>
    );
  }

  return (
    <ExploreLayout title="Tập khách nghiên cứu">
      <div className="space-y-6">
        <ResearchStatsPanel stats={stats} />
        
        <div className="grid grid-cols-[280px_1fr] gap-6">
          <CustomerResearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            filterImpacts={{ orderCount: -Math.floor(stats.customerCount * 0.1), lastPurchase: -Math.floor(stats.customerCount * 0.05) }}
          />
          <div className="space-y-4">
            <CustomerResearchTable
              customers={customers}
              totalCount={totalCount}
              page={page}
              pageSize={10}
              onPageChange={setPage}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>
        </div>

        <ResearchActionBar
          currentFiltersCount={activeFiltersCount}
          matchingCustomers={stats.customerCount}
          revenueShare={100}
          onSaveView={() => setSaveDialogOpen(true)}
          onCreateDecisionCard={() => {}}
        />

        <SaveViewDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          filters={filters}
          customerCount={stats.customerCount}
          onSave={(name, description) => {
            saveViewMutation.mutate(
              { name, description, filters },
              { onSuccess: () => setSaveDialogOpen(false) }
            );
          }}
          isSaving={saveViewMutation.isPending}
        />
      </div>
    </ExploreLayout>
  );
}
