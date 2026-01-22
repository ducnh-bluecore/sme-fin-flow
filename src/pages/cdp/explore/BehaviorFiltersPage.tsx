import { ExploreLayout } from '@/components/cdp/explore/ExploreLayout';
import { HypothesisBuilder } from '@/components/cdp/explore/HypothesisBuilder';

export default function BehaviorFiltersPage() {
  return (
    <ExploreLayout title="Bộ lọc hành vi">
      <HypothesisBuilder />
    </ExploreLayout>
  );
}
