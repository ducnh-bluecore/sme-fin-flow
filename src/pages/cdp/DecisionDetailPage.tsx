import { Helmet } from 'react-helmet-async';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, FileX } from 'lucide-react';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { DecisionDetailView } from '@/components/cdp/decisions/DecisionDetailView';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCDPDecisionCardDetail } from '@/hooks/useCDPDecisionCards';

export default function DecisionDetailPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();

  const { data: card, isLoading, error } = useCDPDecisionCardDetail(cardId);

  if (!cardId) {
    return <Navigate to="/cdp/decisions" replace />;
  }

  if (isLoading) {
    return (
      <CDPLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </CDPLayout>
    );
  }

  if (error || !card) {
    return (
      <CDPLayout>
        <Helmet>
          <title>Không tìm thấy | Thẻ Quyết định - Bluecore</title>
        </Helmet>
        <div className="max-w-5xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/cdp/decisions')}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Button>
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileX className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">Không tìm thấy thẻ quyết định</p>
              <p className="text-sm text-muted-foreground mt-1">
                Thẻ "{cardId}" không tồn tại hoặc đã bị xóa
              </p>
            </CardContent>
          </Card>
        </div>
      </CDPLayout>
    );
  }

  // Map DB data to DecisionDetailView expected format
  const cardForView = {
    id: card.id,
    title: card.title,
    sourceInsights: card.sourceInsights.map(s => s.code),
    sourceEquity: card.sourceEquity,
    severity: card.severity,
    priority: Number(card.priority) || 1,
    owner: card.owner,
    reviewDeadline: card.reviewDeadline,
    status: card.status as 'new' | 'reviewing' | 'decided' | 'archived',
    createdAt: card.createdAt,
    populationSize: card.populationSize,
    equityImpact: card.equityImpact,
    problemStatement: card.problemStatement,
    relatedInsights: card.sourceInsights,
    affectedPopulation: card.affectedPopulation,
    risks: card.risks,
    options: card.options,
    decision: card.decision,
    postDecisionReview: card.postDecisionReview,
  };

  return (
    <CDPLayout>
      <Helmet>
        <title>{card.title} | Thẻ Quyết định - Bluecore</title>
        <meta name="description" content={card.problemStatement?.slice(0, 150)} />
      </Helmet>

      <div className="max-w-4xl">
        <DecisionDetailView card={cardForView} />
      </div>
    </CDPLayout>
  );
}
