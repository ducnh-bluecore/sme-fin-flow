import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PopulationLayout } from '@/components/cdp/populations/PopulationLayout';
import { PopulationDetailView, PopulationDetail } from '@/components/cdp/populations/PopulationDetailView';
import { PopulationEvidencePanel } from '@/components/cdp/populations/PopulationEvidencePanel';
import { useCDPSummaryStats } from '@/hooks/useCDPValueDistribution';

// Generate detail data based on ID using DB stats
function getPopulationDetail(id: string, totalCustomers: number): PopulationDetail {
  const isTier = id.startsWith('tier');
  const isSegment = id.startsWith('segment');
  const isCohort = id.startsWith('cohort');

  const tierData: Record<string, Partial<PopulationDetail>> = {
    'tier-0': {
      name: 'TOP10',
      type: 'tier',
      naturalLanguageDescription: 'Khách hàng thuộc top 10% theo tổng doanh thu thuần trong 365 ngày gần nhất. Đây là nhóm có giá trị cao nhất, đóng góp phần lớn doanh thu và thường có tần suất mua cao, AOV lớn.',
      inclusionCriteria: [
        'Tổng doanh thu thuần 365d >= phân vị 90%',
        'Có ít nhất 1 giao dịch trong 90 ngày gần nhất',
      ],
      exclusionCriteria: [
        'Tỷ lệ hoàn trả > 30%',
      ],
      size: Math.round(totalCustomers * 0.1),
      revenueShare: 45,
      equityShare: 52,
      aov: 3500000,
      purchaseCycle: 18,
      returnRate: 3.2,
      estimatedEquity: 15000000000,
      stability: 'stable',
      stabilityNote: 'Tập khách này có quy mô và hành vi ổn định trong 30 ngày qua. Không phát hiện biến động đáng kể.',
    },
    'tier-1': {
      name: 'TOP20',
      type: 'tier',
      naturalLanguageDescription: 'Khách hàng thuộc nhóm 11-20% theo tổng doanh thu thuần 365 ngày. Nhóm này có tiềm năng chuyển lên TOP10 nếu được nuôi dưỡng tốt.',
      inclusionCriteria: [
        'Tổng doanh thu thuần 365d >= phân vị 80%',
        'Tổng doanh thu thuần 365d < phân vị 90%',
      ],
      exclusionCriteria: [],
      size: Math.round(totalCustomers * 0.1),
      revenueShare: 25,
      equityShare: 22,
      aov: 2200000,
      purchaseCycle: 28,
      returnRate: 5.1,
      estimatedEquity: 7500000000,
      stability: 'stable',
      stabilityNote: 'Nhóm này duy trì ổn định. Một số khách hàng có dấu hiệu tăng AOV và có thể chuyển lên TOP10.',
    },
  };

  const cohortData: Record<string, Partial<PopulationDetail>> = {
    'cohort-0': {
      name: 'Mua Q4-2024',
      type: 'cohort',
      naturalLanguageDescription: 'Khách hàng có lần mua đầu tiên trong quý 4 năm 2024 (tháng 10-12). Đây là cohort mới nhất, đang trong giai đoạn quan sát retention.',
      inclusionCriteria: [
        'Lần mua đầu tiên trong khoảng 01/10/2024 - 31/12/2024',
        'Ít nhất 1 giao dịch thành công',
      ],
      exclusionCriteria: [
        'Khách hàng bị đánh dấu fraud',
      ],
      size: Math.round(totalCustomers * 0.15),
      revenueShare: 8.5,
      equityShare: 12,
      aov: 1800000,
      purchaseCycle: 45,
      returnRate: 8.5,
      estimatedEquity: 4200000000,
      stability: 'drifting',
      stabilityNote: 'Cohort này đang trong giai đoạn định hình hành vi. Tỷ lệ mua lại lần 2 đang được theo dõi chặt chẽ.',
    },
  };

  const segmentData: Record<string, Partial<PopulationDetail>> = {
    'segment-0': {
      name: 'Top 10%',
      type: 'segment',
      naturalLanguageDescription: 'Khách hàng có giá trị cao nhất dựa trên tổng doanh thu lifetime. Nhóm này đóng góp phần lớn doanh thu và có hành vi mua ổn định.',
      inclusionCriteria: [
        'Lifetime revenue >= phân vị 90%',
        'Có >= 3 lần mua thành công',
      ],
      exclusionCriteria: [],
      size: Math.round(totalCustomers * 0.1),
      revenueShare: 42,
      equityShare: 48,
      aov: 3200000,
      purchaseCycle: 22,
      returnRate: 4.1,
      estimatedEquity: 14000000000,
      stability: 'stable',
      stabilityNote: 'Phân khúc này có hành vi mua ổn định. Không có dấu hiệu suy giảm đáng kể.',
    },
  };

  const baseData: PopulationDetail = {
    id,
    name: 'Tập khách',
    type: isTier ? 'tier' : isCohort ? 'cohort' : 'segment',
    definition: 'Định nghĩa tập khách',
    naturalLanguageDescription: 'Mô tả chi tiết về tập khách này và các tiêu chí phân loại.',
    inclusionCriteria: ['Tiêu chí bao gồm'],
    exclusionCriteria: [],
    size: 1000,
    revenueShare: 10,
    equityShare: 12,
    aov: 1500000,
    purchaseCycle: 30,
    returnRate: 5,
    estimatedEquity: 5000000000,
    sizeTrend: { value: 2.5, direction: 'up' },
    aovTrend: { value: -1.2, direction: 'down' },
    stability: 'stable',
    stabilityNote: 'Tập khách này có hành vi ổn định trong thời gian gần đây.',
    relatedInsights: [
      { code: 'V01', name: 'Giảm AOV nhóm cao', severity: 'high' },
      { code: 'R02', name: 'Tăng tỷ lệ hoàn trả', severity: 'medium' },
    ],
    version: '1.0',
    lastUpdated: '15/01/2025',
  };

  const specificData = tierData[id] || cohortData[id] || segmentData[id] || {};

  return {
    ...baseData,
    ...specificData,
    sizeTrend: { value: 2.5, direction: 'up' as const },
    aovTrend: { value: -1.2, direction: 'down' as const },
    relatedInsights: [
      { code: 'V01', name: 'Giảm AOV nhóm cao', severity: 'high' as const },
      { code: 'R02', name: 'Tăng tỷ lệ hoàn trả', severity: 'medium' as const },
    ],
    version: '1.0',
    lastUpdated: '15/01/2025',
  };
}

// Mock sample customers for evidence
const mockSamples = [
  { id: '1', anonymizedId: 'KH-001892', purchaseCount: 8, totalSpend: 12500000, lastPurchase: '12/01/2025', matchScore: 98, status: 'verified' as const },
  { id: '2', anonymizedId: 'KH-003421', purchaseCount: 5, totalSpend: 8900000, lastPurchase: '08/01/2025', matchScore: 95, status: 'verified' as const },
  { id: '3', anonymizedId: 'KH-007823', purchaseCount: 12, totalSpend: 22100000, lastPurchase: '14/01/2025', matchScore: 99, status: 'verified' as const },
  { id: '4', anonymizedId: 'KH-002156', purchaseCount: 3, totalSpend: 5200000, lastPurchase: '02/01/2025', matchScore: 78, status: 'edge_case' as const },
  { id: '5', anonymizedId: 'KH-009012', purchaseCount: 6, totalSpend: 9800000, lastPurchase: '10/01/2025', matchScore: 92, status: 'verified' as const },
];

export default function PopulationDetailPage() {
  const { populationId } = useParams<{ populationId: string }>();
  const navigate = useNavigate();
  const { data: summaryStats } = useCDPSummaryStats();
  const [showEvidence, setShowEvidence] = useState(false);

  const totalCustomers = summaryStats?.totalCustomers || 0;

  const population = useMemo(() => {
    if (!populationId) return null;
    return getPopulationDetail(populationId, totalCustomers);
  }, [populationId, totalCustomers]);

  if (!population) {
    return (
      <PopulationLayout title="Không tìm thấy">
        <div className="text-center py-12">
          <p>Tập khách không tồn tại</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/cdp/populations')}>
            Quay lại danh mục
          </Button>
        </div>
      </PopulationLayout>
    );
  }

  return (
    <PopulationLayout
      title={population.name}
      subtitle={population.definition}
    >
      <Helmet>
        <title>{population.name} | Tập khách hàng - CDP Bluecore</title>
      </Helmet>

      <div className="space-y-6">
        {/* Back button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/cdp/populations')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh mục
        </Button>

        {/* Detail View */}
        <PopulationDetailView 
          population={population}
          onViewEvidence={() => setShowEvidence(true)}
        />

        {/* Evidence Panel */}
        {showEvidence && (
          <PopulationEvidencePanel
            populationName={population.name}
            samples={mockSamples}
            onClose={() => setShowEvidence(false)}
          />
        )}
      </div>
    </PopulationLayout>
  );
}
