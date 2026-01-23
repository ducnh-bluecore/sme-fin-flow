import { Helmet } from 'react-helmet-async';
import { PopulationLayout } from '@/components/cdp/populations/PopulationLayout';
import { PopulationGovernance } from '@/components/cdp/populations/PopulationGovernance';
import { useCDPPopulationChangelog } from '@/hooks/useCDPExplore';

export default function PopulationGovernancePage() {
  const { data: changeLog, isLoading } = useCDPPopulationChangelog();

  return (
    <PopulationLayout
      title="Quản trị & Lịch sử thay đổi"
      subtitle="Theo dõi các thay đổi định nghĩa tập khách để đảm bảo tính nhất quán"
    >
      <Helmet>
        <title>Quản trị Tập khách | CDP - Bluecore</title>
        <meta name="description" content="Quản trị và lịch sử thay đổi định nghĩa tập khách hàng" />
      </Helmet>

      <PopulationGovernance changeLog={changeLog || []} isLoading={isLoading} />
    </PopulationLayout>
  );
}
