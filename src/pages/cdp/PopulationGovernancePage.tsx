import { Helmet } from 'react-helmet-async';
import { PopulationLayout } from '@/components/cdp/populations/PopulationLayout';
import { PopulationGovernance } from '@/components/cdp/populations/PopulationGovernance';

// Mock change log data
const mockChangeLog = [
  {
    id: '1',
    populationName: 'TOP10',
    action: 'created' as const,
    changedBy: 'Admin',
    changedAt: '01/01/2025 09:00',
    version: '1.0',
    purpose: 'Khởi tạo định nghĩa tier TOP10',
    changes: undefined,
  },
  {
    id: '2',
    populationName: 'TOP20',
    action: 'created' as const,
    changedBy: 'Admin',
    changedAt: '01/01/2025 09:05',
    version: '1.0',
    purpose: 'Khởi tạo định nghĩa tier TOP20',
    changes: undefined,
  },
  {
    id: '3',
    populationName: 'Mua Q4-2024',
    action: 'created' as const,
    changedBy: 'Data Team',
    changedAt: '05/01/2025 14:30',
    version: '1.0',
    purpose: 'Tạo cohort theo quý mua',
    changes: undefined,
  },
  {
    id: '4',
    populationName: 'TOP10',
    action: 'updated' as const,
    changedBy: 'Admin',
    changedAt: '10/01/2025 11:20',
    version: '1.1',
    purpose: 'Điều chỉnh điều kiện loại trừ',
    changes: 'Thêm điều kiện tỷ lệ hoàn trả <= 30%',
  },
  {
    id: '5',
    populationName: 'Mua Q3-2024',
    action: 'locked' as const,
    changedBy: 'Admin',
    changedAt: '12/01/2025 08:00',
    version: '1.0',
    purpose: 'Khóa định nghĩa để đảm bảo nhất quán phân tích',
    changes: undefined,
  },
  {
    id: '6',
    populationName: 'High Value Segment',
    action: 'created' as const,
    changedBy: 'Product Owner',
    changedAt: '14/01/2025 16:45',
    version: '1.0',
    purpose: 'Tạo phân khúc khách hàng giá trị cao mới',
    changes: undefined,
  },
];

export default function PopulationGovernancePage() {
  return (
    <PopulationLayout
      title="Quản trị & Lịch sử thay đổi"
      subtitle="Theo dõi các thay đổi định nghĩa tập khách để đảm bảo tính nhất quán"
    >
      <Helmet>
        <title>Quản trị Tập khách | CDP - Bluecore</title>
        <meta name="description" content="Quản trị và lịch sử thay đổi định nghĩa tập khách hàng" />
      </Helmet>

      <PopulationGovernance changeLog={mockChangeLog} />
    </PopulationLayout>
  );
}
