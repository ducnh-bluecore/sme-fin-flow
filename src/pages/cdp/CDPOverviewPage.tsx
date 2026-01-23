import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { DataContextBar } from '@/components/cdp/overview/DataContextBar';
import { HighlightSignalCard } from '@/components/cdp/overview/HighlightSignalCard';
import { TopicSummarySection } from '@/components/cdp/overview/TopicSummarySection';
import { CustomerEquitySnapshot } from '@/components/cdp/overview/CustomerEquitySnapshot';
import { PendingDecisionCards } from '@/components/cdp/overview/PendingDecisionCards';
import { DataConfidenceSummary } from '@/components/cdp/overview/DataConfidenceSummary';
import { 
  useCDPHighlightSignals, 
  useCDPTopicSummaries, 
  useCDPPendingDecisions,
  useCDPDataConfidence,
  useCDPEquitySnapshot
} from '@/hooks/useCDPOverview';

export default function CDPOverviewPage() {
  const navigate = useNavigate();

  // Fetch all data from database views
  const { data: signals = [], isLoading: signalsLoading } = useCDPHighlightSignals();
  const { data: topics = [], isLoading: topicsLoading } = useCDPTopicSummaries();
  const { data: decisions = [], isLoading: decisionsLoading } = useCDPPendingDecisions();
  const { data: confidence, isLoading: confidenceLoading } = useCDPDataConfidence();
  const { data: equity, isLoading: equityLoading } = useCDPEquitySnapshot();

  const isLoading = signalsLoading || topicsLoading || decisionsLoading || confidenceLoading || equityLoading;

  // Data context
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodEnd = now;
  const lastUpdated = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const totalCritical = signals.filter(s => s.severity === 'critical').length;

  // Empty state component
  const EmptyState = ({ message }: { message: string }) => (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center">
        <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Dữ liệu sẽ xuất hiện khi hệ thống CDP được chạy
        </p>
      </CardContent>
    </Card>
  );

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
          dataFreshness={confidence?.dataFreshnessDays && confidence.dataFreshnessDays <= 1 ? "fresh" : "stale"}
        />

        {/* Section 2: Highlight Signals */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Tín hiệu nổi bật</h2>
              <p className="text-sm text-muted-foreground">
                {signalsLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang tải...
                  </span>
                ) : (
                  <>
                    {signals.length} tín hiệu phát hiện
                    {totalCritical > 0 && (
                      <span className="text-destructive font-medium ml-2">
                        • {totalCritical} nghiêm trọng
                      </span>
                    )}
                  </>
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

          {signalsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="h-32 animate-pulse bg-muted/50" />
              ))}
            </div>
          ) : signals.length === 0 ? (
            <EmptyState message="Chưa có tín hiệu nào được phát hiện" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {signals.slice(0, 6).map((signal) => (
                <HighlightSignalCard
                  key={signal.id}
                  signal={signal}
                  onClick={() => navigate(`/cdp/insights/${signal.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Topic Summary */}
        {topicsLoading ? (
          <Card className="h-24 animate-pulse bg-muted/50" />
        ) : topics.length > 0 ? (
          <TopicSummarySection topics={topics} />
        ) : null}

        {/* Section 4 & 5: Two columns - Equity Snapshot & Decision Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CustomerEquitySnapshot />

          {decisionsLoading ? (
            <Card className="h-64 animate-pulse bg-muted/50" />
          ) : (
            <PendingDecisionCards decisions={decisions} />
          )}
        </div>

        {/* Section 6: Data Confidence */}
        {confidenceLoading ? (
          <Card className="h-32 animate-pulse bg-muted/50" />
        ) : confidence ? (
          <DataConfidenceSummary 
            overallScore={confidence.overallScore}
            identityCoverage={confidence.identityCoverage}
            matchAccuracy={confidence.matchAccuracy}
            returnDataCompleteness={confidence.returnDataCompleteness}
            dataFreshnessDays={confidence.dataFreshnessDays}
            issues={confidence.issues}
          />
        ) : null}
      </div>
    </CDPLayout>
  );
}
