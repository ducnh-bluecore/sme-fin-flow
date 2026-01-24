import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PopulationLayout } from '@/components/cdp/populations/PopulationLayout';
import { PopulationDetailView, PopulationDetail } from '@/components/cdp/populations/PopulationDetailView';
import { PopulationEvidencePanel } from '@/components/cdp/populations/PopulationEvidencePanel';
import { useCDPPopulationDetail } from '@/hooks/useCDPPopulations';

// Mock sample customers for evidence (will be replaced with real data later)
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
  const { data: populationData, isLoading } = useCDPPopulationDetail(populationId);
  const [showEvidence, setShowEvidence] = useState(false);

  // Transform DB data to component format
  const population: PopulationDetail | null = populationData ? {
    id: populationData.id,
    name: populationData.name,
    type: populationData.type,
    definition: populationData.definition,
    naturalLanguageDescription: populationData.naturalLanguageDescription,
    inclusionCriteria: populationData.criteriaJson 
      ? Object.entries(populationData.criteriaJson).map(([k, v]) => `${k}: ${v}`)
      : [`Định nghĩa: ${populationData.definition}`],
    exclusionCriteria: [],
    size: populationData.customerCount,
    revenueShare: populationData.revenueShare,
    equityShare: populationData.customerShare, // Using customer share as proxy
    aov: populationData.avgOrderValue,
    purchaseCycle: populationData.purchaseCycleDays,
    returnRate: populationData.returnRate,
    estimatedEquity: populationData.estimatedEquity,
    sizeTrend: { value: 0, direction: 'stable' as const },
    aovTrend: { value: 0, direction: 'stable' as const },
    stability: populationData.stability,
    stabilityNote: 'Tập khách này có hành vi ổn định trong thời gian gần đây.',
    relatedInsights: populationData.insightCount > 0 
      ? [{ code: 'CDP', name: `${populationData.insightCount} insight liên quan`, severity: 'medium' as const }]
      : [],
    version: String(populationData.version),
    lastUpdated: populationData.lastUpdated,
  } : null;

  if (isLoading) {
    return (
      <PopulationLayout title="Đang tải...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PopulationLayout>
    );
  }

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
