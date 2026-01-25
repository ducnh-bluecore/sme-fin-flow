import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { InsightDetailView, InsightDetailData } from '@/components/cdp/insights/InsightDetailView';
import { useCDPInsightDetail, useCreateDecisionFromInsight } from '@/hooks/useCDPInsightDetail';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';

export default function InsightDetailPage() {
  const { insightCode } = useParams();
  
  const { data: insightData, isLoading, error } = useCDPInsightDetail(insightCode);
  const createDecision = useCreateDecisionFromInsight();

  const handleCreateDecisionCard = () => {
    if (!insightData) return;
    
    createDecision.mutate({
      insightEventId: insightData.event_id,
      insightCode: insightData.code,
      title: insightData.title,
      summary: insightData.business_implication,
    }, {
      onSuccess: () => {
        toast.success('Đã tạo Thẻ Quyết định', {
          description: `Insight ${insightData.code} đã được liên kết với thẻ quyết định mới.`
        });
      },
      onError: (err) => {
        toast.error('Lỗi tạo thẻ quyết định', {
          description: err.message
        });
      }
    });
  };

  if (isLoading) {
    return (
      <CDPLayout>
        <Helmet>
          <title>Đang tải... | CDP - Bluecore</title>
        </Helmet>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Đang tải insight...</span>
        </div>
      </CDPLayout>
    );
  }

  if (error || !insightData) {
    return (
      <CDPLayout>
        <Helmet>
          <title>Không tìm thấy | CDP - Bluecore</title>
        </Helmet>
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="py-8 text-center">
            <p className="font-medium">Không tìm thấy insight</p>
            <p className="text-sm text-muted-foreground mt-1">
              Insight "{insightCode}" không tồn tại hoặc chưa được phát hiện
            </p>
          </CardContent>
        </Card>
      </CDPLayout>
    );
  }

  // Convert DB format to component format
  const insight: InsightDetailData = {
    code: insightData.code,
    title: insightData.title,
    topic: insightData.topic,
    populationName: insightData.population_name,
    populationSize: insightData.population_size,
    revenueContribution: insightData.revenue_contribution,
    severity: insightData.severity === 'critical' ? 'high' : insightData.severity,
    confidence: insightData.confidence,
    status: insightData.status,
    currentValue: insightData.current_value,
    baselineValue: insightData.baseline_value,
    changePercent: insightData.change_percent,
    changeDirection: insightData.change_direction === 'stable' ? 'down' : insightData.change_direction,
    metricName: insightData.metric_name,
    periodCurrent: insightData.period_current,
    periodBaseline: insightData.period_baseline,
    businessImplication: insightData.business_implication,
    drivers: insightData.drivers,
    sampleCustomers: insightData.sample_customers,
    snapshotDate: insightData.snapshot_date,
    linkedDecisionCardId: insightData.linked_decision_card_id || undefined,
    linkedDecisionCardStatus: insightData.linked_decision_card_status || undefined,
    detectedAt: insightData.detected_at,
    cooldownUntil: insightData.cooldown_until || undefined,
    // NEW: Actionable fields
    recommendedAction: insightData.recommended_action,
    urgency: insightData.urgency,
    estimatedImpact: insightData.estimated_impact,
    impactCurrency: insightData.impact_currency,
    actionOwner: insightData.action_owner,
  };

  return (
    <CDPLayout>
      <Helmet>
        <title>{insight.code} - {insight.title} | CDP - Bluecore</title>
        <meta name="description" content={`Chi tiết insight ${insight.code}`} />
      </Helmet>

      <InsightDetailView 
        insight={insight}
        onCreateDecisionCard={handleCreateDecisionCard}
      />
    </CDPLayout>
  );
}
