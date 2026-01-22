import { useState } from 'react';
import { ExploreLayout } from '@/components/cdp/explore/ExploreLayout';
import { ResearchStatsPanel } from '@/components/cdp/explore/ResearchStatsPanel';
import { CustomerResearchFilters } from '@/components/cdp/explore/CustomerResearchFilters';
import { CustomerResearchTable, ResearchCustomer } from '@/components/cdp/explore/CustomerResearchTable';
import { ResearchActionBar } from '@/components/cdp/explore/ResearchActionBar';

// Mock data
const mockCustomers: ResearchCustomer[] = Array.from({ length: 50 }, (_, i) => ({
  id: `c${i + 1}`,
  anonymousId: `KH-${String(i + 1001).padStart(6, '0')}`,
  behaviorStatus: ['active', 'dormant', 'at_risk', 'new'][i % 4] as ResearchCustomer['behaviorStatus'],
  totalSpend: Math.floor(Math.random() * 50000000) + 500000,
  orderCount: Math.floor(Math.random() * 20) + 1,
  lastPurchase: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000),
  repurchaseCycle: Math.floor(Math.random() * 60) + 10,
  aov: Math.floor(Math.random() * 3000000) + 200000,
  trend: ['up', 'down', 'stable'][i % 3] as ResearchCustomer['trend'],
  returnRate: Math.random() * 25,
  marginContribution: Math.floor(Math.random() * 5000000) - 1000000,
}));

export default function CustomerResearchPage() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const stats = {
    customerCount: 12450,
    totalRevenue: 45600000000,
    medianAOV: 1250000,
    medianRepurchaseCycle: 32,
    returnRate: 8.5,
    promotionDependency: 42,
  };

  const activeFiltersCount = Object.keys(filters).filter(k => filters[k as keyof typeof filters]).length;

  return (
    <ExploreLayout title="Tập khách nghiên cứu">
      <div className="space-y-6">
        <ResearchStatsPanel stats={stats} />
        
        <div className="grid grid-cols-[280px_1fr] gap-6">
          <CustomerResearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            filterImpacts={{ orderCount: -1234, lastPurchase: -567 }}
          />
          <div className="space-y-4">
            <CustomerResearchTable
              customers={mockCustomers.slice(0, 10)}
              totalCount={mockCustomers.length}
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
          onSaveView={() => {}}
          onCreateDecisionCard={() => {}}
        />
      </div>
    </ExploreLayout>
  );
}
