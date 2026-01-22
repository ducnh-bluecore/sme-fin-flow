import { ExploreLayout } from '@/components/cdp/explore/ExploreLayout';
import { SavedResearchViews } from '@/components/cdp/explore/SavedResearchViews';

export default function SavedViewsPage() {
  return (
    <ExploreLayout title="Góc nhìn đã lưu">
      <SavedResearchViews />
    </ExploreLayout>
  );
}
