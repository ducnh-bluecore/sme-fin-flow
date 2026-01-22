import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { DataContextBar } from '@/components/cdp/overview/DataContextBar';
import { HighlightSignalCard, HighlightSignal } from '@/components/cdp/overview/HighlightSignalCard';
import { TopicSummarySection, TopicSummary } from '@/components/cdp/overview/TopicSummarySection';
import { CustomerEquitySnapshot } from '@/components/cdp/overview/CustomerEquitySnapshot';
import { PendingDecisionCards } from '@/components/cdp/overview/PendingDecisionCards';
import { DataConfidenceSummary } from '@/components/cdp/overview/DataConfidenceSummary';

// Mock data - will be replaced with real data from hooks
const mockHighlightSignals: HighlightSignal[] = [
  {
    id: 'V01',
    headline: 'Top 20% khách hàng giảm chi tiêu 18% trong 30 ngày',
    population: 'Nhóm LTV cao',
    populationCount: 2340,
    direction: 'down',
    changePercent: 18.2,
    revenueImpact: -1_200_000_000,
    severity: 'critical',
    category: 'value'
  },
  {
    id: 'T01',
    headline: 'Thời gian mua lại tăng từ 28 lên 42 ngày',
    population: 'Khách mua lặp lại',
    populationCount: 8920,
    direction: 'down',
    changePercent: 50.0,
    revenueImpact: -680_000_000,
    severity: 'high',
    category: 'velocity'
  },
  {
    id: 'R03',
    headline: 'Tỷ lệ hoàn trả nhóm mới tăng đột biến',
    population: 'Cohort tháng 1',
    populationCount: 1250,
    direction: 'up',
    changePercent: 34.5,
    revenueImpact: -320_000_000,
    severity: 'high',
    category: 'risk'
  },
  {
    id: 'V02',
    headline: 'AOV giảm 12% ở segment chủ lực',
    population: 'Premium Repeat',
    populationCount: 4120,
    direction: 'down',
    changePercent: 12.3,
    revenueImpact: -450_000_000,
    severity: 'medium',
    category: 'value'
  },
  {
    id: 'M01',
    headline: 'Chuyển dịch sang danh mục margin thấp',
    population: 'Multi-category buyers',
    populationCount: 3680,
    direction: 'down',
    changePercent: 8.7,
    revenueImpact: -180_000_000,
    severity: 'medium',
    category: 'mix'
  }
];

const mockTopicSummaries: TopicSummary[] = [
  {
    category: 'value',
    signalCount: 4,
    criticalCount: 1,
    trendDirection: 'declining',
    headline: 'Top customers giảm chi tiêu, AOV co lại'
  },
  {
    category: 'velocity',
    signalCount: 3,
    criticalCount: 0,
    trendDirection: 'declining',
    headline: 'Thời gian mua lại kéo dài ở đa segment'
  },
  {
    category: 'mix',
    signalCount: 2,
    criticalCount: 0,
    trendDirection: 'stable',
    headline: 'Cơ cấu danh mục ổn định, theo dõi margin'
  },
  {
    category: 'risk',
    signalCount: 3,
    criticalCount: 0,
    trendDirection: 'declining',
    headline: 'Hoàn trả và churn có dấu hiệu tăng'
  },
  {
    category: 'quality',
    signalCount: 1,
    criticalCount: 0,
    trendDirection: 'stable',
    headline: 'Độ phủ identity đạt 78%, cần cải thiện'
  }
];

const mockDecisions = [
  {
    id: '1',
    title: 'Chiến lược giữ chân top 20% customers',
    insightSource: 'V01',
    severity: 'critical' as const,
    status: 'new' as const,
    assignedTo: 'CEO',
    daysOpen: 3,
    riskIfIgnored: 1_200_000_000
  },
  {
    id: '2',
    title: 'Điều chỉnh chính sách hoàn trả cohort mới',
    insightSource: 'R03',
    severity: 'high' as const,
    status: 'reviewing' as const,
    assignedTo: 'COO',
    daysOpen: 5,
    riskIfIgnored: 320_000_000
  }
];

const mockDataConfidence = {
  overallScore: 76,
  identityCoverage: 78,
  matchAccuracy: 82,
  returnDataCompleteness: 65,
  dataFreshnessDays: 1,
  issues: [
    { id: '1', label: 'Thiếu return data từ kênh offline', severity: 'warning' as const },
    { id: '2', label: 'Identity gap ở guest checkout', severity: 'info' as const }
  ]
};

export default function CDPOverviewPage() {
  const navigate = useNavigate();

  // Data context
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodEnd = now;
  const lastUpdated = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

  const totalCritical = mockHighlightSignals.filter(s => s.severity === 'critical').length;

  return (
    <CDPLayout>
      <Helmet>
        <title>Tổng quan CDP | Bluecore</title>
        <meta name="description" content="Nền tảng Dữ liệu Khách hàng - Tổng quan điều hành" />
      </Helmet>

      <div className="space-y-6 max-w-6xl">
        {/* Section 1: Data Context Bar */}
        <DataContextBar
          lastUpdated={lastUpdated}
          periodStart={periodStart}
          periodEnd={periodEnd}
          dataFreshness="fresh"
        />

        {/* Section 2: Highlight Signals */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Tín hiệu nổi bật</h2>
              <p className="text-sm text-muted-foreground">
                {mockHighlightSignals.length} tín hiệu phát hiện
                {totalCritical > 0 && (
                  <span className="text-destructive font-medium ml-2">
                    • {totalCritical} nghiêm trọng
                  </span>
                )}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/cdp/insights')}
              className="text-muted-foreground"
            >
              Xem tất cả <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockHighlightSignals.slice(0, 6).map((signal) => (
              <HighlightSignalCard
                key={signal.id}
                signal={signal}
                onClick={() => navigate(`/cdp/insights/${signal.id}`)}
              />
            ))}
          </div>
        </section>

        {/* Section 3: Topic Summary */}
        <TopicSummarySection topics={mockTopicSummaries} />

        {/* Section 4 & 5: Two columns - Equity Snapshot & Decision Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CustomerEquitySnapshot
            totalEquity12M={45_800_000_000}
            totalEquity24M={82_500_000_000}
            atRiskValue={6_200_000_000}
            atRiskPercent={13.5}
            equityChange={-4.2}
            changeDirection="down"
            topDrivers={[
              { label: 'Chậm mua lại', impact: -2_800_000_000, direction: 'negative' },
              { label: 'Giảm AOV', impact: -1_400_000_000, direction: 'negative' },
              { label: 'New cohort', impact: 1_200_000_000, direction: 'positive' }
            ]}
          />

          <PendingDecisionCards decisions={mockDecisions} />
        </div>

        {/* Section 6: Data Confidence */}
        <DataConfidenceSummary {...mockDataConfidence} />
      </div>
    </CDPLayout>
  );
}
