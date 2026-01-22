import { ExploreLayout } from '@/components/cdp/explore/ExploreLayout';
import { PopulationComparison } from '@/components/cdp/explore/PopulationComparison';

export default function ComparePopulationsPage() {
  return (
    <ExploreLayout title="So sánh tập khách">
      <PopulationComparison />
    </ExploreLayout>
  );
}
